/* ui.js - draws the screens. It only shows the data it is given; app.js decides what to show and when.
   Buttons made here carry data-action="..." and app.js handles all clicks in one place. */

import { CONFIG, CROPS } from "./config.js";
import { t, num, getLang } from "./i18n.js";
import { mapUrl } from "./place.js";

/** Shortcut for document.getElementById. */
export const $ = id => document.getElementById(id);

/** Makes text safe to put inside HTML (so a < or & in the knowledge base cannot break the page). */
export function esc(text) {
  return String(text ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** A small line icon. The icons are drawn once in index.html (<symbol id="i-camera"> and so on) and reused here by name. */
export const icon = name => `<svg class="i" aria-hidden="true"><use href="#i-${name}"></use></svg>`;

/** Crop name in the current language. */
export const cropName = crop => CROPS[crop][getLang()];

/** Disease name: the Bangla name from the knowledge base, or the class name made readable in English. */
export function diseaseName(kb, cls) {
  if (getLang() === "bn" && kb[cls].bn.name) return kb[cls].bn.name;
  return cls.replace(kb[cls].crop + "_", "").replace(/_/g, " ");
}

/** 0.873 -> "87%" (Bangla digits in Bangla). */
const percent = p => num(Math.round(p * 100)) + "%";

/** "2026-11-20T09:00" -> "20/11 09:00". */
const dateHour = iso => num(`${iso.slice(8, 10)}/${iso.slice(5, 7)} ${iso.slice(11, 16)}`);

/** Colour of a risk level: high = red, medium = orange, low = green, no rule = grey. */
const riskColour = level => ({ high: "bad", medium: "warn", low: "good" }[level] || "");

// ------------------------------------------------------------------ whole page

const SCREENS = ["home", "checking", "result", "history"];

/** Shows one screen and hides the others. */
export function showScreen(name) {
  for (const id of SCREENS) $(id).hidden = id !== name;
  $("actionbar").hidden = name !== "home";
  document.querySelectorAll("nav.bottom [data-screen]").forEach(button => {
    if (button.dataset.screen === name) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  window.scrollTo(0, 0);
}

/** Fills every element that has data-t="key" with the text in the current language. */
export function applyLanguage() {
  document.documentElement.lang = getLang();
  document.title = t("app_name");
  document.querySelectorAll("[data-t]").forEach(el => { el.textContent = t(el.dataset.t); });
  document.querySelectorAll("[data-t-placeholder]").forEach(el => { el.placeholder = t(el.dataset.tPlaceholder); });
}

// ------------------------------------------------------------------ home screen

/** The 4 crop buttons. The chosen one is highlighted. */
export function renderCrops(chosen) {
  $("crops").innerHTML = Object.keys(CROPS).map(crop => `
    <button type="button" class="crop" data-action="crop" data-crop="${crop}" aria-pressed="${crop === chosen}">
      <span class="crop-pic">${CROPS[crop].icon}</span><b>${cropName(crop)}</b>
    </button>`).join("");
}

/** The 4 photo tips. For potato the photo is of the potato itself, not a leaf. */
export function renderTips(crop) {
  const tips = ["tip_light", crop === "Potato" ? "tip_one_potato" : "tip_one", "tip_steady", "tip_plain"];
  $("tips").innerHTML = `<span class="tips-title">${t("tips_title")}</span>` +
    tips.map(key => `<span class="tip">${t(key)}</span>`).join("");
}

/**
 * The photo preview and the message under it.
 * problem = "q_small" | "q_blur" | "q_dark" | "q_bright" | null; accepted = the farmer chose "use anyway".
 */
export function renderPhoto(photo, problem, accepted, unreadable) {
  $("photo-empty").hidden = !!photo;
  $("photo-preview").hidden = !photo;
  if (photo) $("photo-preview").src = photo.url;

  let message = "";
  if (unreadable) message = `<div class="alert bad">${t("q_unreadable")}</div>`;
  else if (photo && problem && !accepted) {
    message = `<div class="alert warn">${t(problem)}
      <button type="button" class="btn link" data-action="photo-anyway">${t("q_anyway")}</button></div>`;
  } else if (photo) message = `<div class="alert ok">${icon("check")} ${t("q_ok")}</div>`;
  $("photo-message").innerHTML = message;
}

/** The district list. */
export function renderDistricts(districts, place) {
  const options = districts.map((d, i) =>
    `<option value="${i}" ${place && place.district === d.en ? "selected" : ""}>${esc(d[getLang()])}</option>`);
  $("district").innerHTML = `<option value="">${t("pick_district")}</option>` + options.join("");
}

/** The line that says which area is used for the weather. gps = "idle" | "waiting" | "failed". */
export function renderPlace(place, gps, districts) {
  let html, colour = "note";
  if (gps === "waiting") html = esc(t("gps_wait"));
  else if (gps === "failed") { html = esc(t("gps_fail")); colour = "alert warn"; }
  else if (place) {
    const district = districts.find(d => d.en === place.district);
    // From GPS with internet: the real place name ("Mirpur, Dhaka"). From GPS without internet: "near Dhaka district".
    // From the list: just the district name.
    let name;
    if (place.name) name = place.name;
    else if (!district) name = t("my_location");
    else if (place.fromGps) name = t("near_district", { name: district[getLang()] });
    else name = district[getLang()];
    html = icon("pin") + " " + esc(name);
    colour = "alert ok";
  } else html = esc(t("no_area"));
  $("place-status").className = colour;
  $("place-status").innerHTML = html;

  // The small map with a pin: only when the place name came back (that means the internet works, so the map can load).
  const map = $("place-map");
  const showMap = !!(place && place.name);
  map.hidden = !showMap;
  if (showMap && map.dataset.point !== place.lat + "," + place.lon) {   // load the map only when the point changes
    map.dataset.point = place.lat + "," + place.lon;
    map.src = mapUrl(place.lat, place.lon);
  }
}

/**
 * The model line: "info" | "downloading" | "ready" | "missing" | "failed" | "hidden" (test mode).
 * While downloading it shows "12.4 of 28.0 MB" (or only "12.4 MB" if the size is not known).
 */
export function renderModelStatus(status, megabytes = 0, totalMb = 0) {
  const line = $("model-status");
  line.hidden = status === "hidden";
  const downloading = totalMb ? t("model_dl_of", { mb: num(megabytes.toFixed(1)), total: num(totalMb.toFixed(1)) })
                              : t("model_dl", { mb: num(megabytes.toFixed(1)) });
  const text = { info: t("model_info"), downloading, ready: t("model_ready"), missing: t("model_missing"), failed: t("model_fail") };
  line.textContent = text[status] || "";
  line.className = "note model " + status;           // the colour of the line comes from style.css
  // The checking screen shows the download too, so a first check does not look frozen.
  $("checking-note").textContent = status === "downloading" ? downloading : "";
}

/** The big button at the bottom. It always shows the next thing to do: "crop" | "reading" | "photo" | "retake" | "check". */
export function renderNextButton(step) {
  const button = $("next");
  button.textContent = t({ crop: "next_crop", reading: "next_reading", photo: "next_photo", retake: "next_retake", check: "check" }[step]);
  button.dataset.step = step;
  button.disabled = step === "reading";             // wait while the new photo is being opened
  button.classList.toggle("ghost", step !== "check");
}

/** Marks a step as finished on the home screen (green number). */
export function markSteps(crop, photoReady) {
  $("step-crop").classList.toggle("done", !!crop);
  $("step-photo").classList.toggle("done", photoReady);
}

// ------------------------------------------------------------------ checking screen

/** The "checking" screen: the photo and 3 steps. active = index of the step running now (0, 1, 2). */
export function renderChecking(active, photoUrl) {
  if (photoUrl) $("checking-photo").src = photoUrl;
  const steps = ["checking_photo", "checking_weather", "checking_advice"];
  $("checking-steps").innerHTML = steps.map((key, i) =>
    `<li class="${i < active ? "done" : i === active ? "active" : ""}">${t(key)}</li>`).join("");
}

// ------------------------------------------------------------------ result screen (4 kinds)

/** Top 3 possibilities with bars. */
function top3Html(kb, top3) {
  return top3.map(([cls, p]) => `
    <div class="small">${esc(diseaseName(kb, cls))} · ${percent(p)}</div>
    <div class="bar"><i style="width:${Math.round(p * 100)}%"></i></div>`).join("");
}

/** A result card with an icon and a title. */
const card = (iconName, title, body) => `<section class="card"><h3>${icon(iconName)} ${title}</h3>${body}</section>`;

/** The spray card: can I spray, and when. */
function sprayHtml(spray) {
  if (!spray) return "";
  const colour = spray.ok === true ? "good" : spray.ok === false ? "bad" : "";
  let html = `<span class="tag ${colour}">${t("spray_" + spray.key)}</span>`;
  if (spray.ok) {
    html += `<p class="small">${t("spray_next")}:</p><div class="windows">` +
      spray.windows.map(w => `<span>${dateHour(w.start)} – ${num(w.end.slice(11, 16))}</span>`).join("") + "</div>";
  }
  if (spray.rainFreeHours) {
    html += `<p class="small">${spray.labelOnly ? t("spray_label")
      : t("spray_rule", { h: num(spray.rainFreeHours), a: num(spray.windMin), b: num(spray.windMax) })}</p>`;
  }
  return card("wind", t("spray"), html);
}

/** The medicine card: registered brands only. The first 3 are shown; the rest open with "more". */
function medicineHtml(products) {
  if (!products.length) return card("bag", t("medicine"), `<p class="small">${t("medicine_none")}</p>`);
  const one = p => `<div class="product"><b>${esc(p.brand)}</b>
      <div class="small">${t("dose")}: ${esc(p.dose || "-")} · ${t("registration")}: ${esc(p.registration)}</div></div>`;
  let html = `<p class="small">${t("medicine_note")}</p>` + products.slice(0, 3).map(one).join("");
  if (products.length > 3) {
    html += `<details class="more"><summary>${t("more_products", { n: num(products.length - 3) })}</summary>` +
      products.slice(3).map(one).join("") + "</details>";
  }
  return card("bag", t("medicine"), html);
}

/** The healthy-plant card: which diseases the weather favours now. */
function watchHtml(kb, watch) {
  if (!watch) return "";
  if (!watch.length) return `<section class="card"><p>${t("watch_none")}</p></section>`;
  return card("eye", t("watch"),
    watch.map(w => `<p>${esc(diseaseName(kb, w.cls))} <span class="tag ${riskColour(w.level)}">${t("risk_" + w.level)}</span></p>`).join(""));
}

/** The folded "Details" box at the bottom of a result. */
function detailsHtml(kb, r) {
  const row = kb[r.prediction];
  const symptoms = getLang() === "bn" && row.bn.symptoms ? row.bn.symptoms : row.symptoms;
  // Sources: each link from the Excel as a clickable website name, then the cell's own notes (the text without the web addresses).
  const links = (row.links || []).map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join(" · ");
  const notes = row.source.replace(/https?:\/\/[^\s;,)]+/g, "").replace(/^[\s;,]+|[\s;,]+$/g, "").replace(/(\s*;\s*)+/g, "; ");
  const source = [links, notes && !(row.links || []).some(l => l.label === row.source) ? esc(notes) : ""].filter(Boolean).join("<br>");
  return `<details class="box"><summary>${t("details")}</summary><div>
    <h3>${t("top3")}</h3>${top3Html(kb, r.top3)}
    <h3>${t("symptoms")}</h3><p class="small">${esc(symptoms)}</p>
    ${r.risk ? `<h3>${t("risk_reason")}</h3><p class="small">${esc(r.risk.reason)}</p>` : ""}
    <h3>${t("sources")}</h3><p class="small source">${source}</p>
    <p class="small">${t("advice_note")}</p>
  </div></details>`;
}

/** The buttons under every result. The feedback button appears only when CONFIG.FEEDBACK_URL is set. */
function endButtons() {
  let html = `<button type="button" class="btn primary big" data-action="check-another">${t("check_another")}</button>
    <a class="btn big" href="tel:16123">${icon("phone")} ${t("call")}</a>`;
  if (CONFIG.FEEDBACK_URL) {
    html += `<a class="btn link wide" href="${esc(CONFIG.FEEDBACK_URL)}" target="_blank" rel="noopener">${icon("chat")} ${t("feedback")}</a>`;
  }
  return html;
}

/**
 * A finished result (status "ok"). savedTime = when it was saved (shown as a note).
 * The texts are looked up in the knowledge base now, so a saved result follows the language switch.
 */
export function renderResult(kb, r, savedTime) {
  const row = kb[r.prediction];
  const healthy = row.type.toLowerCase().startsWith("healthy");
  const sure = r.confidence >= CONFIG.SURE_LEVEL ? t("sure") : t("fairly_sure");
  const advice = getLang() === "bn" && row.bn.advice ? row.bn.advice : row.management;

  let html = `<div class="answer ${healthy ? "healthy" : ""}">
    <p class="label">${CROPS[r.crop].icon} ${cropName(r.crop)} · ${t("result_label")}</p>
    <p class="name">${healthy ? t("healthy") : esc(diseaseName(kb, r.prediction))}</p>
    <div class="meta"><span class="tag">${sure} · ${percent(r.confidence)} ${t("confidence")}</span>
      ${r.risk ? `<span class="tag ${riskColour(r.risk.level)}">${t("risk_" + r.risk.level)}</span>` : ""}</div>
  </div>`;

  if (r.weatherNote) html += `<div class="alert warn">${t(r.weatherNote)}</div>`;

  if (healthy) {
    html += `<section class="card"><p>${t("urgency_healthy")}</p></section>` + watchHtml(kb, r.watch);
  } else {
    const urgency = r.risk ? t("urgency_" + r.risk.level) : t("urgency_none");
    html += card("todo", t("todo"), `<p><b>${urgency}</b></p><p>${esc(advice)}</p>`);
    html += medicineHtml(row.products) + sprayHtml(r.spray);
  }
  html += endButtons() + detailsHtml(kb, r);
  if (savedTime) html += `<p class="small saved">${t("saved_on")}: ${esc(formatTime(savedTime))}</p>`;
  $("result").innerHTML = html;
}

/** "Not sure" result: below the confidence threshold. */
export function renderNotSure(kb, r) {
  $("result").innerHTML = `<div class="answer notsure">
      <p class="label">${t("result_label")}</p>
      <p class="name">${t("not_sure")}</p><p>${t("not_sure_text")}</p></div>
    <div class="row">
      <button type="button" class="btn primary" data-action="retake">${icon("camera")} ${t("retake")}</button>
      <a class="btn" href="tel:16123">${icon("phone")} ${t("call")}</a></div>
    <details class="box"><summary>${t("top3")}</summary><div>${top3Html(kb, r.top3)}</div></details>`;
}

/** "Wrong crop": the photo looks like another crop. */
export function renderWrongCrop(seen, chosen) {
  const names = { seen: cropName(seen), chosen: cropName(chosen) };
  $("result").innerHTML = `<div class="answer notsure">
      <p class="label">${CROPS[seen].icon} ${t("result_label")}</p>
      <p class="name">${t("wrong_crop", names)}</p><p>${t("wrong_crop_text")}</p></div>
    <button type="button" class="btn primary big" data-action="check-as">${t("check_as", names)}</button>
    <button type="button" class="btn big" data-action="retake">${icon("camera")} ${t("retake")}</button>
    <button type="button" class="btn link wide" data-action="check-anyway">${t("check_anyway", names)}</button>`;
}

/** Something failed. key = the i18n key of the message ("model_missing" or "model_fail"), so it follows the language switch. */
export function renderError(key) {
  $("result").innerHTML = `<div class="answer notsure"><p class="name">${t("error_title")}</p><p>${t(key)}</p></div>
    <div class="row">
      <button type="button" class="btn primary" data-action="retry">${t("retry")}</button>
      <button type="button" class="btn" data-action="check-another">${t("back")}</button></div>`;
}

// ------------------------------------------------------------------ history screen

/** Date and time in the current language, 24-hour clock (for example "20 নভে, ১৪:০৫"). */
function formatTime(time) {
  return new Date(time).toLocaleString(getLang() === "bn" ? "bn-BD" : "en-GB",
    { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
}

/**
 * The history list. items = already filtered; total = how many are saved in all.
 * confirmDelete = id of the item whose delete button was tapped once (it now asks "Delete?"), or "all".
 */
export function renderHistory(kb, items, total, cropFilter, confirmDelete) {
  $("chips").innerHTML = ["all", ...Object.keys(CROPS)].map(crop => `
    <button type="button" class="chip" data-action="filter" data-crop="${crop}" aria-pressed="${crop === cropFilter}">
      ${crop === "all" ? t("all") : CROPS[crop].icon + " " + cropName(crop)}</button>`).join("");

  if (!total) $("history-list").innerHTML = `<p class="empty">${t("history_empty")}</p>`;
  else if (!items.length) $("history-list").innerHTML = `<p class="empty">${t("no_match")}</p>`;
  else {
    $("history-list").innerHTML = items.map(item => `
      <div class="history-item" data-action="open-history" data-id="${esc(item.id)}">
        <img src="${esc(item.thumb)}" alt="">
        <div class="text"><b>${esc(diseaseName(kb, item.prediction))}</b>
          <span>${CROPS[item.crop].icon} ${cropName(item.crop)} · ${esc(formatTime(item.time))}</span></div>
        ${confirmDelete === item.id
          ? `<button type="button" class="delete sure" data-action="delete" data-id="${esc(item.id)}">${t("confirm_delete_one")}</button>`
          : `<button type="button" class="delete" data-action="delete" data-id="${esc(item.id)}" aria-label="${t("delete")}">${icon("x")}</button>`}
      </div>`).join("");
  }
  $("delete-all").hidden = !total;
  $("delete-all").textContent = confirmDelete === "all" ? t("confirm_delete") : t("delete_all");
}
