import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { useEffect, useState } from "react";
import { cs } from "../../i18n/cs";

// SYS-02: the OS is the source of truth, nothing is stored in settings.
export function SettingsScreen() {
  const [autostart, setAutostart] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    isEnabled()
      .then(setAutostart)
      .catch(() => setFailed(true));
  }, []);

  async function toggleAutostart(next: boolean) {
    setFailed(false);
    try {
      await (next ? enable() : disable());
      setAutostart(await isEnabled());
    } catch {
      setFailed(true);
    }
  }

  return (
    <section className="space-y-3">
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          className="size-4 accent-success"
          checked={autostart ?? false}
          disabled={autostart === null}
          onChange={(event) => void toggleAutostart(event.target.checked)}
        />
        {cs.settings.autostart}
      </label>
      {failed && (
        <p role="alert" className="text-danger">
          {cs.settings.autostartError}
        </p>
      )}
    </section>
  );
}
