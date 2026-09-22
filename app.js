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
    imageStorageProvider: "imgbb",
    cloudflareR2UploadUrl: "",
    cloudflareR2PublicUrl: "",
    cloudflareR2UploadToken: "",
    imageProtectionEnabled: true,
    watermarkEnabled: true,
    watermarkText: "AFAK CARPET",
    webpQuality: 0.82,
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
    seoDescription: "آفاق كاربت: توريد وتفصيل السجاد للمساجد والفنادق والمنازل وقاعات المؤتمرات في الجزائر.",
    ogImage: "",
    // Independent visibility switches for the "trust" blocks — a block also
    // auto-hides itself when it has zero items, regardless of this switch.
    sectionsVisible: { projects: true, testimonials: true, stats: true, certifications: true },
    // Floating "jump to section" menu (mobile) — fully admin-editable list.
    navMenuItems: [
      { id: "m1", icon: "🕌", label: "المساجد", labelEn: "Mosques", link: "#mosques", order: 1 },
      { id: "m2", icon: "🏨", label: "الفنادق", labelEn: "Hotels", link: "#hotels", order: 2 },
      { id: "m3", icon: "🏠", label: "المنازل", labelEn: "House Rugs", link: "#schools", order: 3 },
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
    { id: "mosques", order: 1, name: "المساجد", nameEn: "", image: "", desc: "سجاد المحراب والمصلى بمقاسات دقيقة ومطابقة للمساحة.", descEn: "", showColorFilter: true, productCategories: [{ id: "general", name: "عام", nameEn: "General", colorIds: [], insulationOptions: [] }] },
    { id: "hotels", order: 2, name: "الفنادق", nameEn: "", image: "", desc: "سجاد للردهات والغرف والقاعات بلمسة فندقية راقية.", descEn: "", showColorFilter: true, productCategories: [{ id: "general", name: "عام", nameEn: "General", colorIds: [], insulationOptions: [] }] },
    { id: "schools", order: 3, name: "المنازل", nameEn: "House Rugs", image: "", desc: "سجاد أنيق ومريح للصالونات وغرف النوم ومختلف فضاءات المنزل.", descEn: "Elegant, comfortable rugs for living rooms, bedrooms, and every home space.", showColorFilter: false, productCategories: [{ id: "general", name: "عام", nameEn: "General", colorIds: [], insulationOptions: [] }] },
    { id: "halls", order: 4, name: "قاعات المؤتمرات والمساحات الكبرى", nameEn: "", image: "", desc: "تغطية شاملة للمساحات الواسعة والقاعات الرسمية.", descEn: "", showColorFilter: true, productCategories: [{ id: "general", name: "عام", nameEn: "General", colorIds: [], insulationOptions: [] }] }
  ],
  // product: { id, categoryId, name, nameEn, price, size, sizeEn, color,
  //   secondaryColors: [], material, materialEn, sku, desc, descEn, specifications:[], images:[],
  //   productCategoryId, hoverImage, featured, visible, status, publishAt, unpublishAt, offer, order }
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

function migrateHouseRugLabels(site){
  const legacy = new Set(["الروضات", "Kindergartens", "سجاد آمن لفضاءات الأطفال"]);
  const category = site.categories?.find(item => item.id === "schools");
  if (category && (legacy.has(category.name) || legacy.has(category.nameEn) || legacy.has(category.desc))) {
    category.name = "المنازل";
    category.nameEn = "House Rugs";
    category.desc = "سجاد أنيق ومريح للصالونات وغرف النوم ومختلف فضاءات المنزل.";
    category.descEn = "Elegant, comfortable rugs for living rooms, bedrooms, and every home space.";
  }
  (site.settings?.navMenuItems || []).forEach(item => {
    if (legacy.has(item.label) || legacy.has(item.labelEn)) {
      item.icon = "🏠"; item.label = "المنازل"; item.labelEn = "House Rugs"; item.link = "#schools";
    }
  });
  return site;
}

function normalizeProductCategories(site){
  const categoryIds = new Set((site.categories || []).map(category => category.id));
  (site.categories || []).forEach(category => {
    if (!Array.isArray(category.productCategories) || !category.productCategories.length){
      category.productCategories = [{ id: "general", name: "عام", nameEn: "General" }];
    }
    category.productCategories = category.productCategories
      .filter(item => item && item.id && item.name)
      .map(item => ({
        id: String(item.id), name: String(item.name), nameEn: String(item.nameEn || ""),
        colorIds: Array.isArray(item.colorIds) ? item.colorIds.map(String) : [],
        insulationOptions: Array.isArray(item.insulationOptions) ? item.insulationOptions.filter(option => option && option.id && option.name).map(option => ({
          id: String(option.id), name: String(option.name), nameEn: String(option.nameEn || ""), pricePerSqm: Math.max(0, Number(option.pricePerSqm) || 0)
        })) : []
      }));
    if (!category.productCategories.length) category.productCategories = [{ id: "general", name: "عام", nameEn: "General", colorIds: [], insulationOptions: [] }];
    if (category.id === "schools") category.showColorFilter = false;
  });
  (site.products || []).forEach(product => {
    if (!categoryIds.has(product.categoryId)) product.categoryId = "mosques";
    const category = site.categories.find(item => item.id === product.categoryId);
    const validIds = new Set(category?.productCategories?.map(item => item.id) || ["general"]);
    if (!validIds.has(product.productCategoryId)) product.productCategoryId = category?.productCategories?.[0]?.id || "general";
    if (!Array.isArray(product.specifications)) product.specifications = [];
    product.specifications = product.specifications.filter(item => item && (item.label || item.value)).map(item => ({
      label: String(item.label || ""), labelEn: String(item.labelEn || ""), value: String(item.value || ""), valueEn: String(item.valueEn || "")
    }));
  });
  return site;
}

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
        publish(normalizeProductCategories(migrateHouseRugLabels(deepMerge(structuredClone(DEFAULT_SITE), snap.data()))));
      }
    } catch (error) {
      publishFallback(error);
    }
  }, publishFallback);
}

export async function getSiteOnce(){
  const snap = await getDoc(SITE_DOC);
  if (!snap.exists()) return structuredClone(DEFAULT_SITE);
  return normalizeProductCategories(migrateHouseRugLabels(deepMerge(structuredClone(DEFAULT_SITE), snap.data())));
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
    quantity: Math.max(1, Math.min(9999, Number.parseInt(order.quantity, 10) || 1)),
    deliveryAddress: clean(order.deliveryAddress, 240),
    insulation: order.insulation && typeof order.insulation === "object" ? {
      enabled: Boolean(order.insulation.enabled), qualityId: clean(order.insulation.qualityId, 80),
      qualityName: clean(order.insulation.qualityName, 160), pricePerSqm: Math.max(0, Number(order.insulation.pricePerSqm) || 0),
      areaSqm: Math.max(0, Number(order.insulation.areaSqm) || 0), total: Math.max(0, Number(order.insulation.total) || 0)
    } : { enabled: false, qualityId: "", qualityName: "", pricePerSqm: 0, areaSqm: 0, total: 0 },
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
      link: /^https?:\/\//i.test(String(order.product.link || "")) ? String(order.product.link).slice(0, 500) : "",
      specifications: Array.isArray(order.product.specifications) ? order.product.specifications.slice(0, 30).map(item => ({ label: clean(item.label, 100), value: clean(item.value, 240) })) : []
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
  if (payload.name.length < 2 || phone.replace(/\D/g, "").length < 8 || !allowedCategories.has(payload.category) || !payload.wilayaCode || (payload.category === "schools" && !payload.deliveryAddress)){
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

/** Decode, resize without changing aspect ratio, and encode as WebP in the browser. */
export async function convertImageToWebp(file, { maxDimension = 1600, quality = 0.82 } = {}){
  if (!file || !String(file.type || "").startsWith("image/")) throw new Error("اختر ملف صورة صالحًا");
  if (file.type === "image/svg+xml" || String(file.name || "").toLowerCase().endsWith(".svg")) return file;
  const safeQuality = Math.min(1, Math.max(0.1, Number(quality) || 0.82));
  let bitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error("تعذر قراءة الصورة في هذا المتصفح. صور HEIC تحتاج متصفحًا يدعم HEIC أو تحويلها أولًا."); }
  let { width, height } = bitmap;
  if (width > maxDimension || height > maxDimension){
    const scale = maxDimension / Math.max(width, height);
    width = Math.max(1, Math.round(width * scale)); height = Math.max(1, Math.round(height * scale));
  }
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  canvas.getContext("2d", { alpha: true }).drawImage(bitmap, 0, 0, width, height); bitmap.close?.();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", safeQuality));
  if (!blob) throw new Error("تعذر إنشاء ملف WebP");
  const baseName = String(file.name || "image").replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.webp`, { type: "image/webp", lastModified: Date.now() });
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
  const compressed = await convertImageToWebp(file);
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

export async function uploadToCloudflareR2(file, settings = {}){
  if (!file || !String(file.type || "").startsWith("image/")) throw new Error("اختر ملف صورة صالحًا");
  if (file.size > 25 * 1024 * 1024) throw new Error("حجم الصورة يتجاوز 25MB");
  await validateSvgFile(file);
  const endpoint = String(settings.cloudflareR2UploadUrl || "").trim().replace(/\/$/, "");
  if (!endpoint) throw new Error("أدخل رابط Cloudflare R2 Worker أولًا");
  const converted = await convertImageToWebp(file, { quality: settings.webpQuality || 0.82 });
  const headers = { "Content-Type": converted.type, "X-File-Name": encodeURIComponent(converted.name) };
  if (settings.cloudflareR2UploadToken) headers.Authorization = `Bearer ${settings.cloudflareR2UploadToken}`;
  const response = await fetch(endpoint, { method: "POST", headers, body: converted });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "فشل رفع الصورة إلى Cloudflare R2");
  const url = payload.url || payload.publicUrl || (settings.cloudflareR2PublicUrl ? `${String(settings.cloudflareR2PublicUrl).replace(/\/$/, "")}/${encodeURIComponent(converted.name)}` : "");
  if (!url) throw new Error("أعد Worker رابط الصورة في url أو publicUrl، أو أدخل رابط العرض العام");
  return url;
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

export function money(n, lang = document.documentElement.lang || "ar"){
  if (n === undefined || n === null || n === "") return "";
  const isEnglish = lang === "en";
  return Number(n).toLocaleString(isEnglish ? "en-DZ" : "ar-DZ") + (isEnglish ? " DA" : " دج");
}
