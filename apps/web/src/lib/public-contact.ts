const configuredSupportEmail = import.meta.env.VITE_PUBLIC_SUPPORT_EMAIL?.trim();

/**
 * A support address is intentionally omitted unless a valid public address is configured.
 * Set VITE_PUBLIC_SUPPORT_EMAIL only after the mailbox is provisioned and monitored.
 */
export const publicSupportEmail =
  configuredSupportEmail && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(configuredSupportEmail)
    ? configuredSupportEmail
    : null;