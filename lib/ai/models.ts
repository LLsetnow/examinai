import { createOpenAI } from "@ai-sdk/openai";
import type { AiProviderSettings } from "@/lib/types";

function requiredApiKey(name: "DEEPSEEK_API_KEY" | "ZHIPUAI_API_KEY"): string {
  const apiKey = process.env[name]?.trim();
  if (!apiKey) {
    throw new Error(`${name} is required to generate a writing assessment.`);
  }
  return apiKey;
}

function cleanBaseURL(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function isSafeExternalApiURL(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host === "::1") return false;
    if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(host)) return false;
    const private172 = host.match(/^172\.(\d+)\./);
    if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) return false;
    return true;
  } catch {
    return false;
  }
}

function providerConfig(
  configured: AiProviderSettings["scoring"] | AiProviderSettings["vision"] | undefined,
  defaults: { keyName: "DEEPSEEK_API_KEY" | "ZHIPUAI_API_KEY"; baseURL: string; model: string },
) {
  const customBaseURL = configured?.baseURL?.trim();
  const customApiKey = configured?.apiKey?.trim();
  const customModel = configured?.model?.trim();

  if (customBaseURL && !isSafeExternalApiURL(customBaseURL)) {
    throw new Error("API URL must be a public HTTPS address.");
  }
  if (customBaseURL && !customApiKey) {
    throw new Error("A custom API URL requires its own API key.");
  }

  return {
    apiKey: customApiKey || requiredApiKey(defaults.keyName),
    baseURL: customBaseURL ? cleanBaseURL(customBaseURL) : defaults.baseURL,
    model: customModel || defaults.model,
  };
}

function createDeepSeek(settings?: AiProviderSettings) {
  const config = providerConfig(settings?.scoring, {
    keyName: "DEEPSEEK_API_KEY",
    baseURL: "https://api.deepseek.com",
    model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro",
  });
  return createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
}

function createZhipu(settings?: AiProviderSettings) {
  const config = providerConfig(settings?.vision, {
    keyName: "ZHIPUAI_API_KEY",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    model: process.env.ZHIPUAI_VISION_MODEL ?? "glm-4.6v",
  });
  return createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
}

/** DeepSeek handles all text-only IELTS scoring and feedback. */
export function chatModel(settings?: AiProviderSettings) {
  const config = providerConfig(settings?.scoring, {
    keyName: "DEEPSEEK_API_KEY",
    baseURL: "https://api.deepseek.com",
    model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro",
  });
  return createDeepSeek(settings).chat(config.model);
}

/** Zhipu GLM is used only when a Task 1 chart image is attached. */
export function visionModel(settings?: AiProviderSettings) {
  const config = providerConfig(settings?.vision, {
    keyName: "ZHIPUAI_API_KEY",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    model: process.env.ZHIPUAI_VISION_MODEL ?? "glm-4.6v",
  });
  return createZhipu(settings).chat(config.model);
}

/** Configuration for Zhipu's vision-compatible endpoint. */
export function zhipuVisionConfig(settings?: AiProviderSettings) {
  const config = providerConfig(settings?.vision, {
    keyName: "ZHIPUAI_API_KEY",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    model: process.env.ZHIPUAI_VISION_MODEL ?? "glm-4.6v",
  });
  return { apiKey: config.apiKey, baseURL: config.baseURL, modelId: config.model };
}

export function validateExternalApiURL(value: string) {
  return isSafeExternalApiURL(value);
}
