# Life OS

Lokální desktop app (Tauri 2 + React + TypeScript + SQLite) pro návyky a osobní finance. Jeden uživatel, offline, Windows + Linux (Omarchy / Hyprland).

## Zdroj pravdy

- Specifikace: `docs/PRD.md`. Nečti ji celou, jen sekci, která se týká aktuální featury.
- Požadavky mají ID (HAB-03, FIN-10, CALC-03). Uváděj je v plánech, názvech testů a commitech.
- Schválené plány ukládej do `docs/plans/<id>-<nazev>.md`.
- Když PRD něco neříká nebo si odporuje, zeptej se. Nehádej.

## Příkazy

- `npm run tauri dev` – spuštění aplikace
- `npm test` – Vitest
- `npm run lint` – ESLint + Prettier check
- `cd src-tauri && cargo test && cargo clippy -- -D warnings && cargo fmt --check`

## Struktura

- `src/lib/` – čistá byznys logika (`streaks.ts`, `dailyLimit.ts`, `goals.ts`), testy vedle jako `*.test.ts`
- `src/features/<modul>/` – UI komponenty modulu (today, habits, finance, review, settings)
- `src/db/` – přístup k SQLite (repozitáře)
- `src-tauri/migrations/` – SQL migrace, číslované

## Pravidla kódu

- TypeScript strict, žádné `any`.
- Výpočty z PRD sekce „Výpočty a pravidla“ jsou jen v `src/lib` jako čisté funkce. Dnešní datum se předává parametrem, nikdy `new Date()` uvnitř logiky.
- Peníze jsou vždy celé číslo v haléřích (INTEGER), nikdy float. Formátování až v UI (`1 234 Kč`).
- Data jako `YYYY-MM-DD` v lokálním čase, týden začíná pondělí.
- Změna schématu = nová migrace. Existující migraci nikdy neupravuj.
- SQL jen s parametry, nikdy skládáním stringů.
- Žádné cesty natvrdo, jen Tauri app data dir. Vše musí fungovat na Windows i Linuxu.
- Žádná síťová volání a telemetrie.
- Novou závislost přidej jen se zdůvodněním v plánu.
- Testy nikdy nemaž ani neoslabuj jen proto, aby prošly.

## Definice hotovo

`npm test`, `npm run lint` a `cargo clippy` projdou, app se spustí přes `npm run tauri dev` a splněná jsou akceptační kritéria z PRD.

## Workflow

- Jedna featura = jedna větev `feat/<id>-<nazev>`.
- Nejdřív plán, pak schválení, pak implementace test-first.
- Conventional Commits s ID, např. `feat(habits): HAB-03 měsíční matice`.

## Uživatel se učí

Uživatel je začátečník a projekt je jeho učební projekt. Po každé featuře stručně vysvětli 3 nejdůležitější věci, které jsi použil, a navrhni zápis do `docs/learning.md`.
