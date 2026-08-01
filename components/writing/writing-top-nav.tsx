"use client";

import { useI18n } from "@/lib/i18n/provider";

type WritingScreen = "form" | "report" | "history";

interface WritingTopNavProps {
  active: WritingScreen;
  onNewEssay: () => void;
  onHistory?: () => void;
}

/**
 * Left-aligned page switcher shared by the form, report and history headers so
 * the primary navigation stays in the same place across all three screens.
 * Styled as text tabs: the active screen is highlighted with an underline.
 */
export function WritingTopNav({ active, onNewEssay, onHistory }: WritingTopNavProps) {
  const { t } = useI18n();

  const items: Array<{ id: WritingScreen; label: string; onClick: () => void }> = [
    { id: "form", label: t.common.newEssay, onClick: onNewEssay },
  ];
  if (onHistory) {
    items.push({ id: "history", label: t.common.history, onClick: onHistory });
  }

  return (
    <nav className="flex items-center gap-1 sm:gap-2">
      {items.map((item) => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            aria-current={isActive ? "page" : undefined}
            className={`relative whitespace-nowrap px-1.5 py-2 text-sm font-semibold transition-colors sm:px-2 ${
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
            {isActive && (
              <span className="absolute inset-x-1.5 bottom-0 h-0.5 rounded-full bg-primary sm:inset-x-2" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
