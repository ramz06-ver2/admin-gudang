import { useEffect, useRef, useState } from "react";
import {
  AutoComplete,
  Button,
  Card,
  Input,
  Modal,
  Space,
  Steps,
  Tag,
  Typography,
} from "antd";
import { SearchOutlined, UserOutlined, EnvironmentOutlined } from "@ant-design/icons";
import type { Person, Workplace } from "../../types/entry";

const { Title, Text } = Typography;

interface Props {
  open: boolean;
  step: "person" | "workplace";
  title: string;
  placeholder: string;
  options: readonly (Person | Workplace)[];
  onSelect: (value: Person | Workplace) => void;
  onBack?: () => void;
  onClose: () => void;
}

const STEP_INDEX: Record<"person" | "workplace", number> = {
  person: 0,
  workplace: 1,
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
      style={{ top: 80 }}
    >
      <Card
        variant="borderless"
        style={{ borderRadius: 16 }}
        styles={{ body: { padding: 24 } }}
      >
        <Steps
          current={STEP_INDEX[step]}
          size="small"
          items={[
            { title: "Nama Pekerja", icon: <UserOutlined /> },
            { title: "Lokasi Pekerjaan", icon: <EnvironmentOutlined /> },
          ]}
          style={{ marginBottom: 20 }}
        />

        <Title level={4} style={{ marginBottom: 4 }}>
          {title}
        </Title>

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

        {/* Tombol Pilihan Cepat (Sangat memudahkan di Mobile & Desktop) */}
        <div style={{ marginTop: 16 }}>
          <Space size={[8, 8]} wrap>
            {filtered.map((item) => (
              <Button
                key={item.id}
                size="middle"
                style={{ borderRadius: 8, fontWeight: 500 }}
                onClick={() => onSelect(item)}
              >
                {item.name}
              </Button>
            ))}
          </Space>
        </div>

        <Space style={{ marginTop: 20 }} size="small" wrap>
          <Tag>Enter</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            pilih item pertama
          </Text>
          {onBack && (
            <>
              <Tag style={{ cursor: "pointer" }} onClick={onBack}>
                Esc / Kembali
              </Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                kembali ke pilih nama
              </Text>
            </>
          )}
        </Space>
      </Card>
    </Modal>
  );
};