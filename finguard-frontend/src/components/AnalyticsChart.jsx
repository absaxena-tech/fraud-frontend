import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function AnalyticsChart({ data }) {
  if (!data || data.length === 0) {
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
          <button className="tab active">Score Trend</button>
          <button className="tab">Risk Distribution</button>
          <button className="tab">Alert Status</button>
        </div>
      </div>

      <p className="chart-subtitle">
        Transaction volume and fraud score trend over the last 7 days
      </p>

      <div className="chart-area">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="4 4" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />

            <Line type="monotone" dataKey="safe" stroke="#22c55e" strokeWidth={2} name="Safe" />
            <Line type="monotone" dataKey="flagged" stroke="#f59e0b" strokeWidth={2} name="Flagged" />
            <Line type="monotone" dataKey="blocked" stroke="#ef4444" strokeWidth={2} name="Blocked" />
            <Line type="monotone" dataKey="avgScore" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" name="Avg Score" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}