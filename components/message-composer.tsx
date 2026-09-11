import type { FormEvent, KeyboardEvent } from "react";

type MessageComposerProps = {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function MessageComposer({
  value,
  disabled,
  onChange,
  onSubmit,
}: MessageComposerProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  const submitWithEnter = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <form onSubmit={submit}>
      <textarea
        aria-label="Ask MomoRay AI Advisor"
        disabled={disabled}
        maxLength={2_000}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={submitWithEnter}
        placeholder="Ask MomoRay AI Advisor"
        rows={1}
        value={value}
      />
      <button type="submit" aria-label="Send message" disabled={disabled || !value.trim()}>
        Send
      </button>
    </form>
  );
}
