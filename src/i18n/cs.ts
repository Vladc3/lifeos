import type { ModuleId } from "../lib/shortcuts";

// All UI text lives here (NFR-09), so English can be added after 1.0.
export const cs = {
  appName: "Life OS",
  nav: "Moduly",
  modules: {
    today: "Dnes",
    habits: "Návyky",
    finance: "Finance",
    goals: "Cíle",
    review: "Review",
    settings: "Nastavení",
  } satisfies Record<ModuleId, string>,
  placeholder: "Tenhle modul přijde v některé z dalších fází.",
  dbError: "Databázi se nepodařilo otevřít.",
  settings: {
    autostart: "Spouštět po přihlášení",
    autostartError: "Spouštění po přihlášení teď nejde zjistit ani změnit.",
  },
} as const;
