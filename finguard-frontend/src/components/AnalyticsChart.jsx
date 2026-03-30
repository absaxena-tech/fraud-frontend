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

    const approved = transactions.filter(tx => tx.status === 'APPROVED').length;
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
    { name: "Approved", value: stats.approved, color: "#22c55e" },
    { name: "Flagged", value: stats.flagged, color: "#f59e0b" },
    { name: "Blocked", value: stats.blocked, color: "#ef4444" },
  ].filter(item => item.value > 0); // Only show items with values

  // Alert Status Data (Bar Chart)
  const alertStatus = [
    { status: "Approved", count: stats.approved },
    { status: "Flagged", count: stats.flagged },
    { status: "Blocked", count: stats.blocked },
  ];

  const COLORS = ["#22c55e", "#f59e0b", "#ef4444"];

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
              <YAxis />
              <Tooltip />
              <Legend />

              <Line 
                type="monotone" 
                dataKey="approved" 
                stroke="#22c55e" 
                strokeWidth={2} 
                name="Approved" 
              />
              <Line 
                type="monotone" 
                dataKey="flagged" 
                stroke="#f59e0b" 
                strokeWidth={2} 
                name="Flagged" 
              />
              <Line 
                type="monotone" 
                dataKey="blocked" 
                stroke="#ef4444" 
                strokeWidth={2} 
                name="Blocked" 
              />
              <Line
                type="monotone"
                dataKey="avgScore"
                stroke="#6366f1"
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
                <Tooltip />
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
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#6366f1" name="Number of Transactions" />
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
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#22c55e" }}>
              {stats.approved}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              Approved
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#f59e0b" }}>
              {stats.flagged}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              Flagged
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ef4444" }}>
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