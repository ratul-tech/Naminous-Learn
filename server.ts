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
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (e) {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    } else {
      admin.initializeApp();
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

    try {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      // Use getFirestore with databaseId
      const db = getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId);
      
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const isBootstrapAdmin = decodedToken.email === 'shahriarislam275@gmail.com' && decodedToken.email_verified;
      
      const adminDoc = await db.collection('admins').doc(decodedToken.uid).get();
      const isActiveAdmin = adminDoc.exists && adminDoc.data()?.status === 'active';
      
      // Allow if bootstrap admin, active admin OR if deleting own account
      if (!isBootstrapAdmin && !isActiveAdmin && decodedToken.uid !== uid) {
        return res.status(403).json({ error: "Forbidden: Not an active admin or not own account" });
      }

      console.log(`Starting deletion for user: ${uid}`);

      // 1. Delete from all user-related Firestore collections
      const collections = ['students', 'admins', 'results', 'payments', 'submissions', 'feedback'];
      const batch = db.batch();
      
      for (const coll of collections) {
        if (coll === 'students' || coll === 'admins') {
          batch.delete(db.collection(coll).doc(uid));
        } else {
          const snapshot = await db.collection(coll).where('uid', '==', uid).get();
          snapshot.docs.forEach(doc => batch.delete(doc.ref));
        }
      }
      
      await batch.commit();
      console.log(`Deleted all Firestore records for user: ${uid}`);

      // 2. Delete from Firebase Auth
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
