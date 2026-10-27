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
  habits: {
    add: "Přidat návyk (Ctrl+Shift+N)",
    empty: "Zatím tu nemáš žádný návyk. Začni šablonou nebo vlastním.",
    newHabit: "Nový návyk",
    editHabit: "Upravit návyk",
    template: "Šablona",
    noTemplate: "Vlastní návyk",
    name: "Název",
    icon: "Ikona (emoji)",
    identity: "Identita (kým chceš být)",
    type: "Typ",
    types: { check: "Ano/ne", count: "Počet", duration: "Čas (minuty)" },
    target: "Cíl",
    unit: "Jednotka",
    minValue: "Minimum (hodnota)",
    minVersion: "Minimální verze",
    frequency: "Frekvence",
    frequencies: {
      daily: "Denně",
      days: "Vybrané dny",
      weekly_count: "X× týdně",
    },
    weekdays: ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"],
    weeklyTarget: "Kolikrát týdně",
    anchor: "Kotva (po čem to udělám)",
    errors: {
      name: "Název musí mít 1–40 znaků.",
      icon: "Zadej ikonu, třeba emoji.",
      target: "Cíl musí být celé číslo větší než 0.",
      min: "Minimum musí být celé číslo větší než 0 a menší než cíl.",
      days: "Vyber aspoň jeden den.",
      weekly: "Kolikrát týdně: 1 až 7.",
    },
    limitNearest: (name: string, days: number) =>
      `Máš 3 budované návyky. Další přidáš, až se některý zaběhne. Nejblíž je ${name}: nejdřív za ${days} ${plural(days, ["den", "dny", "dní"])}.`,
    limitConsistency: (name: string) =>
      `Máš 3 budované návyky. Další přidáš, až se některý zaběhne. Nejblíž je ${name}: chybí mu konzistence 80 %.`,
    edit: "Upravit",
    pause: "Pozastavit",
    resume: "Pokračovat",
    archive: "Archivovat",
    restore: "Obnovit",
    paused: "pozastaveno",
    archivedList: "Archivované návyky",
    typeLocked: "Typ po založení nejde změnit.",
    frequencyWarning:
      "Změna frekvence přepočítá i minulé dny (série a konzistence). Uložit?",
    frequencyConfirm: "Uložit i tak",
    establishedNotice: (name: string) => `${name}: návyk je zaběhnutý 🎉`,
    pastRest: "Volno jde nastavit jen na dnešek a dál.",
    streak: (count: number, weeks: boolean) =>
      `${count} ${plural(count, weeks ? ["týden", "týdny", "týdnů"] : ["den", "dny", "dní"])}`,
    atRisk: "v ohrožení",
    established: "zaběhnutý",
    status: {
      done: "splnil",
      minimum: "minimum",
      missed: "vynechal",
      rest: "volno",
      pending: "čeká",
      unscheduled: "nenaplánováno",
    },
    cell: (habit: string, date: string, status: string) =>
      `${habit}, ${date}: ${status}`,
    matrix: "Měsíční matice návyků",
    value: (unit: string | null) => (unit ? `Hodnota (${unit})` : "Hodnota"),
    valueTitle: (habit: string, date: string) => `${habit} · ${date}`,
    valueHint: "0 záznam smaže. Pravý klik nebo Shift+Enter na buňce.",
    valueError: "Zadej celé číslo 0 nebo větší.",
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

// Czech plural: forms for 1, 2–4 and 0 / 5 and more.
function plural(count: number, [one, few, many]: [string, string, string]) {
  const rule = new Intl.PluralRules("cs").select(count);
  return rule === "one" ? one : rule === "few" ? few : many;
}
