import { COUNTRIES, normalizeNationalPhoneInput } from "@/lib/countries";
import { normalizeDigits } from "@workspace/tabyan-trpc/input-normalization";

const inputCls =
  "w-full rounded-xl border-2 border-input bg-white dark:bg-card px-4 py-3 font-readex text-lg outline-none focus:border-burgundy dark:focus:border-gold transition text-left";
const selectCls =
  "w-full rounded-xl border-2 border-input bg-white dark:bg-card px-2 py-3 font-readex text-sm outline-none focus:border-burgundy dark:focus:border-gold transition";

export default function PhoneField({
  dial,
  phone,
  onDialChange,
  onPhoneChange,
  onInvalidCharactersChange,
  onEnter,
  autoFocus = true,
}: {
  dial: string;
  phone: string;
  onDialChange: (dial: string) => void;
  onPhoneChange: (phone: string) => void;
  onInvalidCharactersChange?: (invalid: boolean) => void;
  onEnter?: () => void;
  autoFocus?: boolean;
}) {
  const selected = COUNTRIES.find((country) => country.dial === dial) ?? COUNTRIES[0];

  return (
    <div className="flex items-stretch gap-2" dir="rtl">
      <div className="w-[9.5rem] shrink-0 relative">
        <select
          value={dial}
          onChange={(event) => onDialChange(event.target.value)}
          className={selectCls + " h-full appearance-none pe-8"}
          aria-label="الدولة ورمز الاتصال"
        >
          {COUNTRIES.map((country) => (
            <option key={country.iso} value={country.dial}>
              {country.flag} {country.name} ‎+{country.dial}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 end-2 flex items-center text-base" aria-hidden>
          {selected.flag}
        </span>
      </div>
      <div className="relative flex-1">
        <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center font-readex text-sm text-muted-foreground" dir="ltr">
          +{dial}
        </span>
        <input
          autoFocus={autoFocus}
          dir="ltr"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={15}
          value={phone}
          onChange={(event) => {
            const raw = event.target.value;
            const normalized = normalizeDigits(raw);
            onInvalidCharactersChange?.(/[^\d\s().+-]/.test(normalized));
            onPhoneChange(normalizeNationalPhoneInput(dial, raw));
          }}
          onKeyDown={(event) => event.key === "Enter" && onEnter?.()}
          placeholder="5XXXXXXXX"
          className={inputCls + " ps-14"}
          aria-label="رقم الهاتف بدون رمز الدولة"
        />
      </div>
    </div>
  );
}