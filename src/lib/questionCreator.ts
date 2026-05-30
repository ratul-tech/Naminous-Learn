import { collection, addDoc, doc, setDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { Question, Category } from '../types';

export interface CreateMCQInput {
  text: string;
  options: string[];
  correctAnswer: number;
  category: Category;
  subject?: string;
  class?: string;
  board?: string;
  college?: string;
  imageUrl?: string;
  subCategory?: string;
}

/**
 * Programmatically creates a Multiple Choice Question (MCQ) in Firestore
 * and increments the global stats questions counter.
 *
 * @param input The parameters defining the MCQ text, options, correct answer, and metadata.
 * @returns The newly created Question object containing its Firestore auto-generated ID.
 */
export async function createMultipleChoiceQuestion(input: CreateMCQInput): Promise<Question> {
  // Validate input parameters for safety
  if (!input.text || typeof input.text !== 'string' || input.text.trim() === '') {
    throw new Error('Question text is required and must be a non-empty string.');
  }

  if (!Array.isArray(input.options) || input.options.length < 2) {
    throw new Error('Options must be an array with at least 2 choice strings.');
  }

  const trimmedOptions: string[] = [];
  for (let i = 0; i < input.options.length; i++) {
    const opt = input.options[i];
    if (typeof opt !== 'string' || opt.trim() === '') {
      throw new Error(`Option choice at index ${i} must be a non-empty string.`);
    }
    trimmedOptions.push(opt.trim());
  }

  if (
    typeof input.correctAnswer !== 'number' ||
    input.correctAnswer < 0 ||
    input.correctAnswer >= input.options.length
  ) {
    throw new Error(
      `correctAnswer index must be a valid number between 0 and ${input.options.length - 1} representing the options array indices.`
    );
  }

  // Construct standard Question data object matching database schema
  const qData = {
    text: input.text.trim(),
    options: trimmedOptions,
    correctAnswer: input.correctAnswer,
    category: input.category || 'Board',
    subject: input.subject || 'Bangla Second Paper',
    class: input.class || 'SSC Candidate',
    board: input.board || 'Dhaka',
    college: input.college || 'NDC',
    imageUrl: input.imageUrl ? input.imageUrl.trim() : '',
    subCategory: input.subCategory || '',
    createdAt: new Date().toISOString(),
  };

  try {
    // 1. Add document to Firestore 'questions' collection
    const docRef = await addDoc(collection(db, 'questions'), qData);

    // 2. Increment global statistics question counter
    try {
      await setDoc(
        doc(db, 'global_stats', 'counters'),
        { questionsCount: increment(1) },
        { merge: true }
      );
    } catch (statsError) {
      console.warn('Failed to update global question counters, continuing.', statsError);
    }

    // 3. Return the fully formed Question object
    return {
      id: docRef.id,
      ...qData,
    };
  } catch (error) {
    console.error('Error in createMultipleChoiceQuestion:', error);
    throw error;
  }
}
