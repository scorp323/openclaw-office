export interface ProviderTypeMeta {
  id: string;
  name: string;
  icon: string;
  defaultBaseUrl: string;
  defaultApi: string;
  requiresApiKey: boolean;
  placeholder?: string;
}

export const PROVIDER_TYPE_INFO: ProviderTypeMeta[] = [
  { id: "anthropic", name: "Anthropic", icon: "🤖", defaultBaseUrl: "https://api.anthropic.com", defaultApi: "anthropic-messages", requiresApiKey: true, placeholder: "sk-ant-..." },
  { id: "openai", name: "OpenAI", icon: "🧠", defaultBaseUrl: "https://api.openai.com/v1", defaultApi: "openai-responses", requiresApiKey: true, placeholder: "sk-..." },
  { id: "google", name: "Google AI", icon: "🔮", defaultBaseUrl: "https://generativelanguage.googleapis.com", defaultApi: "google-generative-ai", requiresApiKey: true },
  { id: "ollama", name: "Ollama", icon: "🦙", defaultBaseUrl: "http://localhost:11434", defaultApi: "openai-completions", requiresApiKey: false },
  { id: "bedrock", name: "AWS Bedrock", icon: "☁️", defaultBaseUrl: "", defaultApi: "bedrock-converse-stream", requiresApiKey: false },
  { id: "github-copilot", name: "GitHub Copilot", icon: "🐙", defaultBaseUrl: "", defaultApi: "github-copilot", requiresApiKey: false },
  { id: "custom", name: "Custom", icon: "⚙️", defaultBaseUrl: "", defaultApi: "openai-completions", requiresApiKey: true },
];

export function inferProviderType(providerId: string, api?: string, baseUrl?: string): ProviderTypeMeta {
  const byId = PROVIDER_TYPE_INFO.find((p) => p.id === providerId);
  if (byId) return byId;

  if (api) {
    const byApi = PROVIDER_TYPE_INFO.find((p) => p.defaultApi === api);
    if (byApi) return byApi;
  }

  if (baseUrl) {
    if (baseUrl.includes("anthropic.com")) return PROVIDER_TYPE_INFO[0];
    if (baseUrl.includes("openai.com")) return PROVIDER_TYPE_INFO[1];
    if (baseUrl.includes("googleapis.com")) return PROVIDER_TYPE_INFO[2];
    if (baseUrl.includes("localhost:11434")) return PROVIDER_TYPE_INFO[3];
  }

  return PROVIDER_TYPE_INFO[PROVIDER_TYPE_INFO.length - 1]; // "custom" fallback
}

export const REDACTED_SENTINEL = "__OPENCLAW_REDACTED__";
