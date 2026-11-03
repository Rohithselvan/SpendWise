import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98] transition-transform',
  {
    variants: {
      variant: {
        primary: 'bg-emerald-500 text-[#04140c] hover:bg-emerald-400',
        secondary: 'bg-ink-800 text-fg hover:bg-ink-700 border border-line',
        ghost: 'text-fg-muted hover:bg-ink-800 hover:text-fg',
        danger: 'bg-[#e5484d] text-white hover:bg-[#d93d42]',
        outline: 'border border-line text-fg hover:bg-ink-800',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-[15px]',
        lg: 'h-13 min-h-[52px] px-5 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, type = 'button', ...props }, ref) => (
  <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = 'Button';
