import { describe, it, expect } from 'vitest';
import { evaluateQuizAttempt, ServerQuizKey } from './quizScoring';
import { Quiz, QuizAttemptRequest } from '../../api/types';

describe('quizScoring - evaluateQuizAttempt', () => {
  const sampleQuiz: Quiz = {
    id: 'sample-quiz',
    version: 1,
    lesson_id: 'sample-lesson',
    questions: [
      {
        id: 'q1',
        prompt: 'Question 1 prompt',
        options: [
          { id: 'opt_1a', text: 'Option 1A' },
          { id: 'opt_1b', text: 'Option 1B' },
        ],
      },
      {
        id: 'q2',
        prompt: 'Question 2 prompt',
        options: [
          { id: 'opt_2a', text: 'Option 2A' },
          { id: 'opt_2b', text: 'Option 2B' },
        ],
      },
      {
        id: 'q3',
        prompt: 'Question 3 prompt',
        options: [
          { id: 'opt_3a', text: 'Option 3A' },
          { id: 'opt_3b', text: 'Option 3B' },
        ],
      },
      {
        id: 'q4',
        prompt: 'Question 4 prompt',
        options: [
          { id: 'opt_4a', text: 'Option 4A' },
          { id: 'opt_4b', text: 'Option 4B' },
        ],
      },
      {
        id: 'q5',
        prompt: 'Question 5 prompt',
        options: [
          { id: 'opt_5a', text: 'Option 5A' },
          { id: 'opt_5b', text: 'Option 5B' },
        ],
      },
    ],
  };

  const sampleServerKey: ServerQuizKey = {
    answerKey: {
      q1: 'opt_1a',
      q2: 'opt_2a',
      q3: 'opt_3a',
      q4: 'opt_4a',
      q5: 'opt_5a',
    },
    explanations: {
      q1: 'Explanation for Q1.',
      q2: 'Explanation for Q2.',
      q3: 'Explanation for Q3.',
      q4: 'Explanation for Q4.',
      q5: 'Explanation for Q5.',
    },
  };

  it('scores 100% (5/5) and marks attempt as passed', () => {
    const attempt: QuizAttemptRequest = {
      quiz_version: 1,
      answers: [
        { question_id: 'q1', option_id: 'opt_1a' },
        { question_id: 'q2', option_id: 'opt_2a' },
        { question_id: 'q3', option_id: 'opt_3a' },
        { question_id: 'q4', option_id: 'opt_4a' },
        { question_id: 'q5', option_id: 'opt_5a' },
      ],
    };

    const result = evaluateQuizAttempt(sampleQuiz, attempt, sampleServerKey, { attemptId: 'att_test_100' });
    expect(result.attempt_id).toBe('att_test_100');
    expect(result.correct).toBe(5);
    expect(result.total).toBe(5);
    expect(result.score_pct).toBe('100.00');
    expect(result.passed).toBe(true);
    expect(result.feedback).toHaveLength(5);
    expect(result.feedback.every((f) => f.correct)).toBe(true);
  });

  it('passes exactly at the 80.00% threshold (4/5 correct)', () => {
    const attempt: QuizAttemptRequest = {
      quiz_version: 1,
      answers: [
        { question_id: 'q1', option_id: 'opt_1a' },
        { question_id: 'q2', option_id: 'opt_2a' },
        { question_id: 'q3', option_id: 'opt_3a' },
        { question_id: 'q4', option_id: 'opt_4a' },
        { question_id: 'q5', option_id: 'opt_5b' }, // incorrect
      ],
    };

    const result = evaluateQuizAttempt(sampleQuiz, attempt, sampleServerKey);
    expect(result.correct).toBe(4);
    expect(result.total).toBe(5);
    expect(result.score_pct).toBe('80.00');
    expect(result.passed).toBe(true);
    expect(result.feedback[4].correct).toBe(false);
    expect(result.feedback[4].explanation).toBe('Explanation for Q5.');
  });

  it('fails below the 80.00% threshold (3/5 correct = 60.00%)', () => {
    const attempt: QuizAttemptRequest = {
      quiz_version: 1,
      answers: [
        { question_id: 'q1', option_id: 'opt_1a' },
        { question_id: 'q2', option_id: 'opt_2a' },
        { question_id: 'q3', option_id: 'opt_3a' },
        { question_id: 'q4', option_id: 'opt_4b' }, // incorrect
        { question_id: 'q5', option_id: 'opt_5b' }, // incorrect
      ],
    };

    const result = evaluateQuizAttempt(sampleQuiz, attempt, sampleServerKey);
    expect(result.correct).toBe(3);
    expect(result.total).toBe(5);
    expect(result.score_pct).toBe('60.00');
    expect(result.passed).toBe(false);
  });

  it('rejects attempt when quiz version does not match', () => {
    const attempt: QuizAttemptRequest = {
      quiz_version: 2,
      answers: [
        { question_id: 'q1', option_id: 'opt_1a' },
        { question_id: 'q2', option_id: 'opt_2a' },
        { question_id: 'q3', option_id: 'opt_3a' },
        { question_id: 'q4', option_id: 'opt_4a' },
        { question_id: 'q5', option_id: 'opt_5a' },
      ],
    };

    expect(() => evaluateQuizAttempt(sampleQuiz, attempt, sampleServerKey)).toThrowError(
      /Quiz version mismatch/i
    );
  });

  it('rejects attempt with missing answers', () => {
    const attempt: QuizAttemptRequest = {
      quiz_version: 1,
      answers: [
        { question_id: 'q1', option_id: 'opt_1a' },
        { question_id: 'q2', option_id: 'opt_2a' },
        // q3, q4, q5 missing
      ],
    };

    expect(() => evaluateQuizAttempt(sampleQuiz, attempt, sampleServerKey)).toThrowError(
      /Missing answer for required question ID/i
    );
  });

  it('rejects attempt with duplicate answers for the same question', () => {
    const attempt: QuizAttemptRequest = {
      quiz_version: 1,
      answers: [
        { question_id: 'q1', option_id: 'opt_1a' },
        { question_id: 'q1', option_id: 'opt_1b' }, // duplicate
        { question_id: 'q2', option_id: 'opt_2a' },
        { question_id: 'q3', option_id: 'opt_3a' },
        { question_id: 'q4', option_id: 'opt_4a' },
        { question_id: 'q5', option_id: 'opt_5a' },
      ],
    };

    expect(() => evaluateQuizAttempt(sampleQuiz, attempt, sampleServerKey)).toThrowError(
      /Duplicate answer provided/i
    );
  });

  it('rejects attempt with an unknown question ID', () => {
    const attempt: QuizAttemptRequest = {
      quiz_version: 1,
      answers: [
        { question_id: 'q1', option_id: 'opt_1a' },
        { question_id: 'unknown_question', option_id: 'opt_1a' },
        { question_id: 'q2', option_id: 'opt_2a' },
        { question_id: 'q3', option_id: 'opt_3a' },
        { question_id: 'q4', option_id: 'opt_4a' },
        { question_id: 'q5', option_id: 'opt_5a' },
      ],
    };

    expect(() => evaluateQuizAttempt(sampleQuiz, attempt, sampleServerKey)).toThrowError(
      /Unknown question ID/i
    );
  });

  it('rejects attempt with an unknown option ID for a question', () => {
    const attempt: QuizAttemptRequest = {
      quiz_version: 1,
      answers: [
        { question_id: 'q1', option_id: 'invalid_option' },
        { question_id: 'q2', option_id: 'opt_2a' },
        { question_id: 'q3', option_id: 'opt_3a' },
        { question_id: 'q4', option_id: 'opt_4a' },
        { question_id: 'q5', option_id: 'opt_5a' },
      ],
    };

    expect(() => evaluateQuizAttempt(sampleQuiz, attempt, sampleServerKey)).toThrowError(
      /Unknown option ID/i
    );
  });
});
