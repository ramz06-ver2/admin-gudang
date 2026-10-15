import { useEffect, useRef, useState } from "react";
import {
  AutoComplete,
  Card,
  Input,
  Modal,
  Space,
  Steps,
  Tag,
  Typography,
} from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { Person, Workplace } from "../../types/entry";

const { Title, Text } = Typography;

interface Props {
  open: boolean;
  step: "workplace" | "person";
  title: string;
  placeholder: string;
  options: readonly (Person | Workplace)[];
  onSelect: (value: Person | Workplace) => void;
  onBack?: () => void;
  onClose: () => void;
}

const STEP_INDEX: Record<"workplace" | "person", number> = {
  workplace: 0,
  person: 1,
};

export const SetupWizard = ({
  open,
  step,
  title,
  placeholder,
  options,
  onSelect,
  onBack,
  onClose,
}: Props) => {
  const [keyword, setKeyword] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setKeyword("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, step]);

  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(keyword.trim().toLowerCase()),
  );

  const handleEnter = () => {
    if (filtered.length > 0) {
      onSelect(filtered[0]);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable
      maskClosable
      keyboard
      width={520}
      styles={{ body: { padding: 0 } }}
      style={{ top: 100 }}
    >
      <Card
        variant="borderless"
        style={{ borderRadius: 16 }}
        styles={{ body: { padding: 24 } }}
      >
        <Steps
          current={STEP_INDEX[step]}
          size="small"
          items={[{ title: "Lokasi" }, { title: "Nama" }]}
          style={{ marginBottom: 20 }}
        />

        <Title level={4} style={{ marginBottom: 4 }}>
          {title}
        </Title>
        <Text type="secondary">
          Ketik nama, lalu tekan <Tag>Enter</Tag> untuk memilih
        </Text>

        <div style={{ marginTop: 16 }}>
          <AutoComplete
            value={keyword}
            onChange={setKeyword}
            options={filtered.map((o) => ({
              value: o.name,
              label: o.name,
              data: o,
            }))}
            onSelect={(_, option) => {
              const data = (option as { data: Person | Workplace }).data;
              onSelect(data);
            }}
            style={{ width: "100%" }}
            placeholder={placeholder}
          >
            <Input
              ref={inputRef as never}
              size="large"
              prefix={<SearchOutlined />}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleEnter();
                } else if (e.key === "Escape" && onBack) {
                  e.preventDefault();
                  onBack();
                }
              }}
              autoFocus
            />
          </AutoComplete>
        </div>

        <Space style={{ marginTop: 16 }} size="small">
          <Tag>Enter</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            pilih item pertama
          </Text>
          {onBack && (
            <>
              <Tag>Esc</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                kembali
              </Text>
            </>
          )}
        </Space>
      </Card>
    </Modal>
  );
};
