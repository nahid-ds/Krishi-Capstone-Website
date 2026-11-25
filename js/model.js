/* model.js - runs the ConvNeXt-Tiny ONNX model inside the browser and turns its output into a diagnosis.
   Same steps as recommender.py (notebook 09):
     photo -> resize to 224x224 (bilinear) -> /255 -> (x - mean) / std -> model -> 37 logits
     -> wrong-crop check (all 37 classes) -> keep only the chosen crop's classes
     -> softmax(logits / T) = calibrated confidence -> "not sure" if below the threshold */

import { CONFIG } from "./config.js";
import { drawScaled } from "./photo.js";

let calibration = null;   // contents of calibration_for_app.json (T, threshold, class names, mean, std)
let baseUrl = null;       // folder where the model files were found
let session = null;       // the loaded ONNX model
let loading = null;       // promise while the model is downloading

/** Finds calibration_for_app.json in the folders listed in config.js. Returns true if found. */
export async function loadCalibration() {
  for (const base of CONFIG.MODEL_BASE_URLS) {
    try {
      const response = await fetch(base + CONFIG.CALIBRATION_FILE, { cache: "no-cache" });
      if (!response.ok) continue;
      calibration = await response.json();
      baseUrl = base;
      CONFIG.NOT_SURE_THRESHOLD = calibration.not_sure_threshold;
      return true;
    } catch (e) { /* folder not reachable: try the next one */ }
  }
  // A message for you (the developer) in the browser console (F12), not for the farmer.
  console.warn("calibration_for_app.json not found in:", CONFIG.MODEL_BASE_URLS.join(" , "));
  return false;
}

/** Class names in model output order (from the calibration file). */
export const classNames = () => calibration.class_names;

/** Adds the onnxruntime-web script to the page. */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("could not load " + src));
    document.head.appendChild(s);
  });
}

/** Opens the browser cache for the model, or null if this browser does not allow it (private mode, http). */
async function openCache() {
  try { return window.caches && window.isSecureContext ? await caches.open("krishi-model") : null; } catch (e) { return null; }
}

/**
 * Downloads a file, reporting progress as onProgress(bytesReceived, totalBytes).
 * The file is saved in the browser cache so the next visit needs no download.
 * Throws Error("missing") if the file does not exist (404), so the caller can try the next file.
 */
async function downloadWithCache(url, onProgress) {
  const cache = await openCache();
  const saved = cache ? await cache.match(url) : null;
  if (saved) return new Uint8Array(await saved.arrayBuffer());

  // Stall timer: if no data arrives for MODEL_STALL_SECONDS, stop the download (weak signal) instead of waiting forever.
  const stop = new AbortController();
  let timer = setTimeout(() => stop.abort(), CONFIG.MODEL_STALL_SECONDS * 1000);
  const parts = [];
  let received = 0;
  try {
    const response = await fetch(url, { signal: stop.signal });
    if (response.status === 404) throw new Error("missing");
    if (!response.ok) throw new Error(`model file ${response.status}`);
    const total = Number(response.headers.get("content-length")) || 0;   // 0 = size not known
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      received += value.length;
      onProgress(received, total);
      clearTimeout(timer);                                               // data arrived: restart the stall timer
      timer = setTimeout(() => stop.abort(), CONFIG.MODEL_STALL_SECONDS * 1000);
    }
  } finally {
    clearTimeout(timer);
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const p of parts) { bytes.set(p, offset); offset += p.length; }
  // Saving can fail when the phone is short of space. The model still works now; it is downloaded again next time.
  if (cache) { try { await cache.put(url, new Response(bytes)); } catch (e) { console.warn("model not cached", e); } }
  return bytes;
}

/** Downloads (first time) and starts the model. Safe to call many times: it only loads once. */
export function loadModel(onProgress = () => {}) {
  if (session) return Promise.resolve();
  if (!loading) {
    loading = (async () => {
      if (!window.ort) await loadScript(CONFIG.ORT_SCRIPT);
      ort.env.wasm.wasmPaths = CONFIG.ORT_WASM_FOLDER;
      ort.env.wasm.numThreads = 1;
      let lastError = new Error("no model file found");
      for (const file of CONFIG.MODEL_FILES) {           // int8 first, full model if the small one is missing
        let bytes;
        try {
          bytes = await downloadWithCache(baseUrl + file, onProgress);
        } catch (e) {
          if (e.message === "missing") continue;           // this file is not online: try the next one
          throw e;                                         // the download broke: stop here, do not start the bigger file
        }
        try {
          session = await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"] });
          return;
        } catch (e) { lastError = e; }                     // the file is not a working model: try the next one
      }
      throw lastError;
    })();
    loading.catch(() => { loading = null; });             // allow a retry after a failure
  }
  return loading;
}

/** Bilinear resize like Python's PIL (used in training), RGB pixels in and out. Done as two 1-D passes. */
function resizeBilinear(src, srcW, srcH, dstW, dstH) {
  function onePass(input, inW, inH, outSize, horizontal) {
    const inSize = horizontal ? inW : inH;
    const scale = inSize / outSize, support = Math.max(scale, 1);
    const output = new Uint8ClampedArray(horizontal ? outSize * inH * 3 : inW * outSize * 3);
    for (let o = 0; o < outSize; o++) {
      const center = (o + 0.5) * scale;
      const first = Math.max(0, Math.trunc(center - support + 0.5));
      const last = Math.min(inSize, Math.trunc(center + support + 0.5));
      const weights = [];
      for (let i = first; i < last; i++) weights.push(Math.max(0, 1 - Math.abs((i - center + 0.5) / support)));
      const sum = weights.reduce((a, b) => a + b, 0) || 1;
      const lines = horizontal ? inH : inW;
      for (let line = 0; line < lines; line++) {
        let r = 0, g = 0, b = 0;
        weights.forEach((w, k) => {
          const i = first + k, idx = horizontal ? (line * inW + i) * 3 : (i * inW + line) * 3;
          r += input[idx] * w; g += input[idx + 1] * w; b += input[idx + 2] * w;
        });
        const out = horizontal ? (line * outSize + o) * 3 : (o * inW + line) * 3;
        output[out] = Math.round(r / sum); output[out + 1] = Math.round(g / sum); output[out + 2] = Math.round(b / sum);
      }
    }
    return output;
  }
  return onePass(onePass(src, srcW, srcH, dstW, true), dstW, srcH, dstH, false);
}

/** Photo -> model input: 1 x 3 x 224 x 224 numbers, normalised with the training mean and std. */
function imageToTensor(img) {
  const size = calibration.img_size;
  const canvas = drawScaled(img, 1024);                  // huge photos are first shrunk to save phone memory
  const rgba = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  const rgb = new Uint8ClampedArray(canvas.width * canvas.height * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) { rgb[j] = rgba[i]; rgb[j + 1] = rgba[i + 1]; rgb[j + 2] = rgba[i + 2]; }
  const small = resizeBilinear(rgb, canvas.width, canvas.height, size, size);
  const data = new Float32Array(3 * size * size);
  for (let p = 0; p < size * size; p++) {
    for (let c = 0; c < 3; c++) {
      data[c * size * size + p] = (small[p * 3 + c] / 255 - calibration.mean[c]) / calibration.std[c];
    }
  }
  return new ort.Tensor("float32", data, [1, 3, size, size]);
}

/** Softmax: turns scores into probabilities that add up to 1. */
function softmax(scores) {
  const max = Math.max(...scores);
  const exps = scores.map(s => Math.exp(s - max));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / total);
}

/** The 3 most likely classes as [className, probability]. */
function top3(probs) {
  return probs.map((p, i) => [calibration.class_names[i], p]).sort((a, b) => b[1] - a[1]).slice(0, 3);
}

/**
 * Diagnoses one photo for the chosen crop.
 * Returns { status: "wrong_crop", detectedCrop, cropShares, top3 }
 *      or { status: "ok" | "not_sure", prediction, confidence, top3 }.
 * checkCrop = false skips the wrong-crop check (when the farmer says "check anyway").
 */
export async function diagnose(img, crop, checkCrop = true) {
  const input = imageToTensor(img);
  const output = await session.run({ [session.inputNames[0]]: input });
  const logits = Array.from(output[session.outputNames[0]].data);
  const scaled = logits.map(z => z / calibration.temperature);        // temperature scaling (calibration)
  const cropOf = calibration.class_to_crop;

  // 1. Wrong-crop check: add up the probability of each crop over all 37 classes.
  if (checkCrop) {
    const probs = softmax(scaled), shares = {};
    probs.forEach((p, i) => { shares[cropOf[i]] = (shares[cropOf[i]] || 0) + p; });
    const other = Object.keys(shares).filter(c => c !== crop).sort((a, b) => shares[b] - shares[a])[0];
    if (shares[other] > CONFIG.WRONG_CROP_THRESHOLD && shares[other] > (shares[crop] || 0)) {
      return { status: "wrong_crop", detectedCrop: other, cropShares: shares, top3: top3(probs) };
    }
  }

  // 2. Keep only the chosen crop's classes, then calibrated probabilities.
  const masked = scaled.map((z, i) => (cropOf[i] === crop ? z : -Infinity));
  const best = top3(softmax(masked));
  const [prediction, confidence] = best[0];

  // 3. "Not sure" if the best class is below the threshold.
  return { status: confidence < CONFIG.NOT_SURE_THRESHOLD ? "not_sure" : "ok", prediction, confidence, top3: best };
}

/** Test mode only (CONFIG.DEMO_MODE): a fixed sample result for the chosen crop, without the model. */
export function demoDiagnose(crop, kb) {
  const classes = Object.keys(kb).filter(c => kb[c].crop === crop);
  return { status: "ok", prediction: classes[0], confidence: 0.9,
           top3: [[classes[0], 0.9], [classes[1], 0.06], [classes[2], 0.02]] };
}
