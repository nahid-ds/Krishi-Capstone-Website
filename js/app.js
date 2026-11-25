/* app.js - the starting point. It keeps the state of the app, reacts to taps and runs a check:
   photo -> model (model.js) -> weather (weather.js) -> result (recommend.js) -> screen (ui.js) + history (history.js). */

import { CONFIG } from "./config.js";
import { t, getLang, setLang } from "./i18n.js";
import { readPhoto, photoProblem } from "./photo.js";
import { loadCalibration, loadModel, diagnose, demoDiagnose } from "./model.js";
import { getWeather } from "./weather.js";
import { placeName } from "./place.js";
import { buildResult } from "./recommend.js";
import { loadHistory, addToHistory, deleteFromHistory, clearHistory, searchHistory } from "./history.js";
import * as ui from "./ui.js";

const $ = ui.$;

// Everything the app needs to remember while it is open.
const state = {
  kb: {},                 // knowledge base: class name -> treatment, products, weather rule
  districts: [],          // 64 districts with their latitude and longitude
  crop: null,             // "Rice" | "Potato" | "Tomato" | "Mango"
  photo: null,            // from readPhoto(): { img, url, thumb, quality }
  problem: null,          // photo problem: "q_blur" | "q_dark" | "q_bright" | null
  photoAccepted: false,   // the farmer chose "use this photo anyway"
  photoUnreadable: false,
  readingPhoto: false,    // a new photo is being opened (the Check button waits)
  place: null,            // { lat, lon, district } used for the weather
  gps: "idle",            // "idle" | "waiting" | "failed"
  calibration: null,      // promise: true when calibration_for_app.json is found (it loads while the page starts)
  modelFound: false,      // calibration_for_app.json was found
  modelStatus: "info",
  modelMb: 0,             // megabytes downloaded so far
  modelTotalMb: 0,        // size of the model file (0 = not known)
  checkId: 0,             // number of the latest check; an older check that is still running is ignored
  checkStep: 0,           // step shown on the checking screen (0 photo, 1 weather, 2 advice)
  screen: "home",
  shown: null,            // what the result screen shows: { kind, data }, re-drawn when the language changes
  historyCrop: "all",
  confirmDelete: null,    // History: id of the item whose delete button was tapped once, or "all"
};

// ------------------------------------------------------------------ drawing

/** Which step the farmer should do next. */
function nextStep() {
  if (!state.crop) return "crop";
  if (state.readingPhoto) return "reading";
  if (!state.photo) return "photo";
  if (state.problem && !state.photoAccepted) return "retake";
  return "check";
}

function drawHome() {
  ui.renderCrops(state.crop);
  ui.renderTips(state.crop);
  ui.renderPhoto(state.photo, state.problem, state.photoAccepted, state.photoUnreadable);
  ui.renderDistricts(state.districts, state.place);
  ui.renderPlace(state.place, state.gps, state.districts);
  drawModelStatus();
  ui.renderNextButton(nextStep());
  ui.markSteps(state.crop, nextStep() === "check");
}

function drawModelStatus() {
  ui.renderModelStatus(CONFIG.DEMO_MODE ? "hidden" : state.modelStatus, state.modelMb, state.modelTotalMb);
}

function drawShown() {
  const { kind, data } = state.shown;
  if (kind === "result") ui.renderResult(state.kb, data, data.time);
  if (kind === "not_sure") ui.renderNotSure(state.kb, data);
  if (kind === "wrong_crop") ui.renderWrongCrop(data.detectedCrop, data.chosen);
  if (kind === "error") ui.renderError(data.key);
}

function drawHistory() {
  // Items whose disease is no longer in the knowledge base (renamed in the Excel) are skipped, so they cannot break the list.
  const all = loadHistory().filter(item => state.kb[item.prediction]);
  const words = $("search").value;
  const found = searchHistory(all, state.historyCrop, words, item =>
    [item.prediction, state.kb[item.prediction].bn.name, item.crop, ui.cropName(item.crop)].join(" "));
  ui.renderHistory(state.kb, found, all.length, state.historyCrop, state.confirmDelete);
}

// ------------------------------------------------------------------ moving between screens

/**
 * Shows a screen. how = "push" adds it to the browser history (so the phone's Back button returns here),
 * "replace" swaps the current entry, "none" changes nothing (used when Back was pressed).
 */
function go(screen, how = "push") {
  state.screen = screen;
  if (screen === "history") { state.confirmDelete = null; drawHistory(); }
  ui.showScreen(screen);
  if (how === "push") history.pushState({ screen }, "");
  if (how === "replace") history.replaceState({ screen }, "");
}

/** Phone Back button: show the screen saved in the browser history. */
window.addEventListener("popstate", event => {
  let screen = event.state?.screen || "home";
  if (screen === "checking" || (screen === "result" && !state.shown)) screen = "home";
  go(screen, "none");
});

/** Shows something on the result screen. The checking screen is replaced, so Back goes to home. */
function show(kind, data) {
  state.shown = { kind, data };
  drawShown();
  if (state.screen === "checking") go("result", "replace");
}

/** Back to home with an empty photo, ready for the next plant (crop and area are kept). */
function startAgain() {
  state.photo = null;
  state.problem = null;
  state.photoAccepted = false;
  state.photoUnreadable = false;
  drawHome();
  go("home");
}

// ------------------------------------------------------------------ the 3 steps

function chooseCrop(crop) {
  state.crop = crop;
  drawHome();
  startModelDownload();
}

/**
 * Finds calibration_for_app.json. If it was not found before (for example the internet dropped while the page
 * was opening), it asks again, so one bad moment does not break the app until the page is reloaded.
 */
async function findModel() {
  if (!(await state.calibration)) state.calibration = loadCalibration();
  state.modelFound = await state.calibration;
  return state.modelFound;
}

/** Starts downloading the model as soon as a crop is chosen, so it is ready when the photo is taken. */
async function startModelDownload() {
  if (CONFIG.DEMO_MODE || state.modelStatus === "ready") return;
  if (!(await findModel())) { state.modelStatus = "missing"; drawModelStatus(); return; }
  try {
    await loadModel(onModelProgress);
    state.modelStatus = "ready";
  } catch (e) {
    state.modelStatus = "failed";
  }
  drawModelStatus();
}

function onModelProgress(bytes, totalBytes) {
  state.modelStatus = "downloading";
  state.modelMb = bytes / 1e6;
  state.modelTotalMb = totalBytes / 1e6;
  drawModelStatus();
}

async function onPhotoChosen(input) {
  const file = input.files[0];
  input.value = "";                        // so the same photo can be chosen again
  if (!file) return;
  if (state.photo) URL.revokeObjectURL(state.photo.url);   // free the memory of the old photo
  state.readingPhoto = true;               // the Check button waits until the new photo is ready
  drawHome();
  try {
    state.photo = await readPhoto(file);
    state.problem = photoProblem(state.photo.quality);
    state.photoUnreadable = false;
  } catch (e) {
    state.photo = null;
    state.problem = null;
    state.photoUnreadable = true;
  }
  state.photoAccepted = false;
  state.readingPhoto = false;
  drawHome();
}

function useMyLocation() {
  if (!navigator.geolocation) { state.gps = "failed"; drawHome(); return; }
  state.gps = "waiting";
  drawHome();
  navigator.geolocation.getCurrentPosition(
    position => {
      if (state.gps !== "waiting") return;   // the farmer picked a district meanwhile: keep the district
      // Rounded to 4 decimals (about 10 m): enough for the pin on the map. (The weather call rounds it to about 1 km.)
      const lat = +position.coords.latitude.toFixed(4), lon = +position.coords.longitude.toFixed(4);
      // 1. At once, without internet: the nearest district from our list.
      const near = nearestDistrict(lat, lon);
      const place = { lat, lon, district: near ? near.en : null, fromGps: true, name: null };
      state.place = place;
      state.gps = "idle";
      drawHome();
      // 2. With internet: the real place name from OpenStreetMap ("Mirpur, Dhaka") and the map.
      //    Shown only if the farmer has not chosen another place meanwhile. If it fails, step 1 stays.
      placeName(lat, lon, getLang()).then(name => {
        if (name && state.place === place) { place.name = name; drawHome(); }
      });
    },
    () => { if (state.gps === "waiting") { state.gps = "failed"; drawHome(); } },
    { timeout: 15000, maximumAge: 600000 });
}

/**
 * The district whose centre is closest to the GPS point, from data/districts.json (64 districts).
 * Distance in km with a flat-map formula: 1 degree of latitude = 111 km, and 1 degree of longitude is shorter
 * by cos(latitude). This is accurate enough inside Bangladesh. Returns null if the point is more than
 * MAX_DISTRICT_KM from every district (for example, the phone is outside Bangladesh).
 */
function nearestDistrict(lat, lon) {
  let best = null, bestKm = Infinity;
  for (const d of state.districts) {
    const dy = (d.lat - lat) * 111;
    const dx = (d.lon - lon) * 111 * Math.cos(lat * Math.PI / 180);
    const km = Math.sqrt(dx * dx + dy * dy);
    if (km < bestKm) { best = d; bestKm = km; }
  }
  return bestKm <= CONFIG.MAX_DISTRICT_KM ? best : null;
}

function chooseDistrict(index) {
  const d = state.districts[index];
  state.place = d ? { lat: d.lat, lon: d.lon, district: d.en } : null;
  state.gps = "idle";
  drawHome();
}

// ------------------------------------------------------------------ running a check

/**
 * Runs one check. checkCrop = false when the farmer says "it is the crop I chose, check anyway".
 * Every check gets a number (checkId). After each slow step we test stillWanted(): if the farmer pressed Back,
 * or started a newer check, this check stops quietly and shows nothing.
 */
async function runCheck(checkCrop = true) {
  if (state.screen === "checking" || state.readingPhoto || !state.crop || !state.photo) return;   // also stops double taps
  const id = ++state.checkId;
  const stillWanted = () => id === state.checkId && state.screen === "checking";
  const crop = state.crop, photo = state.photo;
  setCheckingStep(0, photo.url);
  go("checking", state.screen === "result" ? "replace" : "push");   // a re-check from the result screen replaces it
  try {
    // 1. Diagnosis by the model (or the fixed sample in test mode).
    let diagnosis;
    if (CONFIG.DEMO_MODE) diagnosis = demoDiagnose(crop, state.kb);
    else {
      if (!(await findModel())) throw new Error("model_missing");
      await loadModel(onModelProgress);
      state.modelStatus = "ready";
      drawModelStatus();
      diagnosis = await diagnose(photo.img, crop, checkCrop);
    }
    if (!stillWanted()) return;
    if (diagnosis.status === "wrong_crop") { show("wrong_crop", { ...diagnosis, chosen: crop }); return; }

    // 2. Weather, only when there is a diagnosis and an area. If it fails, the result is still shown.
    setCheckingStep(1);
    let weather = null;
    if (diagnosis.status === "ok" && state.place) {
      try { weather = await getWeather(state.place.lat, state.place.lon); } catch (e) { weather = null; }
    }
    if (!stillWanted()) return;

    // 3. Advice, then save it in History.
    setCheckingStep(2);
    let result = buildResult(state.kb, crop, diagnosis, weather);
    if (result.status === "not_sure") { show("not_sure", result); return; }
    if (!weather) result.weatherNote = state.place ? "weather_missing" : "no_area";
    result = addToHistory(result, photo.thumb);
    show("result", result);
  } catch (e) {
    console.error(e);
    if (!CONFIG.DEMO_MODE) { state.modelStatus = state.modelFound ? "failed" : "missing"; drawModelStatus(); }
    if (stillWanted()) show("error", { key: e.message === "model_missing" ? "model_missing" : "model_fail" });
  }
}

/** Shows which step of the check is running (0 photo, 1 weather, 2 advice). It is remembered for the language switch. */
function setCheckingStep(step, photoUrl) {
  state.checkStep = step;
  ui.renderChecking(step, photoUrl);
}

// ------------------------------------------------------------------ taps

/** One click handler for every button that has data-action="...". */
document.addEventListener("click", event => {
  const el = event.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;

  if (action === "lang") {
    setLang(getLang() === "bn" ? "en" : "bn");
    try { localStorage.setItem("krishi.lang", getLang()); } catch (e) { /* storage blocked */ }
    ui.applyLanguage();
    drawHome();
    if (state.shown) drawShown();
    if (state.screen === "history") drawHistory();
    if (state.screen === "checking") ui.renderChecking(state.checkStep);
  }
  if (action === "nav" && el.dataset.screen !== state.screen) go(el.dataset.screen);
  if (action === "crop") chooseCrop(el.dataset.crop);
  if (action === "photo-anyway") { state.photoAccepted = true; drawHome(); }
  if (action === "gps") useMyLocation();
  if (action === "next") {
    const step = el.dataset.step;
    if (step === "crop") $("crops").scrollIntoView({ behavior: "smooth", block: "center" });
    if (step === "photo" || step === "retake") $("camera").click();
    if (step === "check") runCheck(true);
  }

  // Result screen buttons
  if (action === "check-another") startAgain();
  if (action === "retake") { startAgain(); $("camera").click(); }
  if (action === "retry") runCheck(true);
  if (action === "check-as") { state.crop = state.shown.data.detectedCrop; drawHome(); runCheck(true); }
  if (action === "check-anyway") runCheck(false);

  // History screen buttons
  // Deleting needs two taps: the first tap asks "Delete?", the second tap deletes.
  if (action === "filter") { state.historyCrop = el.dataset.crop; state.confirmDelete = null; drawHistory(); }
  if (action === "delete") {
    if (state.confirmDelete === el.dataset.id) { deleteFromHistory(el.dataset.id); state.confirmDelete = null; }
    else state.confirmDelete = el.dataset.id;
    drawHistory();
  }
  if (action === "delete-all") {
    if (state.confirmDelete === "all") { clearHistory(); state.confirmDelete = null; }
    else state.confirmDelete = "all";
    drawHistory();
  }
  if (action === "open-history") {
    const item = loadHistory().find(i => i.id === el.dataset.id);
    if (item) { state.shown = { kind: "result", data: item }; drawShown(); go("result"); }
  }
});

$("camera").addEventListener("change", event => onPhotoChosen(event.target));
$("gallery").addEventListener("change", event => onPhotoChosen(event.target));
$("district").addEventListener("change", event => chooseDistrict(event.target.value));
$("search").addEventListener("input", drawHistory);

// ------------------------------------------------------------------ start

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(path + " " + response.status);
  return response.json();
}

async function start() {
  try { setLang(localStorage.getItem("krishi.lang") || "bn"); } catch (e) { /* storage blocked */ }
  if (!CONFIG.DEMO_MODE) state.calibration = loadCalibration();     // starts now, at the same time as the data files
  [state.kb, state.districts] = await Promise.all([loadJson("data/knowledge_base.json"), loadJson("data/districts.json")]);
  $("demo-banner").hidden = !CONFIG.DEMO_MODE;
  if (CONFIG.FEEDBACK_URL) { $("feedback").href = CONFIG.FEEDBACK_URL; $("feedback").hidden = false; }
  ui.applyLanguage();
  drawHome();
  go("home", "replace");
  if (!CONFIG.DEMO_MODE) {
    state.modelFound = await state.calibration;
    if (state.modelStatus === "info" && !state.modelFound) state.modelStatus = "missing";
    drawModelStatus();
  }
}

start().catch(e => {
  console.error(e);
  $("start-error").hidden = false;
});
