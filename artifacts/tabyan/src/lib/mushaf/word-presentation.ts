/**
 * أسلوب كلمة QCF أثناء الإخفاء/التتبع.
 *
 * يقتصر تتبع AI على اللون داخل inline flow ولا يضيف أي خاصية هندسية:
 * لا padding ولا margin ولا transform ولا inline-block.
 */
export interface WordPresentationStyle {
  opacity: number;
  transition: string;
  color?: string;
  background?: string;
  borderRadius?: string;
}

export function getWordPresentationStyle(
  opacity: number,
  isCurrentWord: boolean,
  isAudioAyah: boolean,
): WordPresentationStyle | undefined {
  if (opacity === 1 && !isCurrentWord && !isAudioAyah) return undefined;
  return {
    opacity,
    transition: "opacity 220ms ease",
    ...(isCurrentWord ? { color: "var(--maroon)" } : {}),
    ...(isAudioAyah && !isCurrentWord ? {
      background: "rgba(180,150,50,0.1)",
      borderRadius: "2px",
    } : {}),
  };
}