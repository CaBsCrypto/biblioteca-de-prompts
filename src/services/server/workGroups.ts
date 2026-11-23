import { createHash, randomBytes } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { z } from 'zod';

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/);
const group = { groupId: id };
export const groupActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('list') }),
  z.object({ action: z.literal('create'), name: z.string().trim().min(1).max(80) }),
  z.object({ action: z.literal('join'), code: z.string().trim().regex(/^[a-zA-Z0-9]{20}\.[a-zA-Z0-9_-]{32}$/) }),
  z.object({ action: z.literal('open'), ...group }),
  z.object({ action: z.literal('invite'), ...group }),
  z.object({ action: z.literal('revoke'), ...group }),
  z.object({ action: z.literal('close'), ...group }),
  z.object({ action: z.literal('leave'), ...group }),
  z.object({ action: z.literal('remove'), ...group, memberId: id }),
  z.object({ action: z.literal('share'), ...group, promptId: id }),
  z.object({ action: z.literal('unshare'), ...group, promptId: id }),
]);
export type GroupAction = z.infer<typeof groupActionSchema>;
export type GroupSummary = { id: string; name: string; ownerId: string };
export type GroupPrompt = { id: string; title: string; promptText: string; authorId: string; authorName: string };
export type GroupMember = { id: string; name: string };
export type GroupDetail = { group: GroupSummary; members: GroupMember[]; prompts: GroupPrompt[] };
export type GroupReply = Partial<GroupDetail> & { groups?: GroupSummary[]; code?: string };
type GroupData = Omit<GroupSummary, 'id'> & {
  memberIds: string[];
  members: GroupMember[];
  inviteHash: string | null;
  inviteExpiresAt: number;
};

export class GroupError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function summary(id: string, { name, ownerId }: GroupData): GroupSummary {
  return { id, name, ownerId };
}

export async function runGroupAction(db: Firestore, member: GroupMember, input: GroupAction): Promise<GroupReply> {
  const groups = db.collection('_bibliotecaGroups');
  if (input.action === 'list') {
    const snapshot = await groups.where('memberIds', 'array-contains', member.id).limit(51).get();
    return { groups: snapshot.docs.map(doc => summary(doc.id, doc.data() as GroupData)) };
  }

  const [groupId, secret] = input.action === 'join' ? input.code.split('.') : [];
  const ref = input.action === 'create' ? groups.doc() : groups.doc(input.action === 'join' ? groupId : input.groupId);
  const shares = ref.collection('prompts');

  return db.runTransaction(async tx => {
    if (input.action === 'create') {
      const existing = await tx.get(groups.where('memberIds', 'array-contains', member.id).limit(50));
      if (existing.size >= 50) throw new GroupError(409, 'Has llegado al límite de grupos.');
      const data: GroupData = {
        name: input.name, ownerId: member.id, memberIds: [member.id], members: [member],
        inviteHash: null, inviteExpiresAt: 0,
      };
      tx.create(ref, data);
      return { group: summary(ref.id, data) };
    }

    const data = (await tx.get(ref)).data() as GroupData | undefined;
    if (input.action === 'join') {
      if (!data) throw new GroupError(404, 'La invitación venció o ya fue utilizada.');
      if (!data.memberIds.includes(member.id)) {
        if (data.inviteHash !== digest(secret) || data.inviteExpiresAt <= Date.now()) {
          throw new GroupError(404, 'La invitación venció o ya fue utilizada.');
        }
        const existing = await tx.get(groups.where('memberIds', 'array-contains', member.id).limit(50));
        if (existing.size >= 50 || data.members.length >= 20) throw new GroupError(409, 'Se alcanzó el límite de grupos o miembros.');
        tx.update(ref, {
          memberIds: [...data.memberIds, member.id], members: [...data.members, member],
          inviteHash: null, inviteExpiresAt: 0,
        });
      }
      return { group: summary(ref.id, data) };
    }

    if (!data?.memberIds.includes(member.id)) throw new GroupError(404, 'Este grupo no está disponible.');
    const owner = data.ownerId === member.id;
    if (input.action === 'open') {
      const entries = await tx.get(shares.limit(50));
      return {
        group: summary(ref.id, data), members: data.members,
        prompts: entries.docs.map(doc => ({ ...doc.data(), id: doc.id } as GroupPrompt)),
      };
    }
    if (input.action === 'invite' || input.action === 'revoke') {
      if (!owner) throw new GroupError(403, 'Solo quien creó el grupo puede administrar invitaciones.');
      const token = randomBytes(24).toString('base64url');
      const invite = input.action === 'invite';
      tx.update(ref, { inviteHash: invite ? digest(token) : null, inviteExpiresAt: invite ? Date.now() + 86_400_000 : 0 });
      return invite ? { code: ref.id + '.' + token } : {};
    }
    if (input.action === 'close') {
      if (!owner) throw new GroupError(403, 'Solo quien creó el grupo puede cerrarlo.');
      const entries = await tx.get(shares);
      entries.docs.forEach(doc => tx.delete(doc.ref));
      tx.delete(ref);
      return {};
    }
    if (input.action === 'leave' || input.action === 'remove') {
      const target = input.action === 'leave' ? member.id : input.memberId;
      if (input.action === 'remove' && !owner) throw new GroupError(403, 'Solo quien creó el grupo puede retirar miembros.');
      if (target === data.ownerId) throw new GroupError(409, 'Quien creó el grupo debe cerrarlo para salir.');
      const entries = await tx.get(shares.where('authorId', '==', target));
      entries.docs.forEach(doc => tx.delete(doc.ref));
      tx.update(ref, { memberIds: data.memberIds.filter(uid => uid !== target), members: data.members.filter(value => value.id !== target) });
      return {};
    }
    const share = shares.doc(input.promptId);
    const current = (await tx.get(share)).data();
    if (input.action === 'unshare') {
      if (current && !owner && current.authorId !== member.id) throw new GroupError(403, 'No puedes retirar este prompt.');
      if (current) tx.delete(share);
      return {};
    }
    const prompt = (await tx.get(db.collection('prompts').doc(input.promptId))).data();
    if (!prompt || prompt.userId !== member.id || typeof prompt.title !== 'string' || typeof prompt.promptText !== 'string') {
      throw new GroupError(404, 'Solo puedes compartir prompts de tu biblioteca.');
    }
    if (prompt.title.length > 200 || prompt.promptText.length > 30_000) throw new GroupError(400, 'El prompt supera el tamaño permitido.');
    if (!current && (await tx.get(shares.limit(50))).size >= 50) throw new GroupError(409, 'Este grupo ya tiene 50 prompts.');
    tx.set(share, { title: prompt.title, promptText: prompt.promptText, authorId: member.id, authorName: member.name });
    return {};
  });
}
