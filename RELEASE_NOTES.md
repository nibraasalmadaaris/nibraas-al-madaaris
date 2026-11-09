# NIBRAAS – Release notes (system repair)

## Waxa la saxay
1. **Tenant verification**: wuxuu hadda ku xiran yahay `user.id` (ma aha session object). Token refresh / foreground ma dib-u-dhisaan shaashadda, foomamka furan lama lumiyo. Khaladaadka internet-ka (transient) waxay helaan dib-isku-day toos ah + badhan "Mar kale isku day"; khaladka dhabta ah (aan xubin ahayn / function maqan) wuu kala duwan yahay. Fariinta khaldan ee "Ku orod SQL v20" waxaa laga saaray khaladaadka ku meel gaarka ah. Xaqiijinta lama dhaafin.
2. **Laamaha (branches)**: liiska iyo laanta firfircoon ma aha global localStorage; waxay u kala xirmaan tenant-ka (`nibraas-active-branch:<tenant>`), liiskuna wuxuu ka yimaadaa xogta tenant-ka. Akhris fashilmay = shaashad "mar kale isku day", wax lama qoro.
3. **Kaydinta xogta** (dhammaan shaashadaha): akhris-ka-hor-kaydin, `merge by id` marka laba qalab wada shaqeeyaan, natiijada had iyo jeer waa la hubiyaa, liis madhan ma dul-qori karo xog hore, `listKeys` khalad wuu tuuraa (ma noqdo liis madhan).
4. **PWA**: update bar, `version.json`, `sw.js` build-stamped, kaydin socda ayaa reload-ka hakisa.
5. **Amniga**: `printReport` HTML escape; QR gudaha (`src/lib/qr.js`), `quickchart.io` waa la tirtiray; catch madhan waa la saaray; faylasha duugga ah (`src/lib/App.jsx`, `App broken.jsx`, `App working backup.jsx`, `test.txt`, `placeholder.txt 5.`) waa la tirtiray.
6. **Supabase**: `supabase/migrations`, `rollback`, Edge Function iyo README (xaaladda DB dhabta ah lama xaqiijin karin).

## Tijaabooyinka dhabta ah (sandbox: Chromium/Playwright + mock Supabase + esbuild)
| Tijaabo | Natiijo |
|---|---|
| Auth/tenant/branch (T1–T8: token refresh, offline, non-member, setup error, laamo, 2 tenants) | 20/20 |
| Kaydinta ammaanka ah (C1–C9: akhris fashilmay, merge, conflict, listKeys) | 11/11 |
| PWA update e2e (SW dhab ah: first install, update bar, write pending, reload, cache cleanup, offline shell) | 12/12 |
| 25 shaashadood smoke + CRUD Ardayda (create/search/edit/delete/qoris fashilmay/qalab kale) | 34/34 |
| Backup/Restore (trailing-space keys, tenant remap, fayl khaldan) | 5/5 |
| QR encoder → OpenCV decoder | 5/5 |
| Syntax (TypeScript transpile) dhammaan faylasha | OK |

## AAN la tijaabin (si cad)
- `npm run build` (Vite) – npm registry lama gaari karo sandbox-ka; bundle-ka esbuild ayaa lagu hubiyey. **Ku orod `npm run build` Vercel/gudaha.**
- ESLint / react-hooks lint (lama helin); waxaa beddelay tijaabo runtime ah oo ka baaraysa khaladaadka hooks.
- Muuqaalka (Tailwind CSS ma shaqeynayo sandbox-ka): mobile/tablet/desktop layout **lama arag**; waa in aad ku eegto taleefankaaga.
- Android Chrome iyo PWA dhab ah (taleefan dhab ah), iyo Vercel production.
- Supabase dhabta ah: RLS/migrations waxaa lagu tijaabiyey Postgres 16 maxalli ah (hore), ma aha project-kaaga. Lama ogaan karo in `004_role_based_storage_rls.sql` hore loogu fuliyey – isticmaal hubinta `supabase/README.md`.
- Laba qalab oo isla mar kaydinaya (race ms ah): hubinta waa client-side; atomic DB-level lama dhisin (schema lama beddelin).

## Nidaamka Laba-nooca ah (Quran / Academic)
Faylasha la beddelay: `src/App.jsx` (kaliya), `README.md`, `RELEASE_NOTES.md`, `tests/*` (cusub). SQL: **midna**.

Tijaabooyin dhabta ah (mock Supabase + Chromium): t1 20/20, t2 11/11, t3 12/12, t4 34/34, t5 5/5, **t6 15/15** (signup labada nooc, metadata, school-profile, legacy→Quran oo aan wax qorin, tenant kala go'an, profile-read fail = fail-closed), **t7 13/13** (10 shaashadood academic + Marks keydin + Analytics).
**T7 sababta (la baaray)**: tijaabadu waxay ka dhigtaa akhris kasta mid fashilma, markaa shaashadda waxay muujisaa fariinta school-type ("Nooca nidaamka dugsiga lama akhrin karin") halkii laga filaayay tan laamaha. Labadaba waa fail-closed; tijaabada hadda waxay aqbashaa labada fariin. **Cilad dhab ah oo la helay oo la saxay**: badhanka retry wuxuu markaas dib u bilaabi jiray kaliya laamaha, markaa waxaa loo baahnaa 2 riix; hadda mid ayaa dhaafaya (t8).
**Nooc aan la aqoon**: `school-profile` oo nooc aan la aqoon leh hadda waa fail-closed (ma aha Quran si aamusnaan ah), xog lama dul-qorayo. **t8 7/7**: nooc aan la aqoon, retry hal-riix, profile-write fashilmay → ma qiyaaso, retry kadib menu Academic.
**AAN la tijaabin**: `npm run build` (npm lama gaari karo), muuqaalka/mobile layout (Tailwind lama arag), taleefan dhab ah, Supabase dhabta ah (RLS: furayaasha cusub waxay raacaan default-ka; hubi `004` la fuliyey), Report Card print.

## Luqadaha: Carabi + Ingiriis (shaashad kasta)
**Sababta ay hore u liitay**: tarjumaad buuxda waxay ku jirtay oo keliya magacyada menu-ga (~30 erey); inta kale Soomaali ayaa gudaha code-ka lagu qoray.
**Xalka**: `src/lib/i18n.js` + `i18n-dict.js` (932 qoraal oo Carabi ah, 837 Ingiriis ah). Wuxuu tarjumaa qoraalka shaashadda (DOM) marka luqad kale la doorto, isagoo dib ugu celinaya Soomaali marka la rido; xogta kaydsan lama taabto. Login/signup wuxuu hadda leeyahay doorashada luqadda.
**Tijaabooyin dhabta ah**: t9 11/11 (login/signup AR+EN, rtl, dib-u-celin, dashboard, persist, wax lama qoro), t10 5/5 (dhibcaha oo la kaydiyo Carabi ahaan, xogta asalka ah ayaa la kaydiyay; qiimaha la qoray wuu badbaadaa marka luqadda la beddelo). Scan: dhammaan shaashadaha Quran iyo Academic ee Carabiga ah lama helin qoraal Soomaali ah oo hadhay marka laga reebo xogta isticmaalaha iyo magacyada farsamada.
**AAN la tijaabin / xaddidaad**: tarjumaadda Carabiga/Ingiriiska waa tan aan qoray; ha la dib-u-eego (gaar ahaan erayada diinta/waxbarasho) kahor production. Muuqaalka RTL (Tailwind) lama arag — qaar ka mid ah `ml-/mr-/text-left` waxay u baahan karaan hagaajin. Warbixinnada la daabaco (Report Card, print HTML) iyo CSV headers weli Soomaali. Fariimaha dhaqdhaqaaqa leh ee aan qaamuuska ku jirin (lambar ku jira) waxay u muuqdaan Soomaali ilaa lagu daro.

## Luqadaha — dhis adag (v4)
- **Hordhac**: markii aan eegay mashruuca, `localizeHtml`, `uiLocale` iyo qaar ka mid ah `RULES` ayaa horey ugu jiray `App.jsx`/`i18n.js` (wax ka beddelay 13:49; ma ahayn shaqo aan hadda ku sameeyay). Waan hubiyey (build + t9/t10 way gudbeen) oo waan sii dhammeeyay.
- **Cusub**: 7 `RULES` oo kale (confirm-yada Backup/Restore, ardayga duplicate, "Ku dar X Cusub", "Wax ka beddel X", retry notice); 1 qoraal oo dictionary ah; **RTL**: 40+ class oo jihada ah ayaa loo beddelay logical (Tailwind 4 `ps/pe/ms/start/end/text-start/end`) — LTR isma beddelo.
- **Tijaabooyin**: t11 8/8 (rules), t12 (print HTML AR/EN/SO la hubiyay), scan English-ka dhammaan shaashadaha Quran+Academic: Soomaali hadhay = magacyada xogta kaliya ("Fasalka 1") iyo hal sharaxaad farsamo (hadda lagu daray). Dhammaan suites-kii hore (t1–t10) waa gudbeen.
- **Aan la tijaabin**: muuqaalka RTL (Tailwind lama arag; astaamaha fallaadhaha ma rogmanayaan), tarjumaadda oo aan qof afka ah dib u eegin, build dhab ah.

## Luqadaha (v5): update bar + manifest
- Update bar-ka PWA (DOM saafi ah, React ka baxsan) hadda wuu tarjummaa (AR/EN/SO) — dictionary-ga ayaa lagu daray 6 qoraal; **t13 14/14** (flow-ga PWA oo dhan + bar-ka oo AR/EN/SO ah). `Cusboonaysii` = Update.
- `manifest.webmanifest`: magaca "NIBRAAS — نبراس", sharaxaaddu saddex luqadood. Manifest hal luqad ayuu leeyahay; kuma beddelmayo luqadda isticmaalaha. Taleefanka cusboonaysiinta manifest-ka waxay u baahan kartaa in app-ka dib loo rakibo.

## v6 — Sixid: kaararka tirakoobka ee Dashboard-ka Academic ma gujin jireen
**Sababta dhabta ah**: `AcademicHomeScreen` wuxuu kaararka (Ardayda, Macallimiin, Fasallo, Celcelis natiijo, Xaadirin maanta, Fees la helay) ku muujin jiray `StatCard`, kaas oo ahaa `<div>` aan lahayn `onClick` ama ujeeddo. Ma jirin khalad tenant/auth/database — kaararku marnaba lama xirin shaashad (qaybta 8 tiles-ka hoose way shaqaynayeen). Dashboard-ka Quran wuxuu isticmaalaa `card.action` oo hore u xirnaa, sidaa darteed laguma taaban.
**Sixitaan (22 line)**: `StatCard` hadda aqbalaa `onClick` ikhtiyaari ah (marka la siiyo wuxuu noqdaa `<button>` isla muuqaal ahaan leh, keyboard/tap/click); `AcademicHomeScreen` wuxuu u xirayaa: Ardayda→students, Macallimiin→employees, Fasallo→classes, Celcelis natiijo→analytics, Xaadirin maanta→attendance, Fees la helay→invoices. Kaar wuxuu gujin karaa **kaliya haddii door-ku u oggol yahay** (`canAccess`); haddii kale waa sidii hore (aan gujin). StatCard-ka kale (Maaliyadda, Imtixaanno...) isma beddelin.
**Tijaabo t14 (42/42)**: desktop 1280, mobile 390 (tap), Carabi; kaar kasta wuxuu furaa cinwaanka saxda ah (Ardayda, Shaqaalaha, Maareynta Fasallada, Falanqaynta Waxbarashada, Xaadirinta, Biilasha & Khidmadaha); Macalin: kaarka Macallimiin ma gujo (oggolaansho ma leh), Ardayda wuu gujiyaa; Quran dashboard waa sidiisii. Suites hore (t1–t13) dhammaan gudbay. Aan la tijaabin: taleefan dhab ah, build dhab ah.
