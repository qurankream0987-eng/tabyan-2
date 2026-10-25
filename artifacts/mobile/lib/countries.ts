// Keep registration country data and E.164 validation aligned with the Web source of truth.
export {
  COUNTRIES,
  COUNTRY_PHONE_RULES,
  normalizeNationalPhoneInput,
  validatePhoneNumber,
  toE164,
  type CountryPhoneRule,
} from "../../tabyan/src/lib/countries";