import { useEffect } from "react";

interface UseKeyboardShortcutOptions {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  enabled?: boolean;
  preventDefault?: boolean;
  /** Jika true, shortcut diabaikan saat user sedang mengetik di input/textarea */
  ignoreInputs?: boolean;
  handler: (event: KeyboardEvent) => void;
}

const isEditableElement = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    el.isContentEditable
  );
};

export const useKeyboardShortcut = ({
  key,
  ctrlKey = false,
  shiftKey = false,
  altKey = false,
  metaKey = false,
  enabled = true,
  preventDefault = true,
  ignoreInputs = false,
  handler,
}: UseKeyboardShortcutOptions) => {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== key) return;
      if (event.ctrlKey !== ctrlKey) return;
      if (event.shiftKey !== shiftKey) return;
      if (event.altKey !== altKey) return;
      if (event.metaKey !== metaKey) return;
      if (ignoreInputs && isEditableElement(event.target)) return;

      if (preventDefault) event.preventDefault();
      handler(event);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    key,
    ctrlKey,
    shiftKey,
    altKey,
    metaKey,
    enabled,
    preventDefault,
    ignoreInputs,
    handler,
  ]);
};