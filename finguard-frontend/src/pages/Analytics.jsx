import React, { useEffect, useMemo, useState } from "react";
import { transactionAPI, fraudAPI, riskAPI } from "../api/api";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

export default function Analytics() {
  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [riskProfile, setRiskProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        setError("");

        const [txRes, alertRes, riskRes] = await Promise.all([
          transactionAPI.getMyTransactions(),
          fraudAPI.getMyAlerts().catch(() => ({ data: [] })),
          riskAPI.getMyRisk().catch(() => ({ data: null }))
        ]);

        setTransactions(txRes.data || []);
        if (riskRes.data) setRiskProfile(riskRes.data);

        let alertsData = [];
        const alertDataRaw = alertRes.data;
        if (alertDataRaw) {
          if (Array.isArray(alertDataRaw)) alertsData = alertDataRaw;
          else if (alertDataRaw.content) alertsData = alertDataRaw.content;
          else if (alertDataRaw.alerts) alertsData = alertDataRaw.alerts;
        }
        setAlerts(alertsData);
      } catch (err) {
        console.error("Error fetching analytics data:", err);
        setError("Failed to load analytics data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  // -----------------------------
  // Weekly trend data
  // -----------------------------
  const weeklyData = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const now = new Date();
    const result = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);

      const txsOnDay = transactions.filter(tx => {
        const txDate = new Date(tx.timestamp || tx.createdAt);
        return txDate.getDate() === d.getDate() &&
               txDate.getMonth() === d.getMonth() &&
               txDate.getFullYear() === d.getFullYear();
      });

      const approved = txsOnDay.filter(tx => tx.status === "SUCCESS").length;
      const flagged = txsOnDay.filter(tx => tx.status === "FLAGGED").length;
      const blocked = txsOnDay.filter(tx => tx.status === "BLOCKED").length;

      const alertsOnDay = alerts.filter(a => {
        const aDate = new Date(a.createdAt);
        return aDate.getDate() === d.getDate() &&
               aDate.getMonth() === d.getMonth() &&
               aDate.getFullYear() === d.getFullYear();
      });

      let totalScore = 0;
      alertsOnDay.forEach(a => totalScore += (a.fraudScore || 0) * 100);
      const dayAvgScore = alertsOnDay.length > 0 ? Number((totalScore / alertsOnDay.length).toFixed(2)) : 0;

      result.push({
        day: days[d.getDay()],
        approved,
        flagged,
        blocked,
        totalVolume: approved + flagged + blocked,
        avgScore: dayAvgScore
      });
    }

    return result;
  }, [transactions, alerts]);

  // -----------------------------
  // Distribution Data
  // -----------------------------
  const alertStatusData = useMemo(() => {
    const approved = transactions.filter(t => t.status === "SUCCESS").length;
    const flagged = transactions.filter(t => t.status === "FLAGGED").length;
    const blocked = transactions.filter(t => t.status === "BLOCKED").length;

    return [
      { name: "Success", value: approved, color: "#22C55E" },
      { name: "Flagged", value: flagged, color: "#F59E0B" },
      { name: "Blocked", value: blocked, color: "#EF4444" },
    ].filter(item => item.value > 0);
  }, [transactions]);

  const fraudRulesData = useMemo(() => {
    if (!alerts || alerts.length === 0) return [];
    const counts = {};

    alerts.forEach(a => {
      let rules = a.rulesTriggered || [];
      if (rules.length === 0 && a.primaryRule) rules.push(a.primaryRule);

      rules.forEach(rule => counts[rule] = (counts[rule] || 0) + 1);
    });

    const formattedData = Object.keys(counts).map(key => {
      let formattedKey = key.replace(/_/g, " ");
      switch(key) {
        case "EXTREME_AMOUNT": formattedKey = "Extreme Amount"; break;
        case "HIGH_AMOUNT": formattedKey = "High Amount"; break;
        case "MEDIUM_AMOUNT": formattedKey = "Medium Amount"; break;
        case "VELOCITY_EXCEEDED": formattedKey = "High Velocity"; break;
        case "SUSPICIOUS_CATEGORY": formattedKey = "Suspicious Category"; break;
        case "MISSING_CONTEXT": formattedKey = "Missing Device Context"; break;
        case "IMPOSSIBLE_TRAVEL": formattedKey = "Impossible Travel"; break;
        default: formattedKey = formattedKey.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); break;
      }
      return { name: formattedKey, count: counts[key] };
    });

    return formattedData.sort((a, b) => b.count - a.count);
  }, [alerts]);

  // -----------------------------
  // Summary stats
  // -----------------------------
  const summary = useMemo(() => {
    const total = transactions.length;
    const flagged = transactions.filter(t => t.status === "FLAGGED").length;
    const blocked = transactions.filter(t => t.status === "BLOCKED").length;

    const avgFraudScore = alerts.length > 0
      ? ((alerts.reduce((sum, a) => sum + (a.fraudScore || 0), 0) / alerts.length) * 100).toFixed(1)
      : "0.0";

    const accountRiskScore = riskProfile ? (riskProfile.riskScore * 100).toFixed(1) : "0.0";

    return { total, flagged, blocked, avgFraudScore, accountRiskScore };
  }, [transactions, alerts, riskProfile]);

  if (loading) return (
    <div className="analytics-page">
      <h1 className="analytics-title">Fraud Analytics</h1>
      <p className="analytics-subtitle">Loading analytics...</p>
    </div>
  );

  if (error) return (
    <div className="analytics-page">
      <h1 className="analytics-title">Fraud Analytics</h1>
      <p className="analytics-subtitle error-text">{error}</p>
    </div>
  );

  return (
    <div className="analytics-page">
      <h1 className="analytics-title">Fraud Analytics</h1>
      <p className="analytics-subtitle">Real-time insights and fraud detection metrics</p>

      <div className="analytics-grid">
        {/* TOP LEFT: Volume & Trend */}
        <div className="analytics-card">
          <h2 className="card-title">Transaction Volume & Fraud Score Trend</h2>
          <div className="chart-area" style={{ height: 280, marginTop: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={weeklyData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" strokeOpacity={0.3} />
                <XAxis dataKey="day" stroke="var(--text-secondary)" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" stroke="var(--text-secondary)" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" tickFormatter={val => `${val}%`} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', borderRadius: 8 }} itemStyle={{ color: 'var(--text-primary)' }} />
                <Legend iconType="circle" />
                <Area yAxisId="left" type="monotone" dataKey="totalVolume" name="Total Volume" stroke="#6366F1" fill="url(#colorVolume)" fillOpacity={1} />
                <Line yAxisId="right" type="monotone" dataKey="avgScore" name="Avg Risk Score" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4, fill: "#F59E0B" }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TOP RIGHT: Fraud Rules */}
        <div className="analytics-card">
          <h2 className="card-title">Fraud by Rules Triggered</h2>
          <div className="chart-area" style={{ height: 280, marginTop: 16 }}>
            {fraudRulesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fraudRulesData} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} vertical={false} />
                  <XAxis dataKey="name" type="category" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" />
                  <YAxis type="number" stroke="var(--text-secondary)" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', borderRadius: 8 }} itemStyle={{ color: 'var(--text-primary)' }} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                  <Bar dataKey="count" name="Times Triggered" radius={[4, 4, 0, 0]} barSize={36}>
                    {fraudRulesData.map((entry, index) => {
                      const colors = ["#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e", "#0ea5e9", "#d946ef", "#f97316"];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="chart-subtitle" style={{ textAlign: "center", marginTop: 60 }}>No fraud rules data available</p>}
          </div>
        </div>

        {/* BOTTOM LEFT: Alert Distribution */}
        <div className="analytics-card">
          <h2 className="card-title">Alert Status Distribution</h2>
          <div className="chart-area" style={{ height: 280, marginTop: 16 }}>
            {alertStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }} itemStyle={{ color: 'var(--text-primary)' }} />
                  <Legend />
                  <Pie data={alertStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                    {alertStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="chart-subtitle" style={{ textAlign: "center", marginTop: 60 }}>No alert status data available</p>}
          </div>
        </div>

        {/* BOTTOM RIGHT: Key Metrics */}
        <div className="analytics-card">
          <h2 className="card-title">Key Metrics</h2>
          <div className="metrics-list">
            <div className="metric-row"><span>Total Transactions (30d)</span><span className="metric-value">{summary.total}</span></div>
            <div className="metric-row"><span>Flagged Transactions</span><span className="metric-value warning">{summary.flagged}</span></div>
            <div className="metric-row"><span>Blocked Transactions</span><span className="metric-value danger">{summary.blocked}</span></div>
            <div className="metric-row"><span>Avg Fraud Score</span><span className="metric-value">{summary.avgFraudScore}%</span></div>
            <div className="metric-row"><span>Account Risk Score</span><span className="metric-value">{summary.accountRiskScore}%</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}