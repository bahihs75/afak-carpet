import { getSiteOnce, esc, isProductPublic } from "./app.js";

const root = document.querySelector("[data-section-catalog]");
const sectionId = root?.dataset.section || "mosques";
const lang = ["ar", "fr", "en"].includes(document.documentElement.lang) ? document.documentElement.lang : "ar";
const mainPath = root?.dataset.mainPath || "../../index.html";
const sectionHash = root?.dataset.sectionHash || sectionId;
const copy = {
  ar: {
    filterLabel: "تصفية المنتجات", all: "كل المنتجات", allColors: "كل الألوان", category: "التصنيف", color: "اللون", products: "منتجات القسم", empty: "لا توجد منتجات منشورة في هذا القسم حاليًا.", loading: "جاري تحميل الكتالوج…", error: "تعذر تحميل الكتالوج. حاول تحديث الصفحة.", quote: "اطلب عرض سعر", view: "عرض الكتالوج الكامل", home: "الرئيسية", contact: "تواصل معنا", price: "دج", noDesc: "منتج متاح ضمن حلول AFAK CARPET.", colors: { blue: "أزرق", green: "أخضر", red: "أحمر", gray: "رمادي", beige: "بيج", brown: "بني", black: "أسود", white: "أبيض" }
  },
  fr: {
    filterLabel: "Filtrer les produits", all: "Tous les produits", allColors: "Toutes les couleurs", category: "Catégorie", color: "Couleur", products: "Produits de la section", empty: "Aucun produit publié dans cette section pour le moment.", loading: "Chargement du catalogue…", error: "Impossible de charger le catalogue. Actualisez la page.", quote: "Demander un devis", view: "Voir le catalogue complet", home: "Accueil", contact: "Nous contacter", price: "DA", noDesc: "Produit disponible parmi les solutions AFAK CARPET.", colors: { blue: "Bleu", green: "Vert", red: "Rouge", gray: "Gris", beige: "Beige", brown: "Marron", black: "Noir", white: "Blanc" }
  },
  en: {
    filterLabel: "Filter products", all: "All products", allColors: "All colors", category: "Category", color: "Color", products: "Section products", empty: "No published products are available in this section yet.", loading: "Loading catalog…", error: "Unable to load the catalog. Please refresh the page.", quote: "Get a quote", view: "View full catalog", home: "Home", contact: "Contact us", price: "DA", noDesc: "Product available from AFAK CARPET solutions.", colors: { blue: "Blue", green: "Green", red: "Red", gray: "Gray", beige: "Beige", brown: "Brown", black: "Black", white: "White" }
  }
}[lang];

const grid = document.getElementById("catalogGrid");
const empty = document.getElementById("catalogEmpty");
const status = document.getElementById("catalogStatus");
const categoryFilters = document.getElementById("catalogCategories");
const colorFilters = document.getElementById("catalogColors");
let products = [];
let selectedCategory = "";
let selectedColor = "";
let section;

function localized(value, english = "") { return lang === "en" || lang === "fr" ? (english || value || "") : (value || english || ""); }
function colorName(id) { return copy.colors[id] || id; }
function money(value) { const number = Number(value); return Number.isFinite(number) ? `${new Intl.NumberFormat(lang === "ar" ? "ar-DZ" : "fr-DZ").format(number)} ${copy.price}` : ""; }
function imageUrl(value) { return /^https?:\/\//i.test(String(value || "")) ? String(value) : ""; }
function availableCategory(id) { return section?.productCategories?.find(item => item.id === id); }
function productColors(product) { return Array.isArray(product.secondaryColors) ? product.secondaryColors : (product.secondaryColor ? [product.secondaryColor] : []); }
function setActive(container, value) { container?.querySelectorAll("button").forEach(button => button.classList.toggle("is-active", button.dataset.value === value)); }

function renderFilters() {
  const categories = section?.productCategories || [];
  categoryFilters.innerHTML = `<button type="button" class="catalog-filter is-active" data-value="">${esc(copy.all)}</button>${categories.map(item => `<button type="button" class="catalog-filter" data-value="${esc(item.id)}">${esc(localized(item.name, item.nameEn))}</button>`).join("")}`;
  categoryFilters.querySelectorAll("button").forEach(button => button.addEventListener("click", () => { selectedCategory = button.dataset.value; selectedColor = ""; renderFilters(); renderProducts(); }));

  if (sectionId === "schools" || section?.showColorFilter === false) { colorFilters.closest(".catalog-filter-group")?.remove(); return; }
  const source = selectedCategory ? products.filter(product => product.productCategoryId === selectedCategory) : products;
  const ids = [...new Set(source.flatMap(productColors))];
  colorFilters.innerHTML = `<button type="button" class="catalog-filter is-active" data-value="">${esc(copy.allColors)}</button>${ids.map(id => `<button type="button" class="catalog-filter" data-value="${esc(id)}"><span class="catalog-color-dot" style="--dot:${esc(id)}"></span>${esc(colorName(id))}</button>`).join("")}`;
  colorFilters.querySelectorAll("button").forEach(button => button.addEventListener("click", () => { selectedColor = button.dataset.value; renderProducts(); }));
  setActive(categoryFilters, selectedCategory); setActive(colorFilters, selectedColor);
}

function card(product) {
  const title = localized(product.name, product.nameEn);
  const description = localized(product.desc, product.descEn) || copy.noDesc;
  const image = imageUrl(product.images?.[0]);
  const colors = productColors(product).map(colorName).join(lang === "ar" ? "، " : ", ");
  const category = availableCategory(product.productCategoryId);
  return `<article class="catalog-card">
    <a class="catalog-card-image protected-image" href="${esc(`${mainPath}#${sectionHash}`)}" aria-label="${esc(title)}"><img src="${esc(image)}" alt="${esc(title)}" loading="lazy" decoding="async">${image ? `<span class="catalog-card-index">${esc(sectionId.toUpperCase())}</span>` : ""}</a>
    <div class="catalog-card-body"><div class="catalog-card-meta"><span>${esc(localized(category?.name, category?.nameEn) || copy.category)}</span>${colors ? `<span>${esc(colors)}</span>` : ""}</div><h3>${esc(title)}</h3><p>${esc(description)}</p><div class="catalog-card-footer">${product.price !== "" && product.price != null ? `<strong>${esc(money(product.price))}</strong>` : "<span></span>"}<a class="btn btn-primary" href="${esc(`${mainPath}#${sectionHash}`)}">${esc(copy.quote)}</a></div></div>
  </article>`;
}

function renderProducts() {
  const visible = products.filter(product => (!selectedCategory || product.productCategoryId === selectedCategory) && (!selectedColor || productColors(product).includes(selectedColor)));
  grid.innerHTML = visible.map(card).join("");
  empty.hidden = visible.length > 0;
  status.textContent = `${visible.length} / ${products.length}`;
  setActive(categoryFilters, selectedCategory); setActive(colorFilters, selectedColor);
}

async function init() {
  status.textContent = copy.loading;
  try {
    const site = await getSiteOnce();
    section = (site.categories || []).find(item => item.id === sectionId) || { productCategories: [] };
    products = (site.products || []).filter(product => product.categoryId === sectionId && isProductPublic(product)).sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    renderFilters(); renderProducts();
  } catch (error) { console.error(error); status.textContent = copy.error; empty.hidden = false; }
}
init();
window.addEventListener("pageshow", () => { if (!products.length) init(); });
