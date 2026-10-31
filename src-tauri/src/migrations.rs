use tauri_plugin_sql::{Migration, MigrationKind};

/// Every file in `migrations/` must be listed here (checked by the test below).
/// Never edit a migration once committed: add a new file (plan F1, D2).
pub fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "settings",
            sql: include_str!("../migrations/0001_settings.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "finance",
            sql: include_str!("../migrations/0002_finance.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "default_categories",
            sql: include_str!("../migrations/0003_default_categories.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "habits",
            sql: include_str!("../migrations/0004_habits.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "recurring",
            sql: include_str!("../migrations/0005_recurring.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn every_migration_file_is_registered_in_order_with_its_content() {
        let dir = concat!(env!("CARGO_MANIFEST_DIR"), "/migrations");
        let mut files: Vec<(i64, String, String)> = fs::read_dir(dir)
            .expect("migrations dir")
            .map(|entry| {
                entry
                    .expect("dir entry")
                    .file_name()
                    .into_string()
                    .expect("utf-8 name")
            })
            .filter(|name| name.ends_with(".sql"))
            .map(|name| {
                let (number, rest) = name.split_once('_').expect("file name is NNNN_popis.sql");
                let sql = fs::read_to_string(format!("{dir}/{name}")).expect("readable migration");
                (
                    number.parse().expect("NNNN is a number"),
                    rest.trim_end_matches(".sql").to_owned(),
                    sql,
                )
            })
            .collect();
        files.sort();

        let registered: Vec<(i64, String, String)> = migrations()
            .iter()
            .map(|m| (m.version, m.description.to_owned(), m.sql.to_owned()))
            .collect();

        assert_eq!(registered, files);
    }
}
