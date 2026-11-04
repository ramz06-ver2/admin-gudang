import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Space, Tag, Typography } from "antd";
import {
  CloseOutlined,
  RobotOutlined,
  SendOutlined,
  ReloadOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import type { ChatMessage, UserRole } from "../../shared/types";
import {
  AUTH_CHANGED_EVENT,
  getStoredUser,
} from "../../app/providers/authProvider";
import { getRoleDefinition } from "../../app/providers/accessControlProvider";
import {
  DEFAULT_CHAT_SUGGESTIONS,
  generateChatbotResponse,
} from "./ChatbotEngine"; // 🔧 PERBAIKAN: Huruf kapital C dan E

const { Title, Text } = Typography;

export interface ChatbotWidgetProps {
  defaultOpen?: boolean;
  role?: UserRole;
}

const createWelcomeMessage = (roleLabel: string): ChatMessage => ({
  id: "welcome-msg",
  sender: "bot",
  text: `Halo! Saya Asisten Chatbot Gudang (Mode akses Anda: ${roleLabel}). Silakan tanyakan stok barang, stok menipis, status Monitoring SPB/PO, atau info hak akses.`,
  timestamp: new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }),
  suggestions: DEFAULT_CHAT_SUGGESTIONS,
});

export const ChatbotWidget = ({
  defaultOpen = false,
  role,
}: ChatbotWidgetProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const [inputValue, setInputValue] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [storedUser, setStoredUserState] = useState(() => getStoredUser());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const syncAuth = () => setStoredUserState(getStoredUser());
    window.addEventListener(AUTH_CHANGED_EVENT, syncAuth);
    window.addEventListener("storage", syncAuth);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  const effectiveRole: UserRole = role ?? storedUser?.role ?? "user";
  const roleDef = getRoleDefinition(effectiveRole);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createWelcomeMessage(roleDef.label),
  ]);

  useEffect(() => {
    if (open && typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText ?? inputValue).trim();
    if (!textToSend || isSending) return;

    const nowTime = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: nowTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) {
      setInputValue("");
    }
    setIsSending(true);

    try {
      const reply = await generateChatbotResponse(textToSend, effectiveRole);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        sender: "bot",
        text: reply.text,
        timestamp: new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        suggestions: reply.suggestions,
        actionLinks: reply.actionLinks,
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleResetChat = () => {
    setMessages([createWelcomeMessage(roleDef.label)]);
  };

  if (!open) {
    return (
      <div
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          zIndex: 1500,
        }}
      >
        <Button
          type="primary"
          size="large"
          shape="round"
          icon={<RobotOutlined />}
          onClick={() => setOpen(true)}
          aria-label="Buka Chatbot"
          data-testid="chatbot-open-button"
          style={{
            height: 48,
            paddingInline: 20,
            fontWeight: 600,
            boxShadow: "0 8px 24px rgba(22, 119, 255, 0.35)",
          }}
        >
          Chatbot Gudang
        </Button>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Jendela Chatbot Gudang"
      data-testid="chatbot-fullscreen-window"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 2000,
        background: "#f5f7fa",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header Layar Penuh dengan Tombol Silang (X) di Sebelah Kiri Atas */}
      <div
        style={{
          height: 64,
          padding: "0 20px",
          background: "#ffffff",
          borderBottom: "1px solid #e6ebf1",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Button
            type="text"
            size="large"
            icon={<CloseOutlined style={{ fontSize: 18 }} />}
            onClick={() => setOpen(false)}
            aria-label="Tutup Chatbot"
            data-testid="chatbot-close-button"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: 8,
              border: "1px solid #d9d9d9",
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, #1677ff, #0e4fb8)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              <RobotOutlined />
            </div>
            <div>
              <Title level={5} style={{ margin: 0, lineHeight: 1.2 }}>
                Chatbot Asisten Gudang
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Cek Stok, Barang Menipis, & Status Monitoring SPB/PO
              </Text>
            </div>
          </div>
        </div>

        <Space size={8}>
          <Tag color={roleDef.color} style={{ margin: 0 }}>
            {roleDef.label}
          </Tag>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={handleResetChat}
            aria-label="Reset Percakapan"
          >
            Reset
          </Button>
        </Space>
      </div>

      {/* Area Pesan Chat */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 16px",
        }}
      >
        <div
          style={{
            maxWidth: 880,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {messages.map((msg) => {
            const isUser = msg.sender === "user";
            return (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isUser ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "14px 18px",
                    borderRadius: isUser
                      ? "16px 16px 4px 16px"
                      : "16px 16px 16px 4px",
                    background: isUser ? "#1677ff" : "#ffffff",
                    color: isUser ? "#ffffff" : "#1f1f1f",
                    border: isUser ? "none" : "1px solid #e6ebf1",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    whiteSpace: "pre-line",
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}
                >
                  {msg.text}
                </div>

                <Text
                  type="secondary"
                  style={{ fontSize: 11, marginTop: 4, paddingInline: 4 }}
                >
                  {isUser ? "Anda" : "Bot"} · {msg.timestamp}
                </Text>

                {/* Tombol Navigasi Cepat jika tersedia */}
                {!isUser && msg.actionLinks && msg.actionLinks.length > 0 && (
                  <Space wrap size={8} style={{ marginTop: 8 }}>
                    {msg.actionLinks.map((link) => (
                      <Button
                        key={link.path + link.label}
                        size="small"
                        type="primary"
                        ghost
                        icon={<ArrowRightOutlined />}
                        onClick={() => {
                          setOpen(false);
                          navigate(link.path);
                        }}
                      >
                        {link.label}
                      </Button>
                    ))}
                  </Space>
                )}

                {/* Saran Pertanyaan Cepat */}
                {!isUser && msg.suggestions && msg.suggestions.length > 0 && (
                  <Space wrap size={6} style={{ marginTop: 8 }}>
                    {msg.suggestions.map((sug) => (
                      <Button
                        key={sug}
                        size="small"
                        onClick={() => handleSendMessage(sug)}
                        style={{ borderRadius: 16, fontSize: 12 }}
                      >
                        {sug}
                      </Button>
                    ))}
                  </Space>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Chat di Bagian Bawah */}
      <div
        style={{
          padding: "16px 20px",
          background: "#ffffff",
          borderTop: "1px solid #e6ebf1",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            maxWidth: 880,
            margin: "0 auto",
            display: "flex",
            gap: 10,
          }}
        >
          <Input
            size="large"
            placeholder="Ketik pertanyaan (contoh: Cek stok kabel, Status monitoring SPB, Barang stok menipis)..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPressEnter={() => handleSendMessage()}
            aria-label="Input Pesan Chatbot"
            autoFocus
          />
          <Button
            type="primary"
            size="large"
            icon={<SendOutlined />}
            loading={isSending}
            onClick={() => handleSendMessage()}
            aria-label="Kirim Pesan Chatbot"
          >
            Kirim
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatbotWidget;