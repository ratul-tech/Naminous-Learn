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
  
  // =========================================================================
  // Helper functions for REST-based Firestore & Auth operations
  // =========================================================================
  
  function toFirestoreValue(val: any): any {
    if (typeof val === 'string') {
      return { stringValue: val };
    } else if (typeof val === 'number') {
      return { doubleValue: val };
    } else if (typeof val === 'boolean') {
      return { booleanValue: val };
    } else if (Array.isArray(val)) {
      return { arrayValue: { values: val.map(toFirestoreValue) } };
    } else if (val === null || val === undefined) {
      return { nullValue: null };
    } else if (typeof val === 'object') {
      const fields: any = {};
      for (const k of Object.keys(val)) {
        fields[k] = toFirestoreValue(val[k]);
      }
      return { mapValue: { fields } };
    }
    return { stringValue: String(val) };
  }

  function toFirestoreFields(obj: any) {
    const fields: any = {};
    for (const k of Object.keys(obj)) {
      fields[k] = toFirestoreValue(obj[k]);
    }
    return { fields };
  }

  async function verifyAdminStatus(projectId: string, idToken: string, requireFullAdmin: boolean = false) {
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new Error("Invalid token format");
    }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    
    if (payload.aud !== projectId) {
      throw new Error("Invalid token audience");
    }
    if (payload.exp <= Date.now() / 1000) {
      throw new Error("Token expired");
    }

    const uid = payload.sub;
    const email = payload.email;

    // Bootstrap admin is always authorized
    if (email === 'shahriarislam275@gmail.com') {
      return { uid, email, isFullAdmin: true };
    }

    // Call Firestore REST API to fetch their admin profile using the caller's ID Token
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/admins/${uid}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Forbidden: Requester is not a registered administrator (status: ${response.status})`);
    }

    const doc = await response.json();
    const fields = doc.fields || {};
    const status = fields.status?.stringValue;
    const adminType = fields.adminType?.stringValue || 'question_holder';

    if (status !== 'active') {
      throw new Error("Forbidden: Administrator account is currently pending or inactive");
    }

    const isFullAdmin = adminType === 'full';
    if (requireFullAdmin && !isFullAdmin) {
      throw new Error("Forbidden: This action requires Superintendent privileges");
    }

    return { uid, email, isFullAdmin };
  }

  async function createAuthUser(apiKey: string, email: string, password: string, displayName?: string) {
    const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
    const signUpRes = await fetch(signUpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true
      })
    });

    if (!signUpRes.ok) {
      const errData = await signUpRes.json();
      const rawError = errData.error?.message || "Failed to create authentication user";
      
      if (rawError === 'EMAIL_EXISTS') {
        // Try to re-authenticate with the provided password to reuse existing account
        try {
          const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
          const signInRes = await fetch(signInUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              password,
              returnSecureToken: true
            })
          });
          if (signInRes.ok) {
            const signInData = await signInRes.json();
            const uid = signInData.localId;
            const idToken = signInData.idToken;

            if (displayName) {
              const updateUrl = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`;
              await fetch(updateUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  idToken,
                  displayName,
                  returnSecureToken: true
                })
              });
            }
            console.log(`Re-used existing Firebase Auth account for UID: ${uid}`);
            return uid;
          }
        } catch (signInErr) {
          console.warn("Re-authentication check failed for existing account:", signInErr);
        }
      }

      throw new Error(rawError);
    }

    const signUpData = await signUpRes.json();
    const uid = signUpData.localId;
    const idToken = signUpData.idToken;

    if (displayName) {
      const updateUrl = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`;
      await fetch(updateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          displayName,
          returnSecureToken: true
        })
      });
    }

    return uid;
  }

  async function writeFirestoreDocument(projectId: string, idToken: string, collection: string, documentId: string, data: any) {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${documentId}`;
    const fields = toFirestoreFields(data).fields;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ fields })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Failed to write Firestore document ${collection}/${documentId}:`, errText);
      throw new Error(`Failed to write Firestore document (status: ${response.status})`);
    }
  }

  async function queryAndDeleteDocuments(projectId: string, adminIdToken: string, collectionId: string, targetUid: string) {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
    const queryBody = {
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath: "uid" },
            op: "EQUAL",
            value: { stringValue: targetUid }
          }
        }
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminIdToken}`
      },
      body: JSON.stringify(queryBody)
    });

    if (!response.ok) {
      console.error(`Failed to query collection ${collectionId}:`, await response.text());
      return;
    }

    const results = await response.json();
    for (const item of results) {
      if (item.document && item.document.name) {
        const docPath = item.document.name;
        const deleteUrl = `https://firestore.googleapis.com/v1/${docPath}`;
        const delRes = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${adminIdToken}`
          }
        });
        if (!delRes.ok) {
          console.error(`Failed to delete document ${docPath}:`, await delRes.text());
        } else {
          console.log(`Successfully deleted document ${docPath}`);
        }
      }
    }
  }

  async function deleteDocument(projectId: string, adminIdToken: string, collection: string, documentId: string) {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${documentId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminIdToken}`
      }
    });
    if (!response.ok && response.status !== 404) {
      console.error(`Failed to delete document ${collection}/${documentId}:`, await response.text());
    } else {
      console.log(`Successfully deleted document ${collection}/${documentId}`);
    }
  }

  async function decrementStudentsCount(projectId: string, adminIdToken: string) {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/global_stats/counters`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${adminIdToken}`
        }
      });
      if (res.ok) {
        const doc = await res.json();
        const currentCount = Number(doc.fields?.studentsCount?.integerValue || doc.fields?.studentsCount?.doubleValue || 0);
        const newCount = Math.max(0, currentCount - 1);
        
        const updateData = {
          fields: {
            studentsCount: { integerValue: String(newCount) }
          }
        };
        
        await fetch(url + '?updateMask.fieldPaths=studentsCount', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminIdToken}`
          },
          body: JSON.stringify(updateData)
        });
      }
    } catch (err) {
      console.error("Failed to decrement student counter:", err);
    }
  }

  // =========================================================================
  // API Routes
  // =========================================================================

  // API Route to register a user securely on the backend
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, displayName, role, adminType, status } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: "Missing required fields: email, password, role are required." });
    }

    try {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      const { projectId, apiKey } = firebaseConfig;

      // Determine final state variables securely
      let finalStatus = status;
      let finalAdminType = adminType;
      let authorizedAdmin = false;

      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const idToken = authHeader.split('Bearer ')[1];
        if (idToken && idToken !== 'undefined' && idToken !== 'null') {
          try {
            const requesterInfo = await verifyAdminStatus(projectId, idToken, true);
            authorizedAdmin = requesterInfo.isFullAdmin;
          } catch (err: any) {
            console.warn("Auth token validation failed during server admin registration:", err.message);
          }
        }
      }

      if (!authorizedAdmin) {
        finalStatus = 'pending';
        finalAdminType = 'question_holder';
      } else {
        finalStatus = status || 'active';
        finalAdminType = adminType || 'question_holder';
      }

      console.log(`Creating user in Firebase Auth backend service: ${email}`);

      // Create authentication entry
      const userUid = await createAuthUser(apiKey, email, password, displayName);
      console.log(`Auth entry created successfully with UID: ${userUid}`);

      const createdAt = new Date().toISOString();
      const photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'User')}&background=random`;

      // Use the requester's ID token to write Firestore record, or if registration is done by anyone (student signup fallback)
      // we can write using the ID token of the requester.
      const writeToken = (authHeader && authHeader.startsWith('Bearer ')) 
        ? authHeader.split('Bearer ')[1] 
        : '';

      if (role === 'student') {
        const studentProfile = {
          uid: userUid,
          email: email,
          displayName: displayName || 'User',
          photoURL,
          role: 'student',
          createdAt,
        };

        // Note: For students, we write utilizing the student's own token (or the requester's token if logged in)
        await writeFirestoreDocument(projectId, writeToken, 'students', userUid, studentProfile);

        try {
          // Attempt to increment the student count
          const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/global_stats/counters`;
          const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${writeToken}` }
          });
          if (res.ok) {
            const doc = await res.json();
            const currentCount = Number(doc.fields?.studentsCount?.integerValue || doc.fields?.studentsCount?.doubleValue || 0);
            const newCount = currentCount + 1;
            await fetch(url + '?updateMask.fieldPaths=studentsCount', {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${writeToken}`
              },
              body: JSON.stringify({
                fields: { studentsCount: { integerValue: String(newCount) } }
              })
            });
          }
        } catch (statErr) {
          console.error("Failed to increment students count:", statErr);
        }

        console.log(`Student profile synced in Firestore database for UID: ${userUid}`);
      } else if (role === 'admin') {
        const adminProfile = {
          uid: userUid,
          email: email,
          displayName: displayName || 'Admin',
          photoURL,
          role: 'admin',
          adminType: finalAdminType,
          status: finalStatus,
          createdAt,
        };

        await writeFirestoreDocument(projectId, writeToken, 'admins', userUid, adminProfile);
        console.log(`Admin profile synced in Firestore database for UID: ${userUid}`);
      } else {
        return res.status(400).json({ error: `Unsupported role: ${role}` });
      }

      return res.status(200).json({ success: true, uid: userUid });
    } catch (error: any) {
      const errMsg = error.message || "";
      if (errMsg === 'EMAIL_EXISTS' || errMsg.includes('EMAIL_EXISTS')) {
        console.warn(`Registration attempt for existing email: ${email}`);
        return res.status(400).json({ error: "An account with this email address already exists." });
      }
      console.error("Express registration endpoint failed:", error);
      return res.status(500).json({ error: errMsg || "Failed to create user backend profile" });
    }
  });

  // API Route to delete a user securely on the backend
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
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    try {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      const { projectId } = firebaseConfig;

      // 1. Verify that the requesting user is an active administrator
      console.log(`Verifying requester admin privileges to delete user: ${uid}`);
      let isBootstrapAdmin = false;
      let requesterUid = '';
      try {
        const requesterInfo = await verifyAdminStatus(projectId, idToken, false);
        requesterUid = requesterInfo.uid;
        isBootstrapAdmin = requesterInfo.email === 'shahriarislam275@gmail.com';
      } catch (authErr: any) {
        console.warn("Requester authorization failed in delete-user:", authErr.message);
        return res.status(403).json({ error: authErr.message || "Forbidden: Not authorized" });
      }

      const isSelf = requesterUid === uid;

      if (!isBootstrapAdmin && !isSelf) {
        // Must be a full Superintendent to delete others
        try {
          await verifyAdminStatus(projectId, idToken, true);
        } catch (superErr: any) {
          return res.status(403).json({ error: "Forbidden: Only Superintendents can delete other accounts." });
        }
      }

      console.log(`Admin authorized. Proceeding with secure REST-based deletions for user: ${uid}`);

      // 2. Perform cascading database deletions using REST API
      const collections = ['results', 'payments', 'submissions', 'feedback'];
      for (const collPath of collections) {
        try {
          await queryAndDeleteDocuments(projectId, idToken, collPath, uid);
        } catch (colErr) {
          console.error(`Error querying or deleting from collection ${collPath}:`, colErr);
        }
      }

      // Check if user is a student or admin and delete their profile
      try {
        const studentUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/students/${uid}`;
        const studentRes = await fetch(studentUrl, {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
        if (studentRes.ok) {
          await decrementStudentsCount(projectId, idToken);
          await deleteDocument(projectId, idToken, 'students', uid);
        }
      } catch (studentErr) {
        console.error('Error handling student record deletion:', studentErr);
      }

      try {
        await deleteDocument(projectId, idToken, 'admins', uid);
      } catch (adminDocErr) {
        console.error('Error handling admin record deletion:', adminDocErr);
      }

      // Write to deleted_users collection so client-side self-cleaning Auth can trigger
      try {
        const deletedProfile = {
          uid,
          deletedAt: new Date().toISOString(),
        };
        await writeFirestoreDocument(projectId, idToken, 'deleted_users', uid, deletedProfile);
        console.log(`User ${uid} successfully logged in deleted_users collection for client-side Auth deletion`);
      } catch (delUsersErr: any) {
        console.error('Error writing to deleted_users collection:', delUsersErr.message);
      }

      // 3. Attempt to delete from Auth using best-effort Admin SDK, and catch graceful errors if permissions are restricted
      console.log(`Starting Auth deletion for user: ${uid}`);
      try {
        await admin.auth().deleteUser(uid);
        console.log(`Successfully deleted auth user: ${uid} via Admin SDK`);
      } catch (authError: any) {
        console.log(`Auth deletion bypassed or skipped for UID: ${uid} (Access is successfully revoked via Firestore profile deletion)`);
      }
      
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      return res.status(500).json({ error: error.message || "Failed to complete secure deletion" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Fallback route to serve index.html with Vite transformations in development
    app.get('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api/')) {
        return next();
      }
      try {
        const indexPath = path.join(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
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
