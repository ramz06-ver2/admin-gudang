// src/features/spb/components/EditDocumentTitleModal.tsx
import { Input, Modal } from "antd";
import type { EditingTitleState } from "../types";

export interface EditDocumentTitleModalProps {
  editingTitle: EditingTitleState | null;
  titleInput: string;
  onTitleInputChange: (val: string) => void;
  savingTitle: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export const EditDocumentTitleModal = ({
  editingTitle,
  titleInput,
  onTitleInputChange,
  savingTitle,
  onCancel,
  onSave,
}: EditDocumentTitleModalProps) => (
  <Modal
    title={
      editingTitle
        ? `Edit Judul ${editingTitle.type.toUpperCase()} ${editingTitle.docNo}`
        : "Edit Judul"
    }
    open={!!editingTitle}
    onCancel={onCancel}
    onOk={onSave}
    okText="Simpan"
    cancelText="Batal"
    confirmLoading={savingTitle}
    destroyOnHidden
  >
    <Input
      placeholder="Masukkan judul baru..."
      value={titleInput}
      onChange={(e) => onTitleInputChange(e.target.value)}
      onPressEnter={onSave}
      aria-label="Input Judul Dokumen"
      autoFocus
    />
  </Modal>
);

