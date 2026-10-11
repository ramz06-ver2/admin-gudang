import { describe, it, expect, vi } from "vitest";
import { renderHook, fireEvent } from "@testing-library/react";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";

describe("useKeyboardShortcut", () => {
  it("memanggil handler saat tombol cocok", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcut({ key: " ", handler }));

    fireEvent.keyDown(window, { key: " " });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("TIDAK memanggil saat tombol beda", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcut({ key: " ", handler }));

    fireEvent.keyDown(window, { key: "a" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("ctrl modifier harus cocok", () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcut({ key: "k", ctrlKey: true, handler }),
    );

    fireEvent.keyDown(window, { key: "k" });
    expect(handler).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("ignoreInputs=true skip saat fokus di input", () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcut({ key: " ", ignoreInputs: true, handler }),
    );

    const input = document.createElement("input");
    document.body.appendChild(input);

    fireEvent.keyDown(input, { key: " " });
    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it("enabled=false tidak memasang listener", () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcut({ key: " ", enabled: false, handler }),
    );

    fireEvent.keyDown(window, { key: " " });
    expect(handler).not.toHaveBeenCalled();
  });
});

