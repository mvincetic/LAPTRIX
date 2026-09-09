import { panelId, tabId } from "./tabs";

export function TabList({
  label,
  prefix,
  options,
  value,
  onChange,
  compact = false,
}: {
  label: string;
  prefix: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`tabs${compact ? " compact" : ""}`}
      role="tablist"
      aria-label={label}
    >
      {options.map((option, index) => (
        <button
          key={option}
          id={tabId(prefix, index)}
          role="tab"
          aria-selected={value === option}
          aria-controls={panelId(prefix, index)}
          tabIndex={value === option ? 0 : -1}
          className={value === option ? "active" : ""}
          onClick={() => onChange(option)}
          onFocus={() => onChange(option)}
          onKeyDown={(event) => {
            let next: number;
            if (event.key === "ArrowRight") next = (index + 1) % options.length;
            else if (event.key === "ArrowLeft")
              next = (index + options.length - 1) % options.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = options.length - 1;
            else return;
            event.preventDefault();
            const tabs =
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                '[role="tab"]',
              );
            tabs?.[next]?.focus();
          }}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
