/* place.js - turns a GPS point into a place name ("Mirpur, Dhaka") with OpenStreetMap, and makes the small map.
   Needs the internet. If there is no internet, app.js shows the nearest district instead (no internet needed). */

import { CONFIG } from "./config.js";

/**
 * Asks OpenStreetMap's free Nominatim service for the name of the place at lat, lon ("reverse geocoding").
 * lang = "bn" or "en": the language of the answer. Returns a text like "মিরপুর, ঢাকা", or null if it failed.
 * One call per tap on "Use my location" (the service allows at most 1 call per second, and needs no key).
 */
export async function placeName(lat, lon, lang) {
  const url = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16" +
    "&lat=" + lat + "&lon=" + lon + "&accept-language=" + lang;
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), CONFIG.PLACE_TIMEOUT_SECONDS * 1000);   // weak signal: give up
  try {
    const response = await fetch(url, { signal: stop.signal });
    if (!response.ok) return null;
    const a = (await response.json()).address || {};
    // The local area: the first of these that OpenStreetMap knows, from the smallest to the largest.
    const local = a.village || a.suburb || a.neighbourhood || a.hamlet || a.town || a.city_district || a.city || a.municipality;
    // The bigger area: the district or city. "Dhaka District" -> "Dhaka".
    const big = String(a.state_district || a.city || a.county || "").replace(/ District$| জেলা$/, "");
    const parts = [local, big].filter((p, i, all) => p && all.indexOf(p) === i);   // drop empty and repeated parts
    return parts.length ? parts.join(", ") : null;
  } catch (e) {
    return null;                                    // no internet, or too slow
  } finally {
    clearTimeout(timer);
  }
}

/** Address of the OpenStreetMap map page that shows a small area around the point with a pin on it. */
export function mapUrl(lat, lon) {
  const d = 0.008;                                  // about 900 m on each side of the pin
  return "https://www.openstreetmap.org/export/embed.html?layer=mapnik" +
    "&bbox=" + [lon - d, lat - d, lon + d, lat + d].map(x => x.toFixed(4)).join(",") +   // left,bottom,right,top
    "&marker=" + lat + "," + lon;
}
