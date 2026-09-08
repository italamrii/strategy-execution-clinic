"use client";

export function OTPInput({ value, onChange, label, disabled }: { value: string; onChange: (value: string) => void; label: string; disabled?: boolean }) {
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? "");
  return (
    <fieldset className="otp-fieldset" dir="ltr" disabled={disabled}>
      <legend>{label}</legend>
      <div className="otp-input">
        <input
          className="otp-input__native"
          name="code"
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          aria-label={label}
        />
        {digits.map((digit, index) => <span key={index} aria-hidden>{digit}</span>)}
      </div>
    </fieldset>
  );
}
