/* weather.js - weather for the farmer's area, disease risk and safe spray time.
   Same rules and numbers as recommender.py (checked to give identical results on all 37 classes).
   Rules come from the WR_* and Spray_* columns of the knowledge base. */

const WET_HOURS = 6;           // hours of RH >= 90% or rain in a day that count as "leaf wet" (Hutton rule)
const SOIL_WET_RAIN_7D = 25;   // mm of rain in 7 days used as a "saturated soil" sign (pink rot)
const RAIN_HOUR_MM = 0.1;      // an hour with at least this much rain counts as rainy
const TIMEOUT_MS = 10000;      // give up on the weather after 10 seconds (the result is shown without it)

/** Today's date and hour in Bangladesh time, e.g. { date: "2026-11-20", hour: "2026-11-20T09:00" }. */
function dhakaNow() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const get = type => parts.find(p => p.type === type).value;
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  return { date, hour: `${date}T${get("hour")}:00` };
}

/** Hourly weather from Open-Meteo (free, no key): last 7 days + today + next 3 days, Bangladesh time. */
export async function getWeather(lat, lon) {
  // Rounded to 2 decimals (about 1 km): enough for the weather, and more private.
  const url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat.toFixed(2) + "&longitude=" + lon.toFixed(2) +
    "&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m" +
    "&past_days=7&forecast_days=4&timezone=Asia%2FDhaka&wind_speed_unit=kmh";
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), TIMEOUT_MS);
  let h;
  try {
    const response = await fetch(url, { signal: stop.signal });
    if (!response.ok) throw new Error("weather " + response.status);
    h = (await response.json()).hourly;
  } finally {
    clearTimeout(timer);
  }
  const hourly = h.time.map((time, i) => ({ time, temp: h.temperature_2m[i], rh: h.relative_humidity_2m[i],
    rain: h.precipitation[i] ?? 0, wind: h.wind_speed_10m[i] }));
  const now = dhakaNow();
  return { hourly, daily: toDaily(hourly, now.date), today: now.date, nowHour: now.hour };
}

/** Hourly -> one row per day with the values the rules need (same as daily_from_hourly in Python). */
function toDaily(hourly, today) {
  const byDay = {};
  for (const h of hourly) {
    if (h.temp == null || h.rh == null) continue;
    const day = h.time.slice(0, 10);
    (byDay[day] = byDay[day] || []).push(h);
  }
  const days = Object.keys(byDay).sort().map(date => {
    const hs = byDay[date], n = hs.length, sum = f => hs.reduce((s, h) => s + f(h), 0);
    return {
      date, isForecast: date > today,
      Tmean: sum(h => h.temp) / n, Tmax: Math.max(...hs.map(h => h.temp)), Tmin: Math.min(...hs.map(h => h.temp)),
      RHmean: sum(h => h.rh) / n, RHmax: Math.max(...hs.map(h => h.rh)), RHmin: Math.min(...hs.map(h => h.rh)),
      rain: sum(h => h.rain),
      wetHours: hs.filter(h => h.rh >= 90 || h.rain >= RAIN_HOUR_MM).length,
      rh90Hours: hs.filter(h => h.rh >= 90).length,
    };
  });
  days.forEach((d, i) => { d.rain7d = days.slice(Math.max(0, i - 6), i + 1).reduce((s, x) => s + x.rain, 0); });
  return days;
}

/** Empty cell -> null, otherwise a number. */
const val = v => (v === "" || v == null || isNaN(+v)) ? null : +v;
/** True if v is between lo and hi (a missing limit is ignored). */
const between = (v, lo, hi) => (lo == null || v >= lo) && (hi == null || v <= hi);
/** Longest run of true values in a row. */
const longestRun = list => { let run = 0, best = 0; for (const x of list) { run = x ? run + 1 : 0; best = Math.max(best, run); } return best; };

/** The list of weather conditions written in one knowledge-base row. Each condition tests one day (or window). */
function conditions(rule, cls, rainKey = "rain") {
  const list = [];
  for (const [name, key] of [["Tmean", "Tmean"], ["Tmax", "Tmax"], ["Tmin", "Tmin"], ["RHmean", "RHmean"]]) {
    const lo = val(rule[`${name}_lo_${name.startsWith("T") ? "C" : "pct"}`]), hi = val(rule[`${name}_hi_${name.startsWith("T") ? "C" : "pct"}`]);
    if (lo != null || hi != null) list.push(d => between(d[key], lo, hi));
  }
  if (val(rule.RHmax_lo_pct) != null) list.push(d => d.RHmax >= val(rule.RHmax_lo_pct));
  if (val(rule.RHmin_lo_pct) != null) list.push(d => d.RHmin >= val(rule.RHmin_lo_pct));
  if (cls === "Rice_hispa") list.push(d => d.RHmin <= 81);          // extra limit written only in the rule text
  if (val(rule.RH90_hours_min) != null) list.push(d => d.rh90Hours >= val(rule.RH90_hours_min));
  if (val(rule.Rain_mm_min) != null) list.push(d => d[rainKey] > val(rule.Rain_mm_min));
  const wet = String(rule.Wet_Condition || "").toUpperCase();
  if (wet === "LEAF_WET") list.push(d => d.wetHours >= WET_HOURS);
  else if (wet === "LEAF_WET OR RAIN") list.push(d => d.rain > 0 || d.wetHours >= WET_HOURS);
  else if (wet === "RAIN" && val(rule.Rain_mm_min) == null) list.push(d => d.rain > 0);
  else if (wet === "DRY") list.push(d => d.rain < RAIN_HOUR_MM);
  else if (wet === "SOIL_SATURATED") list.push(d => d.rain7d >= SOIL_WET_RAIN_7D);
  return list;
}

/** Weak rules (confidence "Low") are never allowed to say "high". */
function capIfWeak(result, rule) {
  if (String(rule.Confidence).toLowerCase() === "low" && result.level === "high") {
    result.level = "medium"; result.reason += " Capped at medium because the rule's confidence is Low.";
  }
  return result;
}

/**
 * Weather risk for one disease: { level: "high" | "medium" | "low" | "no rule", reason }.
 * Same logic as disease_risk() in recommender.py.
 */
export function diseaseRisk(cls, kbRow, daily, today) {
  const rule = kbRow.rule;
  if (String(rule.Applicable).toUpperCase() !== "TRUE") return { level: "no rule", reason: "No validated weather rule for this class." };

  const months = String(rule.Active_Months ?? "").split(",").map(m => parseInt(m)).filter(m => !isNaN(m));
  if (months.length && !months.includes(+today.slice(5, 7))) return { level: "low", reason: `Outside the season in the source (months ${rule.Active_Months}).` };
  if (rule.Model === "SEASON_WINDOW") return { level: "medium", reason: "In the active season given by the source." };

  // Late blight: BAMIS temperature/humidity band OR the Hutton criteria.
  if (rule.Model === "TEMP_RH_BAND_OR_HUTTON") {
    const band = daily.map(d => between(d.Tmean, val(rule.Tmean_lo_C), val(rule.Tmean_hi_C)) && d.RHmean >= val(rule.RHmean_lo_pct));
    const hutton = daily.map(d => d.Tmin >= val(rule.Tmin_lo_C) && d.rh90Hours >= val(rule.RH90_hours_min));
    const bandDays = band.filter(Boolean).length, bandForecast = daily.filter((d, i) => band[i] && d.isForecast).length;
    const huttonRun = longestRun(hutton), need = Math.trunc(val(rule.Consecutive_days) || 1);
    const level = huttonRun >= need || (bandDays >= 3 && bandForecast >= 1) ? "high" : bandDays >= 1 || hutton.some(Boolean) ? "medium" : "low";
    return { level, reason: `BAMIS band met on ${bandDays} day(s) (${bandForecast} in forecast); Hutton run ${huttonRun} day(s).` };
  }

  // Rules over a 7-day (BAMIS week) or 30-day window: averages over the window, rain is the total.
  const window = String(rule.Window || "").toLowerCase();
  if (window.startsWith("7-day (bamis") || window.startsWith("30-day")) {
    const n = window.startsWith("7-day") ? 7 : daily.length, rows = [];
    for (let i = n - 1; i < daily.length; i++) {
      const part = daily.slice(i - n + 1, i + 1), avg = k => part.reduce((s, d) => s + d[k], 0) / n;
      rows.push({ Tmean: avg("Tmean"), Tmax: avg("Tmax"), Tmin: avg("Tmin"), RHmean: avg("RHmean"), RHmax: avg("RHmax"), RHmin: avg("RHmin"),
        wetHours: avg("wetHours"), rh90Hours: avg("rh90Hours"), rain7d: avg("rain7d"), rain: part.reduce((s, d) => s + d.rain, 0) });
    }
    const tests = conditions(rule, cls);
    if (!tests.length || !rows.length) return { level: "no rule", reason: "Rule has no numeric condition." };
    const best = Math.max(...rows.map(r => tests.filter(test => test(r)).length / tests.length));
    return capIfWeak({ level: best === 1 ? "high" : best >= 0.6 ? "medium" : "low", reason: `Best ${n}-day window met ${Math.round(best * 100)}% of the conditions.` }, rule);
  }

  // Daily rules: every condition must hold on the same day.
  const tests = conditions(rule, cls, window.includes("7-day for rain") ? "rain7d" : "rain");
  if (!tests.length) return { level: "no rule", reason: "Rule has no numeric condition." };
  const met = daily.map(d => tests.every(test => test(d)));
  const daysMet = met.filter(Boolean).length, forecastMet = daily.filter((d, i) => met[i] && d.isForecast).length;
  const bestShare = Math.max(...daily.map(d => tests.filter(test => test(d)).length / tests.length));
  const need = Math.max(Math.trunc(val(rule.Consecutive_days) || 1), 1);
  const level = longestRun(met) >= need && (daysMet >= 3 || forecastMet >= 1) ? "high" : daysMet >= 1 || bestShare >= 0.75 ? "medium" : "low";
  return capIfWeak({ level, reason: `Rule met on ${daysMet} of ${daily.length} days (${forecastMet} in the forecast).` }, rule);
}

/**
 * Next safe spray times in the next 72 hours (daylight 06:00-17:59 only):
 * wind inside the product's range and no rain for the product's rain-free hours after spraying.
 * Returns { ok, key, windows: [{start, end}], rainFreeHours, windMin, windMax, labelOnly }.
 */
export function sprayWindow(hourly, spray, nowHour) {
  const productClass = (spray.productClass || "").toUpperCase();
  if (String(spray.rainFreeHours).toLowerCase() === "not applicable" || ["SEED_TREATMENT", "GRANULAR", "NONE", ""].includes(productClass)) {
    return { ok: null, key: "notfoliar", windows: [] };
  }
  const labelOnly = val(spray.rainFreeHours) == null;                 // "Follow label": no number known
  const rainFreeHours = labelOnly ? 1 : Math.trunc(val(spray.rainFreeHours));
  const windMin = spray.windMin ?? 5, windMax = spray.windMax ?? 16;
  const start = hourly.findIndex(h => h.time >= nowHour);
  if (start < 0) return { ok: null, key: "noforecast", windows: [] };
  const next72 = hourly.slice(start, start + 72), isRain = h => h.rain >= RAIN_HOUR_MM;

  const goodHours = [];
  next72.forEach((h, j) => {
    const i = start + j, hour = +h.time.slice(11, 13);
    if (hour < 6 || hour > 17) return;                                  // daylight only
    if (!(h.wind >= windMin && h.wind <= windMax)) return;             // wind in the safe range
    if (i + rainFreeHours > hourly.length) return;                     // forecast too short to be sure
    if (hourly.slice(i, i + rainFreeHours).some(isRain)) return;       // rain too soon after spraying
    goodHours.push(i);
  });

  const windows = [];                                                  // join neighbouring good hours
  for (const i of goodHours) {
    const last = windows[windows.length - 1];
    if (last && i === last.end) last.end = i + 1; else windows.push({ begin: i, end: i + 1 });
  }
  const result = { rainFreeHours, windMin, windMax, labelOnly };
  if (!windows.length) return { ...result, ok: false, key: next72.some(isRain) ? "rain" : "wind", windows: [] };
  const list = windows.slice(0, 5).map(w => ({ start: hourly[w.begin].time, end: hourly[w.end] ? hourly[w.end].time : hourly[w.end - 1].time.slice(0, 11) + "23:59" }));
  return { ...result, ok: true, key: list[0].start.slice(0, 10) === nowHour.slice(0, 10) ? "today" : "wait", windows: list };
}
