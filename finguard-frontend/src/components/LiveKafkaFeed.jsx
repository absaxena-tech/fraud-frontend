import React, { useEffect, useRef, useContext, useState } from 'react';
import { ThemeContext } from '../App';

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTimestamp(raw) {
  if (!raw) return "—";
  try {
    const d = new Date(raw);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return raw;
  }
}

function shortId(id) {
  if (!id) return "—";
  const s = String(id);
  return s.length > 13 ? `${s.slice(0, 8)}…${s.slice(-4)}` : s;
}

function getSeverityInfo(severity, isDarkMode) {
  const config = {
    HIGH: {
      icon: '🔴',
      label: 'High',
      color: isDarkMode ? '#ef4444' : '#dc2626',
      bg: isDarkMode ? 'rgba(239,68,68,0.1)' : '#fee2e2',
      border: isDarkMode ? 'rgba(239,68,68,0.3)' : '#fecaca',
    },
    MEDIUM: {
      icon: '🟠',
      label: 'Medium',
      color: isDarkMode ? '#f97316' : '#ea580c',
      bg: isDarkMode ? 'rgba(249,115,22,0.1)' : '#ffedd5',
      border: isDarkMode ? 'rgba(249,115,22,0.3)' : '#fed7aa',
    },
    LOW: {
      icon: '🟡',
      label: 'Low',
      color: isDarkMode ? '#eab308' : '#ca8a04',
      bg: isDarkMode ? 'rgba(234,179,8,0.1)' : '#fef9c3',
      border: isDarkMode ? 'rgba(234,179,8,0.3)' : '#fde047',
    },
    INFO: {
      icon: '🔵',
      label: 'Info',
      color: isDarkMode ? '#3b82f6' : '#2563eb',
      bg: isDarkMode ? 'rgba(59,130,246,0.1)' : '#dbeafe',
      border: isDarkMode ? 'rgba(59,130,246,0.3)' : '#bfdbfe',
    },
  };
  return config[severity] || config.INFO;
}

function formatDataPreview(data) {
  if (data == null) return null;
  if (typeof data === "object") {
    // Extract important fields for preview
    const important = {};
    if (data.transactionId) important.tx = shortId(data.transactionId);
    if (data.amount) important.amount = `$${data.amount}`;
    if (data.accountId) important.account = shortId(data.accountId);
    if (data.status) important.status = data.status;
    
    if (Object.keys(important).length > 0) {
      return Object.entries(important).map(([k, v]) => `${k}: ${v}`).join(' · ');
    }
    return JSON.stringify(data, null, 2);
  }
  return String(data);
}

// ── UI Components ──────────────────────────────────────────────────────────

function StatusBadge({ status, isDarkMode }) {
  const statusConfig = {
    live: { label: 'LIVE', color: '#22c55e', bg: isDarkMode ? 'rgba(34,197,94,0.1)' : '#dcfce7' },
    connecting: { label: 'CONNECTING', color: '#eab308', bg: isDarkMode ? 'rgba(234,179,8,0.1)' : '#fef9c3' },
    error: { label: 'ERROR', color: '#ef4444', bg: isDarkMode ? 'rgba(239,68,68,0.1)' : '#fee2e2' },
  };
  
  const config = statusConfig[status] || statusConfig.connecting;
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      borderRadius: '20px',
      background: config.bg,
    }}>
      <div style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: config.color,
        animation: status === 'live' ? 'pulse 1.5s ease-in-out infinite' : 'none',
      }} />
      <span style={{
        fontSize: '11px',
        fontWeight: 700,
        color: config.color,
        letterSpacing: '0.5px',
      }}>
        {config.label}
      </span>
    </div>
  );
}

function TopicChip({ topic, isDarkMode }) {
  return (
    <span style={{
      fontSize: '10px',
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: '4px',
      background: isDarkMode ? 'rgba(59,130,246,0.2)' : '#eff6ff',
      color: isDarkMode ? '#60a5fa' : '#2563eb',
      fontFamily: 'monospace',
    }}>
      {topic}
    </span>
  );
}

function MetricBadge({ icon, value, label, isDarkMode }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '11px',
      color: isDarkMode ? '#9ca3af' : '#6b7280',
    }}>
      <span style={{ fontSize: '12px' }}>{icon}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
      <span style={{ fontSize: '10px' }}>{label}</span>
    </div>
  );
}

function KafkaMessage({ message, isNew, isDarkMode }) {
  const severity = message.severity || 'INFO';
  const severityInfo = getSeverityInfo(severity, isDarkMode);
  const dataPreview = formatDataPreview(message.data);
  const timestamp = formatTimestamp(message.timestamp);
  
  const [expanded, setExpanded] = useState(false);
  const fullData = message.data ? JSON.stringify(message.data, null, 2) : null;
  
  return (
    <div style={{
      background: isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff',
      border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
      borderLeft: `3px solid ${severityInfo.color}`,
      borderRadius: '8px',
      marginBottom: '12px',
      transition: 'all 0.2s ease',
      animation: isNew ? 'slideIn 0.3s ease-out' : 'none',
      boxShadow: isDarkMode ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        borderBottom: expanded ? `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : '#f3f4f6'}` : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '6px',
            background: severityInfo.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
          }}>
            {severityInfo.icon}
          </div>
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 600,
              fontSize: '13px',
              color: isDarkMode ? '#f3f4f6' : '#111827',
              marginBottom: '4px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {message.key ? `[${message.key}] ` : ''}{message.value || 'Kafka Message'}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {message.topic && <TopicChip topic={message.topic} isDarkMode={isDarkMode} />}
              <span style={{
                fontSize: '11px',
                color: isDarkMode ? '#9ca3af' : '#6b7280',
              }}>
                {timestamp}
              </span>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 600,
            background: severityInfo.bg,
            color: severityInfo.color,
          }}>
            {severityInfo.label}
          </span>
          
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              color: isDarkMode ? '#9ca3af' : '#6b7280',
              display: 'flex',
              alignItems: 'center',
              transition: 'transform 0.2s',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            ▼
          </button>
        </div>
      </div>
      
      {/* Metadata */}
      <div style={{
        padding: expanded ? '12px 16px' : '0 16px 12px 16px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        borderBottom: expanded ? `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : '#f3f4f6'}` : 'none',
      }}>
        {message.partition !== undefined && (
          <MetricBadge icon="📦" value={`P${message.partition}`} label="Partition" isDarkMode={isDarkMode} />
        )}
        {message.offset !== undefined && (
          <MetricBadge icon="📍" value={`O${message.offset}`} label="Offset" isDarkMode={isDarkMode} />
        )}
        {message.key && (
          <MetricBadge icon="🔑" value={shortId(message.key)} label="Key" isDarkMode={isDarkMode} />
        )}
        {message.messageId && (
          <MetricBadge icon="🆔" value={shortId(message.messageId)} label="ID" isDarkMode={isDarkMode} />
        )}
      </div>
      
      {/* Data Preview */}
      {dataPreview && (
        <div style={{ padding: expanded ? '0 16px 12px 16px' : '0 16px 12px 16px' }}>
          <div style={{
            background: isDarkMode ? 'rgba(0,0,0,0.3)' : '#f9fafb',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '11px',
            fontFamily: 'monospace',
            color: isDarkMode ? '#d1d5db' : '#374151',
            cursor: expanded ? 'default' : 'pointer',
            whiteSpace: expanded ? 'pre-wrap' : 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }} onClick={() => !expanded && setExpanded(true)}>
            {expanded ? fullData : dataPreview}
            {!expanded && dataPreview.length > 60 && (
              <span style={{ color: severityInfo.color, marginLeft: '8px' }}>... click to expand</span>
            )}
          </div>
        </div>
      )}
      
      {/* Expand/Collapse Button for expanded view */}
      {expanded && fullData && fullData.length > 200 && (
        <div style={{ padding: '0 16px 12px 16px' }}>
          <button
            onClick={() => setExpanded(false)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '11px',
              color: severityInfo.color,
              cursor: 'pointer',
              padding: '4px 0',
            }}
          >
            Show less ↑
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ isDarkMode }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 20px',
      textAlign: 'center',
    }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: '32px',
        background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px',
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: isDarkMode ? '#6b7280' : '#9ca3af' }}>
          <path d="M2 12h20M12 2v20M4 4l16 16M20 4L4 20" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h3 style={{
        fontSize: '14px',
        fontWeight: 600,
        margin: '0 0 8px 0',
        color: isDarkMode ? '#e5e7eb' : '#374151',
      }}>
        No messages yet
      </h3>
      <p style={{
        fontSize: '12px',
        margin: 0,
        color: isDarkMode ? '#9ca3af' : '#6b7280',
      }}>
        Waiting for Kafka messages to arrive...
      </p>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function LiveKafkaFeed({ messages = [], status = "connecting" }) {
  const { darkMode } = useContext(ThemeContext);
  const isDarkMode = darkMode;
  const messagesEndRef = useRef(null);
  const prevLengthRef = useRef(0);
  
  const newCount = messages.length > prevLengthRef.current ? messages.length - prevLengthRef.current : 0;

  useEffect(() => {
    prevLengthRef.current = messages.length;
    // Auto-scroll to bottom on new messages
    if (messages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const stats = {
    total: messages.length,
    high: messages.filter(m => m.severity === 'HIGH').length,
    medium: messages.filter(m => m.severity === 'MEDIUM').length,
    low: messages.filter(m => m.severity === 'LOW').length,
  };

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div style={{
        background: isDarkMode ? '#1f2937' : '#ffffff',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: isDarkMode ? '0 4px 6px -1px rgba(0,0,0,0.3)' : '0 1px 3px 0 rgba(0,0,0,0.1)',
        border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          background: isDarkMode ? '#111827' : '#f9fafb',
          borderBottom: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{
                fontSize: '16px',
                fontWeight: 700,
                margin: 0,
                color: isDarkMode ? '#f3f4f6' : '#111827',
              }}>
                Live Kafka Feed
              </h2>
              <div style={{
                padding: '2px 8px',
                borderRadius: '20px',
                background: isDarkMode ? '#374151' : '#e5e7eb',
                fontSize: '12px',
                fontWeight: 600,
                color: isDarkMode ? '#9ca3af' : '#4b5563',
              }}>
                {stats.total} messages
              </div>
            </div>
            <StatusBadge status={status} isDarkMode={isDarkMode} />
          </div>
          
          {/* Stats */}
          {stats.total > 0 && (
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {stats.high > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🔴</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: isDarkMode ? '#f3f4f6' : '#111827' }}>
                    {stats.high}
                  </span>
                  <span style={{ fontSize: '11px', color: isDarkMode ? '#9ca3af' : '#6b7280' }}>High</span>
                </div>
              )}
              {stats.medium > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🟠</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: isDarkMode ? '#f3f4f6' : '#111827' }}>
                    {stats.medium}
                  </span>
                  <span style={{ fontSize: '11px', color: isDarkMode ? '#9ca3af' : '#6b7280' }}>Medium</span>
                </div>
              )}
              {stats.low > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🟡</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: isDarkMode ? '#f3f4f6' : '#111827' }}>
                    {stats.low}
                  </span>
                  <span style={{ fontSize: '11px', color: isDarkMode ? '#9ca3af' : '#6b7280' }}>Low</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Messages List */}
        <div style={{
          padding: '16px 20px',
          maxHeight: '500px',
          overflowY: 'auto',
          background: isDarkMode ? '#1f2937' : '#ffffff',
        }}>
          {messages.length === 0 ? (
            <EmptyState isDarkMode={isDarkMode} />
          ) : (
            <>
              {messages.map((message, idx) => (
                <KafkaMessage
                  key={message.messageId || `${message.topic}-${message.partition}-${message.offset}-${idx}`}
                  message={message}
                  isNew={idx < newCount}
                  isDarkMode={isDarkMode}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Error Footer */}
        {status === "error" && (
          <div style={{
            padding: '12px 20px',
            background: isDarkMode ? 'rgba(239,68,68,0.1)' : '#fef2f2',
            borderTop: `1px solid ${isDarkMode ? 'rgba(239,68,68,0.2)' : '#fee2e2'}`,
            fontSize: '12px',
            color: isDarkMode ? '#fca5a5' : '#dc2626',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span>⚠️</span>
            <span>Connection lost — attempting to reconnect to Kafka...</span>
          </div>
        )}
      </div>
    </>
  );
}