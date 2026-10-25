/** Original vector ornament: mirrored leaves and a quiet ivory cartouche.
 * No paths or pixels are taken from the reference photograph. */
export default function SurahHeaderOrnament() {
  return (
    <svg className="tby-surah-frame-border" viewBox="0 0 1000 140" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="994" height="134" fill="var(--hdr-ivory)" className="tby-orn-line" />
      <rect x="10" y="10" width="980" height="120" fill="none" className="tby-orn-line-soft" />
      <Wing />
      <g transform="translate(1000 0) scale(-1 1)"><Wing /></g>
      <path d="M244 10H756C756 24 772 30 786 34C800 53 800 87 786 106C772 110 756 116 756 130H244C244 116 228 110 214 106C200 87 200 53 214 34C228 30 244 24 244 10Z"
        fill="var(--hdr-ivory)" className="tby-orn-line" />
      <path d="M250 17H750M250 123H750" fill="none" className="tby-orn-line-soft" />
    </svg>
  );
}

function Wing() {
  return (
    <g>
      <path d="M18 20C48 8 67 15 72 36C57 30 40 33 35 49C23 43 19 32 18 20ZM18 120C48 132 67 125 72 104C57 110 40 107 35 91C23 97 19 108 18 120ZM151 18C172 8 192 15 204 30C190 33 184 44 187 58C166 55 154 42 151 18ZM151 122C172 132 192 125 204 110C190 107 184 96 187 82C166 85 154 98 151 122Z"
        fill="var(--hdr-green)" opacity=".78" />
      <path d="M26 70C43 43 66 44 77 70C66 96 43 97 26 70ZM133 70C148 43 174 44 184 70C174 96 148 97 133 70ZM67 28C88 12 118 12 140 28M67 112C88 128 118 128 140 112"
        fill="none" className="tby-orn-line" />
      <path d="M46 52C54 55 58 62 57 70C48 67 43 60 46 52ZM46 88C54 85 58 78 57 70C48 73 43 80 46 88ZM163 52C155 55 151 62 152 70C161 67 166 60 163 52ZM163 88C155 85 151 78 152 70C161 73 166 80 163 88Z"
        fill="var(--hdr-green)" opacity=".64" />
      <path d="M76 40L91 25L106 40L121 25L136 40M76 100L91 115L106 100L121 115L136 100M17 54L31 70L17 86M191 51L204 70L191 89"
        fill="none" className="tby-orn-line-soft" />
      <ellipse cx="105" cy="70" rx="26" ry="43" fill="var(--hdr-ivory)" className="tby-orn-line-soft" />
      <path d="M105 20L110 25L105 30L100 25ZM105 110L110 115L105 120L100 115Z" fill="var(--hdr-gold)" />
    </g>
  );
}
