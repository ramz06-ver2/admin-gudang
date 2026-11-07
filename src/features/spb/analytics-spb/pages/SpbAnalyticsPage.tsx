import { useNavigate } from "react-router-dom";
import { Alert, Button, Card, Col, Empty, Row, Space, Spin, Statistic, Typography } from "antd";
import { ArrowLeftOutlined, BarChartOutlined, LineChartOutlined } from "@ant-design/icons";
import { useSpbAnalytics } from "../useSpbAnalytics";
import { SpbBarChart } from "../components/SpbbarChart";
import { SpbTimelineChart } from "../components/SpbTimelineChart";

const { Title, Text } = Typography;

const DARK_CARD = {
  borderRadius: 12,
  background: "#031326",
  border: "1px solid #0e2a4a",
} as const;

export default function SpbAnalyticsPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useSpbAnalytics();

  if (isLoading) return <div style={{ textAlign: "center", padding: 60 }}><Spin size="large" /></div>;
  if (error) return <Alert type="error" showIcon message="Gagal memuat analitik" description={(error as Error)?.message} />;
  if (!data) return null;

  const totalPo = data.itemsWithPoNotArrived + data.itemsArrived;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 32 }}>
      <Space align="center" style={{ marginBottom: 16 }}>
        <Button type="text" size="large" icon={<ArrowLeftOutlined />} onClick={() => navigate("/monitoring-spb")} />
        <div>
          <Title level={3} style={{ margin: 0 }}>Analitik Monitoring SPB</Title>
          <Text type="secondary">Statistik pengajuan, PO, dan kedatangan barang</Text>
        </div>
      </Space>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: 12 }}>
            <Statistic title="Barang Diajukan" value={data.itemsNotPo} valueStyle={{ color: "#faad14" }} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: 12 }}>
            <Statistic title="Total Sudah PO" value={totalPo} valueStyle={{ color: "#1677ff" }} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: 12 }}>
            <Statistic title="Sudah Datang" value={data.itemsArrived} valueStyle={{ color: "#52c41a" }} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: 12 }}>
            <Statistic title="Total Barang SPB" value={data.totalItems} valueStyle={{ color: "#722ed1" }} />
          </Card>
        </Col>
      </Row>

      {/* DIAGRAM BATANG: 3 batang, 3 warna gradasi, tema gelap */}
      <Card
        variant="borderless"
        title={<Space><BarChartOutlined style={{ color: "#faad14" }} /><span style={{ color: "#fff" }}>Distribusi Barang SPB</span></Space>}
        style={{ ...DARK_CARD, marginBottom: 24 }}
        styles={{ header: { borderBottom: "1px solid #0e2a4a", color: "#fff" }, body: { padding: 12 } }}
      >
        {data.totalItems === 0 ? (
          <Empty description={<span style={{ color: "#64748b" }}>Belum ada data SPB</span>} />
        ) : (
          <SpbBarChart data={data.barData} height={360} />
        )}
      </Card>

      {/* GRAFIK GARIS: biru = SPB terkirim, merah = barang datang (dalam 1 grafik) */}
      <Card
        variant="borderless"
        title={<Space><LineChartOutlined style={{ color: "#1fb6ff" }} /><span style={{ color: "#fff" }}>Timeline SPB Terkirim & Barang Datang</span></Space>}
        style={DARK_CARD}
        styles={{ header: { borderBottom: "1px solid #0e2a4a", color: "#fff" }, body: { padding: 12 } }}
      >
        {data.lineData.length === 0 ? (
          <Empty description={<span style={{ color: "#64748b" }}>Belum ada data timeline</span>} />
        ) : (
          <SpbTimelineChart data={data.lineData} height={440} />
        )}
      </Card>
    </div>
  );
}