import React, { useEffect, useState } from 'react';
import { fraudAPI, ragAPI } from '../api/api';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [explanation, setExplanation] = useState('');
  const [explaining, setExplaining] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const res = await fraudAPI.getAlerts();
      setAlerts(res.data || []);
    } catch (err) {
      console.error('Failed to load alerts', err);
    } finally {
      setLoading(false);
    }
  }

  async function getExplanation(alert) {
    try {
      setSelectedAlert(alert);
      setExplaining(true);
      setExplanation('');
      
      const transactionData = {
        id: alert.transactionId,
        accountId: alert.accountId || 'unknown',
        amount: alert.amount || 100,
        currency: 'USD',
        merchant: 'Unknown',
        merchantCategory: alert.ruleTriggered || 'FRAUD_DETECTED',
        location: 'Unknown',
        ipAddress: 'present',
        deviceId: 'present',
        timestamp: alert.createdAt || new Date().toISOString(),
      };
      
      const response = await ragAPI.explain(transactionData);
      setExplanation(response.data.explanation || 'No detailed explanation available.');
    } catch (err) {
      console.error('Failed to get explanation', err);
      setExplanation('Unable to fetch AI explanation at this time. The RAG service may be unavailable.');
    } finally {
      setExplaining(false);
    }
  }

  const getRiskLevel = (score) => {
    if (score >= 0.9) return 'CRITICAL';
    if (score >= 0.7) return 'HIGH';
    if (score >= 0.4) return 'MEDIUM';
    return 'LOW';
  };

  const getRiskClass = (level) => {
    switch(level) {
      case 'CRITICAL': return 'risk-critical';
      case 'HIGH': return 'risk-high';
      case 'MEDIUM': return 'risk-medium';
      default: return 'risk-low';
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Fraud Alerts</h1>
        <button className="btn" onClick={load} disabled={loading}>
          {loading ? 'Loading...' : '⟳ Refresh'}
        </button>
      </div>

      {selectedAlert && (
        <div className="modal-overlay" onClick={() => setSelectedAlert(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>AI Fraud Analysis</h3>
              <button className="modal-close" onClick={() => setSelectedAlert(null)}>×</button>
            </div>
            <div className="modal-body">
              {explaining ? (
                <div className="loading-spinner">Generating AI explanation...</div>
              ) : (
                <>
                  <div className="alert-details">
                    <p><strong>Transaction ID:</strong> {selectedAlert.transactionId}</p>
                    <p><strong>Rule Triggered:</strong> {selectedAlert.ruleTriggered}</p>
                    <p><strong>Fraud Score:</strong> {Math.round(selectedAlert.fraudScore * 100)}%</p>
                    <p><strong>Status:</strong> {selectedAlert.status}</p>
                  </div>
                  <div className="explanation-box">
                    <h4>🤖 AI Explanation</h4>
                    <p>{explanation}</p>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setSelectedAlert(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3>All Fraud Alerts</h3>
        {loading ? (
          <p>Loading alerts...</p>
        ) : alerts.length === 0 ? (
          <p>No fraud alerts detected. Your transactions appear safe!</p>
        ) : (
          <div className="table-box">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Risk Level</th>
                  <th>Rule Triggered</th>
                  <th>Created</th>
                  <th>AI Insight</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => {
                  const riskLevel = getRiskLevel(a.fraudScore);
                  return (
                    <tr key={a.id}>
                      <td className="mono">{a.transactionId?.slice(0, 8)}...</td>
                      <td>
                        <span className={`status-badge ${a.status === 'BLOCKED' ? 'badge-danger' : 'badge-warning'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td>
                        <div className="score-cell">
                          <div className="score-bar">
                            <div className="score-fill" style={{ width: `${a.fraudScore * 100}%` }}></div>
                          </div>
                          <span className="mono">{Math.round(a.fraudScore * 100)}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`risk-badge ${getRiskClass(riskLevel)}`}>
                          {riskLevel}
                        </span>
                      </td>
                      <td><code>{a.ruleTriggered}</code></td>
                      <td>{new Date(a.createdAt).toLocaleString()}</td>
                      <td>
                        <button className="btn-small" onClick={() => getExplanation(a)}>
                          🔍 Explain
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}