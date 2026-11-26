import { useModalFocus } from '../common/useModalFocus';
import type { ApiClient } from '../../api/client';
import type { SchoolAffiliation, User } from '../../api/types';
import { SignInPage } from './SignInPage';

export interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiClient: ApiClient;
  onAuthenticated: (user: User, expiresAt: string, affiliation?: SchoolAffiliation, notice?: string) => void;
}

export function SignInModal({
  isOpen,
  onClose,
  apiClient,
  onAuthenticated,
}: SignInModalProps) {
  const dialogRef = useModalFocus(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to FutureWorth"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#f8f7fc] shadow-2xl border border-purple-300/40 p-4 sm:p-6 text-[#222038]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-1">
          <span className="text-[11px] font-black uppercase tracking-wider text-purple-700 bg-purple-100/90 px-3 py-1 rounded-full border border-purple-200">
            ✦ FutureWorth Student Access
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign in popup"
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-950 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <SignInPage
          apiClient={apiClient}
          onGuest={onClose}
          onAuthenticated={(account, expiresAt, affiliation, notice) => {
            onClose();
            onAuthenticated(account, expiresAt, affiliation, notice);
          }}
        />
      </div>
    </div>
  );
}
