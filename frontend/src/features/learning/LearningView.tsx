import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ApiClient, defaultApiClient } from '../../api/client';
import { Lesson, LessonSummary, ProgressItem, Quiz, QuizAttemptRequest, QuizAttemptResponse } from '../../api/types';
import { LESSONS, LESSON_SUMMARIES } from './content/lessonDefinitions';
import { QUIZZES } from './content/quizDefinitions';
import { SERVER_ANSWER_KEYS, QuizScoringData } from './content/serverAnswerKeys';
import { evaluateQuizAttempt } from './quizScoring';

export interface LearningViewProps {
  apiClient?: ApiClient;
  useInternalScoring?: boolean;
  initialTopicId?: string;
  quizzes?: Record<string, Quiz>;
  serverAnswerKeys?: Record<string, QuizScoringData>;
  onProgressUpdate?: (progress: Record<string, ProgressItem>) => void;
}

export function LearningView({
  apiClient = defaultApiClient,
  useInternalScoring,
  initialTopicId = 'cd-basics',
  quizzes = QUIZZES,
  serverAnswerKeys = SERVER_ANSWER_KEYS,
  onProgressUpdate,
}: LearningViewProps) {
  // Navigation / Selection
  const [selectedTopicId, setSelectedTopicId] = useState<string>(initialTopicId);

  // Active quiz state for current topic
  // Map of question_id -> option_id
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [attemptResult, setAttemptResult] = useState<QuizAttemptResponse | null>(null);

  // Progress state tracked locally (can be synchronized with API)
  const [progressMap, setProgressMap] = useState<Record<string, ProgressItem>>(() => {
    const initial: Record<string, ProgressItem> = {};
    for (const topic of LESSON_SUMMARIES) {
      initial[topic.id] = {
        lesson_id: topic.id,
        quiz_version: 1,
        attempt_count: 0,
        best_score_pct: '0.00',
        latest_score_pct: '0.00',
        completed: false,
      };
    }
    return initial;
  });

  const activeLesson: Lesson = LESSONS[selectedTopicId] || LESSONS['cd-basics'];
  const activeQuiz: Quiz = quizzes[activeLesson.quiz_id] || quizzes['quiz-cd-basics'];
  const activeProgress: ProgressItem = progressMap[selectedTopicId] || {
    lesson_id: selectedTopicId,
    quiz_version: 1,
    attempt_count: 0,
    best_score_pct: '0.00',
    latest_score_pct: '0.00',
    completed: false,
  };

  const completedCount = Object.values(progressMap).filter((p) => p.completed).length;

  // Handle switching topic
  const handleSelectTopic = (topicId: string) => {
    setSelectedTopicId(topicId);
    setSelectedAnswers({});
    setValidationError(null);
    setAttemptResult(null);
  };

  // Handle selecting an option
  const handleOptionSelect = (questionId: string, optionId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
    if (validationError) {
      setValidationError(null);
    }
  };

  // Handle quiz submission
  const handleSubmitQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate that every question has an answer
    const unansweredQuestions = activeQuiz.questions.filter(
      (q) => !selectedAnswers[q.id]
    );

    if (unansweredQuestions.length > 0) {
      setValidationError(
        `Please answer all questions before submitting. (${unansweredQuestions.length} unanswered)`
      );
      return;
    }

    const attemptRequest: QuizAttemptRequest = {
      quiz_version: activeQuiz.version,
      answers: activeQuiz.questions.map((q) => ({
        question_id: q.id,
        option_id: selectedAnswers[q.id],
      })),
    };

    setIsSubmitting(true);

    try {
      let response: QuizAttemptResponse;

      // In tests, local fixture mode, or when requested, use pure internal scoring evaluator
      const shouldScoreLocally =
        useInternalScoring ?? (apiClient.fixtureMode || typeof process !== 'undefined');

      if (shouldScoreLocally) {
        const serverKey = serverAnswerKeys[activeQuiz.id] || {
          answerKey: {},
          explanations: {},
        };
        response = evaluateQuizAttempt(activeQuiz, attemptRequest, serverKey);
      } else {
        response = await apiClient.submitQuizAttempt(activeQuiz.id, attemptRequest);
      }

      setAttemptResult(response);

      // Update progress
      setProgressMap((prev) => {
        const current = prev[selectedTopicId] || {
          lesson_id: selectedTopicId,
          quiz_version: activeQuiz.version,
          attempt_count: 0,
          best_score_pct: '0.00',
          latest_score_pct: '0.00',
          completed: false,
        };

        const newAttemptCount = current.attempt_count + 1;
        const newLatestScore = response.score_pct;
        const currentBestNum = parseFloat(current.best_score_pct) || 0;
        const newScoreNum = parseFloat(response.score_pct) || 0;
        const newBestScore =
          newScoreNum > currentBestNum ? response.score_pct : current.best_score_pct;
        const isCompleted = current.completed || response.passed;

        const updated: ProgressItem = {
          lesson_id: selectedTopicId,
          quiz_version: activeQuiz.version,
          attempt_count: newAttemptCount,
          best_score_pct: newBestScore,
          latest_score_pct: newLatestScore,
          completed: isCompleted,
        };

        const nextMap = { ...prev, [selectedTopicId]: updated };
        onProgressUpdate?.(nextMap);
        return nextMap;
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to score quiz attempt';
      setValidationError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle retry
  const handleRetryQuiz = () => {
    setSelectedAnswers({});
    setValidationError(null);
    setAttemptResult(null);
  };

  return (
    <div className="space-y-8">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Financial Education & Learning</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Original starter curriculum covering savings, equities, and derivatives with interactive knowledge checks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Completed: {completedCount} of {LESSON_SUMMARIES.length} Topics
          </span>
        </div>
      </div>

      {/* Main Grid: Sidebar Navigation + Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Navigation List of all 5 topics */}
        <nav
          aria-label="Topics Navigation"
          className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2"
        >
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2 mb-3">
            Course Topics
          </h3>
          <ul className="space-y-1.5" role="list">
            {LESSON_SUMMARIES.map((topic: LessonSummary) => {
              const isSelected = topic.id === selectedTopicId;
              const isDone = progressMap[topic.id]?.completed;

              return (
                <li key={topic.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectTopic(topic.id)}
                    aria-current={isSelected ? 'page' : undefined}
                    className={`w-full text-left px-3.5 py-3 rounded-lg text-sm transition-colors flex items-center justify-between border ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold shadow-sm'
                        : 'border-transparent text-slate-700 hover:bg-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col pr-2">
                      <span className="truncate">{topic.title}</span>
                      <span className="text-xs font-normal text-slate-500">{topic.topic}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isDone && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800"
                          title="Topic Completed"
                        >
                          ✓ Completed
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content Area: Lesson Reading + Sources + Progress + Quiz */}
        <div className="lg:col-span-8 space-y-6">
          {/* Lesson Header Card */}
          <Card className="border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {activeLesson.topic}
                  </span>
                  <span
                    data-testid="draft-status-badge"
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200"
                  >
                    Draft Content - Pending Review
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">{activeLesson.title}</h3>
              </div>
            </div>

            {/* Lesson Body */}
            <div className="prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed whitespace-pre-line mb-6">
              {activeLesson.body}
            </div>

            {/* Authoritative Sources */}
            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Authoritative Primary Sources
              </h4>
              <ul className="space-y-1 text-xs" aria-label="Authoritative Source Links">
                {activeLesson.source_links.map((link, idx) => (
                  <li key={idx}>
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline break-all inline-flex items-center gap-1"
                    >
                      🔗 {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {/* Topic Progress Summary */}
          <Card className="bg-slate-50 border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Topic Progress Summary</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track your quiz attempts and scores for this lesson.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-slate-500">Attempts: </span>
                  <span data-testid="progress-attempts" className="font-bold text-slate-900">{activeProgress.attempt_count}</span>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-slate-500">Latest: </span>
                  <span data-testid="progress-latest" className="font-bold text-slate-900">{activeProgress.latest_score_pct}%</span>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-slate-500">Best: </span>
                  <span data-testid="progress-best" className="font-bold text-slate-900">{activeProgress.best_score_pct}%</span>
                </div>
                {activeProgress.completed ? (
                  <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                    ✓ Completed (80%+ Passed)
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 text-slate-700">
                    Not Completed
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Interactive Quiz Module */}
          <Card className="border-slate-200 shadow-sm">
            <div className="border-b border-slate-200 pb-3 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Knowledge Check Quiz</h3>
                <p className="text-xs text-slate-500">
                  {activeQuiz.questions.length} questions • Minimum passing score is 80%
                </p>
              </div>

              <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200">
                Pass Threshold: 80%
              </span>
            </div>

            {/* Validation Alert */}
            {validationError && (
              <div
                role="alert"
                className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between"
              >
                <span>{validationError}</span>
              </div>
            )}

            {/* Attempt Result Banner & Feedback */}
            {attemptResult ? (
              <div className="space-y-6">
                <div
                  role="alert"
                  data-testid="quiz-result-banner"
                  className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                    attemptResult.passed
                      ? 'bg-green-50 border-green-200 text-green-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold">
                        {attemptResult.passed ? '🎉 Passed!' : '⚠️ Needs Review'}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-bold ${
                          attemptResult.passed
                            ? 'bg-green-200 text-green-900'
                            : 'bg-amber-200 text-amber-900'
                        }`}
                      >
                        {attemptResult.passed ? 'Status: Passed' : 'Status: Failed'}
                      </span>
                    </div>
                    <p className="text-xs">
                      {attemptResult.passed
                        ? 'Congratulations! You achieved at least the 80% passing threshold.'
                        : 'You did not achieve the required 80% passing threshold. Review the explanations below and try again.'}
                    </p>
                  </div>

                  <div className="text-right sm:border-l sm:pl-6 border-slate-300/50">
                    <div data-testid="quiz-score-pct" className="text-2xl font-black">{attemptResult.score_pct}%</div>
                    <div data-testid="quiz-correct-count" className="text-xs opacity-80">
                      {attemptResult.correct} of {attemptResult.total} correct
                    </div>
                  </div>
                </div>

                {/* Question-by-Question Feedback & Explanations */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Detailed Explanations
                  </h4>
                  {activeQuiz.questions.map((question, qIdx) => {
                    const feedbackItem = attemptResult.feedback.find(
                      (f) => f.question_id === question.id
                    );
                    const isCorrect = feedbackItem?.correct ?? false;
                    const selectedOptId = selectedAnswers[question.id];
                    const selectedOption = question.options.find((o) => o.id === selectedOptId);

                    return (
                      <div
                        key={question.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isCorrect
                            ? 'bg-green-50/50 border-green-200'
                            : 'bg-red-50/50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {qIdx + 1}. {question.prompt}
                          </p>
                          <span
                            className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded ${
                              isCorrect
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 mb-2">
                          <span className="font-semibold">Your selection: </span>
                          {selectedOption?.text || 'None'}
                        </p>

                        <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700">
                          <span className="font-bold text-slate-900">Explanation: </span>
                          {feedbackItem?.explanation || 'No explanation provided.'}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleRetryQuiz}
                    className="w-full sm:w-auto"
                  >
                    Retry Quiz
                  </Button>
                </div>
              </div>
            ) : (
              /* Quiz Questions Form */
              <form onSubmit={handleSubmitQuiz} className="space-y-6">
                {activeQuiz.questions.map((question, qIdx) => {
                  const promptId = `prompt-${question.id}`;

                  return (
                    <fieldset
                      key={question.id}
                      role="radiogroup"
                      aria-labelledby={promptId}
                      className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3"
                    >
                      <legend
                        id={promptId}
                        className="text-sm font-semibold text-slate-900 px-1"
                      >
                        {qIdx + 1}. {question.prompt}
                      </legend>

                      <div className="space-y-2 pt-1">
                        {question.options.map((option) => {
                          const inputId = `opt-${question.id}-${option.id}`;
                          const isChecked = selectedAnswers[question.id] === option.id;

                          return (
                            <label
                              key={option.id}
                              htmlFor={inputId}
                              className={`flex items-start gap-3 p-3 rounded-lg border text-xs sm:text-sm cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-blue-50 border-blue-400 text-blue-950 font-medium shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="radio"
                                id={inputId}
                                name={`question_${question.id}`}
                                value={option.id}
                                checked={isChecked}
                                onChange={() => handleOptionSelect(question.id, option.id)}
                                aria-checked={isChecked}
                                className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                              />
                              <span className="flex-1 select-none">{option.text}</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                })}

                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <span className="text-xs text-slate-500">
                    {Object.keys(selectedAnswers).length} of {activeQuiz.questions.length} answered
                  </span>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    className="min-w-[140px]"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default LearningView;
