import { describe, it, expect } from 'vitest';
import { LESSONS, LESSON_SUMMARIES } from './lessonDefinitions';
import { QUIZZES } from './quizDefinitions';
import { SERVER_ANSWER_KEYS } from './serverAnswerKeys';

describe('Educational Content & Quiz Definitions Specification', () => {
  const EXPECTED_TOPIC_IDS = [
    'cd-basics',
    'hysa-basics',
    'stock-basics',
    'etf-basics',
    'options-intro',
  ];

  it('contains all 5 contract topics in LESSONS and LESSON_SUMMARIES', () => {
    expect(Object.keys(LESSONS)).toHaveLength(5);
    expect(LESSON_SUMMARIES).toHaveLength(5);

    for (const id of EXPECTED_TOPIC_IDS) {
      expect(LESSONS[id]).toBeDefined();
      const lesson = LESSONS[id];
      expect(lesson.id).toBe(id);
      expect(lesson.version).toBe(1);
      expect(lesson.review_status).toBe('draft');
      expect(lesson.title.length).toBeGreaterThan(0);
      expect(lesson.topic.length).toBeGreaterThan(0);
      expect(lesson.body.length).toBeGreaterThan(100);
      expect(lesson.source_links.length).toBeGreaterThanOrEqual(2);
      expect(lesson.quiz_id).toBe(`quiz-${id}`);
    }
  });

  it('guarantees that public quiz definitions contain NO answer keys or correct markers', () => {
    expect(Object.keys(QUIZZES)).toHaveLength(5);

    for (const quizId of Object.keys(QUIZZES)) {
      const quiz = QUIZZES[quizId];
      expect(quiz.id).toBe(quizId);
      expect(quiz.version).toBe(1);
      expect(EXPECTED_TOPIC_IDS).toContain(quiz.lesson_id);

      // Quiz must have at least 3-4 questions (contract requires >= 3-4)
      expect(quiz.questions.length).toBeGreaterThanOrEqual(4);

      // Deep inspection: ensure no secret answer keys or correct flags are exposed
      const quizJson = JSON.stringify(quiz);
      expect(quizJson).not.toContain('"answerKey"');
      expect(quizJson).not.toContain('"answer_key"');
      expect(quizJson).not.toContain('"correct"');
      expect(quizJson).not.toContain('"isCorrect"');
      expect(quizJson).not.toContain('"is_correct"');

      // Check each question structure
      for (const question of quiz.questions) {
        expect(question.id).toMatch(/^q[1-9]/);
        expect(question.prompt.length).toBeGreaterThan(10);
        expect(question.options.length).toBeGreaterThanOrEqual(3);

        for (const option of question.options) {
          expect(option.id).toMatch(/^opt_[a-z]/);
          expect(option.text.length).toBeGreaterThan(0);
          expect(option).not.toHaveProperty('correct');
          expect(option).not.toHaveProperty('isCorrect');
        }
      }
    }
  });

  it('guarantees that SERVER_ANSWER_KEYS matches public quizzes exactly', () => {
    expect(Object.keys(SERVER_ANSWER_KEYS)).toHaveLength(5);

    for (const quizId of Object.keys(QUIZZES)) {
      expect(SERVER_ANSWER_KEYS[quizId]).toBeDefined();
      const quiz = QUIZZES[quizId];
      const scoringData = SERVER_ANSWER_KEYS[quizId];

      expect(scoringData.answerKey).toBeDefined();
      expect(scoringData.explanations).toBeDefined();

      for (const question of quiz.questions) {
        // Must have an answer key for every question
        const correctOptId = scoringData.answerKey[question.id];
        expect(correctOptId).toBeDefined();

        // Target option must exist in the public question's options list
        const validOptionIds = question.options.map((o) => o.id);
        expect(validOptionIds).toContain(correctOptId);

        // Must have a non-trivial pedagogical explanation
        const explanation = scoringData.explanations[question.id];
        expect(explanation).toBeDefined();
        expect(explanation.length).toBeGreaterThan(20);
      }
    }
  });

  it('explicitly states educational-only status and no execution in options-intro lesson', () => {
    const optionsLesson = LESSONS['options-intro'];
    expect(optionsLesson.title).toContain('Educational Only');
    expect(optionsLesson.body.toLowerCase()).toContain('educational');
    expect(optionsLesson.body.toLowerCase()).toContain('not supported');
    expect(optionsLesson.body.toLowerCase()).toContain('trading engine');
  });
});
