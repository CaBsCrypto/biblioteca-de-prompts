import { afterEach, expect, it, vi } from 'vitest';
import { IdentityPoolClient } from 'google-auth-library';
import { configurePilotFirebase } from '../src/services/server/pilotFirebase';

const issuerAudience = '//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/pilot/providers/vercel';
const prod = 'biblioteca-production';
function fixture(project = 'biblioteca-pilot') {
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('BIBLIOTECA_PILOT_FIREBASE_PROJECT_ID', project);
  vi.stubEnv('BIBLIOTECA_PILOT_GCP_AUDIENCE', issuerAudience);
  vi.stubEnv('BIBLIOTECA_PILOT_GCP_SERVICE_ACCOUNT', `backend@${project}.iam.gserviceaccount.com`);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it('rejects the production project and service accounts outside the pilot', () => {
  fixture(prod);
  expect(() => configurePilotFirebase(prod)).toThrow();
  fixture();
  vi.stubEnv('BIBLIOTECA_PILOT_GCP_SERVICE_ACCOUNT', `backend@${prod}.iam.gserviceaccount.com`);
  expect(() => configurePilotFirebase(prod)).toThrow();
});

it('configures isolated Firestore only in Preview without fetching credentials at startup', async () => {
  fixture();
  vi.stubEnv('VERCEL_ENV', 'production');
  expect(() => configurePilotFirebase(prod)).toThrow();
  fixture();
  const pilot = configurePilotFirebase(prod);
  expect(pilot.projectId).toBe('biblioteca-pilot');
  expect(pilot.db.databaseId).toBe('(default)');
  await pilot.db.terminate();
});

it('exposes authorization as an enumerable header for Firestore 7', async () => {
  const identity = new IdentityPoolClient({
    type: 'external_account',
    audience: issuerAudience,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    token_url: 'https://sts.googleapis.com/v1/token',
    subject_token_supplier: { getSubjectToken: async () => 'fixture-subject-token' },
  });
  vi.spyOn(identity, 'getAccessToken').mockResolvedValue({ token: 'fixture-access-token' });
  const headers = Object.entries(await identity.getRequestHeaders());
  expect(headers).toContainEqual(['Authorization', 'Bearer fixture-access-token']);
});
