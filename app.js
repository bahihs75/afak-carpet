// AFAK CARPET — shared data layer.
// Single Firestore document holds the whole site (content/site), mirroring
// the AFAK DECO architecture: cheap reads, one listener, no backend server.
import { db } from "./firebase-init.js";
import {
  doc, getDoc, setDoc, onSnapshot, collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { DEFAULT_IMGBB_KEY } from "./firebase-config.js";

const SITE_DOC = doc(db, "content", "site");
const ORDERS_COL = collection(db, "orders");

/* ------------------------------------------------------------------ */
/* Default content — used the very first time the site loads with an  */
/* empty database, so admin never faces a broken blank page.          */
/* ------------------------------------------------------------------ */
export const DEFAULT_SITE = {
  settings: {
    siteName: "AFAK CARPET",
    logoUrl: "",
    imgbbKey: DEFAULT_IMGBB_KEY,
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    socials: { instagram: "", facebook: "", tiktok: "", linkedin: "" },
    // Shared color-swatch palette used by the filter on any section that
    // enables it (category.showColorFilter). Admin can add/remove/edit hex.
    colorPalette: [
      { id: "blue", name: "أزرق", hex: "#1F4E8C" },
      { id: "bordeaux", name: "بوردو", hex: "#6D1B2A" },
      { id: "gris", name: "رمادي", hex: "#8A8D91" },
      { id: "green", name: "أخضر", hex: "#2F6B3A" }
    ]
  },
  hero: {
    slides: [
      {
        id: "s1",
        image: "",
        eyebrow: "AFAK CARPET",
        title: "سجاد يُصنع ليُصلَّى عليه ويدوم",
        text: "تجهيز المساجد والفنادق والمؤسسات بسجاد عالي الجودة، بمقاسات مخصصة وتنفيذ دقيق.",
        ctaLabel: "اطلب عرض سعر",
        ctaTarget: "#quote"
      }
    ]
  },
  categories: [
    { id: "mosques", order: 1, name: "المساجد", image: "", desc: "سجاد المحراب والمصلى بمقاسات دقيقة ومطابقة للمساحة.", showColorFilter: true },
    { id: "hotels", order: 2, name: "الفنادق", image: "", desc: "سجاد للردهات والغرف والقاعات بلمسة فندقية راقية.", showColorFilter: true },
    { id: "schools", order: 3, name: "الروضات", image: "", desc: "سجاد آمن ومريح لفضاءات الأطفال.", showColorFilter: true },
    { id: "halls", order: 4, name: "قاعات المؤتمرات والمساحات الكبرى", image: "", desc: "تغطية شاملة للمساحات الواسعة والقاعات الرسمية.", showColorFilter: true }
  ],
  // product: { id, categoryId, name, price, size, color, secondaryColor,
  //   material, desc, images:[], hoverImage, featured, visible, order }
  products: [],
  about: {
    title: "من نحن",
    text: "آفاق كاربت شركة جزائرية متخصصة في توريد وتفصيل السجاد للمساجد والفنادق والمؤسسات، نجمع بين جودة الخامة ودقة التنفيذ لخدمة الفضاءات التي تستحق عناية خاصة.",
    image: ""
  },
  // Every image ever uploaded via the admin panel (logo, hero, category,
  // product, about) gets tracked here so it can be reused without
  // re-uploading. Removing an entry only untracks it locally — imgbb has
  // no API-based delete, only a one-time delete_url shown at upload time.
  mediaLibrary: [],
  ordersCount: 0
};

let cache = null;
const listeners = new Set();

export function subscribeSite(cb){
  listeners.add(cb);
  if (cache) cb(cache);
  return () => listeners.delete(cb);
}

export function initSiteListener(){
  onSnapshot(SITE_DOC, async (snap) => {
    if (!snap.exists()){
      await setDoc(SITE_DOC, DEFAULT_SITE);
      cache = structuredClone(DEFAULT_SITE);
    } else {
      cache = deepMerge(structuredClone(DEFAULT_SITE), snap.data());
    }
    listeners.forEach(cb => cb(cache));
  }, (err) => {
    console.error("Site listener error:", err);
  });
}

export async function getSiteOnce(){
  const snap = await getDoc(SITE_DOC);
  if (!snap.exists()) return structuredClone(DEFAULT_SITE);
  return deepMerge(structuredClone(DEFAULT_SITE), snap.data());
}

export async function saveSite(partial){
  const current = await getSiteOnce();
  const next = deepMerge(current, partial);
  await setDoc(SITE_DOC, next);
  return next;
}

export async function submitOrder(order){
  await addDoc(ORDERS_COL, {
    ...order,
    status: "new",
    createdAt: serverTimestamp()
  });
}

function deepMerge(base, override){
  if (Array.isArray(base) || Array.isArray(override)){
    return override !== undefined ? override : base;
  }
  if (typeof base === "object" && base && typeof override === "object" && override){
    const out = { ...base };
    for (const k of Object.keys(override)){
      out[k] = deepMerge(base[k], override[k]);
    }
    return out;
  }
  return override !== undefined ? override : base;
}

/* ------------------------------------------------------------------ */
/* imgbb upload — used only from the admin panel                      */
/* ------------------------------------------------------------------ */
export async function uploadToImgbb(file, apiKey){
  const key = apiKey || DEFAULT_IMGBB_KEY;
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, {
    method: "POST",
    body: formData
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "فشل رفع الصورة");
  return json.data.url; // direct image link
}

/* ------------------------------------------------------------------ */
/* Small utils shared by index.html + admin.html                      */
/* ------------------------------------------------------------------ */
export function esc(str=""){
  return String(str).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
}

export function uid(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}

export function money(n){
  if (n === undefined || n === null || n === "") return "";
  return Number(n).toLocaleString("ar-DZ") + " دج";
}
