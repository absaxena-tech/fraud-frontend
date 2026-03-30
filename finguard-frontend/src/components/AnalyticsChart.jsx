import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

export default function AnalyticsChart({ data, transactions = [] }) {
  const [activeTab, setActiveTab] = useState("score");

  // Calculate statistics from transactions if provided
  const stats = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return {
        approved: 0,
        flagged: 0,
        blocked: 0,
        total: 0,
      };
    }

    const approved = transactions.filter(tx => tx.status === 'SUCCESS').length;
    const flagged = transactions.filter(tx => tx.status === 'FLAGGED').length;
    const blocked = transactions.filter(tx => tx.status === 'BLOCKED').length;

    return {
      approved,
      flagged,
      blocked,
      total: transactions.length,
    };
  }, [transactions]);

  // Risk Distribution Data (Pie Chart)
  const riskDistribution = [
    { name: "Success", value: stats.approved, color: "#22C55E" },
    { name: "Flagged", value: stats.flagged, color: "#F59E0B" },
    { name: "Blocked", value: stats.blocked, color: "#EF4444" },
  ].filter(item => item.value > 0); // Only show items with values

  // Alert Status Data (Bar Chart)
  const alertStatus = [
    { status: "Success", count: stats.approved },
    { status: "Flagged", count: stats.flagged },
    { status: "Blocked", count: stats.blocked },
  ];

  const COLORS = ["#22C55E", "#F59E0B", "#EF4444"];

  if ((!data || data.length === 0) && (!transactions || transactions.length === 0)) {
    return (
      <div className="chart-box">
        <div className="chart-header">
          <h3>Fraud Analytics</h3>
          <div className="chart-tabs">
            <button className="tab active">Score Trend</button>
          </div>
        </div>
        <p className="chart-subtitle">No transaction data available yet</p>
      </div>
    );
  }

  return (
    <div className="chart-box">
      <div className="chart-header">
        <h3>Fraud Analytics</h3>
        <div className="chart-tabs">
          <button
            className={`tab ${activeTab === "score" ? "active" : ""}`}
            onClick={() => setActiveTab("score")}
          >
            Score Trend
          </button>

          <button
            className={`tab ${activeTab === "risk" ? "active" : ""}`}
            onClick={() => setActiveTab("risk")}
          >
            Risk Distribution
          </button>

          <button
            className={`tab ${activeTab === "alert" ? "active" : ""}`}
            onClick={() => setActiveTab("alert")}
          >
            Alert Status
          </button>
        </div>
      </div>

      <p className="chart-subtitle">
        {activeTab === "score" && "Transaction volume and fraud score trend over the last 7 days"}
        {activeTab === "risk" && `Overall risk distribution of ${stats.total} transactions`}
        {activeTab === "alert" && `Total alert status count summary (${stats.total} total transactions)`}
      </p>

      <div className="chart-area">
        <ResponsiveContainer width="100%" height={280}>
          {activeTab === "score" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="4 4" />
              <XAxis dataKey="day" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(val) => `${val}%`} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
                labelStyle={{ color: 'var(--text-primary)' }}
              />
              <Legend />

              <Line
                yAxisId="left"
                type="monotone"
                dataKey="approved"
                stroke="#22C55E"
                strokeWidth={2}
                name="Approved"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="flagged"
                stroke="#F59E0B"
                strokeWidth={2}
                name="Flagged"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="blocked"
                stroke="#EF4444"
                strokeWidth={2}
                name="Blocked"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgScore"
                stroke="#6366F1"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Avg Score"
              />
            </LineChart>
          ) : activeTab === "risk" ? (
            stats.total === 0 ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                No transaction data available
              </div>
            ) : (
              <PieChart>
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Legend />
                <Pie
                  data={riskDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index]} />
                  ))}
                </Pie>
              </PieChart>
            )
          ) : (
            stats.total === 0 ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                No transaction data available
              </div>
            ) : (
              <BarChart data={alertStatus}>
  <CartesianGrid strokeDasharray="4 4" />
  <XAxis dataKey="status" />
  <YAxis allowDecimals={false} />
  <Tooltip
    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
    itemStyle={{ color: 'var(--text-primary)' }}
    cursor={{ fill: 'var(--hover-bg)' }}
  />
  <Bar dataKey="count" name="Number of Transactions">
    {alertStatus.map((entry, index) => {
      const colorMap = {
        Success: "#22C55E",
        Flagged: "#F59E0B",
        Blocked: "#EF4444",
      };
      return (
        <Cell
          key={`cell-${index}`}
          fill={colorMap[entry.status] || "#6366F1"}
        />
      );
    })}
  </Bar>
</BarChart>
            )
          )}
        </ResponsiveContainer>
      </div>

      {/* Optional: Display summary stats */}
      {stats.total > 0 && activeTab !== "score" && (
        <div style={{
          marginTop: "20px",
          paddingTop: "16px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-around",
          flexWrap: "wrap",
          gap: "16px"
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#22C55E" }}>
              {stats.approved}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              Success
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#F59E0B" }}>
              {stats.flagged}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              Flagged
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#EF4444" }}>
              {stats.blocked}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              Blocked
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "var(--primary)" }}>
              {stats.total}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              Total
            </div>
          </div>
        </div>
      )}
    </div>
  );
}