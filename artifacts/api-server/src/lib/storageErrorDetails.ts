export type StorageErrorDetails = {
  errorName: string;
  errorCode?: string;
  httpStatus?: number;
  s3ErrorCode?: string;
  message?: string;
  requestId?: string;
};

type ErrorCandidate = {
  name?: unknown;
  code?: unknown;
  Code?: unknown;
  s3ErrorCode?: unknown;
  message?: unknown;
  httpStatusCode?: unknown;
  statusCode?: unknown;
  requestId?: unknown;
  RequestId?: unknown;
  RequestID?: unknown;
  $metadata?: {
    httpStatusCode?: unknown;
    requestId?: unknown;
  };
};

function safeText(value: unknown, sensitiveValues: string[]): string | undefined {
  if (typeof value !== "string" || !value) return undefined;
  let safe = value;
  for (const sensitiveValue of sensitiveValues) {
    if (sensitiveValue.length >= 4) {
      safe = safe.replaceAll(sensitiveValue, "[REDACTED]");
    }
  }
  safe = safe
    .replace(/https?:\/\/[^\s"'<>]+/gi, "[REDACTED_URL]")
    .replace(
      /\b(authorization|x-amz-credential|access[_-]?key(?:[_-]?id)?|secret[_-]?access[_-]?key)\s*[:=]\s*[^\s,;]+/gi,
      "$1=[REDACTED]",
    )
    .replace(/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, "[REDACTED_ACCESS_KEY]");
  return safe.slice(0, 500);
}

export function getStorageErrorDetails(
  error: unknown,
  sensitiveValues: string[] = [],
): StorageErrorDetails {
  const candidate = (error && typeof error === "object"
    ? error
    : {}) as ErrorCandidate;
  const details: StorageErrorDetails = {
    errorName: safeText(candidate.name, sensitiveValues) ?? "unknown",
  };
  const errorCode = safeText(candidate.code, sensitiveValues);
  const s3ErrorCode = safeText(
    candidate.s3ErrorCode ?? candidate.Code,
    sensitiveValues,
  );
  const rawStatus =
    candidate.$metadata?.httpStatusCode ??
    candidate.httpStatusCode ??
    candidate.statusCode;
  const httpStatus =
    typeof rawStatus === "number" && Number.isInteger(rawStatus)
      ? rawStatus
      : undefined;
  const message = safeText(candidate.message, sensitiveValues);
  const requestId = safeText(
    candidate.$metadata?.requestId ??
      candidate.requestId ??
      candidate.RequestId ??
      candidate.RequestID,
    sensitiveValues,
  );

  if (errorCode) details.errorCode = errorCode;
  if (httpStatus !== undefined) details.httpStatus = httpStatus;
  if (s3ErrorCode) details.s3ErrorCode = s3ErrorCode;
  if (message) details.message = message;
  if (requestId) details.requestId = requestId;
  return details;
}
