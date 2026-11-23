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
        className={`rounded-[19px] border border-[#e8e4f1] bg-white p-6 text-[#222038] shadow-[0_1px_2px_rgba(36,32,66,.04)] ${className}`}
        {...props}
      >
        {(title || subtitle) && (
          <div className="mb-4 border-b border-[#e8e4f1] pb-3">
            {title && (
              <h3 className="flex items-center gap-2 text-lg font-black tracking-[-.025em] text-[#222038]">
                {title}
              </h3>
            )}
            {subtitle && <p className="mt-1 text-sm text-[#615d76]">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
