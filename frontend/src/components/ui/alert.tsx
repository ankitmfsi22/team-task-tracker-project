import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const alertVariants = cva('rounded-md border p-4 text-sm', {
  variants: {
    variant: {
      default: 'border-border bg-secondary text-secondary-foreground',
      destructive: 'border-destructive text-destructive',
    },
  },
  defaultVariants: { variant: 'default' },
});

export function Alert({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}
