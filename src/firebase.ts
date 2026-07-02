import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)')
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize analytics safely (can throw in iframe or sandboxed environments)
try {
  if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
    getAnalytics(app);
  }
} catch (analyticsErr) {
  console.warn("Analytics initialization skipped or failed in this runtime sandbox:", analyticsErr);
}

// Test connection to Firestore
async function testConnection() {
  try {
    // Attempt to fetch a non-existent document to test connection
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    console.log("Firestore connection successful.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Firestore connection failed: The client is offline. Please check your Firebase configuration and internet connection.");
    } else {
      console.warn("Firestore connection test completed with expected error (doc not found), connection is active.");
    }
  }
}

testConnection();
