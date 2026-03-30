import React, { useEffect, useState, useRef, useCallback, useContext } from "react";
import StatCard from "../components/StatCard";
import FraudAlerts from "../components/FraudAlerts";
import AnalyticsChart from "../components/AnalyticsChart";
import LiveKafkaFeed from "../components/LiveKafkaFeed";

import { fraudAPI, transactionAPI, riskAPI } from "../api/api";
import { AlertTriangle, Shield, TrendingUp, Activity, Brain } from "lucide-react";
import { ThemeContext } from "../App";

// Use API Gateway (port 8080) with authentication
const API_GATEWAY_URL = "http://localhost:8080";
const LIVE_FEED_HISTORY_URL = `${API_GATEWAY_URL}/api/live-feed/history`;
const LIVE_FEED_SSE_URL = `${API_GATEWAY_URL}/api/live-feed/stream`;

const MAX_FEED_ITEMS = 50;
const SSE_RECONNECT_DELAY = 5000;

// Helper to get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('accessToken');
};

export default function Dashboard() {
  const { darkMode } = useContext(ThemeContext);
  const [alerts, setAlerts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [riskProfile, setRiskProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  const [liveFeed, setLiveFeed] = useState([]);
  const [sseStatus, setSseStatus] = useState("connecting");

  const eventSourceRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  // ── Prepend new event into feed ──
  const prependEvent = useCallback((event) => {
    setLiveFeed((prev) => {
      const exists = prev.some(e => {
        if (event.messageId && e.messageId) {
          return e.messageId === event.messageId;
        }
        return e.topic === event.topic &&
               e.partition === event.partition &&
               e.offset === event.offset;
      });

      if (exists) {
        console.log("Duplicate event ignored:", event.messageId || `${event.topic}-${event.partition}-${event.offset}`);
        return prev;
      }

      const eventWithId = {
        ...event,
        eventId: event.messageId || `${event.topic}-${event.partition}-${event.offset}-${Date.now()}`
      };
      return [eventWithId, ...prev].slice(0, MAX_FEED_ITEMS);
    });
  }, []);

  // ── SSE Connect Function with Authentication ──
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setSseStatus("connecting");

    const token = getAuthToken();
    if (!token) {
      console.warn("No auth token available for SSE connection");
      setSseStatus("error");
      return;
    }

    const sseUrl = `${LIVE_FEED_SSE_URL}?token=${token}`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.addEventListener("ping", (e) => {
      console.log(":heartbeat: SSE ping:", e.data);
      setSseStatus("live");
    });

    es.addEventListener("kafka-message", (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log(":incoming_envelope: Kafka message received:", data);
        prependEvent(data);
      } catch (err) {
        console.warn("Failed to parse SSE event:", err);
      }
    });

    es.onopen = () => {
      console.log(":white_check_mark: SSE connection opened");
      setSseStatus("live");

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    es.onerror = (err) => {
      console.error(":x: SSE error:", err);
      setSseStatus("error");

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      reconnectTimerRef.current = setTimeout(() => {
        console.log(":arrows_counterclockwise: Reconnecting SSE...");
        connectSSE();
      }, SSE_RECONNECT_DELAY);
    };
  }, [prependEvent]);

  // ── Load history with authentication ──
  useEffect(() => {
    let mounted = true;

    const loadHistory = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          console.warn("No auth token available for history");
          return;
        }

        const res = await fetch(LIVE_FEED_HISTORY_URL, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (res.status === 401) {
          console.error("Authentication failed - please login again");
          return;
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        if (mounted && data && Array.isArray(data)) {
          const eventsWithId = data.map(event => ({
            ...event,
            eventId: event.messageId || `${event.topic}-${event.partition}-${event.offset}-${Date.now()}`
          }));
          setLiveFeed(eventsWithId.slice(0, MAX_FEED_ITEMS));
          console.log(`Loaded ${eventsWithId.length} historical Kafka messages`);
        }
      } catch (err) {
        console.warn("Could not load live feed history:", err);
      }
    };

    loadHistory();
    connectSSE();

    return () => {
      mounted = false;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [connectSSE]);

  // ── Load main dashboard data ──
  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    try {
      setLoading(true);
      await Promise.all([fetchAlerts(), fetchTransactions(), fetchRiskProfile()]);
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAlerts() {
    try {
      const res = await fraudAPI.getMyAlerts();
      setAlerts(res.data || []);
    } catch (err) {
      console.error("Failed to fetch alerts", err);
    }
  }

  async function fetchTransactions() {
    try {
      const res = await transactionAPI.getMyTransactions();
      setTransactions(res.data || []);
    } catch (err) {
      console.error("Failed to fetch transactions", err);
    }
  }

  async function fetchRiskProfile() {
    try {
      const res = await riskAPI.getMyRisk();
      setRiskProfile(res.data);
    } catch (err) {
      console.error("Failed to fetch risk profile", err);
    }
  }

  // Calculate statistics from real transactions
  const approvedCount = transactions.filter(tx => tx.status === "SUCCESS").length;
  const flaggedCount = transactions.filter(tx => tx.status === "FLAGGED").length;
  const blockedCount = transactions.filter(tx => tx.status === "BLOCKED").length;

  // Calculate average fraud score from alerts
  const avgScore = alerts.length > 0
    ? Math.round((alerts.reduce((sum, a) => sum + (a.fraudScore || 0), 0) / alerts.length) * 100)
    : 0;

  // Prepare chart data for the last 7 days
  const chartData = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayString = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // find all transactions on this date
    const txsOnDay = transactions.filter(tx => {
      const txDate = new Date(tx.timestamp);
      return txDate.getDate() === d.getDate() &&
             txDate.getMonth() === d.getMonth() &&
             txDate.getFullYear() === d.getFullYear();
    });

    const approved = txsOnDay.filter(tx => tx.status === "SUCCESS").length;
    const flagged = txsOnDay.filter(tx => tx.status === "FLAGGED").length;
    const blocked = txsOnDay.filter(tx => tx.status === "BLOCKED").length;

    // calculate average fraud score for this day using actual alerts
    const alertsOnDay = alerts.filter(a => {
      const aDate = new Date(a.createdAt);
      return aDate.getDate() === d.getDate() &&
             aDate.getMonth() === d.getMonth() &&
             aDate.getFullYear() === d.getFullYear();
    });

    let totalScore = 0;
    alertsOnDay.forEach(a => {
       totalScore += (a.fraudScore || 0) * 100;
    });
    // Format avg score to have 2 decimal places to be user friendly. Fallback to global avgScore if none.
    const dayAvgScore = alertsOnDay.length > 0 ? Number((totalScore / alertsOnDay.length).toFixed(2)) : avgScore;

    chartData.push({
      day: dayString,
      approved,
      flagged,
      blocked,
      avgScore: isNaN(dayAvgScore) ? avgScore : dayAvgScore
    });
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>Dashboard Overview</h1>
          <p>
            Real-time fraud detection powered by RAG pipeline •{" "}
            {loading ? "Loading..." : sseStatus === "live" ? "Live updates active" : "Reconnecting..."}
          </p>
        </div>

        <div className="header-actions">
          <button className="btn" onClick={fetchAllData} disabled={loading}>
            {loading ? "Refreshing..." : "⟳ Refresh"}
          </button>
          <span className={`badge ${sseStatus === "live" ? "success" : "warning"}`}>
            {sseStatus === "live" ? "● Pipeline Active" : sseStatus === "connecting" ? "● Connecting..." : "● Reconnecting..."}
          </span>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="APPROVED"
          value={approvedCount}
          subtitle="Successful transactions"
          change="+12%"
          trend="up"
          icon={<Activity size={18} />}
          color="green"
        />

        <StatCard
          title="FLAGGED"
          value={flaggedCount}
          subtitle="Needs review"
          change={`${flaggedCount > 0 ? '+' : ''}${flaggedCount}`}
          trend={flaggedCount > 0 ? "up" : "down"}
          icon={<AlertTriangle size={18} />}
          color="yellow"
        />

        <StatCard
          title="BLOCKED"
          value={blockedCount}
          subtitle="Auto-blocked"
          change={`${blockedCount > 0 ? '+' : ''}${blockedCount}`}
          trend={blockedCount > 0 ? "up" : "down"}
          icon={<Shield size={18} />}
          color="red"
        />

        <StatCard
          title="AVG FRAUD SCORE"
          value={`${avgScore}%`}
          subtitle="Risk assessment"
          change={avgScore > 50 ? "High risk" : "Low risk"}
          trend={avgScore > 50 ? "up" : "down"}
          icon={<TrendingUp size={18} />}
          color="purple"
        />

        <StatCard
          title="RISK SCORE"
          value={riskProfile ? `${Math.round(riskProfile.riskScore * 100)}%` : "N/A"}
          subtitle={riskProfile?.riskLevel || "Loading..."}
          change="Based on behavior"
          icon={<Brain size={18} />}
          color="orange"
        />
      </div>

      {/* Pass both chart data and actual transactions to AnalyticsChart */}
      <AnalyticsChart
        data={chartData}
        transactions={transactions}
      />

      {/* ✅ UPDATED: Removed hardcoded white background & padding to respect Dark Theme */}
      <div className="bottom-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '24px', 
        marginTop: '24px' 
      }}>
        
        {/* Fraud Alerts Box */}
        <div style={{ 
          height: '600px', 
          overflowY: 'auto',
          // Hiding standard scrollbar for a cleaner look in dark mode
          scrollbarWidth: 'thin',
          scrollbarColor: darkMode ? '#333 #1e1e2e' : '#ccc transparent'
        }}>
          <FraudAlerts alerts={alerts} />
        </div>

        {/* Live Kafka Feed Box */}
        <div style={{ 
          height: '600px', 
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: darkMode ? '#333 #1e1e2e' : '#ccc transparent'
        }}>
          <LiveKafkaFeed messages={liveFeed} status={sseStatus} />
        </div>

      </div>
    </div>
  );
}