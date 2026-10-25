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
  registrationField,
}: {
  dial: string;
  phone: string;
  onDialChange: (dial: string) => void;
  onPhoneChange: (phone: string, invalidCharacters?: boolean) => void;
  onInvalidCharactersChange?: (invalid: boolean) => void;
  onEnter?: () => void;
  autoFocus?: boolean;
  registrationField?: string;
}) {
  return (
    <div className="flex flex-col min-[400px]:flex-row items-stretch gap-2" dir="rtl">
      <div className="min-[400px]:w-[9.5rem] shrink-0 relative">
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
          ⌄
        </span>
      </div>
      <div className="relative min-w-0 flex-1">
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
            const invalidCharacters = /[^\d\s().+-]/.test(normalized);
            onInvalidCharactersChange?.(invalidCharacters);
            onPhoneChange(normalizeNationalPhoneInput(dial, raw), invalidCharacters);
          }}
          onKeyDown={(event) => event.key === "Enter" && onEnter?.()}
          placeholder="5XXXXXXXX"
          className={inputCls}
          aria-label="رقم الهاتف بدون رمز الدولة"
          data-registration-field={registrationField}
        />
      </div>
    </div>
  );
}
