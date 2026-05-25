import { auth } from '../firebase';
import { OperationType, FirestoreErrorInfo } from '../types';

export function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'ইমেইলটি ইতিমধ্যে ব্যবহৃত হচ্ছে।';
    case 'auth/invalid-email':
      return 'অকার্যকর ইমেইল ঠিকানা।';
    case 'auth/weak-password':
      return 'পাসওয়ার্ডটি খুব দুর্বল।';
    case 'auth/user-not-found':
      return 'এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি।';
    case 'auth/wrong-password':
      return 'ভুল পাসওয়ার্ড।';
    case 'auth/too-many-requests':
      return 'অনেক বেশি চেষ্টা করা হয়েছে। পরে আবার চেষ্টা করুন।';
    case 'auth/network-request-failed':
      return 'নেটওয়ার্ক সংযোগ ত্রুটি।';
    case 'auth/invalid-credential':
      return 'ইমেল বা পাসওয়ার্ড সঠিক নয়।';
    default:
      return 'কিছু ভুল হয়েছে। পরে আবার চেষ্টা করুন।';
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || '',
      email: auth.currentUser?.email || '',
      emailVerified: auth.currentUser?.emailVerified || false,
      isAnonymous: auth.currentUser?.isAnonymous || false,
      tenantId: auth.currentUser?.tenantId || '',
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName || '',
        email: provider.email || '',
        photoUrl: provider.photoURL || ''
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
