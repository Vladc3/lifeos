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
    tabs: { finance: "Rozpočet a kategorie", system: "Systém" },
    autostart: "Spouštět po přihlášení",
    autostartError: "Spouštění po přihlášení teď nejde zjistit ani změnit.",
    budget: "Celkový měsíční rozpočet (Kč)",
    budgetHint: "Prázdné = rozpočet nenastavený.",
    budgetSaved: "Uloženo.",
    budgetError: "Rozpočet musí být kladná částka, nejvýš 2 desetinná místa.",
    categories: "Kategorie",
    expenseCategories: "Výdaje",
    incomeCategories: "Příjmy",
    archivedCategories: "Archivované",
    addCategory: "Přidat kategorii",
    newCategory: "Nová kategorie",
    editCategory: "Upravit kategorii",
    name: "Název",
    icon: "Ikona (emoji)",
    color: "Barva",
    kind: "Typ",
    limit: "Měsíční limit (Kč)",
    limitHint: "Prázdné = bez limitu.",
    noLimit: "bez limitu",
    edit: "Upravit",
    archive: "Archivovat",
    restore: "Obnovit",
    delete: "Smazat",
    errors: {
      name: "Zadej název.",
      icon: "Zadej ikonu, třeba emoji.",
      color: "Vyber barvu.",
      budget: "Limit musí být kladná částka, nejvýš 2 desetinná místa.",
      nameTaken: "Aktivní kategorie s tímto názvem už existuje.",
      inUse: "Kategorie má transakce, smazat ji nejde. Můžeš ji archivovat.",
    },
    kindChange: (count: number) =>
      `Změní se i ${count} ${transactionsWord(count)} této kategorie. Pokračovat?`,
    kindChangeConfirm: "Pokračovat",
  },
  money: {
    expense: "Výdaj",
    income: "Příjem",
  },
  finance: {
    previousMonth: "Předchozí měsíc",
    nextMonth: "Další měsíc",
    budget: "Rozpočet měsíce",
    budgetTotal: "Celkem",
    budgetNotSet: "Celkový rozpočet není nastavený.",
    budgetOpenSettings: "Nastavit v Nastavení",
    spentOf: (spent: string, limit: string) => `${spent} z ${limit}`,
    noCategoryLimits:
      "Žádná kategorie nemá limit. Limity nastavíš v Nastavení → Kategorie.",
    transactions: "Transakce",
    filter: "Kategorie",
    allCategories: "Všechny kategorie",
    empty: "V tomto měsíci tu nejsou žádné transakce.",
    newTransaction: "Nová transakce (Ctrl+N)",
    edit: "Upravit",
    delete: "Smazat",
    confirmDelete: "Opravdu smazat?",
    cancel: "Zrušit",
  },
  transactionDialog: {
    titleNew: "Nová transakce",
    titleEdit: "Upravit transakci",
    amount: "Částka (Kč)",
    kind: "Typ",
    category: "Kategorie",
    date: "Datum",
    note: "Poznámka",
    save: "Uložit",
    cancel: "Zrušit",
    errors: {
      amount: "Zadej částku větší než 0, nejvýš 2 desetinná místa.",
      category: "Vyber kategorii.",
      date: "Zadej platné datum.",
    },
  },
  loadError: "Data se nepodařilo načíst.",
  saveError: "Uložení se nepovedlo.",
} as const;

// "1 transakce", "3 transakce", "5 transakcí"
function transactionsWord(count: number): string {
  return new Intl.PluralRules("cs").select(count) === "other"
    ? "transakcí"
    : "transakce";
}
