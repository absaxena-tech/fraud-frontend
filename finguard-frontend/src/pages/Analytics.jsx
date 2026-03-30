import React, { useEffect, useMemo, useState } from "react";
import AnalyticsChart from "../components/AnalyticsChart";
import { transactionAPI } from "../api/api";

export default function Analytics() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await transactionAPI.getMyTransactions();
        setTransactions(res.data || []);
      } catch (err) {
        console.error("Error fetching transactions:", err);
        setError("Failed to load analytics data.");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
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

      result.push({
        day: days[d.getDay()],
        dateKey: d.toISOString().slice(0, 10),
        approved: 0,
        flagged: 0,
        blocked: 0,
        scoreSum: 0,
        scoreCount: 0,
        avgScore: 0,
      });
    }

    transactions.forEach((tx) => {
      const ts = tx.timestamp || tx.createdAt;
      if (!ts) return;

      const dateKey = new Date(ts).toISOString().slice(0, 10);
      const dayObj = result.find((x) => x.dateKey === dateKey);
      if (!dayObj) return;

      if (tx.status === "SUCCESS") dayObj.approved++;
      if (tx.status === "FLAGGED") dayObj.flagged++;
      if (tx.status === "BLOCKED") dayObj.blocked++;

      if (tx.fraudScore !== undefined && tx.fraudScore !== null) {
        dayObj.scoreSum += tx.fraudScore * 100;
        dayObj.scoreCount++;
      }
    });

    return result.map((d) => ({
      day: d.day,
      approved: d.approved,
      flagged: d.flagged,
      blocked: d.blocked,
      avgScore: d.scoreCount > 0 ? +(d.scoreSum / d.scoreCount).toFixed(1) : 0,
    }));
  }, [transactions]);

  // -----------------------------
  // Summary stats for right panel
  // -----------------------------
  const summary = useMemo(() => {
    const total = transactions.length;
    const flagged = transactions.filter((t) => t.status === "FLAGGED").length;
    const blocked = transactions.filter((t) => t.status === "BLOCKED").length;

    const fraudScores = transactions
      .filter((t) => t.fraudScore !== null && t.fraudScore !== undefined)
      .map((t) => t.fraudScore);

    const avgFraudScore =
      fraudScores.length > 0
        ? ((fraudScores.reduce((a, b) => a + b, 0) / fraudScores.length) * 100).toFixed(1)
        : "0.0";

    const falsePositives = transactions.filter((t) => t.falsePositive === true).length;
    const falsePositiveRate =
      total > 0 ? ((falsePositives / total) * 100).toFixed(1) : "0.0";

    const savedAmount = blocked * 300; // dummy estimate

    return {
      total,
      flagged,
      blocked,
      avgFraudScore,
      falsePositiveRate,
      savedAmount,
    };
  }, [transactions]);

  if (loading) {
    return (
      <div className="analytics-page">
        <h1 className="analytics-title">Fraud Analytics</h1>
        <p className="analytics-subtitle">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-page">
        <h1 className="analytics-title">Fraud Analytics</h1>
        <p className="analytics-subtitle error-text">{error}</p>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <h1 className="analytics-title">Fraud Analytics</h1>
      <p className="analytics-subtitle">
        Real-time insights and fraud detection metrics
      </p>

      <div className="analytics-grid">
        {/* TOP LEFT */}
        <div className="analytics-card">
          <h2 className="card-title">Transaction Volume & Fraud Score Trend</h2>
          <AnalyticsChart data={weeklyData} transactions={transactions} />
        </div>

        {/* TOP RIGHT */}
        <div className="analytics-card">
          <h2 className="card-title">Fraud Rules Distribution</h2>
          <div className="chart-placeholder">
            <p>(Pie chart placeholder)</p>
          </div>
        </div>

        {/* BOTTOM LEFT */}
        <div className="analytics-card">
          <h2 className="card-title">Alert Status Distribution</h2>
          <div className="chart-placeholder">
            <p>(Pie chart placeholder)</p>
          </div>
        </div>

        {/* BOTTOM RIGHT */}
        <div className="analytics-card">
          <h2 className="card-title">Key Metrics</h2>

          <div className="metrics-list">
            <div className="metric-row">
              <span>Total Transactions (30d)</span>
              <span className="metric-value">{summary.total}</span>
            </div>

            <div className="metric-row">
              <span>Flagged Transactions</span>
              <span className="metric-value warning">{summary.flagged}</span>
            </div>

            <div className="metric-row">
              <span>Blocked Transactions</span>
              <span className="metric-value danger">{summary.blocked}</span>
            </div>

            <div className="metric-row">
              <span>Avg Fraud Score</span>
              <span className="metric-value">{summary.avgFraudScore}%</span>
            </div>

            <div className="metric-row">
              <span>False Positive Rate</span>
              <span className="metric-value">{summary.falsePositiveRate}%</span>
            </div>

            <div className="metric-row">
              <span>Saved Amount</span>
              <span className="metric-value success">
                ₹{summary.savedAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}