import React, { useState } from 'react';

export default function FraudAlerts({ alerts }) {
  const [filter, setFilter] = useState('ALL');
  
  const filteredAlerts = filter === 'ALL' 
    ? alerts 
    : alerts.filter(a => a.status === filter);

  const getRiskLevel = (score) => {
    if (score >= 0.9) return "CRITICAL";
    if (score >= 0.7) return "HIGH";
    if (score >= 0.4) return "MEDIUM";
    return "LOW";
  };

  return (
    <div className="alerts-box">
      <div className="alerts-header">
        <h3>Recent Fraud Alerts</h3>
        <span className="badge danger">{alerts.filter(a => a.status === "BLOCKED").length} blocked</span>

        <div className="filters">
          <button 
            className={`filter ${filter === 'ALL' ? 'active' : ''}`} 
            onClick={() => setFilter('ALL')}
          >
            All
          </button>
          <button 
            className={`filter ${filter === 'FLAGGED' ? 'active' : ''}`} 
            onClick={() => setFilter('FLAGGED')}
          >
            Flagged
          </button>
          <button 
            className={`filter ${filter === 'BLOCKED' ? 'active' : ''}`} 
            onClick={() => setFilter('BLOCKED')}
          >
            Blocked
          </button>
        </div>
      </div>

      <div className="alerts-list">
        {filteredAlerts.length === 0 ? (
          <div className="no-alerts">No alerts to display</div>
        ) : (
          filteredAlerts.slice(0, 5).map((a) => {
            const riskLevel = getRiskLevel(a.fraudScore);
            
            return (
              <div
                key={a.id}
                className={`alert-item ${a.status === "BLOCKED" ? "blocked" : "flagged"}`}
              >
                <div className="alert-left">
                  <div className="alert-id">
                    <b>{a.transactionId?.slice(0, 10)}...</b>
                  </div>
                  <p className="alert-desc">
                    Rule: <b>{a.ruleTriggered}</b>
                  </p>

                  <div className="progress-row">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.round(a.fraudScore * 100)}%` }}
                      ></div>
                    </div>

                    <span className="progress-value">
                      {Math.round(a.fraudScore * 100)}%
                    </span>
                  </div>

                  <p className="alert-time">
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="alert-right">
                  <span className={`status-pill ${a.status === "BLOCKED" ? "red" : "yellow"}`}>
                    {a.status}
                  </span>

                  <span className={`risk-pill ${riskLevel === "CRITICAL" ? "red" : "orange"}`}>
                    {riskLevel}
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