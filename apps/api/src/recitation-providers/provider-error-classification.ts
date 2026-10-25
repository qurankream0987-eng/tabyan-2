export type ProviderErrorCategory =
  | "quota_or_billing"
  | "authorization"
  | "rate_limited"
  | "audio_format"
  | "network"
  | "provider_error";

/**
 * Produces a low-detail log category only. Provider messages can contain
 * request, account, or infrastructure details, so they must not be logged or
 * returned to the Native client verbatim.
 */
export function classifyProviderError(message: string): ProviderErrorCategory {
  const value = message.toLowerCase();
  if (/insufficient.?quota|insufficient.?credit|billing|payment|credit balance/.test(value)) {
    return "quota_or_billing";
  }
  if (/unauthorized|authentication|invalid.?api.?key|\b401\b|\b403\b/.test(value)) {
    return "authorization";
  }
  if (/rate.?limit|too many requests|\b429\b/.test(value)) return "rate_limited";
  if (/audio.?format|invalid.?pcm|sample.?rate|encoding/.test(value)) return "audio_format";
  if (/timeout|timed out|connection|socket|network|unavailable/.test(value)) return "network";
  return "provider_error";
}
