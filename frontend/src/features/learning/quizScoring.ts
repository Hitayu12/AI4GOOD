import { ApiError, Quiz, QuizAttemptRequest, QuizAttemptResponse, QuestionFeedback } from '../../api/types';

export interface ServerQuizKey {
  answerKey: Record<string, string>;
  explanations: Record<string, string>;
}

/**
 * Pure scoring function evaluating a quiz attempt against server-side answer keys.
 * Validates that every question in the quiz is answered exactly once:
 * - Rejects missing answers
 * - Rejects duplicate answers
 * - Rejects unknown questions
 * - Rejects unknown options
 * - Validates quiz version
 *
 * Scoring rule: Pass at 80% or above (score_pct >= 80.00).
 */
export function evaluateQuizAttempt(
  quiz: Quiz,
  attempt: QuizAttemptRequest,
  serverKey: ServerQuizKey,
  options?: { attemptId?: string }
): QuizAttemptResponse {
  if (!quiz) {
    throw new ApiError(400, 'INVALID_QUIZ', 'Quiz definition is required');
  }

  if (!attempt || !Array.isArray(attempt.answers)) {
    throw new ApiError(400, 'INVALID_ATTEMPT', 'Quiz attempt answers array is required', 'answers');
  }

  if (attempt.quiz_version !== quiz.version) {
    throw new ApiError(
      400,
      'QUIZ_VERSION_MISMATCH',
      `Quiz version mismatch: expected ${quiz.version}, received ${attempt.quiz_version}`,
      'quiz_version'
    );
  }

  const questionMap = new Map(quiz.questions.map((q) => [q.id, q]));
  const seenQuestionIds = new Set<string>();

  // Validate each submitted answer
  for (const answer of attempt.answers) {
    if (!answer || typeof answer.question_id !== 'string') {
      throw new ApiError(400, 'INVALID_ANSWER', 'Each answer must specify a valid question_id');
    }

    const question = questionMap.get(answer.question_id);
    if (!question) {
      throw new ApiError(
        400,
        'UNKNOWN_QUESTION',
        `Unknown question ID: "${answer.question_id}"`,
        'question_id'
      );
    }

    if (seenQuestionIds.has(answer.question_id)) {
      throw new ApiError(
        400,
        'DUPLICATE_ANSWER',
        `Duplicate answer provided for question ID: "${answer.question_id}"`,
        'question_id'
      );
    }
    seenQuestionIds.add(answer.question_id);

    const validOption = question.options.some((opt) => opt.id === answer.option_id);
    if (!validOption) {
      throw new ApiError(
        400,
        'UNKNOWN_OPTION',
        `Unknown option ID "${answer.option_id}" for question "${answer.question_id}"`,
        'option_id'
      );
    }
  }

  // Validate that every question in the quiz was answered
  for (const question of quiz.questions) {
    if (!seenQuestionIds.has(question.id)) {
      throw new ApiError(
        400,
        'MISSING_ANSWER',
        `Missing answer for required question ID: "${question.id}"`,
        'answers'
      );
    }
  }

  // Score answers
  const total = quiz.questions.length;
  let correct = 0;
  const feedback: QuestionFeedback[] = [];

  for (const question of quiz.questions) {
    const answer = attempt.answers.find((a) => a.question_id === question.id)!;
    const expectedOptionId = serverKey.answerKey[question.id];
    const isCorrect = answer.option_id === expectedOptionId;

    if (isCorrect) {
      correct += 1;
    }

    const explanation =
      serverKey.explanations[question.id] ||
      (isCorrect ? 'Correct answer.' : 'Incorrect answer.');

    feedback.push({
      question_id: question.id,
      correct: isCorrect,
      explanation,
    });
  }

  const scoreNum = total > 0 ? (correct / total) * 100 : 0;
  const score_pct = (Math.round(scoreNum * 100) / 100).toFixed(2);
  const passed = parseFloat(score_pct) >= 80.0;
  const attempt_id =
    options?.attemptId ||
    `att_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  return {
    attempt_id,
    correct,
    total,
    score_pct,
    passed,
    feedback,
  };
}
