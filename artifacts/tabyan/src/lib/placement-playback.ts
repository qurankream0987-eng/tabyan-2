export function resolvePlacementPlaybackUrl(candidateUrl: string, apiOrigin: string): string {
  const apiBase = new URL(apiOrigin);
  const parsed = new URL(candidateUrl, apiBase);
  const allowedQuery = [...parsed.searchParams.keys()].every((key) => key === "diag");
  if (
    parsed.origin !== apiBase.origin
    || !/^\/api\/storage\/placement-playback\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(parsed.pathname)
    || !allowedQuery
    || parsed.searchParams.has("token")
  ) {
    throw new Error("Placement playback URL was rejected");
  }
  return parsed.href;
}