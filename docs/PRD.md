# Life OS – PRD

Verze 0.2 · 2026-10-25 · vlastník: Vova

## 1. Přehled

Life OS je lokální desktop aplikace pro jednoho uživatele. Spojuje budování návyků a osobní finance v jednom okně. Uživatel si návyky i finanční cíle definuje sám.

- **Uživatel:** jeden člověk (student), žádné účty ani přihlašování.
- **Platformy:** Windows 10/11 a Linux (Arch / Omarchy, Hyprland na Waylandu).
- **Jazyk UI:** čeština. Měna: CZK. Locale: cs-CZ.

**Principy**

1. **Local-first:** data jsou jen na disku uživatele, žádný server ani síť.
2. **Ruční zadávání financí:** žádné napojení na banku ani import výpisů.
3. **Rychlost zápisu:** zapsat výdaj nebo odškrtnout návyk musí jít do 5 sekund.
4. **Pravidla zabudovaná v produktu:** app aktivně brání špatným vzorcům (moc návyků najednou, ztráta série po jednom výpadku).
5. **Tmavý, číselný styl:** velká čísla a procenta, minimum dekorací.

## 2. Rozsah

**V MVP:** první spuštění (onboarding), Dnes, Návyky, Týdenní review, Finance a finanční cíle, Nastavení (záloha, PIN).

**Mimo rozsah MVP:**

- napojení na banku, import výpisů, jakákoli síťová komunikace
- cloud sync, více uživatelů, mobilní verze
- AI funkce
- modul Škola (deadliny, maturita) a měsíční report návyky × finance (plánováno po MVP)

## 3. První spuštění a Dnes

**První spuštění (onboarding)**

| ID | Požadavek | Akceptační kritérium |
| --- | --- | --- |
| ONB-01 | Při prázdné DB se spustí průvodce ve 3 krocích: rozpočet → návyky → první cíl | Po dokončení nebo přeskočení se už nezobrazí |
| ONB-02 | Krok rozpočet: měsíční limit pro každou výchozí kategorii (kap. 10) | Limit 0 = kategorie bez limitu |
| ONB-03 | Krok návyky: výběr z šablon nebo vlastní, max 3 | 4. výběr nejde označit, zobrazí se důvod (CALC-06) |
| ONB-04 | Krok cíl: volitelně první finanční cíl | Jde přeskočit |

**Modul Dnes (úvodní obrazovka)**

| ID | Požadavek | Akceptační kritérium |
| --- | --- | --- |
| DNE-01 | 3 hlavní úkoly dne: přidat, odškrtnout, smazat | Max 3 úkoly na den. Nehotové úkoly z včerejška se nabídnou k přesunu na dnes jedním klikem |
| DNE-02 | Dnešní naplánované návyky s rychlým zápisem | Jeden klik = splnil, druhá akce = minimum. Změna se hned promítne do matice |
| DNE-03 | Karta „Dnes můžeš utratit“ | Hodnota podle CALC-07. Pod 0 červeně |
| DNE-04 | Varování „Nikdy dvakrát“ | Zobrazí se pro každý návyk ve stavu v ohrožení (CALC-03) |
| DNE-05 | Nejdůležitější finanční cíl | Cíl s nejvyšší prioritou, progress v % a měsíční příspěvek (CALC-08) |
| DNE-06 | Tlačítko rychlého zápisu výdaje | Otevře FIN-01 |

## 4. Návyky a týdenní review

| ID | Požadavek | Akceptační kritérium |
| --- | --- | --- |
| HAB-01 | Vytvoření vlastního návyku. Pole: název, ikona, identita, typ (ano/ne / počet / čas), cílová hodnota + jednotka, frekvence (denně / vybrané dny / X× týdně), kotva, minimální verze, čas připomínky | Povinné: název (1–40 znaků), typ, frekvence. U typu počet/čas je povinná cílová hodnota > 0 |
| HAB-02 | Úprava, pozastavení a archivace návyku | Pozastavený návyk nemá naplánované dny a jeho série se nemění. Archivace nemaže záznamy. Archivované návyky jsou v samostatném seznamu a jdou obnovit |
| HAB-03 | Měsíční matice: řádky = návyky, sloupce = dny | Buňka ukazuje stav (splnil / minimum / vynechal / volno / čeká / nenaplánováno). Klik cykluje stavy. Budoucí dny nejdou upravit. Přepínání měsíců |
| HAB-04 | Série (streak) u každého návyku | Podle CALC-02 a CALC-03. Stav „v ohrožení“ je vizuálně odlišený |
| HAB-05 | Limit 3 návyků ve fázi budování | Podle CALC-06. Při pokusu o 4. se zobrazí důvod a kolik dní zbývá nejbližšímu návyku do zaběhnutí |
| HAB-06 | Fáze návyku: budování → zaběhnutý | Podle CALC-05. Přechod se uživateli oznámí |
| HAB-07 | Připomínky | Systémová notifikace v nastaveném čase, jen v naplánované dny a jen když ještě není záznam. Funguje na Windows i Linuxu |
| HAB-08 | Statistiky | Konzistence měsíce v % (CALC-04), trend konzistence po dnech, top 5 návyků, hlasy pro identitu (počet úspěšných dní na identitu za měsíc) |
| HAB-09 | Šablony návyků | Při vytváření jde vybrat šablonu z kap. 10 a upravit ji |
| HAB-10 | Automatický návyk „Den bez utrácení“ | Stav se nastavuje sám podle CALC-10 a ručně nejde změnit |
| REV-01 | Týdenní review | V neděli se na Dnes nabídne review. 3 textová pole: co šlo, co nešlo, co změním |
| REV-02 | Přehled týdne v review | Konzistence každého návyku za týden + celkové výdaje týdne podle kategorií |
| REV-03 | Historie review | Seznam minulých review, řazeno od nejnovějšího |

## 5. Finance a finanční cíle

| ID | Požadavek | Akceptační kritérium |
| --- | --- | --- |
| FIN-01 | Rychlý zápis transakce (Ctrl+N kdekoli v app). Pole: částka, typ (výdaj / příjem), kategorie, datum (výchozí dnes), poznámka | Fokus je hned na částce, Enter uloží. Kategorie jde vybrat klávesnicí. Částka > 0, max 2 desetinná místa |
| FIN-02 | Seznam transakcí | Filtr podle měsíce a kategorie, úprava, smazání s potvrzením |
| FIN-03 | Správa kategorií | Přidat, upravit (název, ikona, barva, měsíční limit), archivovat. Kategorie s transakcemi nejde smazat, jen archivovat |
| FIN-04 | Rozpočet měsíce | Progress bar na kategorii: zelená do 80 %, oranžová 80–100 %, červená nad 100 % |
| FIN-05 | Opakované platby | Definice: název, částka, kategorie, den v měsíci. Při spuštění app se vytvoří chybějící transakce pro aktuální měsíc až do dneška (CALC-11) |
| FIN-06 | Vlastní finanční cíle, 3 typy: spořicí, limitový, návykový | Libovolný počet. Přidat, upravit, pozastavit, archivovat. Validace podle typu (spořicí: částka + termín v budoucnu, limitový: kategorie + částka, návykový: počet dní 1–31) |
| FIN-07 | Vklady do spořicího cíle | Vklad není výdaj. Snižuje zbývající příspěvek měsíce (CALC-07, CALC-08). Po dosažení cílové částky se cíl označí jako splněný |
| FIN-08 | Priorita cílů | Řazení přetažením. Když součet příspěvků přesáhne volné peníze (B − S v CALC-07), zobrazí se, které cíle se nevejdou |
| FIN-09 | Měsíční přehled | Graf příjmů a výdajů po dnech, rozdělení výdajů podle kategorií, součty měsíce |
| FIN-10 | Denní limit | Výpočet podle CALC-07, zobrazení v DNE-03 |

## 6. Výpočty a pravidla

Všechny výpočty jsou čisté funkce v `src/lib`, každé pravidlo má vlastní testy. „Dnes“ je vstupní parametr. Datum = lokální kalendářní den, týden = ISO týden (Po–Ne).

**Návyky**

- **CALC-01 Naplánovaný den.** `daily` = každý den. `days` = den, jehož den v týdnu je v `days_mask`. `weekly_count` = vyhodnocuje se po týdnech (viz níže). Dny před `created_at` a dny v pozastavení nejsou naplánované.
- **CALC-02 Úspěch a série.** Úspěch = stav `done` nebo `minimum`. U typu počet/čas je `done`, když `value ≥ target_value`. Série = počet úspěšných naplánovaných dní v řadě, končící dnes (pokud je dnes úspěch), jinak včera. Stav `rest` sérii nepřeruší ani nezvýší. Naplánovaný den v minulosti bez záznamu = `missed`. Dnešek bez záznamu = `pending` a nepočítá se.
- **CALC-03 Nikdy dvakrát.** Jeden `missed` sérii nepřeruší, jen ji nezvýší a návyk je ve stavu `at_risk`, dokud nepřijde další úspěch. Dva naplánované dny `missed` za sebou (nepočítají se `rest` a nenaplánované dny mezi nimi) = série 0. Příklad: ✓ ✓ ✗ ✓ = série 3, ✓ ✓ ✗ ✗ = série 0.
- **CALC-04 Konzistence.** Úspěšné naplánované dny ÷ naplánované dny v období do včerejška včetně (dnes jen když už je úspěch) × 100, zaokrouhleno na celá %. Dny `rest` se nepočítají do jmenovatele. 0 naplánovaných dní = „–“.
- **weekly\_count.** Týden je úspěšný, když má ≥ `weekly_target` úspěchů. Série a CALC-03 se počítají v týdnech, probíhající týden je `pending`. Konzistence týdne = min(úspěchy, cíl) ÷ cíl.
- **CALC-05 Fáze.** Návyk je `building`, dokud neplatí zároveň: od `created_at` uplynulo ≥ 66 dní a konzistence za posledních 66 dní je ≥ 80 %. Pak je `established`. Přechod je jednosměrný.
- **CALC-06 Limit budování.** Aktivních (ne pozastavených, ne archivovaných) návyků ve fázi `building` může být max 3. Vytvoření, obnovení nebo zrušení pozastavení 4. je zablokované. Automatický návyk HAB-10 se do limitu nepočítá.

**Finance** (všechny částky v haléřích)

- **CALC-07 Denní limit.** `B` = součet měsíčních limitů kategorií. `S` = výdaje tohoto měsíce před dneškem. `P` = Σ přes aktivní spořicí cíle max(0, měsíční příspěvek − vklady tento měsíc). `D` = zbývající dny měsíce včetně dneška. Denní dávka `A = max(0, floor((B − S − P) / D))`. Zobrazená hodnota = `A − dnešní výdaje` (může být záporná). Příklad: B = 6 000 Kč, S = 3 900 Kč, P = 1 000 Kč, D = 10 → A = 110 Kč. Dnes utraceno 40 Kč → zobrazí 70 Kč. Příjmy do výpočtu nevstupují.
- **CALC-08 Měsíční příspěvek spořicího cíle.** `M` = počet měsíců od aktuálního do měsíce termínu včetně, min. 1. Příspěvek = `ceil((target − saved) / M)`, kde `saved` = součet vkladů před tímto měsícem. Když `saved ≥ target`, nastaví se `achieved_at` a příspěvek je 0. Prošlý termín bez splnění = stav „po termínu“, M = 1.
- **CALC-09 Limitový cíl.** Progress = výdaje kategorie v měsíci ÷ limit cíle. Měsíc je splněný, když výdaje ≤ limit. Vyhodnocuje se po skončení měsíce.
- **CALC-10 Den bez utrácení.** Den bez jediného výdaje, nepočítají se transakce vytvořené z opakovaných plateb. Automatický návyk: minulý den = `done` nebo `missed`, dnes = `pending`. Návykový cíl je splněný, když počet takových dní v měsíci ≥ `target_days`.
- **CALC-11 Opakované platby.** Generování je idempotentní: unikátní dvojice (`recurring_id`, měsíc). Den v měsíci 29–31 v kratším měsíci = poslední den měsíce.

## 7. Datový model

SQLite, jeden soubor `life-os.db` v Tauri app data dir. Každá tabulka má `id INTEGER PRIMARY KEY` a `created_at`. Částky jsou `INTEGER` v haléřích, data `TEXT` ve formátu `YYYY-MM-DD`.

| Tabulka | Sloupce | Poznámka |
| --- | --- | --- |
| habits | name, icon, identity, type (`check` / `count` / `duration`), target\_value, unit, frequency (`daily` / `days` / `weekly_count`), days\_mask, weekly\_target, anchor, min\_version, reminder\_time, auto\_rule (`null` / `no_spend`), phase (`building` / `established`), archived\_at | days\_mask = bitová maska Po–Ne |
| habit\_pauses | habit\_id, start\_date, end\_date | Pro CALC-01, end\_date null = stále pozastaveno |
| habit\_logs | habit\_id, date, value, status (`done` / `minimum` / `missed` / `rest`), note | UNIQUE(habit\_id, date) |
| daily\_tasks | date, title, done, position | Max 3 na date |
| weekly\_reviews | week\_start, went\_well, went\_badly, change\_next | UNIQUE(week\_start) |
| categories | name, icon, color, monthly\_budget, archived\_at | monthly\_budget 0 = bez limitu |
| transactions | date, amount, type (`income` / `expense`), category\_id, note, recurring\_id | amount > 0 |
| recurring | name, amount, category\_id, day\_of\_month, archived\_at |  |
| recurring\_runs | recurring\_id, month (`YYYY-MM`), transaction\_id | UNIQUE(recurring\_id, month), CALC-11 |
| goals | type (`saving` / `limit` / `no_spend`), name, icon, target\_amount, target\_days, category\_id, deadline, priority, paused\_at, achieved\_at, archived\_at | Pole podle typu, viz FIN-06 |
| goal\_deposits | goal\_id, date, amount | Jen pro `saving` |
| settings | key, value | onboarding\_done, pin\_hash a další |

## 8. UI a design

**Navigace:** levý sidebar s moduly Dnes, Návyky, Finance, Cíle, Review, Nastavení. Okno má minimálně 1024 × 680 px a layout se přizpůsobí tiling oknům na Hyprlandu.

| Obrazovka | Obsah |
| --- | --- |
| Dnes | DNE-01 až DNE-06 v mřížce karet |
| Návyky | Měsíční matice (HAB-03), nahoře konzistence měsíce v kroužku a trend, vpravo top návyky. Tlačítko „Přidat návyk“ |
| Finance | Rozpočet po kategoriích (FIN-04), seznam transakcí (FIN-02), měsíční přehled (FIN-09) |
| Cíle | Karty cílů seřazené podle priority, progress kruh, příspěvek měsíce, tlačítko vkladu |
| Review | Aktuální týdenní review + historie |
| Nastavení | Kategorie, opakované platby, archiv, záloha, PIN |

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
| font | Inter, čísla `tabular-nums` |

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
| NFR-03 | Data jen v Tauri app data dir (Linux `~/.local/share/<app>`, Windows `%APPDATA%\<app>`), žádné cesty natvrdo |
| NFR-04 | Start aplikace do 2 s, zápis transakce nebo návyku do 5 s od otevření formuláře |
| NFR-05 | Záloha: Nastavení → Exportovat zálohu (kopie `.db` do zvolené složky) a Obnovit ze zálohy |
| NFR-06 | Volitelný PIN při spuštění (hash v settings, nikdy plain text) a šifrovaná DB (SQLCipher) |
| NFR-07 | Veškeré SQL parametrizované, vstupy validované na hranici UI → DB |
| NFR-08 | Ovládatelné klávesnicí, viditelný fokus |

**Tech stack**

| Vrstva | Technologie |
| --- | --- |
| Desktop | Tauri 2 |
| UI | React + TypeScript (strict) + Tailwind |
| Grafy | Recharts |
| Data | SQLite přes tauri-plugin-sql, SQL migrace |
| Notifikace | tauri-plugin-notification |
| Testy | Vitest (TS), cargo test (Rust) |
| Kvalita | ESLint, Prettier, clippy, rustfmt |
| CI | GitHub Actions: lint + testy na každém PR, build pro Windows a Linux přes tauri-action při vydání |

**Známé problémy platformy:** na Hyprlandu / Waylandu může WebKit vykreslit prázdné okno. První krok je spustit s `WEBKIT_DISABLE_DMABUF_RENDERER=1`. Windows instalátor se staví na Windows runneru v CI, ne křížově z Linuxu.

## 10. Fáze implementace a výchozí data

Každá fáze končí spustitelnou verzí, zelenými testy a tagem verze.

| Fáze | Verze | Obsah (ID) |
| --- | --- | --- |
| 1 Kostra | 0.1.0 | Tauri + React projekt, sidebar, design tokeny, SQLite + migrační systém, tabulka settings, CI s lintem a testy |
| 2 Finance základ | 0.2.0 | FIN-01 až FIN-04, výchozí kategorie |
| 3 Návyky | 0.3.0 | HAB-01 až HAB-07, HAB-09, CALC-01 až CALC-06 |
| 4 Dnes + cíle | 0.4.0 | ONB-01 až ONB-04, DNE-01 až DNE-06, FIN-05 až FIN-10, HAB-10, CALC-07 až CALC-11 |
| 5 Dokončení | 1.0.0 | HAB-08, REV-01 až REV-03, NFR-05, NFR-06, release build Windows + Linux |

**Výchozí kategorie** (limit nastaví uživatel v ONB-02): Jídlo, Jídlo venku, Doprava, Auto a motorka, Sport a gym, Škola, Zábava, Předplatné, Oblečení, Ostatní. Příjmy: Práce / zakázky, Ostatní příjmy.

**Šablony návyků** (HAB-09)

| Šablona | Typ | Frekvence | Minimální verze |
| --- | --- | --- | --- |
| Spánek do 23:00 | ano/ne | denně | do 23:30 |
| Trénink | čas, 45 min | 4× týdně | 10 minut pohybu |
| Učení | čas, 90 min | Po–Čt | 15 minut |
| Čtení | počet, 10 stran | denně | 1 strana |
| Pitný režim | počet, 8 sklenic | denně | 4 sklenice |
| Den bez utrácení | automatický (HAB-10) | denně | – |
