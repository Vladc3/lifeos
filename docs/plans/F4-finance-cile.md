# Plán: Fáze 4 – Finance a cíle (0.4.0)

**Stav:** schváleno vlastníkem (2026-10-31) · v5 · dev-team hotový · council: Skeptik a Pragmatik schválili v4, Kritik v5

**Zdroj:** `docs/PRD.md` v0.7, kap. 2, 5, 6 (CALC-07 až 11), 7, 8, 9, 12 (Q6, Q8, Q9) · **Větev:** `feat/phase4-finance-cile` · **Složitost:** Large
**ID ve fázi:** FIN-05 až FIN-11, nový FIN-12 (investice), CALC-07 až CALC-11
**Mimo fázi 4:** Dnes včetně DNE-03 a DNE-05 (fáze 5), HAB-10 (fáze 5, CALC-10 teď jen pro návykový cíl), zálohy NFR-05 (fáze 6).

## Shrnutí

Opakované platby, které se doplní samy, tři typy cílů s vklady a prioritou, investiční účty s měsíčním vkladem, denní limit, měsíční přehled a grafický přehled financí. Výpočty jsou čisté funkce v `src/lib`. Opakovaná platba se zapíše atomicky jedním příkazem s triggerem, bez Rust příkazu.

## Odpovědi vlastníka (2026-10-31)

| # | Otázka | Odpověď |
| --- | --- | --- |
| R1 | Q8 vratky | Zatím jako příjem. Výdaje kategorie se nesníží, žádná práce navíc |
| R2 | Q9 investice | Účet s ruční hodnotou + plánovaný měsíční vklad, který snižuje denní limit |
| R3 | Grafy | Recharts (PRD kap. 9) |
| R4 | Cíl po termínu | Podle PRD (M = 1), karta ukáže „po termínu“ a nabídne prodloužit termín nebo pozastavit |
| R5 | Vklad a limit | Zaplacený vklad zůstane rezervovaný, vklad nad plán limit sníží |
| R6 | Budoucí platby | Limit dopředu rezervuje opakované výdaje, které tento měsíc ještě přijdou |

**Rozhodnuto výchozí volbou (vlastník může změnit):** první opakovaná platba je až na datum ≥ založení (pozdější změna dne ji může v jejím měsíci posunout dřív, platba zůstane jedna). Opakovaná platba může být i příjem. Platba, cíl i investice se jen archivují, obnova není (neřešíme doplňování vynechaných měsíců). Vklad jde smazat. Řazení cílů přetažením i tlačítky ↑ ↓.

## Ověřená fakta (2026-10-31)

| Fakt | Důkaz |
| --- | --- |
| Podmíněný `INSERT` + trigger: druhý běh nevloží nic, smazaná ani upravená platba se nevrátí, `ALTER … REFERENCES` funguje | zkouška architekta na SQLite 3.53.4, **v app (3.46) znovu ověřit v T1** |
| `INSERT OR IGNORE` je zakázané: jeho pravidlo přebije trigger a vyrobí duplicitní transakci | reprodukce architekta |
| Vklad podle PRD uvolní rezervaci: B 15 000, D 30, plán 3 000 → A 400, po vkladu 500, odtok 18 000 | reprodukce council → R5 |
| Vklad → přepsání hodnoty → smazání vkladu: trigger tiše sníží přepsanou hodnotu | reprodukce council → E5 bez triggeru |
| HTML5 přetahování na Windows vyžaduje `dragDropEnabled: false` | Context7, Tauri docs v2 |
| `deleteCategory` počítá jen transakce, opakovaná platba i cíl by narazily na cizí klíč | `src/db/categories.ts:106` |
| `updateCategory` mění typ kategorie, opakovaný výdaj by se tiše stal příjmem | `src/db/categories.ts:57` |
| `monthExpenses` zahrnuje dnešek i budoucí data, pro `S` nejde použít | `src/db/transactions.ts` |
| CALC-08 `saved` nezahrnuje vklady tohoto měsíce, ale FIN-07 chce splnění hned | PRD |
| `today` se čte při renderu, otevřená obrazovka se po návratu z lišty sama nenačte | `src/App.tsx` |
| Demo má Předplatné jako běžnou transakci, s opakovanou platbou by se počítalo dvakrát | `src/lib/demo.ts:85` |
| Demo smaže transakce, ale `recurring_runs` by zůstaly a platby by se už nevygenerovaly | `scripts/demo.ts:57` |
| `scripts/demo.ts` běží v čistém Node, `src/lib/demo.ts` nesmí importovat za běhu nic relativního, výpočet limitu tam nejde | zkouška council, `ERR_MODULE_NOT_FOUND` |
| Demo odmítne běžet, dokud app nedoběhla nové migrace | `scripts/demo.ts:39` |

## Změny PRD ke schválení (PRD v0.8)

| # | Změna | Proč |
| --- | --- | --- |
| D1 | Q6 pro CALC-11 vyřešena triggerem. `recurring.first_month` (`YYYY-MM`) místo `created_at`: první měsíc, jehož upravené datum (31. → 28. 2.) je při založení ≥ dnes. Určí se jednou a nejde měnit. FIN-05 „při spuštění app“ znamená načtení Finance a Cíle a návrat do okna, spuštění samotné přibude s Dnes ve fázi 5 | UTC, výchozí volba |
| D2 | Nový FIN-12 Investice: účet (název, ikona, aktuální hodnota, měsíční vklad), přidat, upravit, archivovat. Vklad není výdaj a zvýší hodnotu, hodnotu jde přepsat. Rozšíření kap. 2, tabulky `investments`, `investment_deposits` | R2 |
| D3 | CALC-07 nově: `P` = Σ cíle max(plán, vklady tento měsíc) + Σ investice max(plán, vklady tento měsíc) + `U`. Plán spořicího cíle = příspěvek CALC-08, pozastavený, splněný a archivovaný cíl má plán 0, archivovaná investice také. Vklady tohoto měsíce se počítají vždy. `U` = opakované výdaje, které tento měsíc ještě nemají běh, mají datum > dnes a tento měsíc ≥ `first_month`, + vygenerované výdaje tohoto měsíce s datem ≥ dnes. `dnešní výdaje` je bez vygenerovaných. Příjmy do `U` nikdy nevstupují | R5, R6. Bez druhé části by nájem v den platby ukázal −6 500 Kč |
| D4 | FIN-07: splnění se počítá ze všech vkladů včetně tohoto měsíce, smazání vkladu nebo zvýšení cílové částky ho může zrušit. CALC-08 `saved` zůstává beze změny | Rozpor CALC-08 × FIN-07 |
| D5 | FIN-08: volné peníze = B − S − rezervace investic − `U` − vklady cílů tento měsíc. Cíle podle priority: nevejde-li se zbylý příspěvek > 0, cíl se označí a přeskočí, další menší se může vejít. Pozastavené a cíle bez zbylého příspěvku se neoznačují. Bez rozpočtu nic neoznačuje | Rezervace R5/R6, investice nemají prioritu |
| D6 | FIN-11 na obrazovce Cíle: spent/budget, spořicí cíle, investice (součet hodnoty + vklady měsíce) | Kritérium doplněno |
| D7 | FIN-10 do fáze 5 ve Finance (DNE-03 přijde pak) | Dnes ještě není |
| D8 | Q8 uzavřena: vratka = příjem. Q9 uzavřena D2 | R1, R2 |

## Rozhodnutí

| # | Rozhodnutí | Proč |
| --- | --- | --- |
| E1 | `0005_recurring.sql`: `recurring` (název, částka > 0, `category_id REFERENCES` bez SET NULL, `day_of_month` 1–31, `first_month`, `archived_at`), `recurring_runs` (`UNIQUE(recurring_id, month)`, `transaction_id` nullable, `ON DELETE SET NULL`), `transactions.recurring_id`, trigger `AFTER INSERT ON transactions WHEN NEW.recurring_id IS NOT NULL` zapíše běh s `substr(NEW.date, 1, 7)`. Zápis jen `INSERT … SELECT … WHERE NOT EXISTS (běh)`, nikdy `OR IGNORE` | Q6, atomické |
| E2 | `src/lib/recurring.ts`: `firstRunMonth(day, today)` určí první měsíc při založení. `dueRuns(recurring, runs, today)` → měsíce od `first_month`, upravené datum ≤ dnes, archivovaná nic. `upcomingRecurring(recurring, runs, today)` → výdaje s datem > dnes bez běhu tento měsíc, jen když tento měsíc ≥ `first_month`. `generateRecurring(db, today)` je **await na začátku načtení Finance a Cíle a uvnitř `loadDailyLimit`, `updateRecurring` a `archiveRecurring`** (start app přijde s Dnes ve fázi 5). `focus` okna v `App.tsx` zvýší `dataVersion` | CALC-11, app běží dny v liště. Archivace nebo úprava po pauze nesmí ztratit ani přepsat vynechané měsíce. Limit nezávisí na pořadí volání |
| E3 | Úprava platby (částka, den, kategorie, název) platí jen pro budoucí běhy, vzniklé transakce se nemění, `first_month` se nemění, takže změna dne neotevře měsíc před založením. Změna dne v měsíci s již vzniklým během nic nezdvojí. Archivace kategorie platbu nezastaví | Upravená platba nemění minulost, UNIQUE běh, nález council: změna dne by jinak vyrobila platbu za měsíc před založením |
| E4 | `0006_goals.sql`: `goals` (typ, název, ikona, priorita, `paused_at`, `achieved_at`, `archived_at`, CASE CHECK podle typu: `saving` má částku a termín, `limit` kategorii a částku, `no_spend` `target_days` 1–31; bez CHECK na budoucí termín, bez UNIQUE na prioritu), `goal_deposits` (datum, částka > 0). Všechny tři typy rovnou | Jedna migrace, formulář hlídá budoucí termín |
| E5 | `0007_investments.sql`: `investments` (`base_value`, `base_deposit_id`, `monthly_deposit`, `archived_at`), `investment_deposits` (`id INTEGER PRIMARY KEY AUTOINCREMENT`, datum, částka > 0). **Bez triggeru:** hodnota = `base_value` + Σ vklady s `id > base_deposit_id`. Přepsání hodnoty je jeden `UPDATE`, který nastaví oba sloupce. AUTOINCREMENT, aby se id nepoužilo znovu | Přepsání × smazání vkladu (reprodukce council) |
| E6 | `src/lib/dailyLimit.ts`: `dailyLimit({ budget, spentBefore, reserved, daysLeft, spentToday })` → `{ allowance, shown } \| null` (null při B nenastaveném nebo 0) | CALC-07 |
| E7 | `src/lib/goals.ts`: `monthlyContribution`, `isOverdue`, `reservedThisMonth` (`P`), `freeForGoals`, `limitProgress`, `noSpendDays`, `goalsThatDontFit`. `src/lib/goalForm.ts`, `recurringForm.ts`, `investmentForm.ts`: validace jako `habitForm.ts`. Termín musí být v budoucnu, nebo beze změny proti původnímu. Datum vkladu ≤ dnes | CALC-08 až 10, FIN-08, R4: po termínu jde měnit název bez nového termínu. Budoucí vklad by splnil cíl a vypadl z `P` |
| E8 | Repozitáře `recurring.ts`, `goals.ts`, `investments.ts`. `syncAchieved(db, goalId, today)`: jeden podmíněný `UPDATE` ze všech vkladů, nastaví i zruší `achieved_at`, běží po vkladu, smazání vkladu a úpravě cíle. Přeřazení jedním `UPDATE … CASE`. `deleteCategory` počítá transakce, platby i cíle. `updateCategory` vrátí `kind_locked`, když typ mění a kategorii používá aktivní platba nebo limitový cíl | Pool, Q6, O2 platí pro transakce, ne pro plán |
| E9 | `src/db/dailyLimit.ts`: `loadDailyLimit(db, today)` zavolá `generateRecurring`, pak dotazy a `dailyLimit`, karta (a ve fázi 5 DNE-03) volá jen ji, integrační test na `createTestDb` ji volá také. Karta ukáže i `B`, `S`, `P`, `D` | Bez automatického testu UI je to jediný důkaz celé cesty |
| E10 | Cíle: nahoře FIN-11, pak karty podle priority (kruh, příspěvek, vklad, seznam vkladů se smazáním, upravit, pozastavit, archivovat, po termínu s nabídkou), pak investice se stejným seznamem vkladů. Splněný cíl zůstává viditelný, dokud se nearchivuje. Přetahování HTML5 + ↑ ↓, `dragDropEnabled: false` | FIN-06 až 08, 12, NFR-08 |
| E11 | Nastavení: nová záložka „Opakované platby“ (přidat, upravit, archivovat). Finance: karta denního limitu a FIN-09 | PRD kap. 8 |
| E12 | Grafy: Recharts s přesnou verzí, před instalací ověřit React 19 (Context7) a offline běh. Sloupce příjmů/výdajů po dnech a bary kategorií | R3 |
| E13 | Demo se doplňuje v každém řezu podle tabulky níže. Maže v pořadí `recurring_runs`, `transactions`, `recurring`, `goal_deposits`, `goals`, `investment_deposits`, `investments`. Pravidlo Předplatné nahradí opakovaná platba, transakce vygeneruje app. **Limit nevypisuje** | Výpis by v čistém Node duplikoval vzorec |

**Nová závislost:** `recharts` (grafy FIN-09 a FIN-11, PRD kap. 9, schválil vlastník v R3).

## Povinné testy (ručně spočítané, před kódem)

| Pravidlo | Vstup | Očekáváno |
| --- | --- | --- |
| CALC-07 | B 7 000, S 5 900, P 0, D 11, dnes 40 Kč (PRD) | A 100 Kč, zobrazí 60 Kč |
| CALC-07 | B − S − P záporné | A 0, zobrazí −dnešní výdaje |
| CALC-07 | `floor`: (B−S−P) 1 000 hal., D 3 | A 333 hal. |
| CALC-07 | B nenastavený; B = 0 | null |
| CALC-07 | poslední den měsíce | D = 1 |
| `S` | výdaj včera / dnes / zítra / minulý měsíc / příjem | jen včera |
| R5 | B 15 000, D 30, plán 3 000, vklad 0 / 3 000 / 5 000 | A 400 / 400 / 333,33 Kč |
| `P` | cíl: příspěvek 1 000, vklad 1 500 | 1 500, jiné cíle se neodečtou |
| `P` | pozastavený cíl příspěvek 1 000, vklad 0 / 400 | 0 / 400 |
| `P` | archivovaná investice plán 3 000, vklad 500 tento měsíc | 500 |
| `P` | vklad minulý měsíc, plán 1 000 | 1 000 |
| R6 | 1. 11. 2026, B 15 000, nájem 9 000 den 25, D 30 | A 200 Kč |
| R6 | 25. 11.: nájem vygenerovaný dnes, S 0, D 6, jiné výdaje 0 | A 1 000 Kč, zobrazí 1 000 Kč |
| R6 | 26. 11.: nájem v S, U 0, D 5 | A 1 200 Kč |
| R6 | 25. 11.: nájem vygenerovaný dnes, ručně přesunutý na 27. 11., D 6 | U 9 000, A 1 000 Kč |
| R6 | B 50 000, D 20, příjem 40 000 vygenerovaný dnes | U 0, A 2 500 Kč |
| R6 | budoucí příjem; archivovaná; změna dne 5 → 25 po běhu 5. | U 0 |
| R6 | nájem 9 000, založeno 20. 11., den 5, 22. 11. změna na den 25, B 15 000, D 9 | U 0, A 1 666,66 Kč |
| FIN-08 | volné 1 000, zbylé příspěvky 800 / 500 / 100 | nevejde se jen druhý |
| FIN-08 | bez rozpočtu; pozastavený cíl | nic neoznačí; přeskočí |
| FIN-08 | volné −2 000: zaplacený, splněný, limitový cíl a cíl se zbylými 100 | označí jen poslední |
| Vklad | datum zítra | formulář odmítne |
| FIN-12 | základ 40 000, vklad 2 000 | 42 000 |
| FIN-12 | vklad 2 000, přepsání na 50 000, smazání vkladu | 50 000 |
| FIN-12 | přepsání, nový vklad 1 000 po smazání posledního | hodnota + 1 000 |
| CALC-08 | target 1 000, saved 0, M 3 | `ceil` 334 |
| CALC-08 | termín 6 měsíců od tohoto | M 7 (měsíce včetně obou konců) |
| CALC-08 | po termínu | M = 1, stav po termínu |
| FIN-07 | vklad tento měsíc dosáhne cíle, smazání vkladu; zvýšení cílové částky | `achieved_at` nastaven, pak zrušen; zrušen |
| CALC-09 | výdaje = limit, poslední den měsíce | ještě neuzavřeno, po konci splněno |
| CALC-10 | den jen s opakovanou platbou | je bez utrácení |
| CALC-11 | den 31 v únoru 2027; přestupný rok | 28. 2.; 29. 2. |
| CALC-11 | založeno 20., den 5 | první platba příští měsíc |
| CALC-11 | založeno 20. 11., den 5, běh 5. 12., 10. 12. změna na den 25 | listopad nevznikne, prosinec jeden běh |
| CALC-11 | 10. 12. změna z 25 na 5 před během | prosinec jedna transakce 5. 12. |
| CALC-11 | zastaralý vstup dvakrát (SQL pojistka, ne filtr); dvě generování naráz | jedna transakce |
| CALC-11 | smazaná a upravená platba | nevrátí se, nezmění se |
| CALC-11 | app dva měsíce neběžela, pak archivace; pak úprava částky | vynechané měsíce vzniknou před archivací; se starou částkou |
| Kategorie | změna typu s aktivní platbou; smazání s platbou (i archivovanou) nebo cílem | `kind_locked`; `in_use` |
| Migrace | naplněná DB verze 4 → 5, 6, 7 | data zůstanou |

## Úkoly (svislé řezy)

Každý řez je samostatně hotový včetně své části dema.

| # | Řez | Obsah | Ověření |
| --- | --- | --- | --- |
| T1 | A: opakované platby | 0005, `dueRuns`, `generateRecurring`, focus, `recurringForm`, záložka Nastavení (přidat, upravit, archivovat), `deleteCategory` a `updateCategory` pro platby, demo Předplatné. **Trigger v app na 3.46** ověří K2 | K1–K3 |
| T2 | B1: cíl jako záznam | 0006, `goalForm`, obrazovka Cíle, spořicí cíl: CALC-08, přidat, upravit, pozastavit, archivovat, kategorie pro cíle, demo Dovolená | K4 |
| T3 | B2: vklady | `goal_deposits`, `syncAchieved`, stav po termínu s nabídkou, demo Kurz | K5 |
| T4 | C: investice | 0007, FIN-12, `investmentForm`, přidat, upravit, archivovat, vklady, přepsání hodnoty, demo ETF | K6 |
| T5 | D: denní limit | CALC-07, `reservedThisMonth`, `upcomingRecurring`, `loadDailyLimit` s integračním testem, karta ve Finance | K7 |
| T6 | E: další cíle a priorita | Limitový a návykový cíl, CALC-09, CALC-10, přetahování, ↑ ↓, FIN-08, demo zbylé cíle | K8, K9 |
| T7 | F: přehledy | Recharts, FIN-09, FIN-11 | K10 |
| T8 | G: dokumenty | PRD v0.8, 0.4.0, README, learning | K11 |
| T9 | Vydání | PR, CI, dev-team review, council, ruční kontroly, merge, tag | CI |

## Kontrolní seznam (ruční)

Pořadí: `npm run tauri dev` (doběhnou migrace), v liště „Ukončit“ (křížek jen schová okno), `npm run demo`, `npm run tauri dev`. Před K7 a K8 znovu demo. Menu lišty = pravý klik.

Demo (dnes = den spuštění):

| Položka | Hodnoty | Očekáváno po spuštění |
| --- | --- | --- |
| Předplatné | 259 Kč, den 5 (žádné jiné demo výdaje), `first_month` = předminulý měsíc | Jedna transakce v každém měsíci, kde už 5. den byl |
| Dovolená (spořicí) | 30 000 Kč, termín 1. den měsíce za 6 měsíců (přetečení 31. nehrozí), vklad 5 000 Kč 1. den minulého měsíce | Příspěvek 25 000 ÷ 7 nahoru = 3 571,43 Kč |
| Kurz (spořicí) | 2 000 Kč, termín 1. den minulého měsíce, vklad 1 500 Kč tentýž den | „Po termínu“, příspěvek 500 Kč |
| Zábava (limitový) | 1 500 Kč | Progress podle výdajů Zábavy |
| Bez utrácení (návykový) | 10 dní | Počet dní bez výdajů v měsíci |
| ETF | Základ 40 000 Kč, vklad 2 000 Kč měsíčně | Hodnota 40 000 Kč |

| # | Kontrola | Postup | Očekávaný výsledek |
| --- | --- | --- | --- |
| K1 | Nová platba | Nastavení → Opakované platby: Test 100 Kč, den = dnešní; Test2 100 Kč, den = včerejší (1. v měsíci přeskoč); Finance | Test má transakci s dnešním datem, Test2 tento měsíc žádnou |
| K2 | Generování na 3.46 | Po demu otevřít Finance, přepnout měsíce; `sqlite3 ~/.config/io.github.vladc3.lifeos.dev/life-os.db "SELECT (SELECT count(*) FROM recurring_runs), (SELECT count(*) FROM transactions WHERE recurring_id IS NOT NULL)"`; „Ukončit“, znovu spustit, Finance, stejný dotaz; pak přepnout do jiného okna, `sqlite3 ~/.config/io.github.vladc3.lifeos.dev/life-os.db "UPDATE transactions SET amount = amount + 10000 WHERE recurring_id IS NOT NULL"` a vrátit se do app | Předplatné podle tabulky demo; dvě stejná čísla; po znovuspuštění beze změny; po návratu je útrata měsíce o 100 Kč vyšší bez kliknutí (focus) |
| K3 | Úprava, smazání, archiv | Upravit platbu Test na 200 Kč; smazat její transakci, přepnout modul a zpět; archivovat; nová kategorie + platba s pozdějším dnem, kategorii smazat a změnit na příjem | Transakce zůstane 100 Kč; smazaná se nevrátí; platba zmizí ze seznamu; kategorie nejde smazat ani změnit |
| K4 | Spořicí cíl | Cíle: Přidat, Výlet 30 000 Kč, termín v měsíci za 6 měsíců; druhý cíl s prošlým termínem; platným termínem uložit, pozastavit, archivovat | Výlet 4 285,72 Kč; prošlý termín formulář odmítne; pozastavený nemá příspěvek; archivovaný zmizí |
| K5 | Vklady a termín | Po demu: do Dovolené vložit 25 000 Kč; smazat vklad; u Kurzu „Prodloužit termín“ na 1. den za 2 měsíce | Hned „splněno“; po smazání příspěvek 3 571,43 Kč; Kurz bez varování, příspěvek 166,67 Kč |
| K6 | Investice | ETF: vklad 2 000 Kč; přepsat hodnotu na 50 000 Kč; smazat vklad; archivovat | 42 000 Kč; 50 000 Kč; 50 000 Kč; zmizí. Vklad není v transakcích |
| K7 | Denní limit (D = zbývající dny na kartě, ±0,01 Kč z `floor`) | Rozpočet +30 000 Kč; výdaj dnes 100 Kč; vklad ETF 2 000 Kč; další vklad ETF 1 000 Kč; nová platba 3 000 Kč s pozdějším dnem (poslední den měsíce přeskoč); rozpočet 0 | Karta +30 000 ÷ D; −100 Kč; beze změny; −1 000 ÷ D; −3 000 ÷ D; nabídne „Nastav rozpočet“. Karta sedí s (B − S − P) ÷ D, které sama ukazuje |
| K8 | Typy cílů (od 6. dne v měsíci) | Limitový cíl Zábava; návykový | Progress = výdaje ÷ limit; počet = dny z 5, 7, 11, 17, 19, 23, 25, 29 před dneškem, den 5 má jen opakovanou platbu |
| K9 | Priorita | Přetáhnout myší; ↑ ↓ klávesnicí; rozpočet snížit na 3 000 Kč | Pořadí zůstane po přepnutí modulu; cíle, které se nevejdou, jsou označené |
| K10 | Přehledy | Finance: FIN-09; Cíle: FIN-11; malé okno | Sloupce po dnech, kategorie, součty; útrata, cíle, investice; nic se neuřízne |
| K11 | Demo a regrese | `stat -c %Y ~/.config/io.github.vladc3.lifeos/life-os.db` před a po demu; Ctrl+N, Ctrl+Shift+N, lišta | Reálná DB beze změny, fáze 1–3 fungují |

## Rizika

| Riziko | Pravděpodobnost | Zmírnění |
| --- | --- | --- |
| Trigger se v SQLite 3.46 chová jinak | Nízká | Ověření v app hned v T1 |
| Rozsah T2–T4 přeroste | Střední | Řezy jsou samostatné, další dělení místo škrtání |
| Přetahování ve WebKitGTK nebo WebView2 | Střední | ↑ ↓ fungují vždy, ruční kontrola K9 |
| Recharts s React 19 | Nízká | Ověřit před instalací (E12), jinak SVG sloupce ručně |
| Cíl po termínu srazí limit na 0 | Známé (R4) | Varování na kartě |
| Okno otevřené přes půlnoc bez `focus` ukazuje včerejší limit | Nízká | Známý limit, načte se při dalším uložení nebo návratu do okna |
| UI bez automatických testů | Střední | `loadDailyLimit` a repozitáře s testy, K s přesnými kroky, review hotové fáze |

## Akceptace

- [ ] FIN-05 opakované platby (K1–K3)
- [ ] FIN-06 až FIN-08 cíle (K4, K5, K8, K9)
- [ ] FIN-09, FIN-11 přehledy (K10)
- [ ] FIN-10 denní limit (K7)
- [ ] FIN-12 investice (K6)
- [ ] CALC-07 až CALC-11 s testy
- [ ] Demo a regrese (K11)
- [ ] CI zelené, PRD v0.8 s D1–D8, tag v0.4.0

## Odchylky a poznámky z implementace

| Řez | Poznámka |
| --- | --- |
| T1 | Dev-team před kódem přidal: souběžné generování, kategorii s archivovanou platbou, přesun data vygenerované platby, upgrade z verze 4, zobrazení obsahu Finance i při selhání generování. Mutace: 15 z 15 chycených testy nebo během skriptu, `OR IGNORE` jen ve spojení s odebráním `NOT EXISTS` (sám je neškodný) |
| T1 | V app ověřeno: migrace 5 přes sqlx, 3 platby a 3 běhy po demu i po restartu, `focus` načte změnu z DB, záložka Nastavení vykreslená. Formulář přidání ověří K1 ručně, automatizace kláves nebyla spolehlivá |
| T2 | Mutace 14 z 14 chycených testy. V app ověřena migrace 6 a demo Dovolená. Obrazovka Cíle se při automatické kontrole nevykreslila (okno nešlo zaostřit), první vykreslení ověří K4 ručně |
| T3 | Mutace odhalily 3 díry v testech (smazání všech vkladů, součet přes všechny cíle, stav cizího cíle). Kód byl správně, testy doplněny, 10 z 10 chycených. Vykreslení dialogu vkladů ověří K5 ručně |
| T4 | Mutace: 11 z 12 chycených, 12. výsledek nemění (max přes účty, id rostou v celé tabulce). Díra v součtu měsíce doplněna testem. Migrace 7 proběhla v app vlastníka |
| T5 | Mutace: 26 z 27 chycených, 27. výsledek nemění (filtr měsíce běhů). Díra se staršími vklady archivovaných položek doplněna testem |
| T6 | Mutace: 19 z 19 chycených po doplnění testů výdaje dnes a budoucího měsíce |
| T7 | Recharts 3.10.1 přesně. Skill dataviz nešel prověřit, soubor nebyl na disku, proto nepoužit a barvy jsou z tématu. Mutace výpočtů: 7 z 7 chycených. Grafy ověří K10 ručně |
| T8 | Verze a dokumenty hotové. Vykreslení obrazovek T2–T7 zatím neviděl nikdo, K1–K11 čekají na vlastníka |
