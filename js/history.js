/* history.js - past results, saved only in this browser (localStorage). */

import { CONFIG } from "./config.js";

const KEY = "krishi.history";

/** All saved results, newest first. */
export function loadHistory() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
}

/** Saves the list; if the browser storage is full, the oldest results are dropped. */
function store(list) {
  while (list.length) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return; } catch (e) { list = list.slice(0, -1); }
  }
  try { localStorage.setItem(KEY, "[]"); } catch (e) { /* storage blocked */ }
}

/** Adds one result (with its thumbnail) at the top of the list. Returns the saved item. */
export function addToHistory(result, thumb) {
  const item = { ...result, id: Date.now().toString(36), time: Date.now(), thumb };
  store([item, ...loadHistory()].slice(0, CONFIG.HISTORY_MAX));
  return item;
}

/** Deletes one result by id. */
export function deleteFromHistory(id) { store(loadHistory().filter(item => item.id !== id)); }

/** Deletes everything. */
export function clearHistory() { store([]); }

/**
 * Filters the history: crop = "all" or a crop name; words = search text matched against the given
 * searchable text of each item (disease names in both languages, crop names).
 */
export function searchHistory(list, crop, words, searchableText) {
  const terms = words.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return list.filter(item =>
    (crop === "all" || item.crop === crop) &&
    terms.every(term => searchableText(item).toLowerCase().includes(term)));
}
