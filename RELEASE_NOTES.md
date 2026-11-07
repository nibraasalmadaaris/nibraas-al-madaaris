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
