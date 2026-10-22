import { Component, ErrorInfo, ReactNode } from "react";
import { Result, Button, Typography } from "antd";

const { Paragraph, Text } = Typography;

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, display: "flex", justifyContent: "center" }}>
          <Result
            status="500"
            title="Terjadi Kesalahan (500)"
            subTitle="Maaf, aplikasi mengalami masalah internal."
            extra={
              <Button type="primary" onClick={() => window.location.reload()}>
                Muat Ulang Halaman
              </Button>
            }
          >
            <div style={{ textAlign: "left", background: "#f5f5f5", padding: 16, borderRadius: 8 }}>
              <Text strong>Detail Error:</Text>
              <Paragraph type="danger" copyable style={{ marginTop: 8 }}>
                {this.state.error?.message}
              </Paragraph>
            </div>
          </Result>
        </div>
      );
    }
    return this.props.children;
  }
}