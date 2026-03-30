import React, { useEffect, useRef, useState } from "react";

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
  return message?.data?.value || message?.value || {};
}

function formatMoney(amount) {
  if (amount === null || amount === undefined) return "—";
  return `$${Number(amount).toLocaleString()}`;
}

function formatScore(score) {
  if (score === null || score === undefined) return "—";
  return Number(score).toFixed(2);
}

function getKafkaStatus(message) {
  const rawStatus =
    message?.data?.value?.status ??
    message?.value?.status ??
    message?.status ??
    null;

  if (rawStatus === null) return null;

  const s = String(rawStatus).toUpperCase();

  if (s === "FLAGGED") return "flagged";
  if (s === "BLOCKED") return "blocked";

  return null;
}

// ── UI Components ──────────────────────────────────────────────────────────

function StatusDot({ status }) {
  const colors = {
    // live: { dot: "#22c55e", label: "LIVE" },
    connecting: { dot: "#eab308", label: "CONN" },
    error: { dot: "#ef4444", label: "ERR" },
    null: { dot: "#22c55e", label: "OK" },
    flagged: { dot: "#f97316", label: "FLAG" },
    blocked: { dot: "#ef4444", label: "BLOCK" },
  };

  let statusKey = status;
  if (status === null) statusKey = "null";
  if (status === "flagged") statusKey = "flagged";
  if (status === "blocked") statusKey = "blocked";

  const c = colors[statusKey] || colors.connecting;

  return (
    <span className="status-dot-container">
      <span
        className={`status-dot ${status === "live" || status === "connecting" ? "status-dot-pulse" : ""}`}
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
  if (!value) return null;
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

  return (
    <div
      className={`kafka-card ${isNew ? "kafka-card-new" : ""}`}
      style={{
        background: colors.bg,
        borderLeftColor: colors.bar,
      }}
    >
      {isNew && <div className="live-indicator">● NEW</div>}
      
      <div className="kafka-card-header">
        <div className="kafka-card-left">
          <StatusDot status={cardStatus} />
          <span className="kafka-card-time">{formatTimestamp(timestamp)}</span>
        </div>
      </div>

      <div className="kafka-card-data">
        {!payload || typeof payload !== "object" ? (
          <pre className="kafka-card-data-preview">{String(message.value || "—")}</pre>
        ) : (
          <div className="kafka-details-grid">
            {payload.transactionId && (
              <MetaItem
                label="TX ID"
                value={shortId(payload.transactionId)}
                fullValue={payload.transactionId}
                mono
              />
            )}
            {payload.userEmail && (
              <MetaItem label="Email" value={payload.userEmail.split('@')[0]} fullValue={payload.userEmail} />
            )}
            {payload.amount !== undefined && (
              <MetaItem label="Amount" value={formatMoney(payload.amount)} />
            )}
            {payload.fraudScore !== undefined && (
              <MetaItem label="Score" value={formatScore(payload.fraudScore)} />
            )}
            <MetaItem label="Status" value={payload.status ?? "SUCCESS"} />
          </div>
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

  return (
    <span className={`live-counter ${isAnimating ? "live-counter-pulse" : ""}`}>
      {count}
    </span>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function LiveKafkaFeed({ messages = [], status = "connecting" }) {
  const prevLengthRef = useRef(0);
  const feedEndRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const newCount = messages.length > prevLengthRef.current
    ? messages.length - prevLengthRef.current
    : 0;

  useEffect(() => {
    prevLengthRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    if (autoScroll && feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScroll]);

  return (
    <div className="live-kafka-feed">
      <div className="feed-header">
        <div className="feed-header-left">
          <span className="feed-title">📡 Kafka Live Feed</span>
          {messages.length > 0 && <LiveCounter count={messages.length} />}
          <div className="live-badge">
            <span className="live-badge-dot" />
            <span>LIVE</span>
          </div>
        </div>
        <StatusDot status={status} />
      </div>

      <div className="feed-list">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {messages.map((message, idx) => (
              <KafkaCard
                key={message.messageId || `kafka-${idx}`}
                message={message}
                isNew={idx < newCount}
              />
            ))}
            <div ref={feedEndRef} />
          </>
        )}
      </div>

      {/* {messages.length > 0 && (
        <div className="feed-footer">
          <button
            className={`auto-scroll-btn ${autoScroll ? "active" : ""}`}
            onClick={() => setAutoScroll(!autoScroll)}
          >
            {autoScroll ? "📌 Auto-scroll" : "🔽 Manual scroll"}
          </button>
          {newCount > 0 && !autoScroll && (
            <div className="new-badge">↓ {newCount} new message{newCount !== 1 ? "s" : ""}</div>
          )}
        </div>
      )} */}

      {status === "error" && (
        <div className="feed-footer-error">⚠ Connection lost — reconnecting...</div>
      )}
    </div>
  );
}