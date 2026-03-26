import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Analytics() {
  const weeklyData = [
    { day: 'Mon', transactions: 145, fraudScore: 0.12 },
    { day: 'Tue', transactions: 132, fraudScore: 0.08 },
    { day: 'Wed', transactions: 168, fraudScore: 0.15 },
    { day: 'Thu', transactions: 156, fraudScore: 0.11 },
    { day: 'Fri', transactions: 189, fraudScore: 0.18 },
    { day: 'Sat', transactions: 98, fraudScore: 0.22 },
    { day: 'Sun', transactions: 76, fraudScore: 0.14 },
  ];

  const ruleDistribution = [
    { name: 'HIGH_AMOUNT', value: 45, color: '#ef4444' },
    { name: 'VELOCITY_EXCEEDED', value: 28, color: '#f59e0b' },
    { name: 'SUSPICIOUS_CATEGORY', value: 18, color: '#8b5cf6' },
    { name: 'MISSING_CONTEXT', value: 9, color: '#06b6d4' },
  ];

  const statusData = [
    { name: 'FLAGGED', value: 67, color: '#f59e0b' },
    { name: 'BLOCKED', value: 33, color: '#ef4444' },
  ];

  return (
    <div className="page">
      <h1>Fraud Analytics</h1>
      <p className="page-subtitle">Real-time insights and fraud detection metrics</p>

      <div className="analytics-grid">
        <div className="analytics-card">
          <h3>Transaction Volume & Fraud Score Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="transactions" fill="#3b82f6" name="Transactions" />
              <Bar yAxisId="right" dataKey="fraudScore" fill="#ef4444" name="Avg Fraud Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-card">
          <h3>Fraud Rules Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={ruleDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {ruleDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-card">
          <h3>Alert Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-card">
          <h3>Key Metrics</h3>
          <div className="metrics-list">
            <div className="metric-item">
              <span className="metric-label">Total Alerts (30d)</span>
              <span className="metric-value">247</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">False Positive Rate</span>
              <span className="metric-value">2.3%</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Avg Response Time</span>
              <span className="metric-value">1.2s</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Blocked Transactions</span>
              <span className="metric-value">82</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Saved Amount</span>
              <span className="metric-value">$24,560</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}