// AFAK CARPET — shared data layer.
// Single Firestore document holds the whole site (content/site), mirroring
// the AFAK DECO architecture: cheap reads, one listener, no backend server.
import { db } from "./firebase-init.js";
import {
  doc, getDoc, setDoc, onSnapshot, collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { DEFAULT_IMGBB_KEY } from "./firebase-config.js";

const SITE_DOC = doc(db, "content", "site");
// ARCHITECTURE NOTE: Everything (hero, categories, products, projects, testimonials,
// stats, certifications, settings) lives in this ONE Firestore document. That's
// intentional — it means the whole site loads with a single read and updates live
// everywhere at once, which is ideal at this scale. Firestore caps a single
// document at 1MB. If the product catalog grows to approach that (several hundred
// products with multiple images each), split `products` into its own top-level
// collection (`products/{id}`) and switch app.js to `collection()`/`query()` reads.
// Nothing else needs to change.
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
    consentVersion: "2026-08-15",
    privacyPolicyUrl: "",
    seoTitle: "AFAK CARPET — سجاد المساجد والفنادق والمؤسسات",
    seoDescription: "آفاق كاربت: توريد وتفصيل السجاد للمساجد والفنادق والروضات وقاعات المؤتمرات في الجزائر.",
    ogImage: "",
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
  //   hoverImage, featured, visible, status, publishAt, unpublishAt, offer, order }
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
  const publish = (site) => {
    cache = site;
    listeners.forEach(cb => {
      try { cb(cache); } catch (error) { console.error("Site render error:", error); }
    });
  };
  const publishFallback = (error) => {
    console.error("Site listener error:", error);
    // Never block the public page when Firestore is unavailable or rules are stale.
    // The next successful snapshot will replace this fallback with live content.
    if (!cache) publish(structuredClone(DEFAULT_SITE));
  };
  onSnapshot(SITE_DOC, async (snap) => {
    try {
      if (!snap.exists()){
        try { await setDoc(SITE_DOC, DEFAULT_SITE); }
        catch (writeError) { console.warn("Default site could not be created:", writeError); }
        publish(structuredClone(DEFAULT_SITE));
      } else {
        publish(deepMerge(structuredClone(DEFAULT_SITE), snap.data()));
      }
    } catch (error) {
      publishFallback(error);
    }
  }, publishFallback);
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

const VALID_ADMIN_ROLES = new Set(["admin", "editor", "marketing"]);
export const PRODUCT_STATUSES = ["draft", "published", "archived"];

export async function getAdminRole(user){
  if (!user) return null;
  try {
    const profile = await getDoc(doc(db, "users", user.uid));
    const profileRole = profile.exists() ? profile.data()?.role : "";
    if (VALID_ADMIN_ROLES.has(profileRole)) return profileRole;
    const token = await user.getIdTokenResult();
    const claimRole = token.claims?.role;
    return VALID_ADMIN_ROLES.has(claimRole) ? claimRole : null;
  } catch (error) {
    console.warn("Admin role lookup failed", error);
    return null;
  }
}

export function isProductPublic(product, now = Date.now()){
  if (!product || product.visible === false) return false;
  const status = product.status || "published";
  if (status !== "published") return false;
  const publishAt = product.publishAt ? Date.parse(product.publishAt) : NaN;
  const unpublishAt = product.unpublishAt ? Date.parse(product.unpublishAt) : NaN;
  if (Number.isFinite(publishAt) && publishAt > now) return false;
  if (Number.isFinite(unpublishAt) && unpublishAt <= now) return false;
  return true;
}

export function activeProductOffer(product, now = Date.now()){
  const offer = product?.offer;
  if (!offer || offer.enabled === false) return null;
  const start = offer.startsAt ? Date.parse(offer.startsAt) : NaN;
  const end = offer.endsAt ? Date.parse(offer.endsAt) : NaN;
  if (Number.isFinite(start) && start > now) return null;
  if (Number.isFinite(end) && end <= now) return null;
  return offer;
}

export async function recordAuditLog({ user, role, action, entity = "site", entityId = "", summary = "", changedFields = [] }){
  if (!user || !VALID_ADMIN_ROLES.has(role)) return;
  const clean = (value, max) => String(value ?? "").replace(/[\\u0000-\\u001f\\u007f]/g, " ").trim().slice(0, max);
  await addDoc(collection(db, "auditLogs"), {
    actorId: clean(user.uid, 128), actorEmail: clean(user.email, 160), role,
    action: clean(action, 80), entity: clean(entity, 80), entityId: clean(entityId, 120),
    summary: clean(summary, 500), changedFields: Array.from(new Set((changedFields || []).map(v => clean(v, 80)).filter(Boolean))).slice(0, 30),
    createdAt: serverTimestamp()
  });
}

export async function submitOrder(order){
  const allowedCategories = new Set(["mosques", "hotels", "schools", "halls"]);
  const clean = (value, max) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
  const phone = clean(order.phone, 20).replace(/[^0-9+]/g, "");
  const payload = {
    name: clean(order.name, 120), phone,
    category: clean(order.category, 20), wilayaCode: clean(order.wilayaCode, 10),
    wilayaName: clean(order.wilayaName, 100), commune: clean(order.commune, 100),
    message: String(order.message ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, 1000),
    product: order.product && typeof order.product === "object" ? {
      id: clean(order.product.id, 80), name: clean(order.product.name, 160),
      categoryId: clean(order.product.categoryId, 20), categoryName: clean(order.product.categoryName, 120),
      size: clean(order.product.size, 80), color: clean(order.product.color, 120),
      material: clean(order.product.material, 120), sku: clean(order.product.sku, 80),
      secondaryColors: Array.isArray(order.product.secondaryColors)
        ? order.product.secondaryColors.map(value => clean(value, 60)).filter(Boolean).slice(0, 12)
        : [],
      price: Number.isFinite(Number(order.product.price)) ? Number(order.product.price) : null,
      image: /^https?:\/\//i.test(String(order.product.image || "")) ? String(order.product.image).slice(0, 500) : "",
      link: /^https?:\/\//i.test(String(order.product.link || "")) ? String(order.product.link).slice(0, 500) : ""
    } : null,
    attribution: order.attribution && typeof order.attribution === "object" ? {
      landingPath: clean(order.attribution.landingPath, 240), referrer: clean(order.attribution.referrer, 300),
      utmSource: clean(order.attribution.utmSource, 100), utmMedium: clean(order.attribution.utmMedium, 100),
      utmCampaign: clean(order.attribution.utmCampaign, 160), utmTerm: clean(order.attribution.utmTerm, 160),
      utmContent: clean(order.attribution.utmContent, 160), fbclid: clean(order.attribution.fbclid, 180),
      ttclid: clean(order.attribution.ttclid, 180)
    } : {
      landingPath: clean(location.pathname, 240), referrer: clean(document.referrer, 300),
      utmSource: "", utmMedium: "", utmCampaign: "", utmTerm: "", utmContent: "", fbclid: "", ttclid: ""
    }
  };
  if (payload.name.length < 2 || phone.replace(/\D/g, "").length < 8 || !allowedCategories.has(payload.category) || !payload.wilayaCode){
    throw new Error("بيانات الطلب غير صالحة");
  }
  await addDoc(ORDERS_COL, { ...payload, status: "new", createdAt: serverTimestamp() });
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
/* Upload validation + imgbb upload — used only from the admin panel   */
/* ------------------------------------------------------------------ */
export async function validateSvgFile(file, maxBytes = 30 * 1024){
  if (!file || (!file.type && !String(file.name || "").toLowerCase().endsWith(".svg"))){
    throw new Error("الملف غير صالح");
  }
  const isSvg = file.type === "image/svg+xml" || String(file.name || "").toLowerCase().endsWith(".svg");
  if (!isSvg) return true;
  if (file.size > maxBytes) throw new Error("ملف SVG كبير جدًا؛ الحد الأقصى 30KB");
  const source = await file.text();
  if (!/<svg[\s>]/i.test(source)) throw new Error("ملف SVG غير صالح");
  if (/<script|on[a-z]+\s*=|javascript:|data:text\/html|<foreignObject|<iframe/i.test(source)){
    throw new Error("تم رفض SVG لأنه يحتوي على محتوى غير آمن");
  }
  if (/<(use|image|a|link)\b[^>]+(?:href|xlink:href)\s*=\s*[\"']https?:/i.test(source)){
    throw new Error("تم رفض SVG بسبب رابط خارجي");
  }
  return true;
}

export async function uploadToImgbb(file, apiKey){
  if (!file || !String(file.type || "").startsWith("image/")) throw new Error("اختر ملف صورة صالحًا");
  if (file.size > 12 * 1024 * 1024) throw new Error("حجم الصورة يتجاوز 12MB");
  await validateSvgFile(file);
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
