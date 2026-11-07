// src/features/spb/hooks/useEditDocumentTitle.ts
import { useState, type MouseEvent } from "react";
import { message } from "antd";
import type { EditingTitleState } from "../types";
import { updateDocumentTitle } from "../useMonitoringSPB";
import { buildLocalTitleKey } from "../utils/titleOverrides";

export const useEditDocumentTitle = (
  allowEdit: boolean,
  onAfterSave?: () => void,
) => {
  const [editingTitle, setEditingTitle] = useState<EditingTitleState | null>(
    null,
  );
  const [titleInput, setTitleInput] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const [localTitles, setLocalTitles] = useState<Record<string, string>>({});

  const openEditModal = (
    e: MouseEvent,
    type: "spb" | "po",
    docNo: string,
    currentTitle?: string | null,
  ) => {
    if (!allowEdit) return;
    e.stopPropagation();
    const initial = currentTitle || "";
    setEditingTitle({ type, docNo, currentTitle: initial });
    setTitleInput(initial);
  };

  const closeEditModal = () => setEditingTitle(null);

  const handleSaveTitle = async () => {
    if (!editingTitle) return;
    setSavingTitle(true);
    const { type, docNo, currentTitle } = editingTitle;
    const trimmed = titleInput.trim();
    const localKey = buildLocalTitleKey(type, docNo, currentTitle);

    try {
      await updateDocumentTitle(type, docNo, trimmed, currentTitle);
      setLocalTitles((prev) => ({ ...prev, [localKey]: trimmed }));
      setEditingTitle(null);
      message.success(
        `Judul ${type.toUpperCase()} ${docNo} berhasil diperbarui`,
      );
      onAfterSave?.();
    } catch {
      setLocalTitles((prev) => ({ ...prev, [localKey]: trimmed }));
      setEditingTitle(null);
    } finally {
      setSavingTitle(false);
    }
  };

  return {
    editingTitle,
    titleInput,
    setTitleInput,
    savingTitle,
    localTitles,
    openEditModal,
    closeEditModal,
    handleSaveTitle,
  };
};

