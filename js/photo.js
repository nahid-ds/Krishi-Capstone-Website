/* photo.js - reads the farmer's photo and checks if it is good enough (blur, darkness). */

import { CONFIG } from "./config.js";

/** Opens an image file and returns the loaded <img> element. */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("unreadable image"));
    img.src = URL.createObjectURL(file);
  });
}

/** Draws the image on a canvas whose longest side is at most maxSide pixels. */
export function drawScaled(img, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Photo quality on a 256 px grey copy:
 *  - brightness = average grey value (0 = black, 255 = white)
 *  - sharpness  = variance of the Laplacian (edges). A blurry photo has weak edges, so a low value.
 */
function measureQuality(img) {
  const canvas = drawScaled(img, 256), w = canvas.width, h = canvas.height;
  const px = canvas.getContext("2d").getImageData(0, 0, w, h).data;
  const grey = new Float32Array(w * h);
  let total = 0;
  for (let i = 0; i < w * h; i++) {
    grey[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
    total += grey[i];
  }
  const values = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      values.push(grey[i - 1] + grey[i + 1] + grey[i - w] + grey[i + w] - 4 * grey[i]);   // Laplacian
    }
  }
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return { brightness: total / (w * h), sharpness: variance, width: img.naturalWidth, height: img.naturalHeight };
}

/** Reads a photo file: returns the image, a small thumbnail for History, and the quality numbers. */
export async function readPhoto(file) {
  const img = await loadImage(file);
  return {
    img,
    url: img.src,
    thumb: drawScaled(img, 120).toDataURL("image/jpeg", 0.6),
    quality: measureQuality(img),
  };
}

/** Returns the problem with the photo ("q_small", "q_dark", "q_bright", "q_blur") or null if it is fine. */
export function photoProblem(quality) {
  if (Math.min(quality.width, quality.height) < CONFIG.PHOTO_MIN_SIDE) return "q_small";
  if (quality.brightness < CONFIG.DARK_MIN) return "q_dark";
  if (quality.brightness > CONFIG.BRIGHT_MAX) return "q_bright";
  if (quality.sharpness < CONFIG.BLUR_MIN) return "q_blur";
  return null;
}
