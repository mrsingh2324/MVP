import React from 'react';
import { cn } from '../../utils/cn';

const badgeVariants = {
  default: "bg-primary-500 text-white",
  secondary: "bg-secondary-200 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-200",
  success: "bg-success-500 text-white",
  warning: "bg-warning-500 text-white",
  error: "bg-error-500 text-white",
  outline: "border border-primary-500 text-primary-500 bg-transparent"
};

const Badge = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
});
Badge.displayName = "Badge";

export { Badge, badgeVariants };
