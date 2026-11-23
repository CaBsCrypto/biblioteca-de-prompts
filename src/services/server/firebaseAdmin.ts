import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';
import { configurePilotFirebase } from './pilotFirebase';
import { libraryMode } from './libraryMode';

let pilot: ReturnType<typeof configurePilotFirebase> | undefined;

/** The privileged server uses the same project and database as the web app. */
export function getBibliotecaAdmin() {
  const firestoreEmulator = process.env.FIRESTORE_EMULATOR_HOST;
  const authEmulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if ((firestoreEmulator || authEmulator) && (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1')) {
    throw new Error('Los emuladores de Firebase solo están disponibles en desarrollo local.');
  }
  if (Boolean(firestoreEmulator) !== Boolean(authEmulator)) {
    throw new Error('Configura juntos los emuladores de Auth y Firestore.');
  }

  const local = Boolean(firestoreEmulator);
  if (process.env.VERCEL === '1' && !['preview', 'production'].includes(process.env.VERCEL_ENV ?? '')) {
    throw new Error('No se pudo identificar el entorno de Vercel para iniciar Firebase Admin.');
  }
  const preview = process.env.VERCEL_ENV === 'preview';
  if (libraryMode() === 'pilot' && !preview && !local) {
    throw new Error('La biblioteca del piloto requiere un Preview aislado o emuladores locales.');
  }
  if (preview) pilot ??= configurePilotFirebase(firebaseConfig.projectId);
  const projectId = local ? 'demo-biblioteca' : preview ? pilot!.projectId : firebaseConfig.projectId;
  const credentials = process.env.BIBLIOTECA_FIREBASE_ADMIN_CREDENTIALS;
  const name = 'biblioteca-server';
  const app = getApps().find(value => value.name === name) ?? initializeApp({
    projectId,
    ...(local ? {} : { credential: preview ? pilot!.credential : credentials ? cert(JSON.parse(credentials)) : applicationDefault() }),
  }, name);
  return {
    auth: getAuth(app),
    db: preview ? pilot!.db : getFirestore(app, local ? '(default)' : firebaseConfig.firestoreDatabaseId),
  };
}
