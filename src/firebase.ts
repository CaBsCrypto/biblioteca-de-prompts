import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';

// Initialize Firebase App
const useEmulators = import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === 'true';
const pilotSettings = import.meta.env.VITE_BIBLIOTECA_PILOT_FIREBASE_CONFIG;
const webConfig = pilotSettings ? JSON.parse(pilotSettings) as typeof firebaseConfig : firebaseConfig;
if (pilotSettings && (!webConfig.projectId || webConfig.projectId === firebaseConfig.projectId
  || !webConfig.apiKey || !webConfig.authDomain)) {
  throw new Error('Configura un proyecto Firebase independiente para el piloto.');
}
const app = initializeApp(useEmulators ? { ...firebaseConfig, projectId: 'demo-biblioteca', apiKey: 'demo-key', authDomain: 'localhost' } : webConfig);

// CRITICAL: Initialize Firestore using the designated database ID from config
export const db = getFirestore(app, useEmulators ? '(default)' : webConfig.firestoreDatabaseId || '(default)');
// Preview private writes stay isolated. Public browsing uses the published catalog.
export const publicCatalogDb = !useEmulators && pilotSettings && (import.meta.env.VITE_BIBLIOTECA_LIBRARY_BETA_ENABLED === 'true'
  || import.meta.env.VITE_BIBLIOTECA_LIBRARY_COMMERCIAL_ENABLED === 'true')
  ? getFirestore(initializeApp(firebaseConfig, 'biblioteca-catalog-web'), firebaseConfig.firestoreDatabaseId || '(default)')
  : db;
export const auth = getAuth(app);
if (useEmulators) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099');
}

// Authentication Provider (Google)
export const googleProvider = new GoogleAuthProvider();

// Error handler required by the firebase-integration skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Payload: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Function to test connection as required by rules
export async function testConnection() {
  try {
    const { doc, getDocFromServer } = await import('firebase/firestore');
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or connection.");
    }
  }
}
testConnection();
