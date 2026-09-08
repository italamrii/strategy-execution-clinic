import { type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function TextField({ label, hint, error, id, ...props }: Props) {
  const fieldId = id ?? props.name ?? "field";
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  return (
    <div className="grid gap-2">
      <label htmlFor={fieldId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className="min-h-11 border border-line bg-surface px-3 text-ink outline-none focus-visible:border-navy"
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
