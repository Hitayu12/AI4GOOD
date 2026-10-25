/**
 * Rutgers AI4Good 2026 — AI Tutor Interface
 * Phase 8 Interactive Chat, Curriculum Mode Badging & Source Links
 */

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ApiClient, defaultApiClient } from '../../api/client';
import { TutorMessageItem } from './tutorTypes';
import {
  MAX_TUTOR_MESSAGE_LENGTH,
  QUICK_PROMPTS,
  validateTutorMessage,
  sendTutorQuery,
} from './tutorService';

interface TutorViewProps {
  apiClient?: ApiClient;
  initialSimulationId?: string;
}

export function TutorView({ apiClient = defaultApiClient, initialSimulationId }: TutorViewProps) {
  const [messages, setMessages] = useState<TutorMessageItem[]>([
    {
      id: 'welcome_msg',
      sender: 'tutor',
      text: 'Hello! I am your AI Financial Literacy Tutor. Ask me questions about savings accounts, compound interest, stocks, ETFs, options fundamentals, or portfolio accounting. When you are inside a historical simulation, I operate in Deterministic Curriculum Mode (with zero LLM inference) to ensure no future market data is leaked.',
      mode: 'curriculum',
      sourceLinks: ['https://www.investor.gov/introduction-investing/investing-basics'],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [simulationContextActive, setSimulationContextActive] = useState<boolean>(!!initialSimulationId);
  const [simulationId] = useState<string>(initialSimulationId || 'sim_test_001');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSubmitting]);

  const handleSend = async (textToSend?: string) => {
    const raw = textToSend !== undefined ? textToSend : inputMessage;
    const validation = validateTutorMessage(raw);

    if (!validation.valid || !validation.sanitizedMessage) {
      setErrorMessage(validation.error || 'Invalid message');
      return;
    }

    setErrorMessage(null);
    const sanitized = validation.sanitizedMessage;
    const userMsgId = `user_${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMessageItem: TutorMessageItem = {
      id: userMsgId,
      sender: 'user',
      text: sanitized,
      timestamp,
      status: 'sent',
    };

    setMessages((prev) => [...prev, userMessageItem]);
    if (textToSend === undefined) {
      setInputMessage('');
    }
    setIsSubmitting(true);

    try {
      const activeSimId = simulationContextActive ? simulationId : undefined;
      const response = await sendTutorQuery(sanitized, activeSimId, apiClient);

      const tutorMessageItem: TutorMessageItem = {
        id: `tutor_${Date.now()}`,
        sender: 'tutor',
        text: response.reply,
        mode: response.mode,
        sourceLinks: response.source_links,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sent',
      };

      setMessages((prev) => [...prev, tutorMessageItem]);
      setServiceUnavailable(false);
    } catch (err: unknown) {
      const is503 = err instanceof Error && (err.message.includes('503') || err.message.includes('unavailable'));
      if (is503) {
        setServiceUnavailable(true);
      }

      const errMsg = err instanceof Error ? err.message : 'Failed to reach AI Tutor';
      setErrorMessage(errMsg);

      const errorReplyItem: TutorMessageItem = {
        id: `tutor_err_${Date.now()}`,
        sender: 'tutor',
        text: is503
          ? 'Notice: The AI Tutor provider is currently unavailable. Official educational resources remain available via the links below.'
          : `Error: ${errMsg}`,
        mode: 'curriculum',
        sourceLinks: ['https://www.investor.gov', 'https://www.sec.gov'],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'error',
        errorMessage: errMsg,
      };

      setMessages((prev) => [...prev, errorReplyItem]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isSubmitting) {
        handleSend();
      }
    }
  };

  const handleQuickPromptClick = (prompt: string) => {
    setInputMessage(prompt);
    textareaRef.current?.focus();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Educational Disclaimer Banner */}
      <div
        role="region"
        aria-label="Educational Disclaimer"
        className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-xs text-amber-900 flex items-start gap-2.5"
      >
        <span className="font-bold text-amber-700 uppercase tracking-wider text-[11px] mt-0.5">
          [DISCLAIMER]
        </span>
        <div>
          <span className="font-semibold">Educational Purposes Only:</span> The AI Tutor explains financial concepts, historical simulation mechanics, and curriculum lessons. It does not provide personalized investment advice, stock recommendations, or price forecasts.
        </div>
      </div>

      {/* Service Unavailable Banner (when 503 is returned) */}
      {serviceUnavailable && (
        <div
          role="alert"
          aria-live="assertive"
          aria-label="Provider Unavailable Alert"
          className="bg-red-50 border border-red-300 rounded-lg p-3 text-xs text-red-800 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-red-700 uppercase tracking-wider">[UNAVAILABLE]</span>
            <span>Live AI Tutor provider is unconfigured or offline (503 tutor_unavailable). Curriculum fallback links remain active.</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setServiceUnavailable(false)}
            aria-label="Dismiss provider unavailable banner"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Mode & Simulation Context Card */}
      <Card
        title="AI Financial Tutor"
        subtitle="Conversational learning assistant with zero-lookahead curriculum enforcement"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Active Mode:</span>
            {simulationContextActive ? (
              <span
                data-testid="curriculum-mode-badge"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                Deterministic Curriculum Mode (Zero Lookahead)
              </span>
            ) : (
              <span
                data-testid="ai-mode-badge"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300"
              >
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                Educational AI Mode
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
              <input
                type="checkbox"
                aria-label="Pin to Active Simulation Context"
                checked={simulationContextActive}
                onChange={(e) => setSimulationContextActive(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              Pin to Active Simulation ({simulationId})
            </label>
          </div>
        </div>

        {simulationContextActive && (
          <div className="mt-3 bg-emerald-50/70 border border-emerald-200/60 rounded p-2.5 text-xs text-emerald-800">
            <span className="font-semibold">[ZERO-LOOKAHEAD SAFEGUARD]</span> Because an active simulation session is selected, this conversation runs through our approved deterministic concept engine with <strong>0 model calls</strong>. This guarantees future market prices and curve data are never leaked.
          </div>
        )}

        {/* Chat Messages Stream */}
        <div
          role="log"
          aria-live="polite"
          aria-label="Tutor Conversation History"
          className="mt-4 h-96 overflow-y-auto p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4"
        >
          {messages.map((item) => (
            <div
              key={item.id}
              className={`flex flex-col ${item.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">
                  {item.sender === 'user' ? 'You' : 'AI Financial Tutor'}
                </span>
                {item.mode && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-medium uppercase tracking-wider ${
                      item.mode === 'curriculum'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {item.mode === 'curriculum' ? 'Curriculum' : 'AI Mode'}
                  </span>
                )}
                <span>{item.timestamp}</span>
              </div>

              <div
                className={`max-w-2xl px-4 py-3 rounded-xl text-sm leading-relaxed ${
                  item.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                    : item.status === 'error'
                    ? 'bg-red-50 text-red-900 border border-red-200 rounded-bl-none'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{item.text}</p>

                {/* Source Links */}
                {item.sourceLinks && item.sourceLinks.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs">
                    <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                      Authoritative Sources:
                    </span>
                    <ul className="space-y-1">
                      {item.sourceLinks.map((link, idx) => (
                        <li key={idx}>
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`External reference link: ${link}`}
                            className="text-blue-600 hover:text-blue-800 underline truncate block text-xs"
                          >
                            ↗ {link}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isSubmitting && (
            <div className="flex items-center gap-2 text-xs text-slate-500 italic py-2">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
              {simulationContextActive
                ? 'Retrieving approved curriculum concept...'
                : 'AI Tutor is reasoning...'}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Bar */}
        <div className="mt-4 pt-3 border-t border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
            Suggested Concept Inquiries:
          </span>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp.id}
                type="button"
                onClick={() => handleQuickPromptClick(qp.prompt)}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md border border-slate-300 transition-colors"
                aria-label={`Prompt shortcut: ${qp.label}`}
              >
                💡 {qp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input and Submission Section */}
        <div className="mt-4 space-y-2">
          {errorMessage && (
            <div
              role="alert"
              className="text-xs text-red-600 bg-red-50 border border-red-200 p-2 rounded"
            >
              {errorMessage}
            </div>
          )}

          <div className="relative">
            <textarea
              ref={textareaRef}
              rows={3}
              value={inputMessage}
              maxLength={MAX_TUTOR_MESSAGE_LENGTH}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              placeholder={
                simulationContextActive
                  ? 'Ask about curriculum topics (CDs, HYSAs, ETFs, options, order execution)...'
                  : 'Ask about personal finance, market terminology, or investing basics...'
              }
              aria-label="Tutor Query Input"
              className="w-full text-sm rounded-lg border border-slate-300 p-3 pr-24 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y disabled:bg-slate-100 disabled:text-slate-500"
            />
            <div className="absolute right-3 bottom-3 flex items-center gap-2">
              <span
                className={`text-[11px] ${
                  inputMessage.length > 1900 ? 'text-amber-600 font-semibold' : 'text-slate-400'
                }`}
              >
                {inputMessage.length}/{MAX_TUTOR_MESSAGE_LENGTH}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Press <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px]">Enter</kbd> to send, <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px]">Shift+Enter</kbd> for newline</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMessage('')}
                disabled={isSubmitting || !inputMessage}
                aria-label="Clear input message"
              >
                Clear
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleSend()}
                disabled={isSubmitting || inputMessage.trim().length === 0}
                aria-label="Send tutor inquiry"
              >
                {isSubmitting ? 'Sending...' : 'Send Query'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
export default TutorView;
