import { Firestore } from '@google-cloud/firestore';
import { getVercelOidcToken } from '@vercel/oidc';
import { GoogleAuth, IdentityPoolClient } from 'google-auth-library';
import type { Credential } from 'firebase-admin/app';

export function configurePilotFirebase(productionProject: string) {
  const projectId = process.env.BIBLIOTECA_PILOT_FIREBASE_PROJECT_ID?.trim();
  const audience = process.env.BIBLIOTECA_PILOT_GCP_AUDIENCE?.trim();
  const account = process.env.BIBLIOTECA_PILOT_GCP_SERVICE_ACCOUNT?.trim();
  if (process.env.VERCEL_ENV !== 'preview' || !projectId || projectId === productionProject
    || !audience || !/^\/\/iam\.googleapis\.com\/projects\/\d+\/locations\/global\/workloadIdentityPools\/[\w-]+\/providers\/[\w-]+$/.test(audience)
    || !account || !account.endsWith(`@${projectId}.iam.gserviceaccount.com`)) {
    throw new Error('El piloto requiere una identidad federada y un proyecto Firebase distinto de producción.');
  }

  const identity = new IdentityPoolClient({
    type: 'external_account',
    audience,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    token_url: 'https://sts.googleapis.com/v1/token',
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${account}:generateAccessToken`,
    subject_token_supplier: {
      getSubjectToken: () => getVercelOidcToken({ audience: `https:${audience}` }),
    },
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const credential: Credential = {
    async getAccessToken() {
      const { token } = await identity.getAccessToken();
      const expires = identity.credentials.expiry_date;
      if (!token || !expires || expires <= Date.now()) throw new Error('La identidad del piloto no devolvió un token vigente.');
      return { access_token: token, expires_in: Math.max(1, Math.floor((expires - Date.now()) / 1000)) };
    },
  };
  // Firestore 7's transport expects the enumerable auth headers from google-auth-library 9.
  const auth = new GoogleAuth({ authClient: identity, projectId });
  return { projectId, credential, db: new Firestore({ projectId, databaseId: '(default)', auth }) };
}
