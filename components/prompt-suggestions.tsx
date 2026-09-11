export const suggestedPrompts = [
  "这个枕头可以调高度吗？",
  "我主要侧睡，肩比较宽，喜欢高一点",
  "给我推荐一个配置",
  "我最近脖子一直痛，是不是颈椎病？",
] as const;

type PromptSuggestionsProps = {
  disabled: boolean;
  onSelect: (prompt: string) => void;
};

export function PromptSuggestions({ disabled, onSelect }: PromptSuggestionsProps) {
  return (
    <div>
      {suggestedPrompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(prompt)}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
