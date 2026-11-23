import { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, disabled, ...props }, ref) => {
    const baseClasses =
      'inline-flex items-center justify-center rounded-xl font-bold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#7257e0] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.99]';

    const variantClasses = {
      primary:
        'bg-[#5637ca] hover:bg-[#4626ad] text-white shadow-sm',
      secondary:
        'bg-[#eee8ff] hover:bg-[#e4d9ff] text-[#4d30bc] border border-[#e8e4f1]',
      outline:
        'border border-[#e8e4f1] bg-white hover:bg-[#f6f3ff] hover:border-[#cfc1fa] text-[#332d4c] shadow-sm',
      danger:
        'bg-[#b84b43] hover:bg-[#963a34] text-white shadow-sm focus:ring-[#b84b43]',
    }[variant];

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-5 py-2.5 text-base',
    }[size];

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
