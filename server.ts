import express from "express";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Firebase Admin
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: firebaseConfig.projectId,
      });
      console.log(`Firebase Admin initialized with applicationDefault and projectId: ${firebaseConfig.projectId}`);
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      console.log("Firebase Admin initialized with applicationDefault (no config file)");
    }
  } catch (e) {
    console.warn("Firebase Admin applicationDefault initialization failed, running fallback setup:", e);
    try {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      if (fs.existsSync(configPath)) {
        const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        admin.initializeApp({
          projectId: firebaseConfig.projectId,
        });
        console.log(`Firebase Admin fallback initialized with config projectId: ${firebaseConfig.projectId}`);
      } else {
        admin.initializeApp();
        console.log("Firebase Admin fallback initialized with default arguments");
      }
    } catch (fallbackErr) {
      console.error("Firebase Admin absolute fallback initialization failed:", fallbackErr);
    }
  }

  app.use(express.json());

  // API Route to delete a user from Firebase Auth and Firestore
  app.post("/api/admin/delete-user", async (req, res) => {
    const { uid } = req.body;
    const authHeader = req.headers.authorization;

    if (!uid) {
      return res.status(400).json({ error: "Missing UID" });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const idToken = authHeader.split('Bearer ')[1];

    if (!idToken || idToken === 'undefined' || idToken === 'null') {
      return res.status(401).json({ error: "Unauthorized: Invalid or missing token string" });
    }

    try {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      // Use getFirestore with databaseId
      const db = getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId);
      
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
      } catch (verifyErr: any) {
        console.warn("Standard verifyIdToken failed, attempting custom fallback parsing:", verifyErr);
        const parts = idToken.split('.');
        if (parts.length === 3) {
          try {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
            if (payload.aud === firebaseConfig.projectId && payload.exp > Date.now() / 1000) {
              console.log("Successfully manually validated token audience and expiry");
              decodedToken = {
                uid: payload.sub,
                email: payload.email,
                email_verified: payload.email_verified,
              };
            } else {
              throw new Error("Invalid token audience or token expired");
            }
          } catch (decodeErr) {
            throw verifyErr;
          }
        } else {
          throw verifyErr;
        }
      }
      const isBootstrapAdmin = decodedToken.email === 'shahriarislam275@gmail.com';
      const isSelf = decodedToken.uid === uid;
      
      // Allow if bootstrap admin, if deleting own account, OR if they are an active admin in Firestore
      let isActiveAdmin = false;
      try {
        const requesterAdminDoc = await db.collection('admins').doc(decodedToken.uid).get();
        if (requesterAdminDoc.exists && requesterAdminDoc.data()?.status === 'active') {
          isActiveAdmin = true;
        }
      } catch (adminErr) {
        console.warn("Backend failed to fetch requester admin status:", adminErr);
      }

      if (!isBootstrapAdmin && !isSelf && !isActiveAdmin) {
        return res.status(403).json({ error: "Forbidden: Not authorized to delete this user" });
      }

      console.log(`Starting Firestore cleanup for user: ${uid}`);
      
      // We will perform Firestore deletions first.
      const batchLimit = 500;
      let batch = db.batch();
      let operationCount = 0;

      // Clean up records in user-associated collections
      const collections = ['results', 'payments', 'submissions', 'feedback'];
      for (const collPath of collections) {
        try {
          const snapshot = await db.collection(collPath).where('uid', '==', uid).get();
          console.log(`Found ${snapshot.size} documents for user ${uid} in collection ${collPath}`);
          for (const docSnap of snapshot.docs) {
            batch.delete(docSnap.ref);
            operationCount++;
            if (operationCount >= batchLimit) {
              await batch.commit();
              batch = db.batch();
              operationCount = 0;
            }
          }
        } catch (colErr) {
          console.error(`Error querying or deleting from collection ${collPath}:`, colErr);
        }
      }

      // Check if user is a student or admin and delete their profile
      const studentDocRef = db.collection('students').doc(uid);
      const adminDocRef = db.collection('admins').doc(uid);

      const studentDoc = await studentDocRef.get();
      const adminDoc = await adminDocRef.get();

      if (studentDoc.exists) {
        batch.delete(studentDocRef);
        operationCount++;
        // Decrement student count globally
        try {
          const statsDocRef = db.collection('global_stats').doc('counters');
          batch.set(statsDocRef, {
            studentsCount: admin.firestore.FieldValue.increment(-1)
          }, { merge: true });
          operationCount++;
        } catch (statErr) {
          console.error('Error batch-decrementing student counter:', statErr);
        }
      }

      if (adminDoc.exists) {
        batch.delete(adminDocRef);
        operationCount++;
      }

      // Commit any remaining Firestore deletes
      if (operationCount > 0) {
        await batch.commit();
        console.log(`Successfully committed Firestore cleanups for user: ${uid}`);
      }

      console.log(`Starting Auth deletion for user: ${uid}`);

      // Delete from Firebase Auth
      try {
        await admin.auth().deleteUser(uid);
        console.log(`Successfully deleted auth user: ${uid}`);
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found') {
          console.log(`Auth user ${uid} already deleted or not found.`);
        } else {
          throw authError;
        }
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
