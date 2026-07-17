import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// v42.2 INSTITUTIONAL LAZY FIREBASE ADMIN
// Optimized for Vercel & Institutional Reliability

let initialized = false;

function ensureInitialized() {
  if (initialized) return admin;
  if (admin.apps.length > 0) {
    initialized = true;
    return admin;
  }

  try {
     const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
     let serviceAccountData: any = null;
     
     // Choice A: Official Environment Variable (Vercel/Render)
     if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
           serviceAccountData = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
           if (serviceAccountData.private_key) {
              serviceAccountData.private_key = serviceAccountData.private_key.replace(/\\n/g, '\n');
           }
        } catch (e) {
           console.error("[Firebase] Error parsing FIREBASE_SERVICE_ACCOUNT env var. Ensure it is valid JSON.");
        }
     } 
     
     // Choice B: Institutional Private Key File (Local/Dedicated)
     if (!serviceAccountData) {
        const filePath = join(process.cwd(), "firebase-service-account.json");
        if (existsSync(filePath)) {
           try {
              serviceAccountData = JSON.parse(readFileSync(filePath, "utf8"));
           } catch (e) {
              console.error("[Firebase] Error reading firebase-service-account.json. Ensure it is valid JSON.");
           }
        }
     }
     
     if (serviceAccountData) {
        console.log(`[Firebase] SUCCESS: Initializing with Service Account: ${serviceAccountData.project_id}`);
        admin.initializeApp({
           credential: admin.credential.cert(serviceAccountData),
           projectId: serviceAccountData.project_id || projectId,
        });
        initialized = true;
     } else if (projectId && projectId !== "YOUR_PROJECT_ID") {
        console.warn("[Firebase] WARNING: No Service Account detected. Google token verification WILL fail on localhost.");
        console.log(`[Firebase] Falling back to Project ID only: ${projectId}`);
        admin.initializeApp({
           projectId,
        });
        initialized = true;
     } else {
        console.error("[Firebase] CRITICAL ERROR: No Credentials found for Cloud Bridge.");
     }
  } catch (error) {
     console.error("[Firebase] Fatal Init Error:", error);
  }
  return admin;
}

export const firebaseAdmin = {
  auth: () => ensureInitialized().auth(),
  firestore: () => ensureInitialized().firestore(),
  messaging: () => ensureInitialized().messaging(),
};

export const firestore = {
  collection: (path: string) => firebaseAdmin.firestore().collection(path)
} as any;

export async function syncUserToFirestore(localUser: any) {
  try {
     const docRef = firestore.collection("users").doc(localUser.id);
     await docRef.set({
       ...localUser,
       lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
     }, { merge: true });
     console.log(`[Firestore Sync] User ${localUser.email} archived to cloud`);
  } catch (error) {
     console.error("[Firestore Sync] Failed to mirror user to cloud:", error);
  }
}

export default admin;
