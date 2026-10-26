import { useEffect, useRef, type SyntheticEvent } from "react";

/**
 * Native <dialog> as a React modal (plan F2, E9/E10): open on mount, focus the
 * element marked data-autofocus, Esc asks the parent to close (it unmounts us).
 * We listen to "cancel" (only Esc), not "close": close() in the cleanup below
 * would otherwise unmount the dialog right after StrictMode's second mount.
 */
export function useModalDialog(onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => dialog.close();
  }, []);

  function onCancel(event: SyntheticEvent) {
    event.preventDefault();
    onClose();
  }

  return { ref, onCancel };
}

export const dialogClass =
  "m-auto max-h-[calc(100vh-2rem)] w-[min(28rem,calc(100vw-2rem))] overflow-auto rounded-lg border border-border bg-surface p-6 text-text backdrop:bg-bg/80";
