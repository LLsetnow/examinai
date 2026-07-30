import type { AiProviderSettings } from "@/lib/types";

/**
 * Provider overrides intentionally live only in the current browser profile.
 * They are never stored by the server or included in history reports.
 */
const PROVIDER_SETTINGS_STORAGE_KEY = "examinai-api-settings-v1";

export function loadProviderSettings(): AiProviderSettings | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const value = window.localStorage.getItem(PROVIDER_SETTINGS_STORAGE_KEY);
    return value ? (JSON.parse(value) as AiProviderSettings) : undefined;
  } catch {
    return undefined;
  }
}

export function saveProviderSettings(settings: AiProviderSettings | undefined) {
  if (typeof window === "undefined") return;

  if (settings) {
    window.localStorage.setItem(PROVIDER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } else {
    window.localStorage.removeItem(PROVIDER_SETTINGS_STORAGE_KEY);
  }
}
