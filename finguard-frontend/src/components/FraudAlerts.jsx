import React, { useState } from "react";
import { AlertTriangle, Shield, Clock } from "lucide-react";

export default function FraudAlerts({ alerts }) {
  const [filter, setFilter] = useState("ALL");

  const filteredAlerts =
    filter === "ALL" ? alerts : alerts.filter((a) => a.status === filter);

  const getRiskLevel = (score) => {
    if (score >= 0.9) return "CRITICAL";
    if (score >= 0.7) return "HIGH";
    if (score >= 0.4) return "MEDIUM";
    return "LOW";
  };

  const getRiskColor = (level) => {
    switch (level) {
      case "CRITICAL":
        return "#FF4D4F";
      case "HIGH":
        return "#FF7A45";
      case "MEDIUM":
        return "#FAAD14";
      default:
        return "#52C41A";
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>

      {/* HEADER */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          padding: "12px",
          backdropFilter: "blur(6px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <h3 style={{ marginBottom: "8px" }}>Fraud Alerts</h3>

        <div style={{ display: "flex", gap: "8px" }}>
          {["ALL", "FLAGGED", "BLOCKED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 10px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                background: filter === f ? "#6366F1" : "rgba(255,255,255,0.08)",
                color: filter === f ? "#fff" : "#aaa",
                fontSize: "12px",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* LIST */}
      <div
        style={{
          overflowY: "auto",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {filteredAlerts.length === 0 ? (
          <div style={{ textAlign: "center", opacity: 0.6 }}>
            No alerts to display
          </div>
        ) : (
          filteredAlerts.map((a, index) => {
            const riskLevel = getRiskLevel(a.fraudScore);
            const score = Math.round((a.fraudScore || 0) * 100);

            const rules = a.rulesTriggered || [];

            return (
              <div
                key={a.id || index}
                style={{
                  padding: "14px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  transition: "0.2s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "scale(1.01)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
              >
                {/* TOP */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <AlertTriangle size={16} color="#FACC15" />
                    <strong>{a.transactionId?.slice(0, 12)}...</strong>
                  </div>

                  <div style={{ display: "flex", gap: "6px" }}>
                    {/* STATUS */}
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "999px",
                        fontSize: "11px",
                        background:
                          a.status === "BLOCKED"
                            ? "rgba(255,77,79,0.15)"
                            : "rgba(250,173,20,0.15)",
                        color:
                          a.status === "BLOCKED" ? "#FF4D4F" : "#FAAD14",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      {a.status === "BLOCKED" && <Shield size={12} />}
                      {a.status}
                    </span>

                    {/* RISK */}
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "999px",
                        fontSize: "11px",
                        background: `${getRiskColor(riskLevel)}20`,
                        color: getRiskColor(riskLevel),
                      }}
                    >
                      {riskLevel}
                    </span>
                  </div>
                </div>

                {/* :white_check_mark: RULES TRIGGERED */}
                {rules.length > 0 && (
                  <>
                    <div
                      style={{
                        fontSize: "12px",
                        marginBottom: "4px",
                        opacity: 0.7,
                      }}
                    >
                      Rules Triggered:
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "6px",
                        marginBottom: "8px",
                      }}
                    >
                      {rules.map((rule, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: "11px",
                            padding: "4px 6px",
                            borderRadius: "6px",
                            background: "rgba(99,102,241,0.15)",
                            color: "#818CF8",
                            fontFamily: "monospace",
                          }}
                        >
                          {rule}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {/* PROGRESS */}
                <div style={{ marginBottom: "6px" }}>
                  <div
                    style={{
                      height: "6px",
                      borderRadius: "6px",
                      background: "rgba(255,255,255,0.08)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${score}%`,
                        height: "100%",
                        background: `linear-gradient(90deg, #FAAD14, ${getRiskColor(
                          riskLevel
                        )})`,
                      }}
                    />
                  </div>
                </div>

                {/* FOOTER */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    opacity: 0.6,
                  }}
                >
                  <span>{score}% risk</span>
                  <span style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                    <Clock size={12} />
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
