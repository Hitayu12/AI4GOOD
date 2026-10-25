import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LearningView from './LearningView';
import { Quiz } from '../../api/types';
import { QuizScoringData } from './content/serverAnswerKeys';

describe('LearningView Component', () => {
  it('verifies all 5 topic summaries render in the navigation list', () => {
    render(<LearningView />);

    // 1. All 5 topic summaries render in the navigation list
    expect(screen.getByRole('button', { name: /Certificates of Deposit \(CDs\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /High-Yield Savings Accounts \(HYSAs\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Introduction to Stocks/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exchange-Traded Funds \(ETFs\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Options Primer \(Educational Only\)/i })).toBeInTheDocument();
  });

  it('displays lesson content, source links, and draft status badge when selecting a lesson', () => {
    render(<LearningView />);

    // Check initial lesson (CDs)
    expect(screen.getByTestId('draft-status-badge')).toHaveTextContent(/Draft Content - Pending Review/i);
    expect(
      screen.getByRole('link', { name: /https:\/\/www.fdic.gov\/resources\/deposit-insurance\/financial-products-insured\//i })
    ).toBeInTheDocument();

    // Select "Introduction to Stocks" lesson
    const stocksNavBtn = screen.getByRole('button', { name: /Introduction to Stocks/i });
    fireEvent.click(stocksNavBtn);

    // Verify Stocks content and sources render
    expect(screen.getByRole('heading', { level: 3, name: /Introduction to Stocks/i })).toBeInTheDocument();
    expect(screen.getByText(/A stock \(also known as an equity share\) represents fractional ownership/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /https:\/\/www.investor.gov\/introduction-investing\/investing-basics\/investment-products\/stocks/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /https:\/\/www.finra.org\/investors\/investing\/investment-products\/stocks/i })).toBeInTheDocument();

    // Select "Exchange-Traded Funds (ETFs)" lesson
    const etfNavBtn = screen.getByRole('button', { name: /Exchange-Traded Funds \(ETFs\)/i });
    fireEvent.click(etfNavBtn);
    expect(screen.getByRole('heading', { level: 3, name: /Exchange-Traded Funds \(ETFs\)/i })).toBeInTheDocument();
    expect(screen.getByText(/An Exchange-Traded Fund \(ETF\) is a pooled investment vehicle/i)).toBeInTheDocument();
  });

  it('validates that every question is answered before submitting and prevents submission', () => {
    render(<LearningView />);

    const submitBtn = screen.getByRole('button', { name: /Submit Quiz/i });
    fireEvent.click(submitBtn);

    // Should display validation error
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/Please answer all questions before submitting/i);
    expect(alert).toHaveTextContent(/4 unanswered/i);

    // Answer only question 1
    const optB = screen.getByLabelText(/A time deposit account that holds a fixed sum/i);
    fireEvent.click(optB);

    fireEvent.click(submitBtn);
    expect(screen.getByRole('alert')).toHaveTextContent(/3 unanswered/i);
  });

  it('submits attempt with correct answers, returning score feedback and explanations', () => {
    render(<LearningView />);

    // Answer all 4 questions correctly for default CDs quiz
    // Q1: time deposit
    fireEvent.click(screen.getByLabelText(/A time deposit account that holds a fixed sum/i));
    // Q2: $250,000
    fireEvent.click(screen.getByLabelText(/Deposits are insured up to \$250,000 per depositor/i));
    // Q3: early withdrawal penalty
    fireEvent.click(screen.getByLabelText(/The depositor is assessed an early withdrawal penalty/i));
    // Q4: sharp increase in rates
    fireEvent.click(screen.getByLabelText(/A sharp increase in prevailing market interest rates/i));

    const submitBtn = screen.getByRole('button', { name: /Submit Quiz/i });
    fireEvent.click(submitBtn);

    // Verify score feedback
    expect(screen.getByTestId('quiz-score-pct')).toHaveTextContent('100.00%');
    expect(screen.getByTestId('quiz-correct-count')).toHaveTextContent('4 of 4 correct');
    expect(screen.getByText(/🎉 Passed!/i)).toBeInTheDocument();
    expect(screen.getByText(/Status: Passed/i)).toBeInTheDocument();

    // Verify explanations are displayed
    expect(screen.getByText(/Detailed Explanations/i)).toBeInTheDocument();
    expect(screen.getByText(/A Certificate of Deposit \(CD\) is a promissory time deposit/i)).toBeInTheDocument();
    expect(screen.getByText(/Standard CDs at FDIC-insured depository institutions are backed/i)).toBeInTheDocument();

    // Verify topic progress updated to completed
    expect(screen.getByText(/✓ Completed \(80%\+ Passed\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Completed: 1 of 5 Topics/i)).toBeInTheDocument();
    expect(screen.getByTestId('progress-attempts')).toHaveTextContent('1');
    expect(screen.getByTestId('progress-latest')).toHaveTextContent('100.00%');
    expect(screen.getByTestId('progress-best')).toHaveTextContent('100.00%');
  });

  it('enforces pass threshold of 80% (passes at 80.00%+, fails below 80.00%)', () => {
    // 5-question quiz to explicitly test the exact 80.00% boundary (4/5 = 80.00% passes; 3/5 = 60.00% fails)
    const fiveQuestionQuiz: Quiz = {
      id: 'quiz-cd-basics',
      version: 1,
      lesson_id: 'cd-basics',
      questions: [
        {
          id: 'q1',
          prompt: 'Question 1',
          options: [
            { id: 'opt_a', text: 'Correct Option 1' },
            { id: 'opt_b', text: 'Incorrect Option 1' },
          ],
        },
        {
          id: 'q2',
          prompt: 'Question 2',
          options: [
            { id: 'opt_a', text: 'Correct Option 2' },
            { id: 'opt_b', text: 'Incorrect Option 2' },
          ],
        },
        {
          id: 'q3',
          prompt: 'Question 3',
          options: [
            { id: 'opt_a', text: 'Correct Option 3' },
            { id: 'opt_b', text: 'Incorrect Option 3' },
          ],
        },
        {
          id: 'q4',
          prompt: 'Question 4',
          options: [
            { id: 'opt_a', text: 'Correct Option 4' },
            { id: 'opt_b', text: 'Incorrect Option 4' },
          ],
        },
        {
          id: 'q5',
          prompt: 'Question 5',
          options: [
            { id: 'opt_a', text: 'Correct Option 5' },
            { id: 'opt_b', text: 'Incorrect Option 5' },
          ],
        },
      ],
    };

    const fiveQuestionKey: QuizScoringData = {
      answerKey: {
        q1: 'opt_a',
        q2: 'opt_a',
        q3: 'opt_a',
        q4: 'opt_a',
        q5: 'opt_a',
      },
      explanations: {
        q1: 'Q1 explanation.',
        q2: 'Q2 explanation.',
        q3: 'Q3 explanation.',
        q4: 'Q4 explanation.',
        q5: 'Q5 explanation.',
      },
    };

    render(
      <LearningView
        quizzes={{ 'quiz-cd-basics': fiveQuestionQuiz }}
        serverAnswerKeys={{ 'quiz-cd-basics': fiveQuestionKey }}
      />
    );

    // Fail attempt: 3 of 5 correct (60.00% < 80.00%)
    fireEvent.click(screen.getByLabelText('Correct Option 1'));
    fireEvent.click(screen.getByLabelText('Correct Option 2'));
    fireEvent.click(screen.getByLabelText('Correct Option 3'));
    fireEvent.click(screen.getByLabelText('Incorrect Option 4'));
    fireEvent.click(screen.getByLabelText('Incorrect Option 5'));

    fireEvent.click(screen.getByRole('button', { name: /Submit Quiz/i }));

    // 60.00% score and failed status
    expect(screen.getByTestId('quiz-score-pct')).toHaveTextContent('60.00%');
    expect(screen.getByTestId('quiz-correct-count')).toHaveTextContent('3 of 5 correct');
    expect(screen.getByText(/⚠️ Needs Review/i)).toBeInTheDocument();
    expect(screen.getByText(/Status: Failed/i)).toBeInTheDocument();
    expect(screen.getByText(/You did not achieve the required 80% passing threshold/i)).toBeInTheDocument();

    // Retry and answer 4 of 5 correctly (80.00% >= 80.00%)
    const retryBtn = screen.getByRole('button', { name: /Retry Quiz/i });
    fireEvent.click(retryBtn);

    // Form is reset
    expect(screen.getByRole('button', { name: /Submit Quiz/i })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Correct Option 1'));
    fireEvent.click(screen.getByLabelText('Correct Option 2'));
    fireEvent.click(screen.getByLabelText('Correct Option 3'));
    fireEvent.click(screen.getByLabelText('Correct Option 4'));
    fireEvent.click(screen.getByLabelText('Incorrect Option 5'));

    fireEvent.click(screen.getByRole('button', { name: /Submit Quiz/i }));

    // 80.00% score and passed status
    expect(screen.getByTestId('quiz-score-pct')).toHaveTextContent('80.00%');
    expect(screen.getByTestId('quiz-correct-count')).toHaveTextContent('4 of 5 correct');
    expect(screen.getByText(/🎉 Passed!/i)).toBeInTheDocument();
    expect(screen.getByText(/Status: Passed/i)).toBeInTheDocument();
  });

  it('allows retrying quiz to reset selections and attempt state', () => {
    render(<LearningView />);

    // Select all 4
    fireEvent.click(screen.getByLabelText(/A time deposit account that holds a fixed sum/i));
    fireEvent.click(screen.getByLabelText(/Deposits are insured up to \$250,000 per depositor/i));
    fireEvent.click(screen.getByLabelText(/The depositor is assessed an early withdrawal penalty/i));
    fireEvent.click(screen.getByLabelText(/A sharp increase in prevailing market interest rates/i));

    fireEvent.click(screen.getByRole('button', { name: /Submit Quiz/i }));
    expect(screen.getByTestId('quiz-score-pct')).toHaveTextContent('100.00%');

    // Click retry
    const retryBtn = screen.getByRole('button', { name: /Retry Quiz/i });
    fireEvent.click(retryBtn);

    // Submission form is back, score banner is removed
    expect(screen.queryByTestId('quiz-score-pct')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Quiz/i })).toBeInTheDocument();
    expect(screen.getByText(/0 of 4 answered/i)).toBeInTheDocument();
  });
});
