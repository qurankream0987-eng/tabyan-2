import designTokens from '../../../../lib/design-tokens/tokens.json';

type TokenMode = keyof typeof designTokens.modes;

const toKebabCase = (value: string) =>
  value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/**
 * CSS adapter for the platform-neutral token source.
 * Both mode values are installed before React renders; CSS keeps ownership of
 * mode switching through the existing `.dark` class.
 */
export function installWebDesignTokens() {
  const style = document.documentElement.style;

  for (const [name, value] of Object.entries(designTokens.brand)) {
    style.setProperty(`--tby-brand-${toKebabCase(name)}`, String(value));
  }

  for (const [mode, values] of Object.entries(designTokens.modes) as [
    TokenMode,
    (typeof designTokens.modes)[TokenMode],
  ][]) {
    for (const [name, value] of Object.entries(values)) {
      style.setProperty(`--tby-${mode}-${toKebabCase(name)}`, String(value));
    }
  }

  style.setProperty('--tby-font-interface', designTokens.typography.web.interface);
  style.setProperty('--tby-font-quran', designTokens.typography.web.quran);
  style.setProperty('--tby-radius-base', designTokens.radius.webBase);
}

export { designTokens };