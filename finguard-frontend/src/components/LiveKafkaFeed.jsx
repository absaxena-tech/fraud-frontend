import React, { useEffect, useMemo, useRef, useState } from "react";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTimestamp(raw) {
  if (!raw) return "—";
  try {
    const d = new Date(raw);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return raw;
  }
}

function shortId(id) {
  if (!id) return "—";
  const s = String(id);
  return s.length > 13 ? `${s.slice(0, 8)}…${s.slice(-4)}` : s;
}

function severityColor(severity) {
  if (severity === "HIGH")
    return { bar: "#ef4444", label: "#fca5a5", bg: "rgba(239,68,68,0.08)" };
  if (severity === "MEDIUM")
    return { bar: "#f97316", label: "#fdba74", bg: "rgba(249,115,22,0.08)" };
  if (severity === "LOW")
    return { bar: "#eab308", label: "#fde047", bg: "rgba(234,179,8,0.08)" };
  return { bar: "#22c55e", label: "#86efac", bg: "rgba(34,197,94,0.08)" };
}

function getPayload(message) {
  if (message?.data && typeof message.data === "object") return message.data;
  if (message?.value && typeof message.value === "object") return message.value;
  return {};
}

function formatMoney(amount) {
  if (amount === null || amount === undefined) return "—";
  return `${Number(amount).toLocaleString()}`;
}

function formatScore(score) {
  if (score === null || score === undefined) return "—";
  return Number(score).toFixed(2);
}

// Map Kafka status to our UI-friendly keys
function getKafkaStatus(message) {
  const payload = getPayload(message);
  const rawStatus = payload?.status ?? message?.status ?? null;

  if (!rawStatus) return "OK";

  const s = String(rawStatus).toUpperCase();
  if (s === "FLAGGED") return "FLAGGED";
  if (s === "BLOCKED") return "BLOCKED";
  if (s === "SUCCESS") return "OK";
  return "OK";
}

function getTransactionId(message) {
  return (
    message?.data?.transactionId ??
    message?.data?.id ??
    message?.messageId ??
    null
  );
}

// ── UI Components ──────────────────────────────────────────────────────────

function StatusDot({ status }) {
  const colors = {
    OK: { dot: "#22c55e", label: "OK" },
    FLAGGED: { dot: "#f97316", label: "FLAG" },
    BLOCKED: { dot: "#ef4444", label: "BLOCK" },
    connecting: { dot: "#eab308", label: "CONN" },
    error: { dot: "#ef4444", label: "ERR" },
  };

  const c = colors[status] || colors.connecting;

  return (
    <span className="status-dot-container">
      <span
        className={`status-dot ${
          status === "live" || status === "connecting" ? "status-dot-pulse" : ""
        }`}
        style={{ background: c.dot }}
      />
      <span className="status-label" style={{ color: c.dot }}>
        {c.label}
      </span>
    </span>
  );
}

function Tooltip({ children, tooltipText }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const targetRef = useRef(null);

  const handleMouseEnter = () => {
    if (targetRef.current && tooltipText && tooltipText !== "—") {
      const rect = targetRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => setShowTooltip(false);

  if (!tooltipText || tooltipText === "—") return <>{children}</>;

  return (
    <>
      <span
        ref={targetRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: "pointer", display: "inline-block" }}
      >
        {children}
      </span>
      {showTooltip && (
        <div
          style={{
            position: "fixed",
            top: `${position.top - 5}px`,
            left: `${position.left}px`,
            transform: "translateX(-50%) translateY(-100%)",
            background: "#1f2937",
            color: "#f3f4f6",
            padding: "6px 10px",
            borderRadius: "4px",
            fontSize: "11px",
            fontFamily: "monospace",
            whiteSpace: "nowrap",
            zIndex: 1000,
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            pointerEvents: "none",
            border: "1px solid #374151",
          }}
        >
          {tooltipText}
        </div>
      )}
    </>
  );
}

function MetaItem({ label, value, fullValue, mono }) {
  if (!value && value !== 0) return null;
  const tooltipText = fullValue !== undefined ? fullValue : value;

  return (
    <div className="meta-item">
      <span className="meta-label">{label}</span>
      <Tooltip tooltipText={tooltipText}>
        <span className={`meta-value ${mono ? "meta-value-mono" : ""}`}>
          {value}
        </span>
      </Tooltip>
    </div>
  );
}

function KafkaCard({ message, isNew }) {
  const severity = message.severity || null;
  const colors = severity !== null ? severityColor(severity) : severityColor("INFO");

  const cardStatus = getKafkaStatus(message);
  const payload = getPayload(message);
  const timestamp = message.timestamp || message.detectedAt || Date.now();

  const txId = getTransactionId(message);

  return (
    <div
      className={`kafka-card ${isNew ? "kafka-card-new" : ""}`}
      style={{
        background: colors.bg,
        borderLeftColor: colors.bar,
      }}
    >
      <div className="kafka-card-header">
        <div className="kafka-card-left">
          <StatusDot status={cardStatus} />
          <span className="kafka-card-time">{formatTimestamp(timestamp)}</span>

          {message.topic && (
            <span
              className="kafka-topic-badge"
              style={{
                background: colors.bar,
                color: "white",
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "10px",
                marginLeft: "8px",
              }}
            >
              {message.topic}
            </span>
          )}
        </div>
      </div>

      <div className="kafka-card-data">
        {!payload || typeof payload !== "object" ? (
          <pre className="kafka-card-data-preview">{String(message.value || "—")}</pre>
        ) : (
          <>
            <div className="kafka-details-grid">
              {txId && <MetaItem label="TX ID" value={shortId(txId)} fullValue={txId} mono />}
              {payload.accountId && <MetaItem label="Account" value={shortId(payload.accountId)} fullValue={payload.accountId} mono />}
              {payload.userEmail && <MetaItem label="Email" value={payload.userEmail.split("@")[0]} fullValue={payload.userEmail} />}
              {payload.amount !== undefined && <MetaItem label="Amount" value={formatMoney(payload.amount)} />}
              {payload.currency && <MetaItem label="Currency" value={payload.currency} />}
              {payload.fraudScore !== undefined && <MetaItem label="Fraud Score" value={formatScore(payload.fraudScore)} />}
              {payload.ruleTriggered && <MetaItem label="Rule" value={payload.ruleTriggered} />}
              {payload.merchant && <MetaItem label="Merchant" value={payload.merchant} />}
              {payload.merchantCategory && <MetaItem label="Category" value={payload.merchantCategory} />}
              {payload.location && <MetaItem label="Location" value={payload.location} />}
              {payload.ipAddress && <MetaItem label="IP" value={payload.ipAddress} mono />}
              {payload.deviceId && <MetaItem label="Device" value={shortId(payload.deviceId)} fullValue={payload.deviceId} mono />}
              <MetaItem label="Status" value={cardStatus} />
              {payload.timestamp && <MetaItem label="Detected" value={formatTimestamp(payload.timestamp)} fullValue={payload.timestamp} />}
            </div>

            {payload.explanation && (
              <div style={{ marginTop: "12px", padding: "10px 12px", borderRadius: "10px", background: "rgba(0,0,0,0.20)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#cbd5e1", marginBottom: "6px", letterSpacing: "0.04em", textTransform: "uppercase" }}>Explanation</div>
                <div style={{ fontSize: "13px", lineHeight: 1.5, color: "#f8fafc", whiteSpace: "pre-wrap" }}>{payload.explanation}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">📡</div>
      <p className="empty-state-text">Waiting for messages...</p>
      <p className="empty-state-subtext">Messages will appear here</p>
    </div>
  );
}

function LiveCounter({ count }) {
  const [prevCount, setPrevCount] = useState(count);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (count > prevCount) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);
    }
    setPrevCount(count);
  }, [count]);

  return <span className={`live-counter ${isAnimating ? "live-counter-pulse" : ""}`}>{count}</span>;
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function LiveKafkaFeed({ messages = [], status = "connecting" }) {
  const prevLengthRef = useRef(0);
  const feedEndRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const statusPriority = { BLOCKED: 3, FLAGGED: 2, OK: 1 };

  const deduplicatedMessages = useMemo(() => {
    const map = new Map();

    for (const msg of messages) {
      const txId = getTransactionId(msg) || msg.key || msg.messageId;
      if (!txId) continue;

      const existing = map.get(txId);

      const msgStatus = getKafkaStatus(msg);
      const existingStatus = existing ? getKafkaStatus(existing) : "OK";

      if (!existing || statusPriority[msgStatus] >= statusPriority[existingStatus]) {
        map.set(txId, msg);
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const ta = new Date(a.timestamp || a.detectedAt || 0).getTime();
      const tb = new Date(b.timestamp || b.detectedAt || 0).getTime();
      return ta - tb;
    });
  }, [messages]);

  const newCount =
    deduplicatedMessages.length > prevLengthRef.current
      ? deduplicatedMessages.length - prevLengthRef.current
      : 0;

  useEffect(() => {
    prevLengthRef.current = deduplicatedMessages.length;
  }, [deduplicatedMessages.length]);

  useEffect(() => {
    if (autoScroll && feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [deduplicatedMessages, autoScroll]);

  return (
    <div className="live-kafka-feed">
      <div className="feed-header">
        <div className="feed-header-left">
          <span className="feed-title">📡 Kafka Live Feed</span>
          {deduplicatedMessages.length > 0 && <LiveCounter count={deduplicatedMessages.length} />}
          <div className="live-badge">
            <span className="live-badge-dot" />
            <span>LIVE</span>
          </div>
        </div>

        <StatusDot status={status} />
      </div>

      <div className="feed-list">
        {deduplicatedMessages.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {deduplicatedMessages.map((message, idx) => (
              <KafkaCard key={getTransactionId(message) || `${message.topic}-${idx}`} message={message} isNew={idx >= deduplicatedMessages.length - newCount} />
            ))}
            <div ref={feedEndRef} />
          </>
        )}
      </div>

      {status === "error" && <div className="feed-footer-error">⚠ Connection lost — reconnecting...</div>}
    </div>
  );
}