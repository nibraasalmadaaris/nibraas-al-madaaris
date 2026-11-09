// UI language layer. Somali is the source language of every text in the app. For Arabic / English the
// text shown on screen is translated from the dictionary (./i18n-dict.js). Nothing stored in the database
// is ever changed: only what is displayed. A text with no dictionary entry is shown in Somali.
import { useSyncExternalStore } from "react";
import { AR, EN } from "./i18n-dict.js";

export const LANGUAGES = ["so", "ar", "en"];
const STORAGE_KEY = "nibraas-language";
const DICTS = { ar: AR, en: EN };

function readStoredLang() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return LANGUAGES.includes(v) ? v : "so";
  } catch {
    return "so";
  }
}

let lang = readStoredLang();
const listeners = new Set();

function applyDocumentLang() {
  try {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  } catch { /* not in a browser */ }
}

export function getLang() { return lang; }

export function setLang(next) {
  if (!LANGUAGES.includes(next) || next === lang) return;
  lang = next;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* private mode */ }
  applyDocumentLang();
  retranslateAll();
  listeners.forEach((l) => l());
}

export function useLang() {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => lang, () => "so");
}

// Dynamic texts (with numbers/names) cannot be exact dictionary keys. Each rule: Somali pattern ->
// Arabic / English template; $1, $2 are the captured parts. A captured part is translated too when the
// dictionary knows it (e.g. a class name that is a dictionary word).
const RULES = [
  [/^Xaadirinta maanta: (\d+) diiwaan lama akhrin karin\.$/, "حضور اليوم: تعذّرت قراءة $1 سجلات.", "Today's attendance: $1 records could not be read."],
  [/^(\d+) diiwaan$/, "$1 سجل", "$1 records"],
  [/^(\d+)% la bixiyay$/, "$1% مدفوع", "$1% paid"],
  [/^Ardayda: (\d+) ilaa (\d+)$/, "الطلاب: من $1 إلى $2", "Students: $1 to $2"],
  [/^(\d+) ogeysiis waalid ayaa la diyaariyey\.$/, "تم إعداد $1 إشعار لأولياء الأمور.", "$1 parent notices were prepared."],
  [/^Warbixinta waa dhammaystiran tahay: (\d+) diiwaan xaadirin lama akhrin karin\.$/, "التقرير ناقص: تعذّرت قراءة $1 سجل حضور.", "The report is incomplete: $1 attendance records could not be read."],
  [/^Mushaharka aasaasiga: (.+)$/, "الراتب الأساسي: $1", "Base salary: $1"],
  [/^Bonus: (.+)$/, "المكافأة: $1", "Bonus: $1"],
  [/^Jaris: (.+)$/, "الخصم: $1", "Deduction: $1"],
  [/^Restore waa guuleystay: (\d+) qaybood oo xog ah ayaa la diray\. NIBRAAS waa dib loo furayaa\.$/, "نجحت الاستعادة: تمت استعادة $1 جزءاً من البيانات. يُعاد فتح نبراس.", "Restore succeeded: $1 data parts were restored. NIBRAAS is reopening."],
  [/^Dib-u-dejintu way dhammaystirmin: (\d+) qayb lama tirtirin \((.+)\)\.$/, "لم تكتمل الاستعادة: تعذّر حذف $1 جزءاً ($2).", "Restore did not complete: $1 parts could not be deleted ($2)."],
  [/^Dhibcaha waa inay ahaadaan 0 ilaa (.+)\.$/, "يجب أن تكون الدرجات بين 0 و $1.", "Marks must be between 0 and $1."],
  [/^(\d+) natiijo waa la kaydiyay\.$/, "تم حفظ $1 نتيجة.", "$1 results were saved."],
  [/^Fasalka "(.*)" arday ma lahan\. Hubi magaca fasalka\.$/, "الفصل \"$1\" لا يضم طلاباً. تحقق من اسم الفصل.", "Class \"$1\" has no students. Check the class name."],
  [/^Dhibcaha (.+)$/, "درجات $1", "Marks $1"],
  [/^Wali lama gelin (.+)$/, "لم يُضف $1 بعد", "No $1 added yet"],
  [/^Export waa diyaar: (\d+) diiwaan\.$/, "التصدير جاهز: $1 سجل.", "Export is ready: $1 records."],
  [/^Export-ka waa la joojiyey: (\d+) diiwaan xaadirin lama akhrin karin, faylku wuu ka dhiman lahaa\.$/, "تم إيقاف التصدير: تعذّرت قراءة $1 سجل حضور وكان الملف سيكون ناقصاً.", "Export was stopped: $1 attendance records could not be read and the file would have been incomplete."],
  [/^Xaadirin export ah: (\d+) diiwaan\.$/, "تصدير الحضور: $1 سجل.", "Attendance export: $1 records."],
  [/^(\d+) arday ayaa diyaar u ah preview\.$/, "$1 طالب جاهزون للمعاينة.", "$1 students are ready for preview."],
  [/^Import waa guuleystay: (\d+) cusub, (\d+) la cusboonaysiiyey\.$/, "نجح الاستيراد: $1 جديد و$2 تم تحديثه.", "Import succeeded: $1 new, $2 updated."],
  [/^Lambarku waa inuusan ka yaraan (.+)\.$/, "يجب ألا يقل الرقم عن $1.", "The number must not be less than $1."],
  [/^Lambarku waa inuusan ka badnaan (.+)\.$/, "يجب ألا يزيد الرقم عن $1.", "The number must not exceed $1."],
  [/^Qadarku waa inuusan ka badnaan (.+)\.$/, "يجب ألا يزيد المبلغ عن $1.", "The amount must not exceed $1."],
  [/^Furaha xogta safka (\d+) waa khaldan yahay\.$/, "مفتاح البيانات في الصف $1 غير صحيح.", "The data key in row $1 is invalid."],
  [/^Xogta safka (\d+) qiime \(value\) ma leh\.$/, "بيانات الصف $1 لا تحتوي على قيمة (value).", "Row $1 has no value."],
  [/^Furaha physical-ka ee safka (\d+) waa khaldan yahay\.$/, "المفتاح الفعلي في الصف $1 غير صحيح.", "The physical key in row $1 is invalid."],
  [/^Furaha xogta safka (\d+) lama diyaarin karin\.$/, "تعذّر تجهيز مفتاح بيانات الصف $1.", "The data key of row $1 could not be prepared."],
  [/^Imtixaanka: (.+)$/, "الامتحان: $1", "Exam: $1"],
  [/^Ku dar (.+) Cusub$/, "إضافة $1 جديد", "Add New $1"],
  [/^Wax ka beddel (.+)$/, "تعديل $1", "Edit $1"],
  [/^Isku xirka waa daciif yahay\. Dib ayaa loo isku dayayaa \((\d+)\/(\d+)\)\.\.\.$/, "الاتصال ضعيف. تتم إعادة المحاولة ($1/$2)...", "The connection is weak. Retrying ($1/$2)..."],
  [/^Arday magaca "(.*)" leh ayaa horey fasalkan ugu jira\. Ma sii wadaa oo ma ku darta mar kale\?$/, "يوجد طالب باسم \"$1\" في هذا الفصل مسبقاً. هل تتابع وتضيفه مرة أخرى؟", "A student named \"$1\" is already in this class. Do you want to continue and add again?"],
  [/^Backup-kan wuxuu ka kooban yahay (\d+) qaybood oo xog ah\.\n\nXogta leh furayaal isku mid ah waa la cusboonaysiin karaa\. Hubi inaad haysato backup cusub ka hor intaadan sii wadin\.\n\nMa sii wadeysaa\?$/, "تحتوي هذه النسخة الاحتياطية على $1 جزءاً من البيانات.\n\nقد يتم تحديث البيانات ذات المفاتيح المتطابقة. تأكد من وجود نسخة احتياطية حديثة قبل المتابعة.\n\nهل تريد المتابعة؟", "This backup contains $1 parts of data.\n\nData with identical keys may be updated. Make sure you have a recent backup before continuing.\n\nDo you want to continue?"],
  [/^Backup-ku wuxuu leeyahay furayaal is-dul-saaran: (.+)\. Waxba lama beddelin\. Samee Backup cusub oo qaabkiisa cusub ah kadib marka cusboonaysiintu diyaar noqoto\.$/, "تحتوي النسخة الاحتياطية على مفاتيح متداخلة: $1. لم يتم تغيير أي شيء. أنشئ نسخة احتياطية جديدة بالصيغة الجديدة بعد اكتمال التحديث.", "The backup has overlapping keys: $1. Nothing was changed. Create a new backup in the new format once the update is ready."],
  [/^Restore-ku wuu fashilmay\.\n\n([\s\S]*)$/, "فشلت الاستعادة.\n\n$1", "The restore failed.\n\n$1"],
];

const LOOSE = {};
function looseIndex(to) {
  if (!LOOSE[to]) {
    const idx = new Map();
    for (const [k, v] of Object.entries(DICTS[to] || {})) idx.set(k.toLowerCase(), v);
    LOOSE[to] = idx;
  }
  return LOOSE[to];
}
// Exact match first, then a case-insensitive match (e.g. a lower-cased schema title); else unchanged.
function translateLoose(text, to) {
  const hit = DICTS[to]?.[text];
  if (hit !== undefined) return hit;
  return looseIndex(to).get(String(text).toLowerCase()) ?? text;
}

export function translate(text, to = lang) {
  if (to === "so" || typeof text !== "string") return text;
  const trimmed = text.trim();
  if (!trimmed) return text;
  const hit = DICTS[to]?.[trimmed];
  if (hit !== undefined) {
    if (trimmed === text) return hit;
    const start = text.indexOf(trimmed);
    return text.slice(0, start) + hit + text.slice(start + trimmed.length);
  }
  for (const [re, ar, en] of RULES) {
    const m = trimmed.match(re);
    if (m) {
      const tpl = to === "ar" ? ar : en;
      const filled = tpl.replace(/\$(\d)/g, (_, i) => translateLoose(m[Number(i)], to));
      return text.replace(trimmed, filled);
    }
  }
  // "A · B · C" lists (e.g. class · status): translate each part.
  if (trimmed.includes(" · ")) {
    const parts = trimmed.split(" · ");
    const out = parts.map((p) => translate(p, to));
    if (out.some((p, i) => p !== parts[i])) return text.replace(trimmed, out.join(" · "));
  }
  // Leading symbols / emoji ("✓ Waa la kaydiyey.", "🖨️ Daabac"): translate the text after them.
  const lead = trimmed.match(/^([^\p{L}\p{N}]+)(\p{L}.*)$/su);
  if (lead) {
    const rest = translate(lead[2], to);
    if (rest !== lead[2]) return text.replace(trimmed, lead[1] + rest);
  }
  return text;
}

// Locale for dates/numbers in the current UI language (Latin digits in Arabic for consistency).
export function uiLocale() { return lang === "ar" ? "ar-u-nu-latn" : lang === "en" ? "en-GB" : "so-SO"; }

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&#x27;": "'" };
const escapeText = (v) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// For printed documents written into a new window (outside the app's DOM): translate the text between
// tags, and set lang/dir on the <html> element.
export function localizeHtml(html, to = lang) {
  if (to === "so") return html;
  const body = html.replace(/>([^<>]+)</g, (whole, text) => {
    const plain = text.replace(/&(?:amp|lt|gt|quot|#39|#x27);/g, (e) => ENTITIES[e]);
    const out = translate(plain, to);
    return out === plain ? whole : ">" + escapeText(out) + "<";
  });
  return body.replace(/<html\b[^>]*>/i, `<html lang="${to}" dir="${to === "ar" ? "rtl" : "ltr"}">`);
}

// t("Somali text") for texts built in code (e.g. before they are put in state).
export function t(text) { return translate(text); }

// ---- DOM layer: translates visible text and placeholder/title/aria-label/alt attributes -------------
const ATTRS = ["placeholder", "title", "aria-label", "alt"];
const textRec = new WeakMap(); // text node -> { so, shown }
const attrRec = new WeakMap(); // element -> { [attr]: { so, shown } }
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE", "PRE"]);
let observer = null;

// forAttrs: attributes (placeholder...) of an <input> are translated; only its text content is skipped.
function skipped(el, forAttrs = false) {
  for (let e = el; e; e = e.parentElement) {
    if (e.hasAttribute?.("data-no-i18n")) return true;
    if (SKIP_TAGS.has(e.tagName) && !(forAttrs && (e.tagName === "INPUT" || e.tagName === "TEXTAREA"))) return true;
  }
  return false;
}

function processText(node) {
  if (!node.parentElement || skipped(node.parentElement)) return;
  const cur = node.nodeValue;
  const rec = textRec.get(node);
  const so = rec && rec.shown === cur ? rec.so : cur; // a changed value means React wrote new Somali text
  const out = lang === "so" ? so : translate(so);
  if (out !== cur) node.nodeValue = out;
  textRec.set(node, { so, shown: out });
}

function processAttrs(el) {
  if (!el.getAttribute || skipped(el, true)) return;
  let recs = attrRec.get(el);
  for (const a of ATTRS) {
    if (!el.hasAttribute(a)) continue;
    const cur = el.getAttribute(a);
    const rec = recs?.[a];
    const so = rec && rec.shown === cur ? rec.so : cur;
    const out = lang === "so" ? so : translate(so);
    if (out !== cur) el.setAttribute(a, out);
    if (!recs) { recs = {}; attrRec.set(el, recs); }
    recs[a] = { so, shown: out };
  }
}

function walk(root) {
  if (root.nodeType === 3) { processText(root); return; }
  if (root.nodeType !== 1) return;
  processAttrs(root);
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let n = tw.nextNode();
  while (n) {
    if (n.nodeType === 3) processText(n); else processAttrs(n);
    n = tw.nextNode();
  }
}

function retranslateAll() {
  if (typeof document === "undefined" || !document.body) return;
  walk(document.body);
}

export function installDomTranslator() {
  if (observer || typeof MutationObserver === "undefined" || typeof document === "undefined") return;
  applyDocumentLang();
  const start = () => {
    retranslateAll();
    observer = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "characterData") processText(m.target);
        else if (m.type === "attributes") processAttrs(m.target);
        else m.addedNodes.forEach((n) => walk(n));
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start, { once: true });
}
