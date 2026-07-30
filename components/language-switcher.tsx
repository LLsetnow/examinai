"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();

  return (
    <div
      className="inline-flex items-center rounded-xl border border-red-100 bg-white/85 p-1 shadow-sm"
      role="group"
      aria-label={t.common.language}
    >
      <Languages className="mx-1.5 size-3.5 text-primary" aria-hidden="true" />
      <button
        type="button"
        onClick={() => setLanguage("zh")}
        aria-pressed={language === "zh"}
        className={`min-h-8 rounded-lg px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
          language === "zh"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-red-50 hover:text-primary"
        }`}
      >
        中
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
        className={`min-h-8 rounded-lg px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
          language === "en"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-red-50 hover:text-primary"
        }`}
      >
        EN
      </button>
    </div>
  );
}
