"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, ChevronDown, Eye, KeyRound, ListFilter, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import type { AiProviderSettings } from "@/lib/types";

const SETTINGS_STORAGE_KEY = "examinai-api-settings-v1";

type ProviderKind = "scoring" | "vision";

interface ApiSettingsButtonProps {
  value: AiProviderSettings | undefined;
  onChange: (settings: AiProviderSettings | undefined) => void;
}

interface ProviderDraft {
  baseURL: string;
  apiKey: string;
  model: string;
}

function toDraft(value: AiProviderSettings | undefined, kind: ProviderKind): ProviderDraft {
  return {
    baseURL: value?.[kind]?.baseURL ?? "",
    apiKey: value?.[kind]?.apiKey ?? "",
    model: value?.[kind]?.model ?? "",
  };
}

function toSettings(draft: Record<ProviderKind, ProviderDraft>): AiProviderSettings | undefined {
  const provider = (kind: ProviderKind) => {
    const current = draft[kind];
    const baseURL = current.baseURL.trim();
    const apiKey = current.apiKey.trim();
    const model = current.model.trim();
    return baseURL || apiKey || model ? { baseURL, apiKey, model } : undefined;
  };
  const scoring = provider("scoring");
  const vision = provider("vision");
  return scoring || vision ? { scoring, vision } : undefined;
}

function loadLocalSettings() {
  try {
    const value = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return value ? JSON.parse(value) as AiProviderSettings : undefined;
  } catch {
    return undefined;
  }
}

export function ApiSettingsButton({ value, onChange }: ApiSettingsButtonProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<ProviderKind, ProviderDraft>>({
    scoring: toDraft(value, "scoring"),
    vision: toDraft(value, "vision"),
  });
  const [models, setModels] = useState<Record<ProviderKind, string[]>>({ scoring: [], vision: [] });
  const [loadingKind, setLoadingKind] = useState<ProviderKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadLocalSettings();
    if (stored) onChange(stored);
    // This component may appear in multiple top bars. Each copy reads the
    // same browser-local value once; parent state keeps them synchronized.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    setDraft({ scoring: toDraft(value, "scoring"), vision: toDraft(value, "vision") });
    setError(null);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function updateProvider(kind: ProviderKind, field: keyof ProviderDraft, nextValue: string) {
    setDraft((current) => ({
      ...current,
      [kind]: { ...current[kind], [field]: nextValue },
    }));
  }

  async function fetchModels(kind: ProviderKind) {
    const provider = draft[kind];
    if (!provider.baseURL.trim() || !provider.apiKey.trim()) {
      setError(t.writing.settingsNeedConnection);
      return;
    }
    setLoadingKind(kind);
    setError(null);
    try {
      const response = await fetch("/api/writing/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseURL: provider.baseURL, apiKey: provider.apiKey }),
      });
      const payload = await response.json().catch(() => null) as { models?: string[]; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? t.writing.settingsModelsError);
      const nextModels = payload?.models ?? [];
      setModels((current) => ({ ...current, [kind]: nextModels }));
      if (nextModels.length > 0 && !provider.model.trim()) {
        updateProvider(kind, "model", nextModels[0]);
      }
      if (nextModels.length === 0) setError(t.writing.settingsNoModels);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : t.writing.settingsModelsError);
    } finally {
      setLoadingKind(null);
    }
  }

  function save() {
    const nextSettings = toSettings(draft);
    try {
      if (nextSettings) window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
      else window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } catch {
      setError(t.writing.settingsSaveError);
      return;
    }
    onChange(nextSettings);
    setOpen(false);
  }

  function reset() {
    window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    const nextDraft = { scoring: toDraft(undefined, "scoring"), vision: toDraft(undefined, "vision") };
    setDraft(nextDraft);
    setModels({ scoring: [], vision: [] });
    setError(null);
    onChange(undefined);
  }

  return (
    <>
      <Button variant="outline" size="icon-sm" onClick={() => setOpen(true)} aria-label={t.writing.settings} title={t.writing.settings}>
        <Settings2 className="size-4" />
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-4 backdrop-blur-[2px]" onMouseDown={() => setOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="api-settings-title"
            className="max-h-[min(760px,calc(100dvh-2rem))] w-full max-w-2xl overflow-y-auto rounded-3xl border border-red-100 bg-white p-5 shadow-[0_28px_90px_rgba(69,10,10,0.26)] sm:p-7"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex size-10 items-center justify-center rounded-2xl bg-red-50 text-primary">
                  <Settings2 className="size-5" />
                </div>
                <h2 id="api-settings-title" className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground">
                  {t.writing.settingsTitle}
                </h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">{t.writing.settingsDescription}</p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label={t.writing.settingsClose}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="mt-6 space-y-4">
              <ProviderSettingsPanel
                kind="scoring"
                icon={<KeyRound className="size-4" />}
                title={t.writing.settingsScoring}
                description={t.writing.settingsScoringDescription}
                draft={draft.scoring}
                models={models.scoring}
                loading={loadingKind === "scoring"}
                translations={t.writing}
                onChange={(field, nextValue) => updateProvider("scoring", field, nextValue)}
                onFetchModels={() => void fetchModels("scoring")}
              />
              <ProviderSettingsPanel
                kind="vision"
                icon={<Eye className="size-4" />}
                title={t.writing.settingsVision}
                description={t.writing.settingsVisionDescription}
                draft={draft.vision}
                models={models.vision}
                loading={loadingKind === "vision"}
                translations={t.writing}
                onChange={(field, nextValue) => updateProvider("vision", field, nextValue)}
                onFetchModels={() => void fetchModels("vision")}
              />
            </div>

            {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
            <p className="mt-4 text-xs leading-5 text-muted-foreground">{t.writing.settingsLocalOnly}</p>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={reset}>{t.writing.settingsReset}</Button>
              <Button onClick={save}><Check className="size-4" />{t.writing.settingsSave}</Button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function ProviderSettingsPanel({
  icon,
  title,
  description,
  draft,
  models,
  loading,
  translations,
  onChange,
  onFetchModels,
}: {
  kind: ProviderKind;
  icon: ReactNode;
  title: string;
  description: string;
  draft: ProviderDraft;
  models: string[];
  loading: boolean;
  translations: ReturnType<typeof useI18n>["t"]["writing"];
  onChange: (field: keyof ProviderDraft, value: string) => void;
  onFetchModels: () => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-muted/25 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm">{icon}</div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-[11px] font-semibold text-muted-foreground">{translations.settingsApiURL}</span>
          <input value={draft.baseURL} onChange={(event) => onChange("baseURL", event.target.value)} placeholder={translations.settingsApiURLPlaceholder} inputMode="url" className="mt-1 h-10 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/15" />
        </label>
        <label className="block">
          <span className="text-[11px] font-semibold text-muted-foreground">{translations.settingsApiKey}</span>
          <input value={draft.apiKey} onChange={(event) => onChange("apiKey", event.target.value)} type="password" autoComplete="new-password" placeholder={translations.settingsApiKeyPlaceholder} className="mt-1 h-10 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/15" />
        </label>
        <div>
          <span className="text-[11px] font-semibold text-muted-foreground">{translations.settingsModel}</span>
          <div className="mt-1 flex gap-2">
            {models.length > 0 ? (
              <div className="relative min-w-0 flex-1">
                <select value={draft.model} onChange={(event) => onChange("model", event.target.value)} className="h-10 w-full appearance-none rounded-xl border border-border bg-white px-3 pr-8 text-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/15">
                  <option value="">{translations.settingsSelectModel}</option>
                  {models.map((model) => <option key={model} value={model}>{model}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-3 size-4 text-muted-foreground" />
              </div>
            ) : (
              <input value={draft.model} onChange={(event) => onChange("model", event.target.value)} placeholder={translations.settingsModelPlaceholder} className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-white px-3 text-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/15" />
            )}
            <Button type="button" variant="outline" size="sm" onClick={onFetchModels} disabled={loading} title={translations.settingsFetchModels}>
              <ListFilter className={`size-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden lg:inline">{translations.settingsFetchModels}</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
