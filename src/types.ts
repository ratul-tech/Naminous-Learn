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
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    tenantId: string | null;
    providerInfo: {
      providerId: string;
      displayName: string;
      email: string;
      photoUrl: string;
    }[];
  }
}

export type UserRole = 'student' | 'admin';
export type Gender = 'Male' | 'Female' | 'Other';
export type Group = 'Science' | 'Commerce' | 'Arts';
export type Category = 'Board' | 'College Admission';
export type EventStatus = 'upcoming' | 'ongoing' | 'completed';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  gender?: Gender;
  phone?: string;
  class?: string;
  school?: string;
  group?: Group;
  role: UserRole;
  createdAt: string;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  category: Category;
  subCategory?: string;
  board?: string;
  college?: string;
  createdAt: string;
}

export interface ExamResult {
  id: string;
  uid: string;
  displayName: string;
  school: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
  type: 'Practice' | 'Event';
  eventId?: string;
  createdAt: string;
}

export interface ExamEvent {
  id: string;
  title: string;
  description: string;
  entryFee: number;
  startTime: string;
  duration: number;
  maxCandidates: number;
  prize: string;
  status: EventStatus;
  createdAt: string;
}

export interface Payment {
  id: string;
  uid: string;
  eventId: string;
  method: string;
  trxId: string;
  status: PaymentStatus;
  createdAt: string;
}

export interface Feedback {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  type: 'Suggestion' | 'Issue';
  message: string;
  createdAt: string;
}
