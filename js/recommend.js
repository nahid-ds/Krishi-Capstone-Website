/* recommend.js - puts everything together into one result (the JavaScript version of recommend() in recommender.py):
   diagnosis + knowledge base + weather risk + spray window. */

import { diseaseRisk, sprayWindow } from "./weather.js";

/** True if the class is a healthy plant. */
export const isHealthy = (kb, cls) => kb[cls].type.toLowerCase().startsWith("healthy");

/**
 * Builds the result shown on the result screen and saved in History.
 * diagnosis: from model.js; weather: from getWeather() or null if not available.
 */
export function buildResult(kb, crop, diagnosis, weather) {
  const result = { crop, status: diagnosis.status, prediction: diagnosis.prediction, confidence: diagnosis.confidence, top3: diagnosis.top3 };
  if (diagnosis.status !== "ok" || !weather) return result;           // not sure, or no weather: no risk/spray

  const row = kb[diagnosis.prediction];
  if (isHealthy(kb, diagnosis.prediction)) {
    // Healthy plant: list the diseases of this crop that the current weather favours.
    result.watch = Object.keys(kb)
      .filter(c => kb[c].crop === crop && !isHealthy(kb, c))
      .map(c => ({ cls: c, level: diseaseRisk(c, kb[c], weather.daily, weather.today).level }))
      .filter(w => w.level === "high" || w.level === "medium")
      .sort((a, b) => (a.level === "high" ? 0 : 1) - (b.level === "high" ? 0 : 1))
      .slice(0, 3);
    return result;
  }
  result.risk = diseaseRisk(diagnosis.prediction, row, weather.daily, weather.today);
  result.spray = row.products.length ? sprayWindow(weather.hourly, row.spray, weather.nowHour) : { ok: null, key: "noproduct", windows: [] };
  return result;
}
