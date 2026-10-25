# Plán: Fáze 1 – Kostra (0.1.0)

**Stav:** schváleno vlastníkem 2026-10-25 · prošel dev-team review (PM, Architect, Dev, QA) a 2 koly council (v2: 7/7/7 → v3: 9/9/8,5, žádné otevřené must-fix)

**Zdroj:** `docs/PRD.md` v0.4, kap. 10, fáze 1 · **Větev:** `feat/phase1-kostra` · **Složitost:** Large (pro začátečníka)
**ID ve fázi:** NFR-09, SYS-01, SYS-02, SYS-03 (nový), PUB-01 až PUB-03, Q4 + kostra (Tauri + React, sidebar, design tokeny, SQLite + migrace, tabulka settings, CI s lintem a testy)
**Mimo fázi 1:** instalátory a release workflow (fáze 6), položka „Nový výdaj“ v liště (fáze 2), časovač check-inů (fáze 5), PUB-04/05.

## Shrnutí

Spustitelná prázdná app: okno se sidebarem a 6 prázdnými moduly, tmavé tokeny, SQLite s migracemi a tabulkou `settings`, běh v liště, jedna instance, autostart a CI na Linuxu i Windows. Vývojová a reálná data jsou oddělená od prvního dne: výchozí konfigurace je vývojová, reálnou dává jen `npm run build:release`. Fáze rozhodne Q4 (jak testovat SQL).

## Ověřená fakta (2026-10-25)

| Fakt | Důkaz |
| --- | --- |
| Rust NENÍ nainstalovaný | `rustc: command not found` |
| Node 26.7.0, npm 11.19, webkit2gtk-4.1 2.52.6, libayatana-appindicator 0.6.0 | `node -v`, `pacman -Q` |
| Tray i notifikace obsluhuje quickshell (Omarchy) | `busctl --user status org.kde.StatusNotifierWatcher` → quickshell |
| XDG autostart funguje (uwsm) | `wayland-session-xdg-autostart@hyprland.desktop.target` active |
| `node:sqlite` funguje ve Vitest 3.2.7, UNIQUE se vynucuje, SQLite 3.53.4 | spike prošel |
| `node:sqlite` neumí poziční `$1` jako pole, umí pojmenované `{ $1: v }` | spike |
| tauri-plugin-sql ukládá SQLite do `app_config_dir` | zdroj pluginu `wrapper.rs` |
| tauri-plugin-sql: pool spojení bez WAL a busy_timeout → 2 procesy = `SQLITE_BUSY`; oddělené `execute()` nemají zaručené stejné spojení | zdroj pluginu |
| sqlx zapíná `foreign_keys` ve výchozím stavu; `app.exit()` obchází `CloseRequested`; `Database` jde přiřadit do typu s generickým `select`; `generate_context!` potřebuje existující `dist/` | ověřeno při review |
| Na Linuxu tray neposílá událost kliknutí na ikonu, jen menu | Tauri docs |
| autostart plugin pojmenuje záznam podle productName a registruje právě běžící exe (u AppImage cestu z `APPIMAGE`) | zdroj pluginu |
| Binárka z `tauri dev` načítá `devUrl` (Vite), takže bez běžícího Vite ukáže chybu připojení. `tauri build --debug --no-bundle` má assety uvnitř | review |
| Na Hyprlandu nejde spolehlivě převzít fokus okna z jiného procesu (xdg-activation) | review |
| Git na Windows mění konce řádků na CRLF, což mění bajty v `include_str!` i kontrolní součty sqlx | review |

## Změny PRD ke schválení (schválením plánu se zapíšou do PRD v0.5)

| # | Změna | Proč |
| --- | --- | --- |
| A1 | NFR-03: data v `app_config_dir` (Linux `~/.config/<identifier>`, Windows `%APPDATA%\<identifier>`) | Plugin-sql cestu pevně určuje. Pořád Tauri adresář, žádná cesta natvrdo |
| A2 | PUB-03: oddělení přes identifier místo `life-os-dev.db`. Výchozí `tauri.conf.json` je vývojový (`io.github.vladc3.lifeos.dev`, „Life OS Dev“), takže `npm run tauri dev` i obyčejný `tauri build` jsou bezpečné. Reálná verze vzniká jen přes `npm run build:release` s `tauri.release.conf.json` (`io.github.vladc3.lifeos`, „Life OS“) | Jedna změna oddělí složku dat, autostart záznam i single-instance. Reálné používání může začít kdykoli, demo data z PUB-04 půjdou vždy do dev složky |
| A3 | Bez klíče `settings.autostart`, zdroj pravdy je OS (`isEnabled()`) | Dva zdroje pravdy by se rozjely |
| A4 | Nový SYS-03: jen jedna běžící instance, druhé spuštění ukáže okno první | Pool bez busy_timeout, autostart + ruční spuštění = 2 procesy nad jednou DB |
| A5 | Q6: oddělená volání `execute()` nejsou bezpečná pro transakce (pool). Atomické zápisy (CALC-11, NFR-05) vyřeší plán fáze 4. Nová Q7: kde běží časovač check-inů (fáze 5) | Spike by dal falešně zelený výsledek, sekvenční volání obvykle dostanou stejné spojení |
| A6 | SYS-01 po fázích: lišta, menu Otevřít/Ukončit a zavření = skrytí ve fázi 1, „Nový výdaj“ ve fázi 2 (s FIN-01), časovač ve skrytém okně ve fázi 5 (s HAB-07) | Položky závisí na funkcích, které ve fázi 1 ještě nejsou |

## Rozhodnutí

| # | Rozhodnutí | Proč |
| --- | --- | --- |
| D1 (Q4) | SQL testy ve Vitest proti `node:sqlite` v paměti. Testovací DB aplikuje `.sql` soubory z `src-tauri/migrations/` seřazené podle čísla. Adaptér převádí poziční parametry na `{ $1, $2 }` | Stdlib, žádná nová závislost. Testuje skutečné SQL z `src/db` |
| D2 | Migrace jsou soubory `NNNN_popis.sql` s LF konci řádků (`.gitattributes`: `*.sql text eol=lf`). Rust je registruje přes `include_str!` ve funkci `migrations()`. Pojistky: (a) `cargo test` ověří, že `migrations()` = soubory ve složce (verze, pořadí); (b) Vitest test `migrations.lock.test.ts` porovná SHA-256 (`node:crypto`) každé migrace se zamčeným `src-tauri/migrations/lock.json` a selže, když se zamčená migrace změní nebo nová chybí v zámku | (a) zapomenutá registrace = chybějící tabulky a testy přesto zelené. (b) sqlx odmítne spustit app, když se aplikovaná migrace změní. Běží v `npm test` na Linuxu i Windows |
| D3 | `tauri-plugin-single-instance` jako první plugin. Druhé spuštění zavolá `show` + `unminimize` + `set_focus` | SYS-03 |
| D4 | Tray z jádra Tauri (feature `tray-icon`). Menu: Otevřít, Ukončit. Zavření okna = `prevent_close` + `hide`. Ukončit = `app.exit(0)` | SYS-01 (A6). Na Linuxu klik na ikonu nefunguje, proto „Otevřít“ v menu |
| D5 | `tauri-plugin-autostart`, capability `autostart:default`. Přepínač v placeholderu Nastavení. Po spuštění se ukáže okno na modulu Dnes | SYS-02 |
| D6 | Navigace bez routeru: `useState` modulu, výchozí Dnes, Ctrl+1–6. Mapování zkratek jako čistá funkce `src/lib/shortcuts.ts` | 6 obrazovek bez URL |
| D7 | Inter přes `@fontsource-variable/inter` (nová závislost) | NFR-02 offline, licence OFL je v balíčku |
| D8 | Tailwind v4 přes `@tailwindcss/vite`, tokeny v CSS `@theme`. API ověřit v Context7 při úkolu | PRD stack |
| D9 | `src/i18n/cs.ts` jako obyčejný `as const` objekt, bez knihovny | NFR-09 |
| D10 | Repozitáře dostávají typ `Db` (`select`, `execute`). V app je to instance `Database` z plugin-sql přiřazená do proměnné typu `Db`, takže rozjetí typů zachytí `tsc`. V testech adaptér nad `node:sqlite`. Transakce zatím nejsou (A5) | Jeden kód, dvě prostředí, kontrola zdarma |
| D11 | CI `ci.yml` od T3, na každý push a PR. Oba joby: `actions/setup-node` s `node-version-file: .nvmrc` (výchozí Node runneru nemá `node:sqlite`). Job web (ubuntu): `npm ci`, `npm run lint`, `npm test`. Job rust (matice ubuntu + windows, `Swatinem/rust-cache`): `npm ci && npm test && npm run build` (testy i na Windows, `dist/` pro `generate_context!`), `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test`. Ubuntu: oficiální Tauri prerekvizity (`libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev libxdo-dev libssl-dev build-essential`) | Windows se ověřuje průběžně. Veřejné repo = minuty zdarma |

**Nové závislosti:** `tauri-plugin-sql` (feature sqlite), `tauri-plugin-single-instance`, `tauri-plugin-autostart` + JS `@tauri-apps/plugin-sql`, `@tauri-apps/plugin-autostart`, `@fontsource-variable/inter`. Dev: `vitest`, `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `prettier`, `tailwindcss`, `@tailwindcss/vite`. Každá kvůli konkrétnímu ID výše.

## Úkoly

| # | Úkol | Ověření |
| --- | --- | --- |
| T0 | Rust: `sudo pacman -S rustup && rustup default stable` | `rustc -V`, `cargo -V` |
| T1 | Větev `feat/phase1-kostra`. `create-tauri-app` (react-ts, npm) do dočasné složky (do neprázdné odmítne), přesun do repa, ruční sloučení `.gitignore` a README. Cargo balíček `life-os`. `tauri.conf.json`: identifier `io.github.vladc3.lifeos.dev`, productName „Life OS Dev“, okno min. 1024 × 680. `tauri.release.conf.json`: identifier `io.github.vladc3.lifeos`, productName „Life OS“. Skript `build:release` = `tauri build --config src-tauri/tauri.release.conf.json --no-bundle` (v Context7 ověřit, vůči čemu se cesta `--config` řeší) | `npm run tauri dev` otevře okno (Hyprland: případně `WEBKIT_DISABLE_DMABUF_RENDERER=1`); `npm run build:release` vytvoří `src-tauri/target/release/life-os`; `git status` neukáže přepsané docs/, CLAUDE.md, LICENSE |
| T2 | Nástroje: TS strict, ESLint flat config, Prettier s `.prettierignore` pro `docs/` a `CLAUDE.md`, `.nvmrc` = 26. Skripty: `lint` = `tsc --noEmit && eslint . && prettier --check .` (šablona create-tauri-app má v `tsconfig.json` `include: ["src"]`; `tsc -b` by kvůli `composite` v `tsconfig.node.json` mohl vygenerovat `vite.config.js`, který by Vite upřednostnil), `test` = `vitest run` | `npm run lint` a `npm test` projdou; schválně rozbitý typ v `src/` → `npm run lint` selže, pak vrátit (důkaz, že `tsc` opravdu kontroluje `src`) |
| T3 | CI (D11), push větve, draft PR | `gh pr checks` zelené na ubuntu i windows |
| T4 | D2: `.gitattributes`, `0001_settings.sql` (`settings(id INTEGER PRIMARY KEY, key TEXT NOT NULL UNIQUE, value TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`), `migrations()` v Rustu, test registrace (nejdřív červený: soubor bez registrace), `lock.json` + `migrations.lock.test.ts` (nejdřív červený: chybí zámek). Před prvním `cargo test` jednou `npm run build` | `cargo test` a `npm test` červeně → zeleně; pokusná úprava `0001` → `npm test` selže, pak vrátit |
| T5 | TDD D1 + D10: `src/db/testDb.ts`, `settings.test.ts`: chybějící klíč → null, set/get, přepis (upsert `ON CONFLICT(key) DO UPDATE`), hodnota s apostrofem a `'; DROP TABLE settings; --`, `PRAGMA foreign_keys` = 1. Pak `settings.ts` | `npm test` červeně, pak zeleně |
| T6 | `src/db/index.ts`: `Database.load('sqlite:life-os.db')` do proměnné typu `Db`, capability `sql:default` + `sql:allow-execute`. Když DB selže, app ukáže chybovou hlášku z `cs.ts` místo bílé obrazovky | K2, K3 |
| T7 | Tokeny z PRD kap. 8 v `@theme`, Inter, `tabular-nums`, viditelný fokus (NFR-08) | `npm run lint`; screenshot |
| T8 | `src/i18n/cs.ts`: názvy modulů, texty kostry, chybová hláška DB | `npm run lint` |
| T9 | Shell: sidebar 6 modulů, placeholdery v `src/features/<modul>/`, výchozí Dnes, Ctrl+1–6. TDD `shortcuts.test.ts`: Ctrl+1 → Dnes … Ctrl+6 → Nastavení, Ctrl+7 / bez Ctrl / Ctrl+Shift+1 → null | `npm test` červeně → zeleně; K4 |
| T10 | SYS-01 + SYS-03: tray (feature `tray-icon`), menu, zavření = skrytí, Ukončit = `app.exit(0)`, single-instance | K5 |
| T11 | SYS-02: autostart plugin, `autostart:default`, přepínač v Nastavení | K6 |
| T12 | Dokumentace: README (spuštění na Linuxu a Windows, `build:release` pro reálné používání, Hyprland: WEBKIT proměnná, tray potřebuje SNI host, autostart potřebuje XDG autostart nebo `exec-once`), PRD v0.5 (A1–A6), CLAUDE.md (příkaz `build:release`), `docs/learning.md` | review diffu |
| T13 | PR z draftu na ready, merge, tag `v0.1.0` | CI zelené na `main`, `git tag` |

## Kontrolní seznam (ruční, s očekávaným výsledkem)

`BIN` = `src-tauri/target/debug/life-os` z `npm run tauri build -- --debug --no-bundle` (assety uvnitř, dev identifier). `npm run tauri dev` zapisuje do stejného souboru verzi, která načítá Vite, proto K5 a K6 dělej hned po sestavení `BIN` a mezi zapnutím autostartu a odhlášením `tauri dev` nespouštěj. `DEV` = `~/.config/io.github.vladc3.lifeos.dev`, `REAL` = `~/.config/io.github.vladc3.lifeos`.

| # | Kontrola | Příkaz / postup | Očekávaný výsledek |
| --- | --- | --- | --- |
| K0 | Před K1 a K2 | aspoň jednou spustit `npm run tauri dev`, aby vznikla `$DEV/life-os.db` | soubor existuje |
| K1 | Dev nesahá na reálná data, release nesahá na dev (PUB-03) | 1) `ls -d $REAL` → spustit `npm run tauri dev` → zavřít → `ls -d $REAL`. 2) `stat -c %Y $DEV/life-os.db` → `npm run build:release` a spustit `src-tauri/target/release/life-os` → Ukončit → znovu `stat` | 1) `$REAL` neexistuje před ani po. 2) `$REAL/life-os.db` vznikl, čas změny `$DEV/life-os.db` se nezměnil |
| K1b | DB se necommituje (PUB-02) | `git check-ignore -v life-os.db` | vypíše pravidlo `*.db` |
| K2 | DB a migrace | `sqlite3 $DEV/life-os.db '.tables' 'select version from _sqlx_migrations'` | `_sqlx_migrations settings`, verze `1` |
| K3 | Chybový stav DB | `npm run dev` (jen Vite) v prohlížeči přes chrome-devtools: plugin chybí → DB selže | chybová hláška z `cs.ts`, žádná bílá obrazovka, v konzoli jen ta očekávaná chyba |
| K4 | Shell | v app: Ctrl+1–6 přepínají moduly, Tab ukazuje fokus, okno nejde zmenšit pod 1024 × 680 | vše platí |
| K5 | Lišta a jedna instance | spustit `BIN` → zavřít okno → `pgrep -xc life-os` = 1 a ikona v liště; menu Otevřít → okno zpět; spustit `BIN` znovu z druhého terminálu → `pgrep -xc life-os` pořád 1 a okno je vidět (na Windows i zaostřené); menu Ukončit → `pgrep -xc life-os` = 0 | vše platí |
| K6 | Autostart | v `BIN` přepínač zapnout → `~/.config/autostart/Life OS Dev.desktop` existuje a ukazuje na `BIN`; odhlásit a přihlásit → app naběhne s oknem na Dnes; přepínač vypnout → soubor zmizí | vše platí, na konci žádný záznam Life OS v `~/.config/autostart` |

Autostart instalované verze (AppImage, Windows Run klíč) se ověří ve fázi 6 s instalátory.

## Validace (Definice hotovo)

```bash
npm run lint && npm test
cd src-tauri && cargo test && cargo clippy -- -D warnings && cargo fmt --check
npm run tauri dev   # okno naběhne bez chyb v konzoli
# + kontrolní seznam K1–K6
gh pr checks        # ubuntu i windows zelené
```

## Rizika

| Riziko | Pravděpodobnost | Zmírnění |
| --- | --- | --- |
| Prázdné okno na Hyprlandu (WebKit DMABUF) | Střední | `WEBKIT_DISABLE_DMABUF_RENDERER=1`, do README |
| Windows build selže (MSVC, cesty) | Střední | CI matice od T3, chyba se ukáže u úkolu, který ji způsobil |
| `node:sqlite` a sqlx se liší chováním | Nízká | Jen standardní SQL, `foreign_keys` zapnuté na obou stranách |
| Začátečník se zasekne na Rustu | Střední | Rustu je minimum (`lib.rs`), každý kus s vysvětlením a odkazem `soubor:řádek` |
| Skrytý webview může brzdit JS časovače (fáze 5) | Neznámá | Q7, rozhodne se ve fázi 5. „Skrýt, ne zavřít“ platí v obou variantách |

## Akceptace

- [ ] Kostra: okno, sidebar 6 modulů, výchozí Dnes, Ctrl+1–6, tokeny, Inter, viditelný fokus, min. 1024 × 680 (K4)
- [ ] SQLite + migrace + `settings` + repozitář s testy, Q4 rozhodnuto, obě pojistky migrací (T4, T5, K2)
- [ ] NFR-09: texty kostry jen v `cs.ts`
- [ ] SYS-01 v rozsahu A6, SYS-03 jedna instance (K5)
- [ ] SYS-02 autostart přepínač, ověřeno na Hyprlandu (K6)
- [ ] PUB-01 README, PUB-02 (K1b), PUB-03 dev i release strana (K1)
- [ ] CI zelené na ubuntu i windows, PRD v0.5 s A1–A6, tag v0.1.0

## Odpovědi vlastníka

1. Identifier `io.github.vladc3.lifeos`: schváleno.
2. Windows: vlastník má Windows počítač. Ve fázi 6 proběhne K5 a K6 ručně i na Windows (zaostření okna, Run klíč autostartu).
