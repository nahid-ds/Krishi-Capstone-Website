/* config.js - every setting of the website in one place.
   Change the model address here when the hosting is decided. */

export const CONFIG = {
  // Where the model and its calibration file are. The first folder that has calibration_for_app.json is used.
  // "model/" = the model folder next to index.html (good for testing with Live Server).
  // The second line = a public Hugging Face model repository (good for the live website).
  MODEL_BASE_URLS: [
     "https://huggingface.co/Lamyea/krishi-doctor-model/resolve/main/",
  "model/",
  ],
  // Model files tried in this order: the small int8 copy first, the full model if the small one is missing.
  MODEL_FILES: ["convnext_tiny_int8.onnx", "convnext_tiny.onnx"],
  CALIBRATION_FILE: "calibration_for_app.json",
  // If the model download receives nothing for this many seconds (weak signal), it stops and says so.
  MODEL_STALL_SECONDS: 30,

  // onnxruntime-web runs the ONNX model inside the browser (WebAssembly).
  ORT_SCRIPT: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/ort.min.js",
  ORT_WASM_FOLDER: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/",

  // Decision thresholds (same as notebook 08 and recommender.py).
  NOT_SURE_THRESHOLD: 0.58,       // replaced by the value in calibration_for_app.json when it loads
  WRONG_CROP_THRESHOLD: 0.5,      // another crop gets more than half of the probability -> "wrong crop"
  SURE_LEVEL: 0.85,               // confidence from here up is shown as "sure", below as "fairly sure"

  // Photo quality check.
  BLUR_MIN: 60,                   // sharpness score below this = blurry
  DARK_MIN: 45,                   // average brightness (0-255) below this = too dark
  BRIGHT_MAX: 235,                // above this = washed out
  PHOTO_MIN_SIDE: 100,            // a photo smaller than 100 px on its short side is too small to check

  // "Use my location": the nearest district is shown if it is closer than this (otherwise "My location").
  MAX_DISTRICT_KM: 100,
  // Give up on the place name (OpenStreetMap) after this many seconds; the nearest district is shown instead.
  PLACE_TIMEOUT_SECONDS: 8,

  HISTORY_MAX: 50,                // results kept in this browser

  // Link of your Google Form for feedback. Empty "" = no feedback button.
  FEEDBACK_URL: "",

  // Testing switch: true = no model needed, the result is a fixed sample (a banner says so). Keep false.
  DEMO_MODE: false,
};

export const CROPS = {
  Rice:   { bn: "ধান",   en: "Rice",   icon: "🌾" },
  Potato: { bn: "আলু",   en: "Potato", icon: "🥔" },
  Tomato: { bn: "টমেটো", en: "Tomato", icon: "🍅" },
  Mango:  { bn: "আম",    en: "Mango",  icon: "🥭" },
};
