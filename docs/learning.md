# Co jsem se naučil

Zápisky po každé fázi. Krátce: co, proč, kde v kódu.

## Fáze 1 – Kostra (0.1.0)

1. **Test, který nejdřív selže, dokazuje, že něco hlídá.** Zámek migrací (`src/db/migrations.lock.test.ts`) jsem nejdřív pustil bez zámku (červeně), pak se zámkem (zeleně) a pak schválně upravil migraci (zase červeně). Teprve tím je jisté, že test opravdu chrání pravidlo „migraci nikdy neupravuj“.
2. **Konfigurace může chránit data líp než podmínky v kódu.** Vývojová a reálná verze mají jiný identifier (`src-tauri/tauri.conf.json` vs. `tauri.release.conf.json`), takže mají jinou složku s daty, jiný záznam v autostartu a jinou „jednu instanci“. Žádné `if (dev)` v kódu, nejde to omylem obejít.
3. **Ověřuj na stroji, ne v hlavě.** `node:sqlite` neumí `$1` jako pole (zjištěno spikem), Ctrl+1 na české klávesnici posílá `+` (proto `event.code` v `src/lib/shortcuts.ts`), Hyprland 0.56 má nový zápis `hyprctl dispatch` v Lua. Každá z těch věcí by jinak byla chyba, kterou by testy nenašly.
