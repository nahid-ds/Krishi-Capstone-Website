/* i18n.js - all words shown on screen, in Bangla (default) and English. */

const TEXT = {
  bn: {
    app_name: "কৃষি ডাক্তার", app_tag: "ফসলের রোগ চেনার সহায়ক",
    hero_title: "ছবি তুলে জানুন গাছের কী রোগ", hero_sub: "৩টি ধাপ, এক মিনিটের কম সময়।",
    demo_banner: "টেস্ট মোড: মডেল ছাড়া নমুনা ফলাফল দেখানো হচ্ছে।",
    n1: "১", n2: "২", n3: "৩", step_crop: "ফসল বেছে নিন", step_photo: "আক্রান্ত অংশের ছবি তুলুন", step_area: "আপনার এলাকা", optional: "(ঐচ্ছিক)",
    tips_title: "ভালো ছবির জন্য:", tip_light: "দিনের আলো", tip_one: "একটি পাতা", tip_one_potato: "একটি আলু", tip_steady: "হাত স্থির", tip_plain: "সাদামাটা পটভূমি",
    photo_tap: "এখানে চাপুন, ছবি তুলুন", take_photo: "ছবি তুলুন", from_gallery: "গ্যালারি থেকে",
    use_gps: "আমার অবস্থান ব্যবহার করুন", or_district: "অথবা জেলা বেছে নিন", pick_district: "জেলা বেছে নিন…",
    gps_wait: "অবস্থান খোঁজা হচ্ছে…", gps_fail: "অবস্থান পাওয়া যায়নি। জেলা বেছে নিন।", my_location: "আমার অবস্থান", near_district: "আপনার অবস্থান: {name} জেলার কাছে",
    no_area: "এলাকা না দিলে আবহাওয়ার পরামর্শ দেখানো যাবে না।",
    next_crop: "ধাপ ১: উপরে ফসল বেছে নিন", next_reading: "ছবি খোলা হচ্ছে…", next_photo: "ধাপ ২: ছবি তুলুন", next_retake: "আবার ছবি তুলুন", check: "রোগ পরীক্ষা করুন",
    privacy: "ছবি কোথাও পাঠানো হয় না; রোগ নির্ণয় এই ফোনেই হয়।",
    q_blur: "ছবিটি ঝাপসা। হাত স্থির রেখে কাছ থেকে আবার তুলুন।", q_dark: "ছবিটি খুব অন্ধকার। দিনের আলোয় আবার তুলুন।",
    q_bright: "ছবিটি খুব উজ্জ্বল। সরাসরি রোদ এড়িয়ে আবার তুলুন।", q_ok: "ছবি পরিষ্কার আছে।", q_anyway: "তবুও এই ছবি ব্যবহার করুন",
    q_unreadable: "এই ছবিটি খোলা যাচ্ছে না। অন্য ছবি বেছে নিন।",
    q_small: "ছবিটি খুব ছোট। ফোনের ক্যামেরা দিয়ে কাছ থেকে নতুন ছবি তুলুন।",
    model_info: "রোগ চেনার মডেল প্রথমবার এই ফোনে নামবে, পরে আর লাগবে না।", model_dl: "মডেল নামানো হচ্ছে: {mb} MB", model_dl_of: "মডেল নামানো হচ্ছে: {total} MB এর মধ্যে {mb} MB",
    model_ready: "মডেল প্রস্তুত", model_missing: "রোগ চেনার মডেলে পৌঁছানো যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।", model_fail: "মডেল চালু করা যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।",
    checking_photo: "ছবি দেখা হচ্ছে", checking_weather: "আবহাওয়া দেখা হচ্ছে", checking_advice: "পরামর্শ খোঁজা হচ্ছে",
    error_title: "সমস্যা হয়েছে", retry: "আবার চেষ্টা করুন", back: "ফিরে যান",
    result_label: "ফলাফল", sure: "নিশ্চিত", fairly_sure: "মোটামুটি নিশ্চিত", confidence: "নিশ্চয়তা", healthy: "আপনার গাছ সুস্থ মনে হচ্ছে",
    risk_high: "উচ্চ ঝুঁকি", risk_medium: "মাঝারি ঝুঁকি", risk_low: "কম ঝুঁকি", "risk_no rule": "আবহাওয়া-নিয়ম নেই",
    weather_missing: "আবহাওয়ার তথ্য পাওয়া যায়নি, তাই আবহাওয়া ঝুঁকি ও স্প্রের সময় দেখানো হলো না।",
    watch: "নজর রাখুন: এখনকার আবহাওয়া এই রোগগুলোর অনুকূল", watch_none: "এখনকার আবহাওয়ায় বড় কোনো রোগের ঝুঁকি দেখা যাচ্ছে না।",
    todo: "এখন কী করবেন",
    urgency_high: "এখনই ব্যবস্থা নিন: আবহাওয়া এই সমস্যার জন্য খুব অনুকূল।",
    urgency_medium: "শিগগির ব্যবস্থা নিন: আবহাওয়া কিছুটা অনুকূল। ২-৩ দিন পরপর দেখুন।",
    urgency_low: "এখনকার আবহাওয়া রোগ ছড়ানোর অনুকূল নয়। ছড়াতে থাকলে তবেই স্প্রে করুন।",
    "urgency_no rule": "এই সমস্যার জন্য আবহাওয়া-নিয়ম নেই: নিচের পরামর্শ মেনে চলুন।",
    urgency_none: "নিচের পরামর্শ মেনে চলুন।", urgency_healthy: "কোনো চিকিৎসা লাগবে না।",
    spray: "স্প্রে করার সময়", spray_noproduct: "এই সমস্যার জন্য নিবন্ধিত স্প্রে নেই।",
    spray_notfoliar: "এটি পাতায় স্প্রে করার ওষুধ নয় (বীজ শোধন বা দানাদার)।", spray_noforecast: "আবহাওয়ার পূর্বাভাস পাওয়া যায়নি।",
    spray_rain: "আগামী ৭২ ঘণ্টা স্প্রে করবেন না: বৃষ্টির সম্ভাবনা।", spray_wind: "আগামী ৭২ ঘণ্টা স্প্রে করবেন না: বাতাস নিরাপদ সীমার বাইরে।",
    spray_today: "আজ স্প্রে করা যায়", spray_wait: "অপেক্ষা করুন", spray_next: "পরবর্তী নিরাপদ সময়",
    spray_rule: "স্প্রের পর অন্তত {h} ঘণ্টা বৃষ্টি না হওয়া এবং বাতাস {a}–{b} কিমি/ঘণ্টা দরকার।", spray_label: "প্যাকেটের লেবেল মেনে চলুন।",
    medicine: "দোকানে কী চাইবেন", medicine_note: "এর যেকোনো একটি চান। লেবেলের মাত্রা মেনে চলুন।", more_products: "আরও {n}টি ওষুধ দেখুন",
    medicine_none: "বাংলাদেশে নিবন্ধিত কোনো ওষুধ পাওয়া যায়নি। উপজেলা কৃষি অফিসারের পরামর্শ নিন।",
    dose: "মাত্রা", registration: "DAE নিবন্ধন",
    check_another: "আরেকটি গাছ পরীক্ষা করুন", call: "১৬১২৩ এ কল করুন", retake: "আবার ছবি তুলুন",
    details: "বিস্তারিত", top3: "সম্ভাব্য ৩টি ফল", symptoms: "লক্ষণ", sources: "তথ্যসূত্র", risk_reason: "আবহাওয়া-নিয়মের ব্যাখ্যা",
    advice_note: "এই অ্যাপ পরামর্শ দেয়, প্রেসক্রিপশন নয়। সন্দেহ থাকলে উপজেলা কৃষি অফিসার বা ১৬১২৩ এ যোগাযোগ করুন।",
    not_sure: "নিশ্চিত হওয়া যাচ্ছে না", not_sure_text: "দিনের আলোয়, স্থির হাতে, একটি পাতা বা আলুর পরিষ্কার ছবি আবার তুলুন। এরপরও না হলে ১৬১২৩ এ কল করুন।",
    wrong_crop: "এটি {seen} গাছের ছবি মনে হচ্ছে, {chosen} নয়", wrong_crop_text: "ফসল বদলান, অথবা ঠিক ফসলের ছবি আবার তুলুন।",
    check_as: "{seen} হিসেবে পরীক্ষা করুন", check_anyway: "না, এটি {chosen}। তবুও পরীক্ষা করুন",
    saved_on: "সংরক্ষিত", history: "আগের পরীক্ষা", search: "রোগ বা ফসলের নাম খুঁজুন…", all: "সব",
    history_empty: "এখনো কোনো পরীক্ষা নেই।", no_match: "কিছু পাওয়া যায়নি।", delete_all: "সব মুছে ফেলুন", confirm_delete: "নিশ্চিত? আবার চাপুন",
    delete: "মুছুন", confirm_delete_one: "মুছবেন?",
    nav_home: "হোম", nav_history: "ইতিহাস", nav_call: "১৬১২৩",
    feedback: "মতামত দিন (১ মিনিট)",
  },
  en: {
    app_name: "Krishi Doctor", app_tag: "Crop disease helper",
    hero_title: "Take a photo, find out what is wrong with your plant", hero_sub: "3 steps, under a minute.",
    demo_banner: "Test mode: sample results without the model.",
    n1: "1", n2: "2", n3: "3", step_crop: "Choose your crop", step_photo: "Take a photo of the sick part", step_area: "Your area", optional: "(optional)",
    tips_title: "For a good photo:", tip_light: "Daylight", tip_one: "One leaf", tip_one_potato: "One potato", tip_steady: "Hold steady", tip_plain: "Plain background",
    photo_tap: "Tap here to take a photo", take_photo: "Take photo", from_gallery: "From gallery",
    use_gps: "Use my location", or_district: "or pick your district", pick_district: "Pick district…",
    gps_wait: "Finding your location…", gps_fail: "Could not get your location. Pick your district.", my_location: "My location", near_district: "Your location: near {name} district",
    no_area: "Without an area, weather advice cannot be shown.",
    next_crop: "Step 1: choose your crop above", next_reading: "Opening the photo…", next_photo: "Step 2: take a photo", next_retake: "Take the photo again", check: "Check my plant",
    privacy: "The photo is not sent anywhere; the diagnosis runs on this phone.",
    q_blur: "The photo is blurry. Hold still, move closer and try again.", q_dark: "The photo is too dark. Take it again in daylight.",
    q_bright: "The photo is too bright. Avoid direct sun and try again.", q_ok: "Photo is clear.", q_anyway: "Use this photo anyway",
    q_unreadable: "This photo cannot be opened. Choose another photo.",
    q_small: "The photo is too small. Take a new photo close up with the phone camera.",
    model_info: "The disease model downloads to this phone the first time only.", model_dl: "Downloading the model: {mb} MB", model_dl_of: "Downloading the model: {mb} of {total} MB",
    model_ready: "Model ready", model_missing: "Could not reach the disease model. Check your internet connection and try again.", model_fail: "Could not start the model. Check your internet and try again.",
    checking_photo: "Looking at the photo", checking_weather: "Checking the weather", checking_advice: "Finding advice",
    error_title: "Something went wrong", retry: "Try again", back: "Go back",
    result_label: "Result", sure: "Sure", fairly_sure: "Fairly sure", confidence: "confidence", healthy: "Your plant looks healthy",
    risk_high: "High risk", risk_medium: "Medium risk", risk_low: "Low risk", "risk_no rule": "No weather rule",
    weather_missing: "Weather is not available, so weather risk and spray timing are not shown.",
    watch: "Keep watch: the current weather favours these diseases", watch_none: "The current weather does not favour any major disease.",
    todo: "What to do now",
    urgency_high: "Act now: the weather strongly favours this problem.",
    urgency_medium: "Act soon: the weather is partly favourable. Check every 2-3 days.",
    urgency_low: "The weather does not favour spread now. Spray only if it keeps spreading.",
    "urgency_no rule": "No weather rule for this problem: follow the advice below.",
    urgency_none: "Follow the advice below.", urgency_healthy: "No treatment needed.",
    spray: "When to spray", spray_noproduct: "No registered spray for this problem.",
    spray_notfoliar: "Not a foliar spray (seed treatment or granules).", spray_noforecast: "No forecast available.",
    spray_rain: "Don't spray in the next 72 h: rain expected.", spray_wind: "Don't spray in the next 72 h: wind outside the safe range.",
    spray_today: "Spray today", spray_wait: "Wait", spray_next: "next safe window",
    spray_rule: "Needs {h} rain-free hours after spraying and wind {a}–{b} km/h.", spray_label: "Follow the product label.",
    medicine: "What to ask for at the shop", medicine_note: "Ask for any one of these. Follow the label dose.", more_products: "Show {n} more",
    medicine_none: "No product is registered in Bangladesh for this problem. Ask your Upazila agriculture officer.",
    dose: "Dose", registration: "DAE reg.",
    check_another: "Check another plant", call: "Call 16123", retake: "Retake photo",
    details: "Details", top3: "Top 3 possibilities", symptoms: "Symptoms", sources: "Sources", risk_reason: "Weather rule explanation",
    advice_note: "This app gives advice, not a prescription. If in doubt, contact your Upazila agriculture officer or call 16123.",
    not_sure: "We are not sure", not_sure_text: "Retake the photo in daylight, with a steady hand, of one clear leaf or potato. If still not sure, call 16123.",
    wrong_crop: "This looks like a {seen} plant, not {chosen}", wrong_crop_text: "Change the crop, or take a new photo of the right crop.",
    check_as: "Check it as {seen}", check_anyway: "No, it is {chosen}. Check anyway",
    saved_on: "Saved", history: "Past checks", search: "Search disease or crop…", all: "All",
    history_empty: "No checks yet.", no_match: "Nothing found.", delete_all: "Delete all", confirm_delete: "Sure? Tap again",
    delete: "Delete", confirm_delete_one: "Delete?",
    nav_home: "Home", nav_history: "History", nav_call: "16123",
    feedback: "Give feedback (1 minute)",
  },
};

let lang = "bn";

/** Current language: "bn" or "en". */
export const getLang = () => lang;

/** Change the language. */
export function setLang(newLang) { lang = newLang === "en" ? "en" : "bn"; }

/** Text for a key in the current language. {name} parts are filled from vars. */
export function t(key, vars = {}) {
  let s = TEXT[lang][key] ?? TEXT.en[key] ?? key;
  for (const k in vars) s = s.replace(`{${k}}`, vars[k]);
  return s;
}

/** Numbers in Bangla digits when the language is Bangla (12 -> ১২). */
export function num(value) {
  return lang === "bn" ? String(value).replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[d]) : String(value);
}
