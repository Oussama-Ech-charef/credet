import {
  cloneElement,
  forwardRef,
  isValidElement,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional = false,
  children,
  className,
}: FieldProps) {
  const descriptionId = error
    ? `${htmlFor}-error`
    : hint
      ? `${htmlFor}-hint`
      : undefined;
  const control =
    isValidElement(children) && descriptionId
      ? cloneElement(
          children as ReactElement<{
            "aria-describedby"?: string;
            "aria-invalid"?: boolean;
          }>,
          {
            "aria-describedby": descriptionId,
            "aria-invalid": Boolean(error),
          },
        )
      : children;

  return (
    <div className={cn("field", error && "field--error", className)}>
      <div className="field__label-row">
        <label className="field__label" htmlFor={htmlFor}>
          {label}
        </label>
        {optional ? <span className="field__optional">اختياري</span> : null}
      </div>
      {control}
      {error ? (
        <p className="field__error" id={descriptionId} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field__hint" id={descriptionId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn("input", className)} {...props} />;
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn("input textarea", className)} {...props} />;
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn("input select", className)} {...props}>
      {children}
    </select>
  );
});
