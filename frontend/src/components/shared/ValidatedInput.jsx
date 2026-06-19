import React from 'react';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';

/**
 * Input with validation error display
 */
export const ValidatedInput = ({
  label,
  error,
  required,
  className,
  inputClassName,
  ...props
}) => {
  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <Input
        className={cn(
          error && "border-red-500 focus:ring-red-500",
          inputClassName
        )}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};

/**
 * Select with validation error display
 */
export const ValidatedSelect = ({
  label,
  error,
  required,
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500 focus:ring-red-500"
        )}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};

/**
 * Textarea with validation error display
 */
export const ValidatedTextarea = ({
  label,
  error,
  required,
  className,
  ...props
}) => {
  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500 focus:ring-red-500"
        )}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};

export default ValidatedInput;
