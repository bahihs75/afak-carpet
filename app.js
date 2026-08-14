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
    colorPalette: [
      { id: "blue", name: "أزرق", nameEn: "Blue", hex: "#1F4E8C" },
      { id: "bordeaux", name: "بوردو", nameEn: "Bordeaux", hex: "#6D1B2A" },
      { id: "gris", name: "رمادي", nameEn: "Grey", hex: "#8A8D91" },
      { id: "green", name: "أخضر", nameEn: "Green", hex: "#2F6B3A" }
    ],
    // Optional analytics/marketing pixels — scripts are only injected on the
    // public site when a field is non-empty, so nothing loads by default.
    cfAnalyticsToken: "",
    metaPixelId: "",
    tiktokPixelId: "",
    // Independent visibility switches for the "trust" blocks — a block also
    // auto-hides itself when it has zero items, regardless of this switch.
    sectionsVisible: { projects: true, testimonials: true, stats: true, certifications: true },
    // Floating "jump to section" menu (mobile) — fully admin-editable list.
    navMenuItems: [
      { id: "m1", icon: "🕌", label: "المساجد", labelEn: "Mosques", link: "#mosques", order: 1 },
      { id: "m2", icon: "🏨", label: "الفنادق", labelEn: "Hotels", link: "#hotels", order: 2 },
      { id: "m3", icon: "🎒", label: "الروضات", labelEn: "Kindergartens", link: "#schools", order: 3 },
      { id: "m4", icon: "🏛️", label: "القاعات الكبرى", labelEn: "Halls", link: "#halls", order: 4 },
      { id: "m5", icon: "ℹ️", label: "من نحن", labelEn: "About", link: "#about", order: 5 },
      { id: "m6", icon: "✉️", label: "تواصل معنا", labelEn: "Contact", link: "#contact", order: 6 }
    ]
  },
  hero: {
    slides: [
      {
        id: "s1",
        image: "",
        eyebrow: "AFAK CARPET", eyebrowEn: "",
        title: "سجاد يُصنع ليُصلَّى عليه ويدوم", titleEn: "",
        text: "تجهيز المساجد والفنادق والمؤسسات بسجاد عالي الجودة، بمقاسات مخصصة وتنفيذ دقيق.", textEn: "",
        ctaLabel: "اطلب عرض سعر", ctaLabelEn: "",
        // secondary button — fully admin-customizable text + destination
        // (destination can be an in-page anchor like "#mosques" or any URL)
        secondaryLabel: "استكشف المنتجات", secondaryLabelEn: "",
        secondaryLink: "#mosques"
      }
    ]
  },
  categories: [
    { id: "mosques", order: 1, name: "المساجد", nameEn: "", image: "", desc: "سجاد المحراب والمصلى بمقاسات دقيقة ومطابقة للمساحة.", descEn: "", showColorFilter: true },
    { id: "hotels", order: 2, name: "الفنادق", nameEn: "", image: "", desc: "سجاد للردهات والغرف والقاعات بلمسة فندقية راقية.", descEn: "", showColorFilter: true },
    { id: "schools", order: 3, name: "الروضات", nameEn: "", image: "", desc: "سجاد آمن ومريح لفضاءات الأطفال.", descEn: "", showColorFilter: true },
    { id: "halls", order: 4, name: "قاعات المؤتمرات والمساحات الكبرى", nameEn: "", image: "", desc: "تغطية شاملة للمساحات الواسعة والقاعات الرسمية.", descEn: "", showColorFilter: true }
  ],
  // product: { id, categoryId, name, nameEn, price, size, sizeEn, color,
  //   secondaryColors: [], material, materialEn, sku, desc, descEn, images:[],
  //   hoverImage, featured, visible, order }
  products: [],
  about: {
    title: "من نحن", titleEn: "",
    text: "آفاق كاربت شركة جزائرية متخصصة في توريد وتفصيل السجاد للمساجد والفنادق والمؤسسات، نجمع بين جودة الخامة ودقة التنفيذ لخدمة الفضاءات التي تستحق عناية خاصة.", textEn: "",
    image: ""
  },
  // "مشاريعنا" — a simple, admin-editable gallery of completed installations.
  projects: [], // { id, image, caption, captionEn, order }
  // Trust block content — each independently toggleable via settings.sectionsVisible.
  testimonials: [], // { id, name, nameEn, role, roleEn, quote, quoteEn, order }
  stats: [],        // { id, label, labelEn, number, order }
  certifications: [], // { id, image, name, nameEn, order }
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
/* Client-side image compression before upload — keeps the site fast   */
/* even when the marketing team uploads large phone-camera photos.     */
/* Resizes to a max dimension and re-encodes as JPEG at 82% quality.   */
/* Falls back to the original file if compression fails for any reason.*/
/* ------------------------------------------------------------------ */
export async function compressImage(file, maxDimension = 1600, quality = 0.82){
  try{
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    if (width > maxDimension || height > maxDimension){
      const scale = maxDimension / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file; // compression didn't help, keep original
    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file; // never block an upload because compression failed
  }
}

/* ------------------------------------------------------------------ */
/* imgbb upload — used only from the admin panel                      */
/* ------------------------------------------------------------------ */
export async function uploadToImgbb(file, apiKey){
  const key = apiKey || DEFAULT_IMGBB_KEY;
  const compressed = await compressImage(file);
  const formData = new FormData();
  formData.append("image", compressed);
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
/* Bilingual content getter — returns the English field (e.g. "nameEn") when
   lang is "en" AND that field was actually filled in by the admin,
   otherwise falls back to the Arabic field. English content is optional
   everywhere, so nothing breaks if it was never entered. */
export function tf(obj, field, lang){
  if (!obj) return "";
  if (lang === "en" && obj[field + "En"]) return obj[field + "En"];
  return obj[field] || "";
}

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
