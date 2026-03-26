import React, { useEffect, useState } from 'react';
import StatCard from '../components/StatCard';
import FraudAlerts from '../components/FraudAlerts';
import AnalyticsChart from '../components/AnalyticsChart';
import LiveFeed from '../components/LiveFeed';
import { fraudAPI, transactionAPI, riskAPI } from '../api/api';
import { CreditCard, AlertTriangle, Shield, TrendingUp, Activity, Brain } from 'lucide-react';

export default function Dashboard() {
  const [alerts, setAlerts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [riskProfile, setRiskProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [liveFeed, setLiveFeed] = useState([]);

  useEffect(() => {
    fetchAllData();
    
    const interval = setInterval(() => {
      addLiveMessage();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  async function fetchAllData() {
    try {
      setLoading(true);
      await Promise.all([
        fetchAlerts(),
        fetchTransactions(),
        fetchRiskProfile(),
      ]);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAlerts() {
    try {
      const res = await fraudAPI.getMyAlerts();
      setAlerts(res.data || []);
    } catch (err) {
      console.error('Failed to fetch alerts', err);
    }
  }

  async function fetchTransactions() {
    try {
      const res = await transactionAPI.getMyTransactions();
      setTransactions(res.data || []);
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    }
  }

  async function fetchRiskProfile() {
    try {
      const res = await riskAPI.getMyRisk();
      setRiskProfile(res.data);
    } catch (err) {
      console.error('Failed to fetch risk profile', err);
    }
  }

  function addLiveMessage() {
    const messages = [
      'New transaction processed through Kafka',
      'Fraud detection engine analyzed 50+ transactions',
      'RAG service retrieved similar fraud patterns',
      'Risk profiles updated for active accounts',
      'Rule engine evaluated new transaction patterns',
      'AI explanation generated for suspicious activity',
    ];
    
    const newMessage = {
      message: messages[Math.floor(Math.random() * messages.length)],
      txn: `System • ${new Date().toLocaleTimeString()}`,
      time: 'just now',
    };
    
    setLiveFeed(prev => [newMessage, ...prev.slice(0, 9)]);
  }

  const blockedCount = alerts.filter((a) => a.status === "BLOCKED").length;
  const flaggedCount = alerts.filter((a) => a.status === "FLAGGED").length;

  const avgScore =
    alerts.length > 0
      ? Math.round(
          (alerts.reduce((sum, a) => sum + (a.fraudScore || 0), 0) / alerts.length) * 100
        )
      : 0;

  const chartData = transactions.slice(0, 7).map((tx, index) => ({
    day: `Day ${index + 1}`,
    safe: tx.status === 'PENDING' ? 1 : 0,
    flagged: tx.status === 'FLAGGED' ? 1 : 0,
    blocked: tx.status === 'BLOCKED' ? 1 : 0,
    avgScore: (tx.amount / 1000) * (riskProfile?.riskScore || 0.5),
  }));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard Overview</h1>
          <p>
            Real-time fraud detection powered by RAG pipeline •{" "}
            {loading ? "Loading..." : "Live updates active"}
          </p>
        </div>

        <div className="header-actions">
          <button className="btn" onClick={fetchAllData} disabled={loading}>
            {loading ? "Refreshing..." : "⟳ Refresh"}
          </button>
          <span className="badge success">● Pipeline Active</span>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="TOTAL TRANSACTIONS"
          value={transactions.length}
          subtitle="Processed"
          change="Live"
          icon={<Activity size={18} />}
          color="blue"
        />

        <StatCard
          title="FLAGGED"
          value={flaggedCount}
          subtitle="Needs review"
          change="Live"
          icon={<AlertTriangle size={18} />}
          color="yellow"
        />

        <StatCard
          title="BLOCKED"
          value={blockedCount}
          subtitle="Auto-blocked"
          change="Live"
          icon={<Shield size={18} />}
          color="red"
        />

        <StatCard
          title="AVG FRAUD SCORE"
          value={`${avgScore}%`}
          subtitle="Based on alerts"
          change="Live"
          icon={<TrendingUp size={18} />}
          color="purple"
        />

        <StatCard
          title="RISK SCORE"
          value={riskProfile ? `${Math.round(riskProfile.riskScore * 100)}%` : 'N/A'}
          subtitle={riskProfile?.riskLevel || 'Loading...'}
          change="Live"
          icon={<Brain size={18} />}
          color="orange"
        />
      </div>

      <AnalyticsChart data={chartData} />

      <div className="bottom-grid">
        <FraudAlerts alerts={alerts} />
        <LiveFeed feed={liveFeed} />
      </div>
    </div>
  );
}