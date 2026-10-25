import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SettingsModal } from '../features/reading/SettingsModal';
import { DEFAULT_READER_PREFERENCES } from '../reader/readerPreferences';

describe('Tanzil runtime attribution', () => {
  it('shows the source, CC BY 3.0, and official source and license links in reader settings', () => {
    const markup = renderToStaticMarkup(
      createElement(SettingsModal, {
        isOpen: true,
        onClose: () => undefined,
        preferences: DEFAULT_READER_PREFERENCES,
        onUpdate: () => undefined,
      }),
    );

    expect(markup).toContain('مصدر النص القرآني');
    expect(markup).toContain('Tanzil Project');
    expect(markup).toContain('CC BY 3.0');
    expect(markup).toContain('href="https://tanzil.net/"');
    expect(markup).toContain('href="https://tanzil.net/docs/Text_License"');
  });
});
