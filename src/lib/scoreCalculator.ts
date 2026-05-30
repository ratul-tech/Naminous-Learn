/**
 * System utility for calculating quiz/exam scores and formatting the output in Bengali.
 */

export interface QuizScoreInput {
  marksPerRight: number;
  negativeMarksPerWrong: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
}

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/**
 * Converts English digit strings/numbers to Bengali digit strings.
 * e.g., 6 to ৬, 3.50 to ৩.৫০, -1.25 to -১.২৫
 */
export function toBengaliNumber(val: number | string): string {
  const str = typeof val === 'number' ? val.toString() : val;
  return str.replace(/[0-9]/g, (digit) => BENGALI_DIGITS[parseInt(digit, 10)]);
}

/**
 * Score calculation and formatting in Bengali structure.
 * Expected Output Format:
 * [Total] টায় [Wrong] টা ভুল [Correct] টা সঠিক
 * Score : [Calculated_Score]
 */
export function calculateQuizScoreBengali(input: QuizScoreInput): string {
  const {
    marksPerRight,
    negativeMarksPerWrong,
    totalQuestions,
    correctAnswers,
    wrongAnswers
  } = input;

  // Handles both positive/negative inputs for negative penalty per wrong answer gracefully
  const penalty = negativeMarksPerWrong < 0 ? negativeMarksPerWrong : -negativeMarksPerWrong;
  const score = (correctAnswers * marksPerRight) + (wrongAnswers * penalty);

  // Convert each part into Bengali digit representation
  const formattedTotal = toBengaliNumber(totalQuestions);
  const formattedWrong = toBengaliNumber(wrongAnswers);
  const formattedCorrect = toBengaliNumber(correctAnswers);
  
  // Format score with exactly 2 decimal places and then to Bengali digits
  const formattedScore = toBengaliNumber(score.toFixed(2));

  // Output must match structure exactly:
  // [Total] টায় [Wrong] টা ভুল [Correct] টা সঠিক
  // Score : [Calculated_Score]
  return `${formattedTotal} টায় ${formattedWrong} টা ভুল ${formattedCorrect} টা সঠিক\nScore : ${formattedScore}`;
}
