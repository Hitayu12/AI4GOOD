import { HTMLAttributes, forwardRef } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ title, subtitle, className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-2xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-xl p-6 shadow-lg shadow-black/20 hover:border-purple-500/40 hover:shadow-purple-500/10 transition-all duration-200 text-slate-100 ${className}`}
        {...props}
      >
        {(title || subtitle) && (
          <div className="mb-4 border-b border-slate-800/80 pb-3">
            {title && (
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                {title}
              </h3>
            )}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
