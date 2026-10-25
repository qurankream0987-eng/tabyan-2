import designTokens from '@workspace/design-tokens/tokens.json';

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
  style.setProperty('--tby-font-decorative', designTokens.typography.web.decorative);
  style.setProperty('--tby-font-quran', designTokens.typography.web.quran);
  style.setProperty('--tby-radius-base', designTokens.radius.webBase);
  style.setProperty('--tby-radius-card', `${designTokens.radius.card / 16}rem`);
  style.setProperty('--tby-radius-input', `${designTokens.radius.input / 16}rem`);
}

export { designTokens };
