import { describe, it, expect } from 'vitest';
import {
  validateTutorMessage,
  isUnsafeFinancialAdvicePrompt,
  lookupCurriculumConcept,
  sendTutorQuery,
  MAX_TUTOR_MESSAGE_LENGTH,
} from './tutorService';
import { ApiClient } from '../../api/client';

describe('tutorService', () => {
  describe('validateTutorMessage', () => {
    it('accepts valid input within bounds', () => {
      const res = validateTutorMessage('What is a High-Yield Savings Account?');
      expect(res.valid).toBe(true);
      expect(res.sanitizedMessage).toBe('What is a High-Yield Savings Account?');
      expect(res.error).toBeUndefined();
    });

    it('rejects empty or whitespace-only messages', () => {
      const res1 = validateTutorMessage('');
      expect(res1.valid).toBe(false);
      expect(res1.error).toContain('cannot be empty');

      const res2 = validateTutorMessage('   \n\t  ');
      expect(res2.valid).toBe(false);
      expect(res2.error).toContain('cannot be empty');
    });

    it('accepts messages of exactly 2,000 characters', () => {
      const msg = 'a'.repeat(MAX_TUTOR_MESSAGE_LENGTH);
      const res = validateTutorMessage(msg);
      expect(res.valid).toBe(true);
      expect(res.sanitizedMessage?.length).toBe(MAX_TUTOR_MESSAGE_LENGTH);
    });

    it('rejects messages exceeding 2,000 characters', () => {
      const msg = 'a'.repeat(MAX_TUTOR_MESSAGE_LENGTH + 1);
      const res = validateTutorMessage(msg);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('exceeds the 2,000 character limit');
    });
  });

  describe('isUnsafeFinancialAdvicePrompt', () => {
    it('detects personalized stock purchase prompts', () => {
      expect(isUnsafeFinancialAdvicePrompt('Should I buy AAPL right now?')).toBe(true);
      expect(isUnsafeFinancialAdvicePrompt('What stock should I buy for quick gains?')).toBe(true);
      expect(isUnsafeFinancialAdvicePrompt('Will MSFT go up tomorrow?')).toBe(true);
      expect(isUnsafeFinancialAdvicePrompt('Predict the price of SPY')).toBe(true);
      expect(isUnsafeFinancialAdvicePrompt('Execute this trade for me')).toBe(true);
    });

    it('allows educational concept inquiries', () => {
      expect(isUnsafeFinancialAdvicePrompt('What is an ETF?')).toBe(false);
      expect(isUnsafeFinancialAdvicePrompt('How does compound interest compound?')).toBe(false);
      expect(isUnsafeFinancialAdvicePrompt('Explain weighted-average cost basis')).toBe(false);
      expect(isUnsafeFinancialAdvicePrompt('What is the difference between a CD and a savings account?')).toBe(false);
    });
  });

  describe('lookupCurriculumConcept', () => {
    it('returns deterministic concept definition for compound interest', () => {
      const res = lookupCurriculumConcept('Tell me about compound interest');
      expect(res.reply).toContain('Compound interest');
      expect(res.source_links.length).toBeGreaterThan(0);
      expect(res.source_links[0]).toContain('investor.gov');
    });

    it('returns deterministic definition for ETF', () => {
      const res = lookupCurriculumConcept('What is an ETF?');
      expect(res.reply).toContain('Exchange-Traded Fund');
      expect(res.source_links.length).toBeGreaterThan(0);
    });

    it('declines unsafe investment advice queries in curriculum mode', () => {
      const res = lookupCurriculumConcept('Should I buy AAPL?');
      expect(res.reply).toContain('Notice: As an educational platform, the AI Tutor does not provide personalized investment advice');
    });

    it('returns default curriculum overview for unrecognized queries', () => {
      const res = lookupCurriculumConcept('Tell me something random');
      expect(res.reply).toContain('educational curriculum covers foundational financial instruments');
      expect(res.source_links).toBeDefined();
    });
  });

  describe('sendTutorQuery', () => {
    it('sends query and returns curriculum mode response when simulationId is provided', async () => {
      const client = new ApiClient();
      client.setFixtureMode(true);

      const res = await sendTutorQuery('How does compound interest work?', 'sim_test_001', client);
      expect(res.mode).toBe('curriculum');
      expect(res.reply).toContain('Compound interest');
      expect(res.source_links.length).toBeGreaterThan(0);
    });

    it('sends query and returns ai mode response when simulationId is omitted', async () => {
      const client = new ApiClient();
      client.setFixtureMode(true);

      const res = await sendTutorQuery('What can you teach me?', undefined, client);
      expect(res.mode).toBe('ai');
      expect(res.reply).toContain('Educational AI Tutor');
    });

    it('throws validation error before network call for blank messages', async () => {
      const client = new ApiClient();
      await expect(sendTutorQuery('   ', undefined, client)).rejects.toThrow('Message cannot be empty.');
    });

    it('throws validation error before network call for oversized messages', async () => {
      const client = new ApiClient();
      const longMessage = 'x'.repeat(2005);
      await expect(sendTutorQuery(longMessage, undefined, client)).rejects.toThrow('2,000 character limit');
    });
  });
});
