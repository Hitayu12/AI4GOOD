/**
 * Rutgers AI4Good 2026 — AI Tutor Feature Types
 * Phase 8 Contract & Interaction Definitions
 */

export type TutorMode = 'ai' | 'curriculum';

export interface TutorMessageItem {
  id: string;
  sender: 'user' | 'tutor';
  text: string;
  mode?: TutorMode;
  sourceLinks?: string[];
  timestamp: string;
  status?: 'sending' | 'sent' | 'error';
  errorMessage?: string;
}

export interface TutorQuickPrompt {
  id: string;
  label: string;
  prompt: string;
  topic: string;
}

export interface TutorValidationResult {
  valid: boolean;
  error?: string;
  sanitizedMessage?: string;
}

export interface TutorConfig {
  tutorEnabled: boolean;
  unavailableReason?: string;
  activeSimulationId?: string;
  maxCharacterLimit: number;
}
