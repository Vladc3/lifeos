# Co jsem se naučil

Zápisky po každé fázi. Krátce: co, proč, kde v kódu.

## Fáze 1 – Kostra (0.1.0)

1. **Test, který nejdřív selže, dokazuje, že něco hlídá.** Zámek migrací (`src/db/migrations.lock.test.ts`) jsem nejdřív pustil bez zámku (červeně), pak se zámkem (zeleně) a pak schválně upravil migraci (zase červeně). Teprve tím je jisté, že test opravdu chrání pravidlo „migraci nikdy neupravuj“.
2. **Konfigurace může chránit data líp než podmínky v kódu.** Vývojová a reálná verze mají jiný identifier (`src-tauri/tauri.conf.json` vs. `tauri.release.conf.json`), takže mají jinou složku s daty, jiný záznam v autostartu a jinou „jednu instanci“. Žádné `if (dev)` v kódu, nejde to omylem obejít.
3. **Ověřuj na stroji, ne v hlavě.** `node:sqlite` neumí `$1` jako pole (zjištěno spikem), Ctrl+1 na české klávesnici posílá `+` (proto `event.code` v `src/lib/shortcuts.ts`), Hyprland 0.56 má nový zápis `hyprctl dispatch` v Lua. Každá z těch věcí by jinak byla chyba, kterou by testy nenašly.

## Fáze 2 – Finance základ (0.2.0)

1. **Test musí selhat ze správného důvodu.** Testy schématu „DB odmítne částku 0“ nejdřív prošly, ale jen proto, že tabulka ještě neexistovala (chyba „no such table“). Teprve `toThrow(/constraint failed/)` je přinutil selhat kvůli pravidlu (`src/db/finance.schema.test.ts`). Stejně tak schválně zanesená chyba (výpočet přes float) ukázala, že testy částek opravdu hlídají `0,29` (`src/lib/money.test.ts`).
2. **Testy a app můžou běžet na jiné verzi stejné knihovny.** App používá SQLite 3.46 (zabalený v sqlx), testy 3.53 (Node). Zjištěno v `Cargo.lock`, proto se migrace ověřily i spuštěním app. A pozor na `NULL` v SQL: `CHECK (date(date) = date)` by pustil „26.10.2026“, protože `date()` vrátí NULL a CHECK NULL propustí. Proto `IS` (`src-tauri/migrations/0002_finance.sql`).
3. **Událost se může ztratit, uložený stav ne.** Kliknutí na „Nový výdaj“ hned po startu by poslalo událost dřív, než ji JS poslouchá. Rust si proto kliknutí uloží a frontend si ho vyzvedne (`src-tauri/src/lib.rs`, `NewExpenseRequested`; `src/App.tsx`). Ověřeno kliknutím přes D-Bus 4,5 s po startu.

## Fáze 4 – Finance a cíle (0.4.0)

1. **Mutace najdou díry, které zelené testy schovají.** U vkladů prošly všechny testy, ale kdyby `deleteDeposit` smazal všechny vklady, žádný by to nechytil. Testy doplněné v `src/db/goals.test.ts`. Pozor na mutace, které nic nezmění: `OR IGNORE` přežil jen proto, že pojistka `NOT EXISTS` zůstala v kódu.
2. **Když jeden příkaz stačí, transakce není potřeba.** Pool spojení v plugin-sql neumí bezpečné `BEGIN`/`COMMIT`. Podmíněný `INSERT` a trigger zapíší transakci i běh naráz (`src-tauri/migrations/0005_recurring.sql`, `src/db/recurring.ts`).
3. **Výpočet je potřeba zkusit na celý měsíc, ne na jeden den.** Rezervace nájmu fungovala do jeho dne, pak by limit ukázal −6 500 Kč. Oprava: vygenerované výdaje od dneška zůstávají v rezervaci (`src/db/dailyLimit.ts`). Rada našla chyby až přepočtem konkrétních dnů.

## Fáze 3 – Návyky (0.3.0)

1. **Výstup mutace si přečti, než něco napíšeš.** Commit `2ba0de6` tvrdil „mutace P6 chycena“, ale s rozbitým kódem prošly všechny testy. Přeskočený týden mezi úspěchy dává stejnou sérii jako vynechaný, takže testy rozdíl neviděly. Pomohl až test, kde přeskočený týden sousedí s vynechaným (`src/lib/habits.test.ts`, „a skipped week next to a miss“).
2. **Jeden zdroj pravdy pro výpočty.** `dayStatuses` určuje stav každého dne a série, konzistence i fáze čtou jen z něj (`src/lib/habits.ts`). „Nikdy dvakrát“ je jedna funkce `neverTwice` pro dny i týdny.
3. **Ověř knihovnu ve zdroji, ne odhadem.** Jestli sqlx páruje `$1` podle čísla, nebo podle pořadí výskytu, rozhodl kód `sqlx-sqlite/src/arguments.rs` (podle čísla). Testy na `node:sqlite` by chybu v pořadí nenašly.
