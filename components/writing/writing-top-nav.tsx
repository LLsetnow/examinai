"use client";

import { FileClock, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
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
 */
export function WritingTopNav({ active, onNewEssay, onHistory }: WritingTopNavProps) {
  const { t } = useI18n();

  return (
    <nav className="flex items-center gap-1">
      <Button
        variant={active === "form" ? "secondary" : "ghost"}
        size="sm"
        aria-current={active === "form" ? "page" : undefined}
        onClick={onNewEssay}
      >
        <PenLine className="size-4" />
        <span className="ml-1.5 hidden sm:inline">{t.common.newEssay}</span>
      </Button>
      {onHistory && (
        <Button
          variant={active === "history" ? "secondary" : "ghost"}
          size="sm"
          aria-current={active === "history" ? "page" : undefined}
          onClick={onHistory}
        >
          <FileClock className="size-4" />
          <span className="ml-1.5 hidden sm:inline">{t.common.history}</span>
        </Button>
      )}
    </nav>
  );
}
