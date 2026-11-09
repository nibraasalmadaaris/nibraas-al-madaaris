# NIBRAAS AL-MADAARIS

Nidaam maamul dugsi Qur'aan / madrasad (React + Vite + Tailwind 4 + Supabase), PWA oo taleefanka lagu rakibi karo.

## Qaab-dhismeedka

| Meel | Waxa ku jira |
|------|--------------|
| `src/App.jsx` | App-ka oo dhan: auth, tenant/branch, 12-ka qaybood, dashboard |
| `src/lib/supabase.js` | Supabase client (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) |
| `src/lib/qr.js` | QR generator gudaha browser-ka (xog dibadda lama dirayo) |
| `src/registerServiceWorker.js`, `public/sw.js`, `vite.config.js` | Nidaamka update-ka PWA (build id, version.json, update bar) |
| `supabase/` | SQL migrations, rollbacks, Edge Function, iyo `supabase/README.md` (ka akhri ka hor intaadan wax ku fulin) |
| `RELEASE_NOTES.md` | Waxa la saxay, waxa la tijaabiyey, iyo waxa aan la tijaabin |

## Environment variables (Vercel → Settings → Environment Variables)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Ha geliyin `service_role` key meel browser-ka ah. Edge Function-ku wuxuu isticmaalaa secret-ka server-ka.

## Orod gudaha

```bash
npm install
npm run dev        # development
npm run build      # production build -> dist/
npm run preview
```

## Deployment (GitHub → Vercel)

1. Beddel faylasha mashruuca GitHub (commit + push). Vercel wuu is-dhisayaa.
2. Hubi in Build Command = `npm run build`, Output = `dist` (`vercel.json` ayaa SPA rewrites haya).
3. Mar kasta oo deploy cusub dhaco, `sw.js` iyo `version.json` waxay helaan build id cusub; app-ka rakiban wuxuu muujiyaa "Nooc cusub oo NIBRAAS ah ayaa diyaar ah" → **Cusboonaysii**.
4. SQL migrations **lama fuliyo si toos ah**. Raac `supabase/README.md` (marka hore Backup, kadib hubi waxa horey u jira).

## Rollback

- **App:** Vercel → Deployments → deploy hore → *Promote to Production* (ama `git revert` kadibna push). Isticmaalayaasha rakiban waxay arkayaan update-ka sida caadiga ah.
- **Database:** migrations 003 iyo 004 waxay leeyihiin `supabase/rollback/…`. Xogta app-ka (`app_storage`) migrations-kan ma beddelaan.
- **Xogta:** Dejinta Nidaamka → Backup ka hor isbeddel weyn; Restore wuxuu soo celinayaa backup-ka.

## Sida xogta loo ilaaliyo

- Fur-kasta waxaa la kaydin karaa kaliya ka dib marka si guul leh loo akhriyay (akhris fashilmay ≠ liis madhan).
- Kaydin kasta ka hor waa la dib-u-akhriyaa; haddii qalab kale beddelay, isbeddellada waxaa lagu daraa `id` (laba qalab midna ma tirtiro kan kale).
- Natiijada kaydinta had iyo jeer waa la hubiyaa; khalad = fariin cad, xogtii hore ma beddelanto.
- Tenant verification lama dhaafo: khaladaadka internet-ka waa la dib-u-isku dayaa, kuwa dhabta ah (aan xubin ahayn) waa la muujiyaa.

## Xaaladda SMS iyo Parent Portal

SMS-ka dhabta ah iyo Parent Portal-ka waalidka **weli lama isku xirin** provider/login; app-ku wuxuu kaydiyaa fariimaha iyo taariikhda kaliya, shaashadaha ayaa si cad u sheegaya.

## Laba nidaam oo waxbarasho (Quran / Academic)
- Diiwaangelinta cusub: **1) dooro nidaamka → 2) xogta dugsiga + admin → 3) dashboard-ka saxda ah.** Doorashada waxaa lagu keydiyaa `user_metadata.nibraas_school_type` ka dibna Admin-ku waxa uu qoraa `school-profile` (global key tenant-ka) markii ugu horreysay ee uu galo.
- `quran` = menu-ga Qur'aanka oo dhan (Xifdhi, Muraajaco, Qur'aan, Guulaha...). `academic` = Fasallo & Sections, Sannadka & Terms, Maaddooyin, Dhibco & Darajooyin, Warqadaha Natiijada, Falanqayn, Fees, Parent Portal. Module-ka aan khuseyn lama muujiyo, `canAccess` na wuu diidaa.
- **Dugsiyada hore u jira**: `school-profile` ma laha → si toos ah waa `quran`, wax lama qoro, dib-u-diiwaangelin looma baahna.
- Akhrin fashilmay, qoris fashilmay, ama nooc aan la aqoon = shaashad xiran ("mar kale isku day"), nooca lama qiyaaso.
- Hybrid: mustaqbalka, `type: "hybrid"` + `TYPE_MODULES` gelin kara labada liis; hadda lama hirgelin.
- SQL cusub looma baahna (`app_storage` ayaa isticmaala). Rollback: ku celi `App.jsx` hore (git revert); xogta Quran lama taaban.

## Luqadaha (Soomaali / العربية / English)
- Soomaaliga waa luqadda asalka ah ee qoraalka app-ka. `src/lib/i18n.js` wuxuu muujiyaa tarjumaadda Carabi/Ingiriis ee qoraalka shaashadda (qoraal, placeholder, title, aria-label) isagoo ka qaadanaya `src/lib/i18n-dict.js` (~930 qoraal). **Xogta kaydsan lama beddelo** — kaliya waxa la muujiyo.
- Qoraal aan qaamuuska ku jirin wuxuu ka muuqdaa Soomaali (ma jiro khalad). Si loo daro tarjumaad: ku dar `"Qoraalka Soomaaliga": "..."` `AR` iyo `EN` gudahood `i18n-dict.js` (furaha waa inuu la mid yahay qoraalka App.jsx).
- Luqad-doorashada waxay ku jirtaa login-ka iyo gudaha app-ka; Carabi = `dir="rtl"`.
- Warbixinnada/Report Card ee la daabaco: `localizeHtml()` wuxuu tarjumaa qoraalka iyo `dir=rtl`. Taariikhaha: `uiLocale()`. Qoraallada leh lambar/magac (tusaale 'Import waa guuleystay: 3 cusub...') waxay isticmaalaan `RULES` gudaha `i18n.js`.
- Aan la tarjumin: magacyada/faallooyinka isticmaalaha (waa sida loo geliyey), qoraallada console, Edge Function errors.
- RTL: classes jihada (`ml/mr/pl/pr/left/right/text-left/right`) waxaa loo beddelay kuwa macquul ah (`ms/me/ps/pe/start/end/text-start/end`) si Carabiga u rogmado.
