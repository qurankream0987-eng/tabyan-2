import * as Location from "expo-location";
import { COUNTRIES } from "@workspace/tabyan-domain/countries";

export type DetectedCountry = (typeof COUNTRIES)[number];

/** Same free client-side reverse geocoder the web StudentRegisterFlow calls (no key). */
export async function countryCodeAt(latitude: number, longitude: number): Promise<string> {
  const response = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=ar`,
  );
  if (!response.ok) throw new Error("location lookup failed");
  const data = (await response.json()) as { countryCode?: unknown };
  return typeof data.countryCode === "string" ? data.countryCode.toUpperCase() : "";
}

/**
 * Picks the registration country from the device position.
 * Returns null when permission is refused, the fix fails, or the country is not one we serve.
 */
export async function detectCountry(): Promise<DetectedCountry | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return null;
  // The last known position is enough to name a country; a fresh fix can take long indoors.
  const last = await Location.getLastKnownPositionAsync();
  const { latitude, longitude } = (last ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })).coords;
  const iso = await countryCodeAt(latitude, longitude);
  return COUNTRIES.find((country) => country.iso === iso) ?? null;
}
