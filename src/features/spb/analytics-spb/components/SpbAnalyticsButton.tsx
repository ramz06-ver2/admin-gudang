import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BarChartOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import { BAR_COLORS, useSpbAnalytics } from "../useSpbAnalytics";

export const SpbAnalyticsButton = () => {
  const navigate = useNavigate();
  const { data } = useSpbAnalytics();

  const { gradient, hasData, tooltipText } = useMemo(() => {
    if (!data) {
      return { gradient: "#e6ebf1", hasData: false, tooltipText: "Memuat analitik..." };
    }

    const values = data.barData.map((b) => b.value);
    const sum = values.reduce((s, v) => s + v, 0);

    if (sum === 0) {
      return { gradient: "#e6ebf1", hasData: false, tooltipText: "Belum ada data SPB" };
    }

    const pctA = (values[0] / sum) * 100;
    const pctB = (values[1] / sum) * 100;
    const pctC = (values[2] / sum) * 100;

    const gradient = `conic-gradient(
      ${BAR_COLORS.diajukan} 0% ${pctA}%,
      ${BAR_COLORS.po} ${pctA}% ${pctA + pctB}%,
      ${BAR_COLORS.datang} ${pctA + pctB}% 100%
    )`;

    return {
      gradient,
      hasData: true,
      tooltipText: (
        <div style={{ fontSize: 13, lineHeight: 1.8 }}>
          <div style={{ color: BAR_COLORS.diajukan }}>● Diajukan: <strong>{pctA.toFixed(1)}%</strong></div>
          <div style={{ color: BAR_COLORS.po }}>● Sudah PO: <strong>{pctB.toFixed(1)}%</strong></div>
          <div style={{ color: BAR_COLORS.datang }}>● Sudah Datang: <strong>{pctC.toFixed(1)}%</strong></div>
        </div>
      ),
    };
  }, [data]);

  return (
    <div style={{ position: "fixed", right: 32, bottom: 100, zIndex: 1200 }}>
      <Tooltip title={tooltipText} placement="left">
        <div
          role="button"
          aria-label="Buka analitik SPB"
          data-testid="spb-analytics-button"
          onClick={() => navigate("/monitoring-spb/analytics")}
          style={{
            width: 102,        // ✅ Dibesarkan 50% dari 68px
            height: 102,
            borderRadius: "50%",
            background: hasData ? gradient : "#e6ebf1",
            padding: 8,        // Proporsional dengan ukuran
            cursor: "pointer",
            boxShadow: "0 8px 30px rgba(22, 119, 255, 0.35)",
            transition: "transform 0.2s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,     // Ikon lebih besar
              color: "#1677ff",
            }}
          >
            <BarChartOutlined />
          </div>
        </div>
      </Tooltip>
    </div>
  );
};