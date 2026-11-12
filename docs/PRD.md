# Life OS – PRD

Verze 0.8 · 2026-10-31 · vlastník: Vova

## 1. Přehled

Life OS je lokální desktop aplikace pro jednoho uživatele. Spojuje budování návyků a osobní finance v jednom okně. Uživatel si návyky i finanční cíle definuje sám.

- **Uživatel:** jeden člověk (student), žádné účty ani přihlašování.
- **Platformy:** Windows 10/11 a Linux (Arch / Omarchy, Hyprland na Waylandu).
- **Jazyk UI:** čeština. Měna: CZK. Locale: cs-CZ.

**Problém:** vlastník dnes návyky ani peníze nesleduje, nosí je v hlavě. Aplikace na návyky už zkoušel a vzdal je ze 3 důvodů. Life OS řeší každý z nich:

| Proč jsem přestal | Odpověď v Life OS |
| --- | --- |
| Zapomněl jsem app otevřít | App běží v liště, spouští se po přihlášení a 2× denně se ozve (SYS-01, SYS-02, HAB-07) |
| Zapisování bylo moc práce | Zápis do 5 s, jedna klávesová zkratka (princip 3, FIN-01, DNE-02) |
| Ztratil jsem sérii a vzdal to | „Nikdy dvakrát“: jeden výpadek sérii nezničí (CALC-03) |

App se používá ráno (plán dne, kolik můžu utratit) a večer (dopsat návyky a výdaje).

**Proč projekt vzniká:** vlastník ho bude denně používat, je to jeho portfolio a učí se na něm líp stavět s AI (rozumět kódu, který AI píše, lepší workflow, rychlejší dodání). Postup je veřejný (kap. 11).

**Úspěch MVP (1.0.0):**

- Vlastník app používá 30 dní po sobě (každý den aspoň jeden záznam).
- Zápis výdaje i odškrtnutí návyku trvá do 5 s (NFR-04).
- „Dnes můžeš utratit“ odpovídá ručnímu výpočtu podle CALC-07.

**Principy**

1. **Local-first:** data jsou jen na disku uživatele, žádný server ani síť.
2. **Ruční zadávání financí:** žádné napojení na banku ani import výpisů.
3. **Rychlost zápisu:** zapsat výdaj nebo odškrtnout návyk musí jít do 5 sekund.
4. **Pravidla zabudovaná v produktu:** app aktivně brání špatným vzorcům (moc návyků najednou, ztráta série po jednom výpadku).
5. **Tmavý, číselný styl:** velká čísla a procenta, minimum dekorací.

## 2. Rozsah

**V MVP:** první spuštění (onboarding), Dnes, Návyky, Týdenní review, Finance a finanční cíle, běh v liště s ranním a večerním check-inem, Nastavení (záloha, PIN zámek).

**Investice** se v MVP evidují ručně: účet, aktuální hodnota a plánovaný měsíční vklad (FIN-12). Napojení na broker nebo kurzy je mimo rozsah.

**Mimo rozsah MVP:**

- napojení na banku, import výpisů, jakákoli síťová komunikace
- cloud sync, více uživatelů, mobilní verze
- AI funkce
- připomínka v samostatném čase pro každý návyk (MVP má jen 2 denní check-iny, HAB-07)
- anglické UI, volba měny a locale (po 1.0, připravuje NFR-09)
- šifrování databáze (SQLCipher): tauri-plugin-sql ho nepodporuje, ochranu dat na disku zajišťuje šifrování disku v OS
- modul Škola (deadliny, maturita) a měsíční report návyky × finance (plánováno po MVP)

## 3. První spuštění a Dnes

**První spuštění (onboarding)**

| ID | Požadavek | Akceptační kritérium |
| --- | --- | --- |
| ONB-01 | Při prázdné DB se spustí průvodce ve 3 krocích: rozpočet → návyky → první cíl | Po dokončení nebo přeskočení se už nezobrazí |
| ONB-02 | Krok rozpočet: celkový měsíční rozpočet (kolik můžu za měsíc utratit) a volitelně limity jednotlivých výdajových kategorií (kap. 10) | Celkový rozpočet jde přeskočit. Limit kategorie 0 = kategorie bez limitu |
| ONB-03 | Krok návyky: výběr z šablon nebo vlastní, max 3 | 4. výběr nejde označit, zobrazí se důvod (CALC-06) |
| ONB-04 | Krok cíl: volitelně první finanční cíl | Jde přeskočit |
| ONB-05 | Konec průvodce: „Spouštět po přihlášení“ (SYS-02) a časy check-inů (HAB-07) | Zaškrtávátko je výchozí zapnuté, časy předvyplněné 7:30 a 21:00. Obojí jde později změnit v Nastavení |

**Modul Dnes (úvodní obrazovka)**

| ID | Požadavek | Akceptační kritérium |
| --- | --- | --- |
| DNE-01 | 3 hlavní úkoly dne: přidat, odškrtnout, smazat | Max 3 úkoly na den. Nehotové úkoly z včerejška se nabídnou k přesunu na dnes jedním klikem |
| DNE-02 | Dnešní naplánované návyky s rychlým zápisem | Jeden klik = splnil, druhá akce = minimum. Změna se hned promítne do matice |
| DNE-03 | Karta „Dnes můžeš utratit“ | Hodnota podle CALC-07. Pod 0 červeně. Když celkový rozpočet není nastavený, karta místo čísla nabídne „Nastav rozpočet“ |
| DNE-04 | Varování „Nikdy dvakrát“ | Zobrazí se pro každý návyk ve stavu v ohrožení (CALC-03) |
| DNE-05 | Nejdůležitější finanční cíl | Cíl s nejvyšší prioritou, progress v % a měsíční příspěvek (CALC-08) |
| DNE-06 | Tlačítko rychlého zápisu výdaje | Otevře FIN-01 |

## 4. Návyky a týdenní review

| ID | Požadavek | Akceptační kritérium |
| --- | --- | --- |
| HAB-01 | Vytvoření vlastního návyku. Pole: název, ikona, identita, typ (ano/ne / počet / čas), cílová hodnota + jednotka, frekvence (denně / vybrané dny / X× týdně), kotva, minimální verze (text), minimální hodnota (u typu počet/čas) | Povinné: název (1–40 znaků), typ, frekvence. U typu počet/čas je povinná cílová hodnota > 0. Minimální hodnota je volitelná, 0 < min < cíl |
| HAB-02 | Úprava, pozastavení a archivace návyku | Pozastavený návyk nemá naplánované dny a jeho série se nemění. Archivace nemaže záznamy. Archivované návyky jsou v samostatném seznamu a jdou obnovit. Změna frekvence přepočítá minulost (s varováním), změna cíle ne (stav se ukládá při zápisu). Typ po založení nejde změnit. Archivované dny se počítají jako pauza, obnova návyk rovnou spustí (limit CALC-06 platí) |
| HAB-03 | Měsíční matice: řádky = návyky, sloupce = dny | Buňka ukazuje stav (splnil / minimum / vynechal / volno / čeká / nenaplánováno). Klik cykluje stavy. Budoucí naplánované dny jde nastavit jen na volno (CALC-02), jinak nejdou upravit. Přepínání měsíců. Cyklus kliku: prázdné → splnil → minimum → prázdné, u dneška a budoucích naplánovaných dní navíc volno (budoucí jen volno ↔ prázdné). U počtu/času splnil = cílová hodnota, minimum = `min_value`; přesné číslo pravým klikem nebo Shift+Enter (0 záznam smaže) |
| HAB-04 | Série (streak) u každého návyku | Podle CALC-02 a CALC-03. Stav „v ohrožení“ je vizuálně odlišený |
| HAB-05 | Limit 3 návyků ve fázi budování | Podle CALC-06. Při pokusu o 4. se zobrazí důvod a nejmenší počet dní, který nejbližšímu návyku zbývá do zaběhnutí (66 − stáří návyku ve dnech). Když nejbližší návyk má ≥ 66 dní, ale konzistenci pod 80 %, místo čísla text o chybějící konzistenci; u `weekly_count` v týdnech do 9 |
| HAB-06 | Fáze návyku: budování → zaběhnutý | Podle CALC-05. Přechod se uživateli oznámí |
| HAB-07 | Ranní a večerní check-in: systémová notifikace ve 2 nastavených časech (výchozí 7:30 a 21:00) | Obsah podle CALC-12. Každý check-in jde v Nastavení vypnout. Klik na notifikaci otevře Dnes. Max 1 ranní a 1 večerní za den. Když app v daný čas neběžela, check-in se dodatečně neposílá. Funguje na Windows i Linuxu |
| HAB-08 | Statistiky | Konzistence měsíce v % (CALC-04), trend konzistence po dnech, top 5 návyků, hlasy pro identitu (počet úspěšných dní na identitu za měsíc) |
| HAB-09 | Šablony návyků | Při vytváření jde vybrat šablonu z kap. 10 a upravit ji |
| HAB-10 | Automatický návyk „Den bez utrácení“ | Stav se počítá z transakcí podle CALC-10 a ručně nejde změnit |
| REV-01 | Týdenní review | V neděli se na Dnes nabídne review aktuálního týdne. 3 textová pole: co šlo, co nešlo, co změním. V modulu Review jde vyplnit nebo upravit review kteréhokoli minulého týdne (jedno na týden) |
| REV-02 | Přehled týdne v review | Konzistence každého návyku za týden + celkové výdaje týdne podle kategorií |
| REV-03 | Historie review | Seznam minulých review, řazeno od nejnovějšího |

## 5. Finance a finanční cíle

| ID | Požadavek | Akceptační kritérium |
| --- | --- | --- |
| FIN-01 | Rychlý zápis transakce (Ctrl+N kdekoli v app). Pole: částka, typ (výdaj / příjem), kategorie, datum (výchozí dnes), poznámka | Fokus je hned na částce, Enter uloží. Nabízí se jen kategorie zvoleného typu, jdou vybrat klávesnicí. Částka > 0, max 2 desetinná místa, desetinná čárka i tečka |
| FIN-02 | Seznam transakcí | Filtr podle měsíce a kategorie, úprava, smazání s potvrzením |
| FIN-03 | Správa kategorií | Přidat, upravit (název, ikona, barva, typ výdaj/příjem, měsíční limit jen u výdajových), archivovat. Kategorie s transakcemi nejde smazat, jen archivovat. Změna typu kategorie změní i typ jejích transakcí, předtím se app zeptá s počtem dotčených transakcí |
| FIN-04 | Rozpočet měsíce | Celkový rozpočet (bar všech výdajů měsíce proti `settings.monthly_budget`, bez nastaveného rozpočtu odkaz do Nastavení) + progress bar na každou kategorii s limitem > 0: zelená do 80 %, oranžová 80–100 %, červená nad 100 % |
| FIN-05 | Opakované platby | Definice: název, částka, kategorie, den v měsíci. Přidat, upravit, archivovat. Při načtení Finance a Cíle a při návratu do okna se vytvoří chybějící transakce za všechny měsíce od prvního měsíce platby až do dneška (CALC-11). Ve fázi 5 přibude spuštění app |
| FIN-06 | Vlastní finanční cíle, 3 typy: spořicí, limitový, návykový | Libovolný počet. Přidat, upravit, pozastavit, archivovat. Validace podle typu (spořicí: částka + termín v budoucnu, limitový: kategorie + částka, návykový: počet dní 1–31) |
| FIN-07 | Vklady do spořicího cíle | Vklad není výdaj, datum nejde v budoucnu, vklad jde smazat. Snižuje zbývající příspěvek měsíce (CALC-08). Splnění se počítá ze všech vkladů včetně tohoto měsíce a nastane hned po dosažení cílové částky. Smazání vkladu nebo zvýšení cílové částky ho může zrušit |
| FIN-08 | Priorita cílů | Řazení přetažením i tlačítky. Volné peníze = B − S − rezervace investic − `U` − vklady cílů tento měsíc (CALC-07). Cíle podle priority: když se zbylý příspěvek nevejde, cíl se označí a přeskočí, další menší se může vejít. Pozastavené cíle a cíle bez zbylého příspěvku se neoznačují. Bez rozpočtu se neoznačuje nic |
| FIN-09 | Měsíční přehled | Graf příjmů a výdajů po dnech, rozdělení výdajů podle kategorií, součty měsíce |
| FIN-10 | Denní limit | Výpočet podle CALC-07, zobrazení ve Finance, od fáze 5 v DNE-03 |
| FIN-11 | Grafický přehled financí | Na obrazovce Cíle: útrata měsíce proti rozpočtu, spořicí cíle a jejich plnění, součet hodnoty investic a vklady měsíce |
| FIN-12 | Investice | Účet: název, ikona, aktuální hodnota, měsíční vklad. Přidat, upravit, archivovat. Vklad není výdaj, zvýší hodnotu a jde smazat. Hodnotu jde přepsat, dosavadní vklady pak v ní jsou a jejich smazání ji nezmění |

## 6. Výpočty a pravidla

Všechny výpočty jsou čisté funkce v `src/lib`, každé pravidlo má vlastní testy. „Dnes“ je vstupní parametr. Datum = lokální kalendářní den, týden = ISO týden (Po–Ne).

**Návyky**

- **CALC-01 Naplánovaný den.** `daily` = každý den. `days` = den, jehož den v týdnu je v `days_mask`. `weekly_count` = vyhodnocuje se po týdnech (viz níže). Dny před `start_date` (lokální datum založení) a dny v pozastavení nejsou naplánované.
- **CALC-02 Úspěch a série.** Úspěch = stav `done` nebo `minimum`. U typu počet/čas je `done`, když `value ≥ target_value`, a `minimum`, když `min_value ≤ value < target_value`. Menší hodnota (nebo chybějící `min_value`) není úspěch. Série = počet úspěšných naplánovaných dní v řadě, končící dnes (pokud je dnes úspěch), jinak včera. Stav `rest` sérii nepřeruší ani nezvýší. `rest` jde nastavit jen dopředu, tj. pro dnešek nebo budoucí naplánovaný den. Minulý den na `rest` změnit nejde (vynechání nejde zpětně omluvit). Naplánovaný den v minulosti bez záznamu = `missed`. Dnešek bez záznamu = `pending` a nepočítá se.
- **CALC-03 Nikdy dvakrát.** Jeden `missed` sérii nepřeruší, jen ji nezvýší a návyk je ve stavu `at_risk`, dokud nepřijde další úspěch. Dva naplánované dny `missed` za sebou (nepočítají se `rest` a nenaplánované dny mezi nimi) = série 0. Příklad: ✓ ✓ ✗ ✓ = série 3, ✓ ✓ ✗ ✗ = série 0. `at_risk` platí jen při sérii větší než 0.
- **CALC-04 Konzistence.** Úspěšné naplánované dny ÷ naplánované dny v období do včerejška včetně (dnes jen když už je úspěch) × 100, zaokrouhleno na celá %. Dny `rest` se nepočítají do jmenovatele. 0 naplánovaných dní = „–“.
- **weekly\_count.** Týden je úspěšný, když má ≥ `weekly_target` úspěchů. Série a CALC-03 se počítají v týdnech, probíhající týden je `pending`. Konzistence týdne = min(úspěchy, cíl) ÷ cíl. Neúplný týden (týden založení, týden s pauzou) se počítá jen, když je splněný; nesplněný není `missed`.
- **CALC-05 Fáze.** Návyk je `building`, dokud neplatí zároveň: od `start_date` uplynulo ≥ 66 dní a konzistence za posledních 66 dní je ≥ 80 %. Pak je `established`. U `weekly_count` místo toho: od `start_date` uplynulo ≥ 9 celých ISO týdnů a průměrná konzistence týdne za posledních 9 celých týdnů je ≥ 80 %. Přechod je jednosměrný, proto se uloží do `habits.phase` ve chvíli, kdy podmínka poprvé platí.
- **CALC-06 Limit budování.** Aktivních (ne pozastavených, ne archivovaných) návyků ve fázi `building` může být max 3. Vytvoření, obnovení nebo zrušení pozastavení 4. je zablokované. Automatický návyk HAB-10 se do limitu nepočítá.

**Finance** (všechny částky v haléřích)

- **CALC-07 Denní limit.** `B` = celkový měsíční rozpočet (`settings.monthly_budget`). `S` = všechny výdaje tohoto měsíce s datem před dneškem, včetně opakovaných plateb. `P` = Σ cíle max(plán, vklady tento měsíc) + Σ investice max(plán, vklady tento měsíc) + `U`. Plán spořicího cíle = příspěvek CALC-08, pozastavený, splněný a archivovaný cíl má plán 0. Plán investice = měsíční vklad, archivovaná má 0. Vklady tohoto měsíce se počítají vždy, zaplacený vklad tedy zůstává rezervovaný a vklad nad plán limit sníží. `U` = opakované výdaje, které tento měsíc ještě nemají běh a mají datum > dnes (a tento měsíc ≥ první měsíc platby), + vygenerované výdaje tohoto měsíce s datem ≥ dnes. `D` = zbývající dny měsíce včetně dneška. Denní dávka `A = max(0, floor((B − S − P) / D))`. Zobrazená hodnota = `A − dnešní výdaje` (může být záporná), dnešní výdaje jsou bez vygenerovaných plateb. Když `B` není nastavený nebo je 0, výpočet se neprovádí (DNE-03). Limity kategorií do výpočtu nevstupují, slouží jen pro FIN-04. Příjmy do výpočtu nevstupují. Transakce s datem v budoucnu se započítají až v jejich den. Příklad: B = 7 000 Kč, S = 5 900 Kč (z toho 2 000 Kč v kategorii bez limitu), P = 0, D = 11 → A = 100 Kč. Dnes utraceno 40 Kč → zobrazí 60 Kč.
- **CALC-08 Měsíční příspěvek spořicího cíle.** `M` = počet měsíců od aktuálního do měsíce termínu včetně, min. 1. Příspěvek = `ceil((target − saved) / M)`, kde `saved` = součet vkladů před tímto měsícem. Když `saved ≥ target`, nastaví se `achieved_at` a příspěvek je 0. Prošlý termín bez splnění = stav „po termínu“, M = 1.
- **CALC-09 Limitový cíl.** Progress = výdaje kategorie v měsíci ÷ limit cíle. Měsíc je splněný, když výdaje ≤ limit. Vyhodnocuje se po skončení měsíce.
- **CALC-10 Den bez utrácení.** Den bez jediného výdaje, nepočítají se transakce vytvořené z opakovaných plateb. Stav automatického návyku se vždy počítá z transakcí, neukládá se do `habit_logs` (zpětně zapsaný výdaj tak změní i minulé dny). Minulý den = `done` nebo `missed`, dnes = `pending`. Návykový cíl je splněný, když počet takových dní v měsíci ≥ `target_days`.
- **CALC-11 Opakované platby.** Generování je idempotentní: unikátní dvojice (`recurring_id`, měsíc). Doplní se všechny měsíce od `first_month` do aktuálního, v aktuálním jen když datum platby ≤ dnes. Den v měsíci 29–31 v kratším měsíci = poslední den měsíce. `first_month` je první měsíc, jehož datum platby je při založení ≥ dnes, určí se jednou a nemění se. Úprava platby platí jen pro další běhy, před úpravou nebo archivací se doplní vynechané měsíce. Transakce a běh se zapíší jedním příkazem s triggerem.

**Systém**

- **CALC-12 Obsah check-inu.** Vstup: dnešek, druh (ranní / večerní), data. Výstup: titulek a text notifikace. Ranní: počet dnešních naplánovaných návyků a hodnota „Dnes můžeš utratit“ (CALC-07, bez nastaveného rozpočtu se vynechá). Večerní: názvy dnešních naplánovaných návyků bez záznamu a dnešní útrata celkem. V neděli bez vyplněného review navíc výzva k review. Když jsou všechny návyky zapsané, večerní text jen shrne den. Funkce je čistá v `src/lib`, časovač a odeslání notifikace jsou mimo ni.

## 7. Datový model

SQLite, jeden soubor `life-os.db` v Tauri app config dir (NFR-03). Vývojová a reálná verze mají různý identifier, a tedy různou složku (PUB-03). Každá tabulka má `id INTEGER PRIMARY KEY` a `created_at`. Částky jsou `INTEGER` v haléřích, data `TEXT` ve formátu `YYYY-MM-DD`.

| Tabulka | Sloupce | Poznámka |
| --- | --- | --- |
| habits | name, start\_date, icon, identity, type (`check` / `count` / `duration`), target\_value, unit, frequency (`daily` / `days` / `weekly_count`), days\_mask, weekly\_target, anchor, min\_version, min\_value, auto\_rule (`null` / `no_spend`, od fáze 5), phase (`building` / `established`), archived\_at | days\_mask = bitová maska Po–Ne. phase se mění jen podle CALC-05 |
| habit\_pauses | habit\_id, start\_date, end\_date | Pro CALC-01, end\_date null = stále pozastaveno |
| habit\_logs | habit\_id, date, value, status (`done` / `minimum` / `missed` / `rest`), note | UNIQUE(habit\_id, date). Automatický návyk sem nezapisuje (CALC-10) |
| daily\_tasks | date, title, done, position | Max 3 na date |
| weekly\_reviews | week\_start, went\_well, went\_badly, change\_next | UNIQUE(week\_start) |
| categories | name, icon, color, kind (`expense` / `income`), monthly\_budget, archived\_at | monthly\_budget 0 = bez limitu, u `income` vždy 0 |
| transactions | date, amount, category\_id, note, recurring\_id (od fáze 4, FIN-05) | amount > 0. Typ (příjem / výdaj) se neukládá, je to `kind` kategorie (JOIN) |
| recurring | name, amount, category\_id, day\_of\_month, first\_month (`YYYY-MM`), archived\_at | Jen archivace, ne mazání |
| recurring\_runs | recurring\_id, month (`YYYY-MM`), transaction\_id | UNIQUE(recurring\_id, month), CALC-11 |
| goals | type (`saving` / `limit` / `no_spend`), name, icon, target\_amount, target\_days, category\_id, deadline, priority, paused\_at, achieved\_at, archived\_at | Pole podle typu, viz FIN-06 |
| goal\_deposits | goal\_id, date, amount | Jen pro `saving` |
| investments | name, icon, base\_value, base\_deposit\_id, monthly\_deposit, archived\_at | Hodnota = base\_value + vklady s id > base\_deposit\_id |
| investment\_deposits | investment\_id, date, amount | Id se nepoužije znovu (AUTOINCREMENT) |
| settings | key, value | onboarding\_done, monthly\_budget (haléře), pin\_hash, checkin\_morning a checkin\_evening (`HH:MM`, prázdné = vypnuto) a další |

## 8. UI a design

**Navigace:** levý sidebar s moduly Dnes, Návyky, Finance, Cíle, Review, Nastavení. Layout je navržený pro okno od 1024 × 680 px, ale okno minimální velikost nevynucuje: tiling na Hyprlandu by jinak obsah roztáhl a rozmazal. Menší okno nesmí rozbít layout.

| Obrazovka | Obsah |
| --- | --- |
| Dnes | DNE-01 až DNE-06 v mřížce karet |
| Návyky | Měsíční matice (HAB-03), nahoře konzistence měsíce v kroužku a trend, vpravo top návyky. Tlačítko „Přidat návyk“ |
| Finance | Denní limit (FIN-10, do fáze 5), rozpočet po kategoriích (FIN-04), měsíční přehled (FIN-09), seznam transakcí (FIN-02) |
| Cíle | Přehled financí (FIN-11), karty cílů seřazené podle priority, progress kruh, příspěvek měsíce, tlačítko vkladu, investice (FIN-12) |
| Review | Aktuální týdenní review + historie |
| Nastavení | Celkový rozpočet, kategorie, opakované platby, check-iny a autostart, archiv, záloha, PIN |

**Design tokeny**

| Token | Hodnota |
| --- | --- |
| bg | #0B0B0C |
| surface | #141416 |
| border | #26262A |
| text | #F2F2F2 |
| text-muted | #8A8A8F |
| success (splnil, v limitu) | #22C55E |
| warning (minimum, 80–100 %, v ohrožení) | #F59E0B |
| danger (vynechal, přes limit) | #EF4444 |
| font | Inter přibalený v app (žádné Google Fonts, NFR-02), čísla `tabular-nums` |

Velká čísla (procenta, částky) mají 32–48 px. Žádné tapety ani obrázky na pozadí.

**Klávesové zkratky**

| Zkratka | Akce |
| --- | --- |
| Ctrl+N | Nová transakce (FIN-01) |
| Ctrl+Shift+N | Nový návyk |
| Ctrl+1 až Ctrl+6 | Přepnutí modulu |
| Esc | Zavřít dialog |

## 9. Nefunkční požadavky a tech stack

| ID | Požadavek |
| --- | --- |
| NFR-01 | Windows 10/11 a Linux (Arch / Omarchy, Hyprland, Wayland). Stejné chování na obou |
| NFR-02 | Plně offline. Žádná síťová volání, žádná telemetrie |
| NFR-03 | Data jen v Tauri app config dir, kam DB ukládá tauri-plugin-sql (Linux `~/.config/<identifier>`, Windows `%APPDATA%\<identifier>`), žádné cesty natvrdo |
| NFR-04 | Start aplikace do 2 s, zápis transakce nebo návyku do 5 s od otevření formuláře |
| NFR-05 | Záloha: Nastavení → Exportovat zálohu (`VACUUM INTO` do zvolené složky, ne kopie otevřeného souboru) a Obnovit ze zálohy |
| NFR-06 | Volitelný PIN zámek při spuštění. Ukládá se jen hash PINu (Argon2 nebo bcrypt) v settings, nikdy plain text. PIN je zámek obrazovky, ne šifrování. DB se nešifruje (kap. 2) |
| NFR-07 | Veškeré SQL parametrizované, vstupy validované na hranici UI → DB |
| NFR-08 | Ovládatelné klávesnicí, viditelný fokus |
| NFR-09 | Všechny texty UI v jednom souboru (`src/i18n/cs.ts`), žádné texty natvrdo v komponentách. Čísla, částky a data formátuje `Intl` s `cs-CZ`. Po 1.0 tak jde přidat angličtina bez přepisování komponent |
| SYS-01 | Běh v systémové liště (tray). Zavření okna app skryje do lišty, nekončí ji. Menu lišty: Otevřít, Nový výdaj (od fáze 2, s FIN-01), Ukončit. Časovač check-inů (HAB-07, fáze 5) běží, i když je okno skryté |
| SYS-02 | Spuštění po přihlášení (autostart), zapíná se v ONB-05 nebo v Nastavení. Po spuštění se otevře Dnes. Zdroj pravdy je OS, stav se neukládá do settings |
| SYS-03 | Běží jen jedna instance. Druhé spuštění ukáže okno první instance a skončí (tauri-plugin-sql nemá busy_timeout, dva procesy nad jednou DB by dostaly `SQLITE_BUSY`) |

**Tech stack**

| Vrstva | Technologie |
| --- | --- |
| Desktop | Tauri 2 |
| UI | React + TypeScript (strict) + Tailwind |
| Grafy | Recharts |
| Data | SQLite přes tauri-plugin-sql, SQL migrace |
| Lišta | Tray ikona z jádra Tauri 2 (feature `tray-icon`) |
| Jedna instance | tauri-plugin-single-instance (SYS-03) |
| Notifikace | tauri-plugin-notification, jen okamžité odeslání. Na desktopu plánování neumí, čas hlídá vlastní časovač v app |
| Autostart | tauri-plugin-autostart (nová závislost, zdůvodnit v plánu fáze 1) |
| Testy | Vitest (TS), cargo test (Rust) |
| Kvalita | ESLint, Prettier, clippy, rustfmt |
| CI | GitHub Actions: lint + testy na každém PR, build pro Windows a Linux přes tauri-action při vydání |

**Známé problémy platformy:** na Hyprlandu / Waylandu může WebKit vykreslit prázdné okno. První krok je spustit s `WEBKIT_DISABLE_DMABUF_RENDERER=1`. Windows instalátor se staví na Windows runneru v CI, ne křížově z Linuxu. Na Hyprlandu potřebuje tray ikona bar s modulem tray (Waybar) a notifikace běžící notifikační daemon (např. mako). Autostart na Linuxu zapisuje XDG `.desktop` soubor do `~/.config/autostart`. Ten Hyprland sám nespouští, funguje jen když session XDG autostart podporuje (např. přes uwsm). Ověřit ve fázi 1, jinak zdokumentovat `exec-once` v README.

## 10. Fáze implementace a výchozí data

Každá fáze končí spustitelnou verzí, zelenými testy a tagem verze.

| Fáze | Verze | Obsah (ID) |
| --- | --- | --- |
| 1 Kostra | 0.1.0 | Tauri + React projekt, sidebar, design tokeny, SQLite + migrační systém, tabulka settings, CI s lintem a testy, NFR-09, SYS-01 (bez Nového výdaje a časovače), SYS-02, SYS-03, PUB-01 až PUB-03. Plán: `docs/plans/F1-kostra.md` |
| 2 Finance základ | 0.2.0 | FIN-01 až FIN-04, výchozí kategorie, PUB-04 (transakce a kategorie), SYS-01 Nový výdaj. Plán: `docs/plans/F2-finance.md` |
| 3 Návyky | 0.3.0 | HAB-01 až HAB-06, HAB-09, CALC-01 až CALC-06. Plán: `docs/plans/F3-navyky.md` |
| 4 Finance a cíle | 0.4.0 | FIN-05 až FIN-12, CALC-07 až CALC-11. Plán: `docs/plans/F4-finance-cile.md` |
| 5 Dnes | 0.5.0 | ONB-01 až ONB-05, DNE-01 až DNE-06, HAB-07, HAB-10, CALC-12 |
| 6 Dokončení | 1.0.0 | HAB-08, REV-01 až REV-03, NFR-05, NFR-06, release build Windows + Linux |

**Výchozí kategorie** (limit nastaví uživatel v ONB-02):

- Výdaje: Jídlo, Jídlo venku, Doprava, Auto a motorka, Sport a gym, Škola, Zábava, Předplatné, Oblečení, Ostatní.
- Příjmy: Práce / zakázky, Ostatní příjmy.

**Šablony návyků** (HAB-09)

| Šablona | Typ | Frekvence | Minimální verze (min\_value) |
| --- | --- | --- | --- |
| Spánek do 23:00 | ano/ne | denně | do 23:30 |
| Trénink | čas, 45 min | 4× týdně | 10 minut pohybu (10) |
| Učení | čas, 90 min | Po–Čt | 15 minut (15) |
| Čtení | počet, 10 stran | denně | 1 strana (1) |
| Pitný režim | počet, 8 sklenic | denně | 4 sklenice (4) |
| Den bez utrácení | automatický (HAB-10) | denně | – |

## 11. Build in public

Repo je veřejné od prvního commitu. Veřejný je kód a postup, nikdy vlastníkova data.

| ID | Požadavek | Akceptační kritérium |
| --- | --- | --- |
| PUB-01 | Veřejný GitHub repozitář s licencí MIT a README | README: co app dělá, screenshot, jak ji spustit na Windows a Linuxu |
| PUB-02 | Do repa se nikdy nedostanou reálná data | `.gitignore` obsahuje `*.db`, `*.db-*` a zálohy. Commity používají GitHub noreply e-mail. Testové fixtures jsou smyšlené |
| PUB-03 | Vývoj odděleně od reálných dat | Výchozí `tauri.conf.json` je vývojový (identifier `io.github.vladc3.lifeos.dev`, „Life OS Dev“), takže `npm run tauri dev` i obyčejný build používají vlastní složku. Reálnou verzi (`io.github.vladc3.lifeos`, „Life OS“) postaví jen `npm run build:release`. Vývoj ani demo data nikdy nesahají na reálnou DB |
| PUB-04 | Demo data pro screenshoty | Příkaz naplní dev DB smyšlenými transakcemi a návyky (návyky od fáze 3). Screenshoty v README a příspěvcích jsou jen z demo dat |
| PUB-05 | Příspěvek o postupu za každou fázi | Při tagu verze: release notes z Conventional Commits + krátký příspěvek (co je hotové, co jsem se naučil, screenshot) |

## 12. Otevřené otázky

Rozhodnout před fází, ve které se používají. Do té doby se neimplementují.

| # | Otázka | Fáze | Návrh |
| --- | --- | --- | --- |
| Q6 | Jak dělat atomické zápisy pro zálohy (NFR-05)? tauri-plugin-sql má pool spojení, takže `BEGIN`/`COMMIT` v oddělených `execute()` nejsou bezpečné | 6 | Rozhodnout v plánu fáze 6. CALC-11 vyřešeno triggerem ve v0.8 |
| Q7 | Kde běží časovač check-inů (HAB-07)? Skrytý webview může brzdit JS časovače | 5 | Rozhodnout v plánu fáze 5 (JS vs. Rust) |

Vyřešené ve v0.8: Q8 vratka se zapisuje jako příjem, výdaje kategorie se nesníží. Q9 investice jsou účet s ruční hodnotou a měsíčním vkladem (FIN-12).

Vyřešené ve v0.5: Q4 SQL testy ve Vitest proti `node:sqlite` v paměti se stejnými migracemi (plán fáze 1, D1).

Vyřešené ve v0.4: Q1 `rest` jen dopředu (CALC-02), Q2 `min_value` (CALC-02), Q3 fáze u `weekly_count` (CALC-05), Q5 review kdykoli zpětně (REV-01).

## Změny ve verzi 0.8

Podle schváleného plánu fáze 4 (`docs/plans/F4-finance-cile.md`, D1–D8):

- CALC-11 a kap. 7: `recurring.first_month` místo `created_at`, atomický zápis triggerem (Q6 pro CALC-11).
- Nový FIN-12 Investice, kap. 2 a 7 rozšířené, Q9 vyřešená. Q8 vyřešená: vratka je příjem.
- CALC-07: zaplacený vklad zůstává rezervovaný, `P` zahrnuje investice a nadcházející opakované výdaje. Dnešní výdaje jsou bez vygenerovaných plateb.
- FIN-07: splnění ze všech vkladů, jde zrušit. FIN-08: přesná definice volných peněz. FIN-11: přesné kritérium.
- FIN-10 je do fáze 5 ve Finance. FIN-05: generování při načtení obrazovek, spuštění app přibude ve fázi 5.

## Změny ve verzi 0.7

Podle schváleného plánu fáze 3 (`docs/plans/F3-navyky.md`, C1–C6):

- Kap. 7 a CALC-01/05: `habits.start_date` (lokální datum) místo UTC `created_at`. `auto_rule` až s HAB-10.
- HAB-02: změna frekvence přepočítá minulost, cíl ne, typ nejde změnit. HAB-03: cyklus kliku a přesné číslo.
- HAB-05: text místo čísla, když chybí konzistence. weekly\_count: neúplný týden se počítá jen splněný.
- HAB-02: archiv funguje jako pauza. CALC-03: `at_risk` jen při sérii > 0 (dev-team review hotové fáze).

## Změny ve verzi 0.6

Podle schváleného plánu fáze 2 (`docs/plans/F2-finance.md`, B1–B7):

- Kap. 7: `transactions` bez sloupce `type`, typ je `kind` kategorie. `recurring_id` až s FIN-05.
- FIN-03: změna typu kategorie změní i její transakce. FIN-04: co je celkový rozpočet.
- Nový FIN-11 (grafický přehled financí, fáze 4). Nové otázky Q8 (vratky) a Q9 (investice).
- PUB-04 a SYS-01 po fázích, popisky menu v liště zůstávají v Rustu až do angličtiny (výjimka z NFR-09).

## Změny ve verzi 0.5

Podle schváleného plánu fáze 1 (`docs/plans/F1-kostra.md`, A1–A6):

- NFR-03: DB je v app config dir, protože tam ji ukládá tauri-plugin-sql.
- PUB-03: oddělení dev a reálných dat přes identifier místo `life-os-dev.db`.
- SYS-02 bez klíče `settings.autostart`. Nový SYS-03: jedna instance.
- SYS-01 rozdělený po fázích. Nové otázky Q6 (transakce) a Q7 (časovač), Q4 vyřešená.

## Změny ve verzi 0.4

Podle rozhovoru s vlastníkem (proč dřív s aplikacemi přestal, kdy app používá):

- „Problém“ přepsaný na 3 skutečné důvody, proč vlastník aplikace na návyky vzdal, a odpověď na každý z nich.
- HAB-07 je zpět v MVP jako 2 denní check-iny (CALC-12) + SYS-01 lišta + SYS-02 autostart (ONB-05). Lišta a autostart jsou ve fázi 1, protože nesou největší riziko na Hyprlandu.
- CALC-02: `rest` jen dopředu, `minimum` u typu počet/čas podle nového `min_value`.
- CALC-05: pravidlo fáze pro `weekly_count`. REV-01: review jde vyplnit kdykoli zpětně.
- NFR-09: texty UI v jednom souboru kvůli angličtině po 1.0.

## Změny ve verzi 0.3

- CALC-07: místo součtu limitů kategorií se používá jeden celkový měsíční rozpočet. Do `S` se počítají všechny výdaje. Když rozpočet chybí, karta ho nabídne nastavit, místo aby ukazovala 0 Kč.
- NFR-06: jen PIN zámek. SQLCipher je mimo MVP, protože tauri-plugin-sql ho nepodporuje.
- HAB-07: připomínky jsou mimo MVP. Desktopový plugin notifikací neumí plánovat.
- Kategorie dostaly typ výdaj/příjem. CALC-10 se počítá, neukládá. CALC-11 doplní i měsíce, kdy app nebyla spuštěná. Záloha přes `VACUUM INTO`. Font je přibalený v app.
- Fáze 4 je rozdělená na 4 (finance a cíle) a 5 (Dnes).
- Nové: problém a měřítka úspěchu, kap. 11 Build in public, kap. 12 Otevřené otázky.
