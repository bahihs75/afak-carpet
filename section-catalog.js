import { getSiteOnce, esc, isProductPublic } from "./app.js";

const root = document.querySelector("[data-section-catalog]");
const sectionId = root?.dataset.section || "mosques";
const lang = ["ar", "fr", "en"].includes(document.documentElement.lang) ? document.documentElement.lang : "ar";
const mainPath = root?.dataset.mainPath || "../../index.html";
const sectionHash = root?.dataset.sectionHash || sectionId;
const copy = {
  ar: { filterLabel: "تصفية المنتجات", all: "كل المنتجات", allColors: "كل الألوان", category: "التصنيف", color: "اللون", products: "منتجات القسم", empty: "لا توجد منتجات منشورة في هذا القسم حاليًا.", loading: "جاري تحميل الكتالوج…", error: "تعذر تحميل الكتالوج. حاول تحديث الصفحة.", quote: "اطلب عرض سعر", view: "عرض الكتالوج الكامل", home: "الرئيسية", contact: "تواصل معنا", price: "دج", noDesc: "منتج متاح ضمن حلول AFAK CARPET.", colors: { blue: "أزرق", green: "أخضر", red: "أحمر", gray: "رمادي", beige: "بيج", brown: "بني", black: "أسود", white: "أبيض" } },
  fr: { filterLabel: "Filtrer les produits", all: "Tous les produits", allColors: "Toutes les couleurs", category: "Catégorie", color: "Couleur", products: "Produits de la section", empty: "Aucun produit publié dans cette section pour le moment.", loading: "Chargement du catalogue…", error: "Impossible de charger le catalogue. Actualisez la page.", quote: "Demander un devis", view: "Voir le catalogue complet", home: "Accueil", contact: "Nous contacter", price: "DA", noDesc: "Produit disponible parmi les solutions AFAK CARPET.", colors: { blue: "Bleu", green: "Vert", red: "Rouge", gray: "Gris", beige: "Beige", brown: "Marron", black: "Noir", white: "Blanc" } },
  en: { filterLabel: "Filter products", all: "All products", allColors: "All colors", category: "Category", color: "Color", products: "Section products", empty: "No published products are available in this section yet.", loading: "Loading catalog…", error: "Unable to load the catalog. Please refresh the page.", quote: "Get a quote", view: "View full catalog", home: "Home", contact: "Contact us", price: "DA", noDesc: "Product available from AFAK CARPET solutions.", colors: { blue: "Blue", green: "Green", red: "Red", gray: "Gray", beige: "Beige", brown: "Brown", black: "Black", white: "White" } }
}[lang];

const grid = document.getElementById("catalogGrid");
const empty = document.getElementById("catalogEmpty");
const status = document.getElementById("catalogStatus");
const categoryFilters = document.getElementById("catalogCategories");
const colorFilters = document.getElementById("catalogColors");
let products = [];
let selectedCategory = "";
let selectedColor = "";
let selectedSort = "default";
let section;

function localized(value, english = "") { return lang === "en" || lang === "fr" ? (english || value || "") : (value || english || ""); }
function colorName(id) { const item = palette.find(color => color.id === id); return item ? (localized(item.name, item.nameEn) || item.name || id) : (copy.colors[id] || id); }
function colorHex(id) { return palette.find(color => color.id === id)?.hex || id; }
function money(value) { const number = Number(value); return Number.isFinite(number) ? `${new Intl.NumberFormat(lang === "ar" ? "ar-DZ" : "fr-DZ").format(number)} ${copy.price}` : ""; }
function imageUrl(value) { return /^https?:\/\//i.test(String(value || "")) ? String(value) : ""; }
function availableCategory(id) { return section?.productCategories?.find(item => item.id === id); }
function productColors(product) { return Array.isArray(product.secondaryColors) ? product.secondaryColors : (product.secondaryColor ? [product.secondaryColor] : []); }
function setActive(container, value) { container?.querySelectorAll("button").forEach(button => button.classList.toggle("is-active", button.dataset.value === value)); }
function protectImages(){
  const enabled = section?.imageProtectionEnabled !== false;
  if (!enabled) return;
  ["contextmenu", "dragstart", "selectstart", "copy"].forEach(type => document.addEventListener(type, event => { if (event.target.closest(".protected-image, .catalog-card-image")) event.preventDefault(); }));
}
function applySiteBackgrounds(site){
  const backgrounds = site?.settings?.backgrounds || {};
  const blue = backgrounds.blue || {};
  const white = backgrounds.white || {};
  const rootStyle = document.documentElement.style;
  const validColor = value => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : "#EEF5FF";
  rootStyle.setProperty("--site-bg-blue", validColor(blue.color));
  rootStyle.setProperty("--site-bg-white", validColor(white.color || "#FFFFFF"));
  rootStyle.setProperty("--site-pattern-blue", blue.patternUrl ? `url("${imageUrl(blue.patternUrl)}")` : "none");
  rootStyle.setProperty("--site-pattern-white", white.patternUrl ? `url("${imageUrl(white.patternUrl)}")` : "none");
}

function renderFilters() {
  const categories = section?.productCategories || [];
  categoryFilters.innerHTML = `<button type="button" class="catalog-filter is-active" data-value="">${esc(copy.all)}</button>${categories.map(item => `<button type="button" class="catalog-filter" data-value="${esc(item.id)}">${esc(localized(item.name, item.nameEn))}</button>`).join("")}`;
  categoryFilters.querySelectorAll("button").forEach(button => button.addEventListener("click", () => { selectedCategory = button.dataset.value; selectedColor = ""; renderFilters(); renderProducts(); }));
  if (sectionId === "schools" || section?.showColorFilter === false) { colorFilters.closest(".catalog-filter-group")?.remove(); return; }
  const source = selectedCategory ? products.filter(product => product.productCategoryId === selectedCategory) : products;
  const ids = [...new Set(source.flatMap(productColors))];
  colorFilters.innerHTML = `<button type="button" class="catalog-filter is-active" data-value="">${esc(copy.allColors)}</button>${ids.map(id => `<button type="button" class="catalog-filter" data-value="${esc(id)}"><span class="catalog-color-dot" style="--dot:${esc(colorHex(id))}"></span>${esc(colorName(id))}</button>`).join("")}`;
  colorFilters.querySelectorAll("button").forEach(button => button.addEventListener("click", () => { selectedColor = button.dataset.value; renderProducts(); }));
  let sort = document.getElementById("catalogPriceSort");
  if (!sort) { sort=document.createElement("select"); sort.id="catalogPriceSort"; sort.className="catalog-price-sort"; sort.innerHTML=`<option value="default">${esc(lang === "ar" ? "الترتيب الافتراضي" : lang === "fr" ? "Ordre par défaut" : "Default order")}</option><option value="asc">${esc(lang === "ar" ? "السعر: من الأقل إلى الأعلى" : lang === "fr" ? "Prix croissant" : "Price: low to high")}</option><option value="desc">${esc(lang === "ar" ? "السعر: من الأعلى إلى الأقل" : lang === "fr" ? "Prix décroissant" : "Price: high to low")}</option>`; colorFilters.closest(".catalog-filter-panel")?.append(sort); sort.addEventListener("change",()=>{selectedSort=sort.value; renderProducts();}); }
  sort.value=selectedSort;
  setActive(categoryFilters, selectedCategory); setActive(colorFilters, selectedColor);
}
function card(product) {
  const title = localized(product.name, product.nameEn);
  const description = localized(product.desc, product.descEn) || copy.noDesc;
  const image = imageUrl(product.images?.[0]);
  const colors = productColors(product).map(colorName).join(lang === "ar" ? "، " : ", ");
  const category = availableCategory(product.productCategoryId);
  return `<article class="catalog-card"><a class="catalog-card-image protected-image" href="${esc(`${mainPath}#${sectionHash}`)}" aria-label="${esc(title)}"><img src="${esc(image)}" alt="${esc(title)}" loading="lazy" decoding="async" draggable="false">${image ? `<span class="catalog-card-index">${esc(sectionId.toUpperCase())}</span>` : ""}</a><div class="catalog-card-body"><div class="catalog-card-meta"><span>${esc(localized(category?.name, category?.nameEn) || copy.category)}</span>${colors ? `<span>${esc(colors)}</span>` : ""}</div><h3>${esc(title)}</h3><p>${esc(description)}</p><div class="catalog-card-footer">${product.price !== "" && product.price != null ? `<strong>${esc(money(product.price))}</strong>` : "<span></span>"}<a class="btn btn-primary" href="${esc(`${mainPath}#${sectionHash}`)}">${esc(copy.quote)}</a></div></div></article>`;
}
function renderProducts() {
  let visible = products.filter(product => (!selectedCategory || product.productCategoryId === selectedCategory) && (!selectedColor || productColors(product).includes(selectedColor)));
  if (selectedSort !== "default") visible = [...visible].sort((a,b) => { const pa=Number(a.price)||0, pb=Number(b.price)||0; return selectedSort === "asc" ? pa-pb : pb-pa; });
  grid.innerHTML = visible.map(card).join(""); empty.hidden = visible.length > 0; status.textContent = `${visible.length} / ${products.length}`; setActive(categoryFilters, selectedCategory); setActive(colorFilters, selectedColor);
}
function ensureCatalogUtilities(){
  if (document.getElementById("catalogFloatingTop")) return;
  const wrap = document.createElement("div"); wrap.className = "catalog-floating-utilities";
  wrap.innerHTML = `<button type="button" id="catalogFloatingTop" aria-label="${copy.home}">↑</button><a href="#contact" id="catalogFloatingCall" aria-label="${copy.contact}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 0 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg></a>`;
  document.body.appendChild(wrap);
  const top = wrap.querySelector("#catalogFloatingTop"); top.addEventListener("click", () => window.scrollTo({top:0,behavior:"smooth"}));
  const phone = String(site?.settings?.phone || "").replace(/[^0-9+]/g, "");
  const call = wrap.querySelector("#catalogFloatingCall"); call.href = phone ? `tel:${phone}` : `${mainPath}#contact`;
  window.addEventListener("scroll", () => top.classList.toggle("is-visible", window.scrollY > window.innerHeight * .55), {passive:true});
}
async function init() {
  status.textContent = copy.loading;
  try { site = await getSiteOnce(); applySiteBackgrounds(site); ensureCatalogUtilities(); section = (site.categories || []).find(item => item.id === sectionId) || { productCategories: [] }; section.imageProtectionEnabled = site.settings?.imageProtectionEnabled !== false; products = (site.products || []).filter(product => product.categoryId === sectionId && isProductPublic(product)).sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)); renderFilters(); renderProducts(); protectImages(); }
  catch (error) { console.error(error); status.textContent = copy.error; empty.hidden = false; }
}
init();
window.addEventListener("pageshow", () => { if (!products.length) init(); });
