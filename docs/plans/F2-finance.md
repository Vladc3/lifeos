# Plán: Fáze 2 – Finance základ (0.2.0)

**Stav:** schváleno vlastníkem 2026-10-26 · prošel dev-team review (PM, Architect, Dev, QA) a council (typ transakce: 3 : 1 pro odvození z kategorie) · vlastník odpověděl na O1–O3

**Zdroj:** `docs/PRD.md` v0.5, kap. 5, 7, 8, 9 (SYS-01), 10, 11 · **Větev:** `feat/phase2-finance` · **Složitost:** Large (první featura s formuláři a vlastním schématem)
**ID ve fázi:** FIN-01, FIN-02, FIN-03, FIN-04, výchozí kategorie (kap. 10), PUB-04, SYS-01 („Nový výdaj“, PRD: „od fáze 2, s FIN-01“), Ctrl+N (kap. 8)
**Mimo fázi 2:** opakované platby a `recurring_id` (FIN-05, fáze 4), cíle (FIN-06 až 08), FIN-09, FIN-10 (fáze 4), demo návyky (fáze 3), PUB-05.

## Shrnutí

Zápis příjmů a výdajů do 5 s odkudkoli (Ctrl+N, „Nový výdaj“ v liště), seznam transakcí po měsících s filtrem, úpravou a smazáním, správa kategorií s výchozí sadou a rozpočet měsíce s progress bary. SQLite hlídá tvar dat (CHECK, cizí klíče), repozitáře vracejí srozumitelné výsledky, výpočty a pravidla formuláře jsou čisté funkce v `src/lib`. Demo data jdou jen do dev DB.

## Odpovědi vlastníka (2026-10-26)

| # | Otázka | Odpověď |
| --- | --- | --- |
| O1 | FIN-04 „Celkový rozpočet“: co přesně ukázat? | Ve fázi 2 bar všech výdajů měsíce proti `settings.monthly_budget` se stejnými barvami 80 / 100 %. Výdaje v kategoriích bez limitu se počítají. Bez nastaveného rozpočtu místo baru odkaz „Nastav rozpočet v Nastavení“. Vlastník chce navíc grafický přehled všech financí (útrata, spoření, investice): přehled útraty a spořicích cílů přibude ve fázi 4 (B6), investice jsou nová otázka (B7) |
| O2 | FIN-03 dovoluje změnit typ kategorie. Co s jejími staršími transakcemi? | Změní se s ní (typ transakce se bere z kategorie). Když kategorie transakce má, dialog se zeptá „Změní se i N transakcí. Pokračovat?“ |
| O3 | `npm run demo` smaže všechny transakce v **dev** DB a vloží smyšlené. Reálné DB se nikdy nedotkne. OK? | Ano |

## Ověřená fakta (2026-10-26)

| Fakt | Důkaz |
| --- | --- |
| App používá SQLite **3.46.0** (sqlx, `libsqlite3-sys` 0.30.1 bundled), testy `node:sqlite` 3.53.4. **Pravidlo: v SQL jen funkce, které umí 3.46**, jinak testy projdou a app spadne | `Cargo.lock`, `sqlite3.h` v registry |
| Navržené schéma ve spike: částka 0, datum `2026-02-30` i `26.10.2026`, limit u příjmové kategorie, duplicitní název aktivní kategorie a smazání použité kategorie DB odmítne. Název archivované kategorie jde znovu použít | spike v `node:sqlite` |
| Obnova archivované kategorie selže, když mezitím vznikla aktivní se stejným názvem | spike (částečný unikátní index) |
| Chybové texty SQLite se mezi sqlx a `node:sqlite` liší, proto se podle nich nesmí rozhodovat | dev-team (QA) |
| Repozitáře berou `Db` (`select`, `execute`), testy na `node:sqlite` se všemi migracemi, cizí klíče zapnuté v obou | `src/db/types.ts`, `testDb.ts`, `settings.test.ts` |
| Nová migrace = soubor + řádek v `migrations.rs` + hash v `lock.json` | `migrations.rs`, `migrations.lock.test.ts` |
| Rust → frontend: `app.emit` (`tauri::Emitter`), v JS `listen` z `@tauri-apps/api/event` (vrací Promise, odhlášení až po jejím splnění) | Context7, Tauri docs v2 |
| Událost poslaná dřív, než JS zavolá `listen`, se ztratí | dev-team (Architect, QA) |
| Na Linuxu se menu lišty otevírá pravým klikem (touchpad: dvěma prsty) | fáze 1, K5 |
| `toISOString()` dává datum v UTC: v 0:30 v Česku vrátí včerejšek | dev-team (Dev, QA) |
| Pro fázi 4: sqlx pouští migraci v transakci, kde `PRAGMA foreign_keys=OFF` nic neudělá. Přestavba tabulky pak potřebuje `PRAGMA defer_foreign_keys=ON` | dev-team (Architect), ověřit při plánu fáze 4 |

## Změny PRD ke schválení (zapíšou se do PRD v0.6)

| # | Změna | Proč |
| --- | --- | --- |
| B1 | `transactions` **bez sloupce `type`**: typ transakce = `categories.kind`. Změna typu kategorie změní i její transakce (O2) | Council 3 : 1. Jeden zdroj pravdy, nemůže se rozjet. Opravit omylem založenou kategorii jde jedním krokem. JOIN je při ~2 000 řádcích za rok zdarma |
| B2 | `transactions.recurring_id` přibude až s FIN-05 (fáze 4). Plán fáze 4 rozhodne, jestli stačí `recurring_runs` | Tabulka `recurring` zatím neexistuje |
| B3 | PUB-04 po fázích: teď transakce, kategorie a jejich limity, návyky ve fázi 3 | Tabulky návyků zatím nejsou |
| B4 | Výjimka z NFR-09 pro popisky menu v liště (v Rustu) platí až do přidání angličtiny po 1.0 | Viz E8 |
| B5 | Nová otázka Q8 do kap. 12: jak zapsat vratku (refundace nákupu)? Teď jen jako příjem | Council (Skeptic). `amount > 0` platí dál, rozhodne se před fází 4 (FIN-09, CALC-07) |
| B6 | Nový požadavek FIN-11 ve fázi 4: grafický přehled financí na jedné obrazovce (útrata měsíce proti rozpočtu + spořicí cíle a jejich plnění). Přesné akceptační kritérium napíše plán fáze 4 | O1: vlastník chce přehled všech financí, data o cílech vzniknou až ve fázi 4 |
| B7 | Nová otázka Q9 do kap. 12: investice (co evidovat, ruční hodnota nebo vklady, jak je ukázat v přehledu FIN-11). Rozhodnout před fází 4 | O1. Investice v PRD zatím nejsou, kap. 2 (rozsah) se musí rozšířit |

## Rozhodnutí

| # | Rozhodnutí | Proč |
| --- | --- | --- |
| E1 | Migrace `0002_finance.sql` (schéma) a `0003_default_categories.sql` (výchozí kategorie) zvlášť. Jen SQL z SQLite 3.46 | Schéma a data se nemíchají (skill `database-migrations`) |
| E2 | `categories`: `name`, `icon`, `color`, `kind` CHECK `expense`/`income`, `monthly_budget INTEGER NOT NULL DEFAULT 0 CHECK (>= 0)`, CHECK `kind = 'expense' OR monthly_budget = 0`, `archived_at`, `created_at`. Částečný unikátní index `(kind, name) WHERE archived_at IS NULL` | PRD kap. 7, FIN-03 |
| E3 | `transactions`: `date TEXT NOT NULL CHECK (date(date) = date)`, `amount INTEGER NOT NULL CHECK (amount > 0)`, `category_id INTEGER NOT NULL REFERENCES categories(id)`, `note`, `created_at`. Bez indexu (filtr měsíce `substr(date, 1, 7) = $1` stačí) | `date(date) = date` odmítne i neexistující den. `NOT NULL` + cizí klíč = smazání použité kategorie selže i mimo UI |
| E4 | Repozitáře se rozhodují podle dat, ne podle chyb: `deleteCategory` nejdřív spočítá transakce a vrátí `"in_use"`, `restoreCategory` vrátí `"name_taken"`, `createCategory` / `updateCategory` vrátí `"name_taken"`. Omezení v DB jsou pojistka. Změna typu kategorie na příjem zároveň nastaví limit 0 | Texty chyb se liší mezi sqlx a `node:sqlite` (fakta) |
| E5 | Čisté funkce v `src/lib` (každá s testy): `money.ts` (`parseAmount`, `formatMoney`), `dates.ts` (`todayLocal(now)`, `monthOf`, `shiftMonth`), `budget.ts` (`budgetLevel`), `transactionForm.ts` (`validateTransactionForm`, `categoryOptions`) | CLAUDE.md: logika jen v `src/lib`, dnešek parametrem. Pravidla formuláře jdou otestovat bez prohlížeče |
| E6 | `parseAmount`: čárka i tečka = desetinná čárka, mezera a NBSP = oddělovač tisíců. Takže `1.234` = 3 desetinná místa = chyba. Počítá z řetězce (celá a desetinná část zvlášť), nikdy přes float. `formatMoney`: `Intl` cs-CZ, haléře jen když nejsou nulové (`1 234 Kč`, `120,50 Kč`) | FIN-01. Float by z `0,29` udělal 28 haléřů |
| E7 | `categoryOptions(categories, type, currentCategoryId?)`: aktivní kategorie zvoleného typu + u úpravy i aktuální kategorie transakce, i když je archivovaná | Jinak `<select>` ukáže první položku a uložení tiše přesune transakci (Dev) |
| E8 | „Nový výdaj“ v liště: Rust položka `new_expense` nastaví příznak (`AtomicBool`), ukáže okno a pošle událost `new-expense`. `App.tsx` po `listen` zavolá příkaz `take_new_expense` (vrátí a vynuluje příznak), takže kliknutí před načtením JS se neztratí. Popisky menu zůstanou v Rustu (B4) | Tray z JS by přinesl vlastní problémy (druhá ikona po reloadu webview, Ukončit by potřeboval další plugin). Příznak řeší ztracenou událost (Architect, QA) |
| E9 | Stav v `App.tsx`: `dialog: null \| { mode: "new", type } \| { mode: "edit", transaction }` a počítadlo `dataVersion`, které se zvýší po každém uložení (Finance podle něj znovu načte data). Ctrl+N při otevřeném dialogu nic nedělá, Ctrl+1–6 při otevřeném dialogu taky ne. `<dialog>` hlásí zavření přes `onClose` (Esc). Dialog se zavře až po úspěšném uložení, při chybě zůstane otevřený s hláškou | `showModal()` na otevřeném dialogu hází výjimku. Jedna cesta pro Ctrl+N, lištu i úpravu (Dev) |
| E10 | Dialog: nativní `<dialog>` + `<form>` (Enter uloží, Esc zavře), fokus na částce, typ jako dvě rádiová tlačítka, kategorie v `<select>`, datum `<input type="date">` (výchozí `todayLocal`), poznámka | Klávesnice a Esc zdarma, žádná knihovna |
| E11 | Ctrl+N: `shortcuts.ts` vrátí akci `newTransaction` pro `KeyN` (fyzická klávesa, jako Ctrl+1–6) | Kap. 8 |
| E12 | Smazání transakce s potvrzením v řádku („Smazat“ → „Opravdu smazat?“ / „Zrušit“), ne `window.confirm` | Bez nové závislosti, stejné na Windows i Linuxu |
| E13 | Finance: přepínač měsíce (‹ říjen 2026 ›), rozpočet měsíce (FIN-04, O1), seznam s filtrem kategorie (FIN-02). Kategorie a celkový rozpočet v Nastavení (PRD kap. 8) | Rozložení podle PRD |
| E14 | Kategorie: přidat, upravit, archivovat, obnovit, smazat nepoužitou. Ikona = emoji (textové pole), barva = jedna z 8 pevných barev v `src/lib/categoryColors.ts` | Bez knihovny ikon. Obnova je jeden UPDATE a chrání před omylem |
| E15 | Ověření UI: **bez nových závislostí** (žádný jsdom ani Testing Library). Logiku formuláře a výpočty kryjí testy v `src/lib` a `src/db`, propojení v UI ruční kontroly K1–K12 s přesnými vstupy | jsdom neumí dobře `<dialog>`, plugin-sql by se musel mockovat. Prohlížeč přes `npm run dev` plugin-sql nemá (QA) |
| E16 | PUB-04 `npm run demo` (`scripts/demo.ts`, `node:sqlite`): cestu k DB složí čistá funkce `devDbPath(platform, env, identifier)` s testy pro Linux a Windows, identifier čte jen z `src-tauri/tauri.conf.json` a odmítne ho, když nekončí na `.dev`. Když DB neexistuje nebo `_sqlx_migrations` nemá poslední verzi, skončí s hláškou „Nejdřív jednou spusť `npm run tauri dev`“. Jen DML: smaže transakce, nastaví limity a vloží transakce za 3 měsíce, kategorie hledá podle názvu. Data vyrobí čistá funkce `demoTransactions(today, categories)` bez náhody. Na konci vypíše „Restartuj app“ | Migrace pouští jen app (sqlx si je eviduje). Detekce běžící app byla nespolehlivá, proto žádná (Architect, Dev, QA) |

**Nové závislosti:** žádné. Skript běží přes `node` (Node 26 spouští `.ts` přímo, ověří se v T10, jinak `.mjs`).

## Úkoly

Texty do `cs.ts` jsou součástí každého úkolu (NFR-09).

| # | Úkol | Ověření |
| --- | --- | --- |
| T1 | Spike 30 min v `tauri dev`: `<dialog>` + `<form>` + `<select>` + `<input type="date">` ve WebKitGTK (Enter, Esc i s otevřeným selectem, kde se ukáže popup na Hyprlandu). Výsledek do faktů, při problému s datem textové pole + `parseDate` | zápis do plánu |
| T2 | TDD `money.ts`: `parseAmount` (chyba: prázdné, `abc`, `0`, `-5`, `1,234`, `1.234`, nad `MAX_SAFE_INTEGER`; OK: `12` → 1200, `12,5` → 1250, `12.50` → 1250, `0,29` → 29, `0,1` → 10, `1 234,50` i s NBSP → 123450), `formatMoney` (`123450` → `1 234,50 Kč`, `100000` → `1 000 Kč`) | `npm test` červeně → zeleně |
| T3 | TDD `dates.ts` (`todayLocal` těsně po půlnoci místního času, test s `TZ=Europe/Prague`; `shiftMonth` prosinec → leden a zpět; `monthOf`) a `budget.ts` (`budgetLevel`: 0 %, 80 % = ok, 80,01 % = warning, 100 % = warning, 100,01 % = over, limit 0 = žádný bar) | `npm test` červeně → zeleně |
| T4 | Migrace 0002 + 0003 + registrace + `lock.json`. Testy schématu `src/db/finance.schema.test.ts`: částka 0, `2026-02-30`, `category_id` NULL, limit u příjmové, duplicitní aktivní název a smazání použité kategorie selžou; 10 výdajových + 2 příjmové kategorie | červeně (tabulky nejsou) → zeleně; `cargo test` |
| T5 | TDD repozitáře `categories.ts` a `transactions.ts` (E4): create, update, archive, restore (`name_taken`), delete (`in_use`), změna typu s počtem transakcí, list podle měsíce a kategorie (typ přes JOIN), součty výdajů podle kategorie a celkem za měsíc | `npm test` červeně → zeleně |
| T6 | TDD `transactionForm.ts` (`validateTransactionForm`, `categoryOptions` včetně archivované aktuální) a `shortcuts.ts` (Ctrl+N; Ctrl+Shift+N, Ctrl+Alt+N → nic) | `npm test` červeně → zeleně |
| T7 | Dialog transakce + stav v `App.tsx` (E9, E10, E11) | K1, K2, K11 |
| T8 | Finance obrazovka (E12, E13) | K3, K4 |
| T9 | Nastavení: celkový rozpočet, správa kategorií (E14, O2) | K5, K6 |
| T10 | Lišta „Nový výdaj“ (E8): Context7 pro příkaz a jeho povolení v capabilities | K7, K12 |
| T11 | PUB-04 (E16): TDD `devDbPath` a `demoTransactions` (stejný vstup = stejný výstup, všechna data v posledních 3 měsících a ne v budoucnu, jen kategorie, které dostala), pak skript | K8 |
| T12 | Verze 0.2.0 (`package.json`, `Cargo.toml`, `tauri.conf.json`), README (screenshot z demo dat, `npm run demo`), `docs/learning.md` (PRD v0.6 už při schválení) | review diffu |
| T13 | PR, CI zelené, merge, tag `v0.2.0` | `gh pr checks`, `git tag` |

## Kontrolní seznam (ruční)

`DEV` = `~/.config/io.github.vladc3.lifeos.dev`, `REAL` = `~/.config/io.github.vladc3.lifeos`. App spouštěj `npm run tauri dev`. Menu lišty = **pravý klik** na ikonu (touchpad: klik dvěma prsty), ikona je v šuplíku `‹`, pokud není připnutá.

| # | Kontrola | Postup | Očekávaný výsledek |
| --- | --- | --- | --- |
| K1 | Rychlý zápis | Na každém z 6 modulů: Ctrl+N → napsat `120,50` → Enter | Dialog se otevře s kurzorem v poli částky, typ Výdaj, datum dnešek. Po Enter zmizí, ve Finance je nahoře výdaj 120,50 Kč v první kategorii. Od Ctrl+N po uložení pod 5 s |
| K2 | Chybné částky | Ctrl+N, postupně `0`, `-5`, `1,234`, `1.234`, `abc`, prázdné → Enter | Pokaždé hláška „Zadej částku větší než 0, nejvýš 2 desetinná místa“ (text z `cs.ts`), dialog zůstane otevřený, ve Finance nic nepřibude |
| K3 | Klávesnice v dialogu | Ctrl+N → Tab přes všechna pole → šipkou přepnout typ na Příjem → v kategoriích šipkami → Esc | Fokus je vidět na každém poli. U Příjmu jsou v nabídce jen „Práce / zakázky“ a „Ostatní příjmy“. Esc zavře, nic se neuloží |
| K4 | Seznam a úprava | Finance: ‹ na minulý měsíc a zpět, filtr „Jídlo“, u transakce Upravit → částka `99` → Enter; Smazat → Zrušit; Smazat → Opravdu smazat | Seznam ukazuje jen zvolený měsíc a kategorii, úprava ukáže 99 Kč, po Zrušit transakce zůstane, po potvrzení zmizí |
| K5 | Rozpočet | Nastavení: rozpočet 7 000 Kč, Jídlo limit 1 000 Kč. Zapsat výdaje v Jídle tak, aby součet byl 700, pak 900, pak 1 100 Kč | Bar Jídla zelený / oranžový / červený. Kategorie s limitem 0 bar nemají. Celkový bar podle O1 |
| K6 | Kategorie | Nastavení: přidat „Káva ☕“, přejmenovat, archivovat; Ctrl+N; obnovit. Smazat „Jídlo“ (má transakce). Změnit typ kategorie s transakcemi | Archivovaná v dialogu chybí, u jejích transakcí v seznamu zůstane název. Smazat Jídlo nejde, nabídne Archivovat. Změna typu se zeptá na počet transakcí (O2) |
| K7 | Nový výdaj z lišty | Zavřít okno křížkem → menu lišty → Nový výdaj | Okno se ukáže s otevřeným dialogem, typ Výdaj (když fokus nepřejde do okna, stačí klik, Hyprland, viz fáze 1) |
| K8 | Demo data | 1) `stat -c %Y $REAL/life-os.db $REAL/life-os.db-wal` 2) ukončit app přes lištu → `npm run demo` 3) znovu `stat` 4) `npm run tauri dev` | Skript vypíše počet vložených transakcí a „Restartuj app“. Časy v `REAL` se nezmění. Ve Finance jsou 3 měsíce dat a barevné bary |
| K9 | Malé okno | Hyprland: dát app do dlaždice vedle terminálu (zhruba 750 × 400) | Finance i dialog se přeskládají, žádný vodorovný posuvník, tlačítka Uložit a Zrušit jsou vidět |
| K10 | Regrese fáze 1: lišta a jedna instance | Zavřít okno → menu lišty Otevřít → spustit app znovu z druhého terminálu → menu lišty Ukončit | Okno zpět, `pgrep -xc life-os` pořád 1, po Ukončit 0 |
| K11 | Regrese fáze 1: zkratky | Ctrl+1 až Ctrl+6 bez dialogu; s otevřeným dialogem Ctrl+2 | Bez dialogu přepínají moduly. S dialogem se nic nestane |
| K12 | Nový výdaj hned po startu | Spustit app a během první sekundy kliknout v liště Nový výdaj | Dialog se otevře (E8, příznak) |

## Validace (Definice hotovo)

```bash
npm run lint && npm test
cd src-tauri && cargo test && cargo clippy -- -D warnings && cargo fmt --check
npm run tauri dev   # + K1–K12
gh pr checks        # ubuntu i windows zelené
```

## Rizika

| Riziko | Pravděpodobnost | Zmírnění |
| --- | --- | --- |
| SQL funkce, kterou má 3.53 a nemá 3.46: testy zelené, app spadne | Střední | Pravidlo v E1, K1 v reálné app hned po T4 |
| `<input type="date">` nebo `<select>` ve WebKitGTK zlobí | Střední | Spike T1 před UI |
| Zapomenutý JOIN na `categories.kind` → špatné součty bez chyby | Střední | Součty jen v repozitářích s testy (T5), UI nepíše SQL |
| Demo skript zapíše do reálné DB | Nízká, dopad vysoký | `devDbPath` odmítne identifier bez `.dev`, test; K8 přes `stat` |
| Fokus po „Nový výdaj“ na Hyprlandu nepřejde do okna | Střední | Dialog je otevřený, stačí klik. Známé z fáze 1 |
| Změna typu kategorie přepíše historii omylem | Nízká | Potvrzení s počtem transakcí (O2) |

## Akceptace

- [ ] FIN-01 zápis: fokus na částce, Enter uloží, kategorie podle typu, validace částky (K1–K3)
- [ ] FIN-02 seznam: měsíc, kategorie, úprava, smazání s potvrzením (K4)
- [ ] FIN-03 kategorie: přidat, upravit, archivovat, použitou nejde smazat (K6)
- [ ] FIN-04 rozpočet: celkový + barvy 80 / 100 % (K5, O1)
- [ ] Výchozí kategorie 10 + 2 (T4)
- [ ] SYS-01 „Nový výdaj“ v liště, i hned po startu (K7, K12)
- [ ] PUB-04 demo data jen v dev DB (K8)
- [ ] Regrese fáze 1 v pořádku (K10, K11)
- [ ] CI zelené, PRD v0.6 s B1–B7, tag v0.2.0
