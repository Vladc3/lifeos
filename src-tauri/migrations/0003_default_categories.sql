-- PRD kap. 10. Data, not schema (plan F2, E1). Colors are from src/lib/categoryColors.ts.
-- Limits stay 0 until the user sets them (FIN-03, ONB-02).
INSERT INTO categories (name, icon, color, kind) VALUES
  ('Jídlo', '🛒', '#22c55e', 'expense'),
  ('Jídlo venku', '🍽️', '#f59e0b', 'expense'),
  ('Doprava', '🚌', '#3b82f6', 'expense'),
  ('Auto a motorka', '🏍️', '#ef4444', 'expense'),
  ('Sport a gym', '🏋️', '#14b8a6', 'expense'),
  ('Škola', '🎓', '#a855f7', 'expense'),
  ('Zábava', '🎮', '#ec4899', 'expense'),
  ('Předplatné', '🔁', '#3b82f6', 'expense'),
  ('Oblečení', '👕', '#ec4899', 'expense'),
  ('Ostatní', '📦', '#8a8a8f', 'expense'),
  ('Práce / zakázky', '💼', '#22c55e', 'income'),
  ('Ostatní příjmy', '💰', '#14b8a6', 'income');
