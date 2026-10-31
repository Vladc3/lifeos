# Plán: Fáze 3 – Návyky (0.3.0)

**Stav:** schváleno vlastníkem 2026-10-27 · prošel dev-team review a council (Skeptic a Critic proti v2, opraveno) · vlastník odpověděl na P1–P7

**Zdroj:** `docs/PRD.md` v0.6, kap. 4, 6 (CALC-01 až 06), 7, 8, 10 · **Větev:** `feat/phase3-navyky` · **Složitost:** Large (nejvíc výpočtů v celé app)
**ID ve fázi:** HAB-01 až HAB-06, HAB-09, CALC-01 až CALC-06, PUB-04 (demo návyky), Ctrl+Shift+N (kap. 8)
**Mimo fázi 3:** HAB-07 check-iny a HAB-10 „Den bez utrácení“ včetně jeho šablony (fáze 5), HAB-08 statistiky, kroužek konzistence, trend a top návyky z kap. 8 (fáze 6), archiv v Nastavení (fáze 6).

## Shrnutí

Návyky od založení po sérii: vlastní návyk nebo šablona, měsíční matice, kde se stav zapíše jedním klikem, série s pravidlem „nikdy dvakrát“, pozastavení, archivace, limit 3 budovaných návyků a přechod do fáze „zaběhnutý“. Jediný zdroj pravdy o dnech je čistá funkce `dayStatuses`, z ní čtou série, konzistence i fáze. Fáze 5 (HAB-10) a 6 (HAB-08, REV-02) na ni navážou.

## Odpovědi vlastníka (2026-10-26)

| # | Otázka | Odpověď |
| --- | --- | --- |
| P1 | Zápis v matici | Klik cykluje: prázdné → splnil → minimum (jen s min. verzí / `min_value`) → prázdné. U minulého dne je prázdné = vynechal (CALC-02), takže samostatné „vynechal“ v cyklu není (byl by to klik bez viditelné změny, council). Počet/čas: „splnil“ uloží cílovou hodnotu, „minimum“ `min_value`. Přesné číslo: pravý klik nebo Shift+Enter otevře malý dialog |
| P2 | Volno | Jen dnes a budoucí naplánované dny (CALC-02): dnes prázdné → splnil → minimum → volno → prázdné, budoucí den jen prázdné ↔ volno. `weekly_count` volno nemá (nemá naplánované dny) |
| P3 | Změna cíle | Stav se uloží při zápisu, historie zůstane podle tehdejšího cíle |
| P4 | Přechod do „zaběhnutý“ | Jednorázová hláška na obrazovce Návyky |
| P5 | Změna frekvence | Přepočítá se i minulost (série, konzistence). Před uložením varování |
| P6 | Neúplný týden u `weekly_count` (týden založení, týden s pauzou) | Počítá se jen, když je splněný. Nesplněný není „vynechal“ a sérii nezmění |
| P7 | HAB-05, když nejbližší návyk má ≥ 66 dní, ale konzistence < 80 % | Text místo čísla („Čtení: chybí konzistence 80 %“). U `weekly_count` počet týdnů do 9 |

## Ověřená fakta (2026-10-26)

| Fakt | Důkaz |
| --- | --- |
| `created_at DEFAULT (datetime('now'))` je v UTC: návyk založený v 0:30 by měl start včera | `0002_finance.sql`, dev-team (QA, Dev, Arch) |
| Série „nikdy dvakrát“ může sahat libovolně daleko zpět, měsíc v matici nestačí | CALC-02, CALC-03 |
| plugin-sql nemá transakce přes více `execute()` (pool), jeden podmíněný příkaz je atomický | PRD Q6, fáze 1 |
| Vzor fáze 2: repozitáře vracejí výsledky, testy schématu chtějí `/constraint failed/`, jen SQL ze SQLite 3.46, migrace se zámkem | `docs/plans/F2-finance.md` |
| `dates.ts` nemá `addDays`, den v týdnu ani začátek týdne | `src/lib/dates.ts` |
| App běží dny v liště, „dnes“ spočítané při načtení obrazovky po půlnoci zastará | SYS-01, council (Critic) |

## Změny PRD ke schválení (zapíšou se do PRD v0.7)

| # | Změna | Proč |
| --- | --- | --- |
| C1 | `habits.start_date` (lokální `YYYY-MM-DD`) místo `created_at` v CALC-01 a CALC-05 | UTC `created_at` posune start o den kolem půlnoci. Demo potřebuje start nastavit zpětně |
| C2 | HAB-03: zápis podle P1 a P2. Přesné číslo: 0 nebo prázdné smaže záznam, menší než minimum = neúspěch (minulý den vynechal, dnes stále čeká) | PRD neříká, jak u počtu/času |
| C3 | HAB-02: změna frekvence přepočítá minulost (P5), změna cíle ne (P3) | PRD to neříká |
| C4 | weekly\_count: neúplný týden podle P6. HAB-05 hláška podle P7 | PRD to neříká |
| C5 | `habits.auto_rule` přibude až s HAB-10 (fáze 5) | Teď by nic nedělal |
| C6 | HAB-02: typ návyku (ano/ne, počet, čas) po založení nejde změnit | Staré hodnoty by nedávaly smysl (Critic). Kdo chce jiný typ, založí nový návyk |

## Rozhodnutí

| # | Rozhodnutí | Proč |
| --- | --- | --- |
| E1 | Migrace `0004_habits.sql`: `habits` (PRD kap. 7 bez `auto_rule`, s `start_date`), `habit_pauses`, `habit_logs`. CHECK na výčty, délku názvu 1–40, `target_value > 0` u počtu/času, `0 < min_value < target_value`, `days_mask` 1–127 jen u `days`, `weekly_target` 1–7 jen u `weekly_count`, `date(x) IS x`. Pauzy: `end_date IS NULL OR end_date >= start_date`, částečný unikátní index na otevřenou pauzu (`WHERE end_date IS NULL`). Logy: `UNIQUE(habit_id, date)`, cizí klíče | PRD kap. 7, HAB-01, poučení z fáze 2 |
| E2 | Výpočty v jednom souboru `src/lib/habits.ts` (+ `habits.test.ts`): `isScheduled` (CALC-01), `dayStatuses(habit, pauses, logs, from, to, today)` → stav každého dne (jediný zdroj), `streak` (CALC-02, 03, týdny), `consistency` (CALC-04), `reachesEstablished` (CALC-05), `daysToEstablished` (HAB-05, P7), `nextCellStatus` (cyklus P1, P2), `statusForValue(value, target, min)`. Týdny klíčované datem pondělí. `statusForValue` se volá jen při zápisu, `dayStatuses` čte jen uložený `status` (P3: změna cíle historii nepřepíše). `dayStatuses` ignoruje záznamy na dnech, které už nejsou naplánované (P5), a `rest` u `weekly_count`. Dnešek: úspěch = splnil/minimum, volno = volno, jinak čeká | Méně souborů (Dev), jeden zdroj stavů pro fáze 5 a 6 (Arch), rozpor P3 × T2 (Skeptic) |
| E3 | `dates.ts` + `addDays`, `isoWeekday`, `weekStart` (počítá přes UTC, bez posunu letního času). `days_mask` bit 0 = pondělí … bit 6 = neděle | CLAUDE.md, týden od pondělí |
| E4 | Repozitář `src/db/habits.ts`: vytvoření (`start_date` = `todayLocal`), úprava (bez změny typu, C6), zápis odmítne `rest` na minulém dni (`"past_rest"`), logy (všechny logy aktivních návyků jedním dotazem, ~365 řádků na návyk a rok), zápis stavu, pauza (začíná dnes, konec = včera, a když by byl před začátkem, pauza se smaže), archiv, obnova | CALC-02 potřebuje celou historii |
| E5 | CALC-06 atomicky bez transakce: vytvoření jako `INSERT … SELECT … WHERE (SELECT count(*) …) < 3`, obnova a konec pauzy jako `UPDATE … WHERE (…) < 3`, podle `rowsAffected` vrátí `"limit"`. Text důvodu (P7) se počítá až po zablokování | Pool bez transakcí (Arch) |
| E6 | `syncPhases(db, today)`: pro aktivní `building` návyky ověří CALC-05 a uloží `established` (jednosměrně, `UPDATE … WHERE phase = 'building'`). Volá se při načtení Návyků a před kontrolou limitu. Vrátí nově zaběhnuté pro hlášku P4 | Limit nesmí číst zastaralou fázi (Arch) |
| E7 | Obrazovka Návyky: „dnes“ se počítá při každém kliku a synchronizaci, ne jednou při načtení (Critic). Měsíc (jako Finance), matice návyky × dny s vyznačeným dneškem, u návyku série („5 dní“ / „3 týdny“), stav „v ohrožení“ oranžově, fáze. Buňka = tlačítko s `aria-label`, šipky mezi buňkami (roving tabindex), Enter/mezerník = další stav, Shift+Enter/pravý klik = dialog s číslem. Prázdný stav: tlačítko „Přidat návyk“ + šablony. Pod maticí pozastavené a archivované návyky (obnova) | HAB-02 až 04, NFR-08, PM |
| E8 | Dialog návyku (HAB-01, HAB-09): výběr z 5 šablon (kap. 10 bez „Den bez utrácení“), pak pole. `validateHabitForm` v `src/lib/habitForm.ts`. Při změně frekvence varování (P5) | Vzor fáze 2 |
| E9 | Ctrl+Shift+N otevře dialog nového návyku (`shortcuts.ts`) | PRD kap. 8 |
| E10 | PUB-04: `npm run demo` smaže `habit_logs`, `habit_pauses`, `habits` (v tomto pořadí) a vloží 4 návyky s pevnými řadami (tabulka K níže): Trénink `established`, Čtení, Spánek a Učení `building` (= 3, limit dodržen). Po `syncPhases` je Učení zaběhnuté, takže K7 má místo pro 1 nový návyk a další zablokuje. „Start před N dny“ = `start_date` = dnes − N | Demo jde mimo repozitář, limit musí dodržet samo (QA). Rozpor demo × K7 našli všechny 3 hlasy council |

**Nové závislosti:** žádné.

## Úkoly

Po svislých řezech (council, Skeptic): každý řez jde od výpočtů přes DB po obrazovku a dá se vyzkoušet v app. Uvnitř řezu TDD. `weekly_count` je poslední řez, aby `daily` a `days` šly vydat, i kdyby se zasekl (pak 0.3.1).

| # | Řez | Obsah | Ověření |
| --- | --- | --- | --- |
| T1 | A: ano/ne denně | `dates.ts` (`addDays`, `isoWeekday`, `weekStart`); `habits.ts` pro `daily`/`days` (`isScheduled`, `dayStatuses`, `streak` s případy z PRD a review, `nextCellStatus`); migrace 0004 + testy schématu; repozitář (vytvoření, logy, `past_rest`); obrazovka Návyky s maticí, šipkami a sérií; dialog návyku bez šablon | červeně → zeleně; K2, K4, K5, K6 |
| T2 | B: počet a čas | `statusForValue`, cyklus s hodnotami, dialog s přesným číslem (C2), šablony (HAB-09), `validateHabitForm`, Ctrl+Shift+N | K1, K3 |
| T3 | C: životní cyklus | Pauza, archiv, obnova, úprava (C6, varování P5), `consistency`, `reachesEstablished`, `syncPhases`, limit CALC-06 (E5) a text P7, hláška P4 | K7, K8, K9 |
| T4 | D: X× týdně | `weekly_count` v `dayStatuses` a `streak` (týdny, P6, 53. týden), fáze po 9 týdnech, P7 v týdnech, matice bez volna | K12 |
| T5 | E: demo a dokumenty | Demo návyky (E10), PRD v0.7 (C1–C6), verze 0.3.0, README, `learning.md` | K10, K11 |
| T6 | Vydání | PR, CI, dev-team review hotové fáze, council, ruční kontroly vlastníka, merge, tag | CI zelené |

## Kontrolní seznam (ruční)

Spouštěj `npm run tauri dev` po `npm run demo` (K10). Demo návyky (dnes = den spuštění, D-1 = včera):

| Demo návyk | Typ, frekvence | Řada posledních dní | Očekáváno |
| --- | --- | --- | --- |
| Čtení | počet 10 stran, min 1, denně, start před 30 dny | D-30 až D-1 samé ✓ | série 30, dnes čeká |
| Trénink | čas 45 min, min 10, 4× týdně, start před 12 týdny, `established` | celé minulé týdny 4×, tento týden prázdný | série 12 týdnů, tento týden čeká |
| Spánek do 23:00 | ano/ne, denně, start před 20 dny | D-20 až D-2 ✓, D-1 nic | série 19 dní · v ohrožení |
| Učení | čas 90 min, Po–Čt, start před 70 dny, `building` | konzistence posledních 66 dní ≥ 80 % | po načtení „zaběhnuté“ + hláška |

| # | Kontrola | Postup | Očekávaný výsledek |
| --- | --- | --- | --- |
| K1 | Zápis jedním klikem | Čtení, buňka dnes: klik | „splnil“ (10), série 31 |
| K2 | Cyklus | Čtení dnes: klikat dál | minimum (1) → volno → prázdné, série se mění podle CALC-02 |
| K3 | Přesná hodnota | Čtení dnes: pravý klik (nebo Shift+Enter) → 7 → Enter; pak znovu → 0 → Enter | 7: „minimum“ (≥ 1, < 10). 0: záznam zmizí, dnes čeká |
| K4 | Minulost a budoucnost | Klik na včera u Spánku (opakovaně); klik na zítřek | Včera: splnil → minimum → prázdné (= vynechal), nikdy volno. Zítra: jen volno ↔ prázdné |
| K5 | V ohrožení | Spánek | Oranžově „v ohrožení“, série 19 dní |
| K6 | Klávesnice | Tab do matice, šipky, Enter, Shift+Enter | Fokus je vidět, Enter cykluje, Shift+Enter otevře dialog |
| K7 | Limit (HAB-05) | Po K9 (Učení zaběhnuté): Ctrl+Shift+N (fyzicky) → šablona Pitný režim → Uložit; pak Ctrl+Shift+N → vlastní návyk „Meditace“ → Uložit | Pitný režim projde (3 budované). Meditace zablokovaná: „Nejblíž je Čtení: nejdřív za 36 dní.“ |
| K8 | Pauza, archiv, úprava | Čtení: pozastavit → matice; zrušit pauzu; upravit frekvenci na Po–Pá → varování; pole typu je zamčené; archivovat → pod maticí Obnovit | Pozastavený nemá naplánované dny a série se nemění; po obnově jsou záznamy zpět a archivované dny nejsou vynechané |
| K9 | Přechod fáze | Otevřít Návyky po demu | Hláška „Učení je zaběhnuté“ jen jednou, po přepnutí modulu znovu nevyskočí |
| K10 | Demo | `npm run demo`; `stat -c %Y ~/.config/io.github.vladc3.lifeos/life-os.db` před a po | Návyky podle tabulky výše, finance demo stejné jako ve fázi 2, reálná DB beze změny |
| K11 | Regrese | Ctrl+N, Ctrl+1–6, lišta (pravý klik) Otevřít / Nový výdaj / Ukončit | Vše jako ve fázi 2 |
| K12 | Týdenní návyk | Trénink: klik na dnešek; klik na zítřek | Dnes ✓ (tento týden 1 ze 4), série 12 týdnů beze změny, volno se nenabízí. Budoucí dny jsou prázdné a na klik nereagují |
| K13 | Půlnoc | Nechat app běžet přes půlnoc, pak klik na včerejší buňku | Volno se nenabízí, „dnes“ je nový den |

## Rizika

| Riziko | Pravděpodobnost | Zmírnění |
| --- | --- | --- |
| Chyby v sérii na hranách (pauza, volno, týdny přes rok) | Vysoká | Tabulka případů v řezu A z PRD a review, `dayStatuses` jako jediný zdroj, `weekly_count` až v posledním řezu |
| Fáze se uloží omylem (nevratně) | Střední | Testy hranic 65/66 dní a 79/80 % v řezu C, `UPDATE … WHERE phase = 'building'` |
| Matice 31 × N tlačítek pomalá | Nízká | Stavy se počítají jednou pro měsíc, ne v každé buňce |
| Propojení UI bez automatických testů (jako fáze 2) | Střední | Logika cyklu v `nextCellStatus` s testy, K1–K11 s přesnými daty, dev-team review hotové fáze |

## Akceptace

- [ ] HAB-01 + HAB-09 vytvoření a šablony (K7)
- [ ] HAB-02 úprava, pauza, archiv (K8)
- [ ] HAB-03 matice (K1–K4, K6)
- [ ] HAB-04 série a v ohrožení (K5)
- [ ] HAB-05 limit 3 (K7)
- [ ] HAB-06 přechod fáze (K9)
- [ ] CALC-01 až 06 s testy (T2, T3)
- [ ] PUB-04 demo návyky (K10)
- [ ] Regrese fází 1–2 (K11), týdenní návyk (K12), půlnoc (K13)
- [ ] CI zelené, PRD v0.7 s C1–C6, tag v0.3.0

## Odchylky při implementaci

| Co | Proč |
| --- | --- |
| Validace formuláře, šablony, Ctrl+Shift+N a limit při vytvoření (E5) už v řezu A | Malé, a create by se jinak přepisoval |
| `isLoggable` vedle `isScheduled` | `weekly_count` nemá naplánované dny, ale zapisovat jde každý aktivní den |
| „Nikdy dvakrát“ jako jedna funkce `neverTwice` pro dny i týdny | Bez duplikace mezi `daily`/`days` a `weekly_count` |
| Týdenní konzistence pro fázi nezapočítává pauzy (`ponytail:` v kódu) | Pozastavený týden průměr sníží. Upravit, až to bude vadit |
| Ověřeno ve zdroji `sqlx-sqlite 0.8.6`: `$N` se páruje podle čísla | Testy na `node:sqlite` by chybu v pořadí parametrů neodhalily |
| Commit `2ba0de6` tvrdil chycenou mutaci P6, nebyla | Opraveno testem v `13f20f0`, poučení v `docs/learning.md` |
| Dev-team review hotové fáze: archiv jako pauza (PRD v0.7) | Po obnově by se archivované dny počítaly jako vynechané. Archivace teď otevře pauzu, obnova ji ukončí a hlídá limit |
| Dev-team review: „v ohrožení“ jen při sérii > 0, opravy UI | „0 dní · v ohrožení“ nedávalo smysl. Hláška o zaběhnutí se ve StrictMode ztrácela, fokus matice mohl vypadnout z tabulátoru, lišta překrývala dialog návyku |
| Zůstává na později | Pro fázi 6: `consistency` u `weekly_count` počítá dny, ne týdny (HAB-08 a REV-02 musí použít týdenní průměr). Pro fázi 5: pravidlo CALC-06 je v SQL i v `limitMessage`, HAB-10 ho musí upravit na obou místech. Hláška o zaběhnutí při vytvoření návyku se neukáže (odznak „zaběhnutý“ ano) |
| Ověření UI z části automaticky: migrace 4 v app (SQLite 3.46), matice s ✓ ✓ ◐ ✓ ✗ a „4 dny · v ohrožení“, `syncPhases` po demu (Učení zaběhnuté), K10 (`stat` reálné DB beze změny) | Klikání v matici přes `wtype` nespolehlivé (kódy kláves), K1–K9, K11–K13 ručně vlastník |
| Virtuální monitor (`hyprctl output create headless`) si vzal workspace 5, kde bylo okno vlastníka | Po odebrání monitoru se vrátilo. Příště nejdřív zvolit volné číslo workspace |
