// Algeria wilayas + communes reference data (58 wilayas, post-2019 reform).
//
// NOTE FOR BAHI: you already built a full wilaya→commune dataset for
// msq-afakdeco (the AFAK DECO order form). If you send me that file, I will
// swap the `communes` arrays below with your real, already-verified data —
// that's higher-priority ground truth than anything generic. Until then,
// each wilaya below ships with its capital commune as a safe working default
// so the cascading select is functional, not broken or empty.
//
// Shape kept intentionally simple so app.js / admin.html never need to change
// when this file is replaced:
//   [{ code: "01", ar: "أدرار", communes: ["أدرار", ...] }, ...]

export const WILAYAS = [
  { code: "01", ar: "أدرار", communes: ["أدرار"] },
  { code: "02", ar: "الشلف", communes: ["الشلف"] },
  { code: "03", ar: "الأغواط", communes: ["الأغواط"] },
  { code: "04", ar: "أم البواقي", communes: ["أم البواقي"] },
  { code: "05", ar: "باتنة", communes: ["باتنة"] },
  { code: "06", ar: "بجاية", communes: ["بجاية"] },
  { code: "07", ar: "بسكرة", communes: ["بسكرة"] },
  { code: "08", ar: "بشار", communes: ["بشار"] },
  { code: "09", ar: "البليدة", communes: ["البليدة"] },
  { code: "10", ar: "البويرة", communes: ["البويرة"] },
  { code: "11", ar: "تمنراست", communes: ["تمنراست"] },
  { code: "12", ar: "تبسة", communes: ["تبسة"] },
  { code: "13", ar: "تلمسان", communes: ["تلمسان"] },
  { code: "14", ar: "تيارت", communes: ["تيارت"] },
  { code: "15", ar: "تيزي وزو", communes: ["تيزي وزو"] },
  { code: "16", ar: "الجزائر", communes: ["الجزائر الوسطى"] },
  { code: "17", ar: "الجلفة", communes: ["الجلفة"] },
  { code: "18", ar: "جيجل", communes: ["جيجل"] },
  { code: "19", ar: "سطيف", communes: ["سطيف"] },
  { code: "20", ar: "سعيدة", communes: ["سعيدة"] },
  { code: "21", ar: "سكيكدة", communes: ["سكيكدة"] },
  { code: "22", ar: "سيدي بلعباس", communes: ["سيدي بلعباس"] },
  { code: "23", ar: "عنابة", communes: ["عنابة"] },
  { code: "24", ar: "قالمة", communes: ["قالمة"] },
  { code: "25", ar: "قسنطينة", communes: ["قسنطينة"] },
  { code: "26", ar: "المدية", communes: ["المدية"] },
  { code: "27", ar: "مستغانم", communes: ["مستغانم"] },
  { code: "28", ar: "المسيلة", communes: ["المسيلة"] },
  { code: "29", ar: "معسكر", communes: ["معسكر"] },
  { code: "30", ar: "ورقلة", communes: ["ورقلة"] },
  { code: "31", ar: "وهران", communes: ["وهران"] },
  { code: "32", ar: "البيض", communes: ["البيض"] },
  { code: "33", ar: "إليزي", communes: ["إليزي"] },
  { code: "34", ar: "برج بوعريريج", communes: ["برج بوعريريج"] },
  { code: "35", ar: "بومرداس", communes: ["بومرداس"] },
  { code: "36", ar: "الطارف", communes: ["الطارف"] },
  { code: "37", ar: "تندوف", communes: ["تندوف"] },
  { code: "38", ar: "تيسمسيلت", communes: ["تيسمسيلت"] },
  { code: "39", ar: "الوادي", communes: ["الوادي"] },
  { code: "40", ar: "خنشلة", communes: ["خنشلة"] },
  { code: "41", ar: "سوق أهراس", communes: ["سوق أهراس"] },
  { code: "42", ar: "تيبازة", communes: ["تيبازة"] },
  { code: "43", ar: "ميلة", communes: ["ميلة"] },
  { code: "44", ar: "عين الدفلى", communes: ["عين الدفلى"] },
  { code: "45", ar: "النعامة", communes: ["النعامة"] },
  { code: "46", ar: "عين تموشنت", communes: ["عين تموشنت"] },
  { code: "47", ar: "غرداية", communes: ["غرداية"] },
  { code: "48", ar: "غليزان", communes: ["غليزان"] },
  { code: "49", ar: "تيميمون", communes: ["تيميمون"] },
  { code: "50", ar: "برج باجي مختار", communes: ["برج باجي مختار"] },
  { code: "51", ar: "أولاد جلال", communes: ["أولاد جلال"] },
  { code: "52", ar: "بني عباس", communes: ["بني عباس"] },
  { code: "53", ar: "عين صالح", communes: ["عين صالح"] },
  { code: "54", ar: "عين قزام", communes: ["عين قزام"] },
  { code: "55", ar: "تقرت", communes: ["تقرت"] },
  { code: "56", ar: "جانت", communes: ["جانت"] },
  { code: "57", ar: "المغير", communes: ["المغير"] },
  { code: "58", ar: "المنيعة", communes: ["المنيعة"] }
];

export function communesOf(wilayaCode) {
  const w = WILAYAS.find(w => w.code === wilayaCode);
  return w ? w.communes : [];
}
