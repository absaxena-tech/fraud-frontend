import React, { useEffect, useState } from 'react';
import { fraudAPI, ragAPI } from '../api/api';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [explanation, setExplanation] = useState('');
  const [explaining, setExplaining] = useState(false);
  const [explanationError, setExplanationError] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching alerts...');
      let response;
      
      try {
        response = await fraudAPI.getMyAlerts();
        console.log('getMyAlerts response:', response);
      } catch (err) {
        console.log('getMyAlerts failed, trying getAlerts:', err.message);
        try {
          response = await fraudAPI.getAlerts();
          console.log('getAlerts response:', response);
        } catch (fallbackErr) {
          console.error('Both API calls failed:', fallbackErr);
          throw fallbackErr;
        }
      }
      
      let alertsData = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          alertsData = response.data;
        } else if (response.data.content && Array.isArray(response.data.content)) {
          alertsData = response.data.content;
        } else if (response.data.alerts && Array.isArray(response.data.alerts)) {
          alertsData = response.data.alerts;
        } else {
          console.warn('Unexpected response structure:', response.data);
          alertsData = [];
        }
      }
      
      console.log('Processed alerts:', alertsData);
      setAlerts(alertsData);
      
    } catch (err) {
      console.error('Failed to load alerts:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }

  async function getExplanation(alert) {
    try {
      setSelectedAlert(alert);
      setExplaining(true);
      setExplanation('');
      setExplanationError(null);
      
      // Prepare the transaction data
      const transactionData = {
        id: alert.transactionId,
        accountId: alert.accountId || 'unknown',
        userEmail: alert.userEmail || '',
        amount: alert.amount || 0,
        currency: 'USD',
        merchant: alert.merchant || 'Unknown',
        merchantCategory: alert.ruleTriggered || 'FRAUD_DETECTED',
        location: alert.location || 'Unknown',
        ipAddress: alert.ipAddress || 'present',
        deviceId: alert.deviceId || 'present',
        timestamp: alert.detectedAt || alert.createdAt || new Date().toISOString()
      };
      
      // Prepare the rule explanation
      let ruleExplanation = alert.explanation || '';
      if (!ruleExplanation) {
        // Generate a meaningful explanation based on the alert data
        const score = alert.fraudScore || 0;
        const status = alert.status || 'FLAGGED';
        
        if (score >= 0.9) {
          ruleExplanation = `Critical fraud detected. Transaction has very high fraud score of ${Math.round(score * 100)}%. Immediate action required.`;
        } else if (score >= 0.7) {
          ruleExplanation = `High risk transaction with fraud score ${Math.round(score * 100)}%. Multiple fraud indicators detected.`;
        } else if (score >= 0.4) {
          ruleExplanation = `Medium risk transaction with fraud score ${Math.round(score * 100)}%. Some suspicious patterns detected.`;
        } else {
          ruleExplanation = `Low risk but flagged due to ${alert.ruleTriggered || 'specific rule'}. May require verification.`;
        }
      }
      
      console.log('Sending to RAG API:', { transactionData, ruleExplanation });
      
      // Call the RAG API with both transaction data and rule explanation
      const response = await ragAPI.explain(transactionData, ruleExplanation);
      console.log('RAG API response:', response);
      
      if (response.data && response.data.explanation) {
        setExplanation(response.data.explanation);
      } else if (response.data && response.data.message) {
        setExplanation(response.data.message);
      } else {
        setExplanation('No detailed explanation available.');
      }
    } catch (err) {
      console.error('Failed to get explanation:', err);
      console.error('Error details:', err.response);
      
      let errorMessage = 'Unable to fetch AI explanation. ';
      
      if (err.response) {
        console.error('Response data:', err.response.data);
        console.error('Response status:', err.response.status);
        console.error('Response headers:', err.response.headers);
        
        errorMessage += `Server returned ${err.response.status}: `;
        if (err.response.data && err.response.data.message) {
          errorMessage += err.response.data.message;
        } else if (err.response.data && err.response.data.error) {
          errorMessage += err.response.data.error;
        } else if (err.response.status === 500) {
          errorMessage += 'Internal server error. The RAG service may be unavailable.';
        } else if (err.response.status === 400) {
          errorMessage += 'Invalid request format. Please try again.';
        } else {
          errorMessage += 'Unknown error occurred.';
        }
        
        // Generate a fallback explanation since the API failed
        const fallbackExplanation = generateFallbackExplanation(alert);
        setExplanation(fallbackExplanation);
        setExplanationError(`${errorMessage} Showing basic explanation instead.`);
      } else if (err.request) {
        errorMessage += 'No response from server. The RAG service might be down.';
        setExplanation(generateFallbackExplanation(alert));
        setExplanationError(`${errorMessage} Showing basic explanation instead.`);
      } else {
        errorMessage += err.message;
        setExplanation(generateFallbackExplanation(alert));
        setExplanationError(`${errorMessage} Showing basic explanation instead.`);
      }
    } finally {
      setExplaining(false);
    }
  }
  
  // Generate a fallback explanation when the RAG service is unavailable
  function generateFallbackExplanation(alert) {
    const score = alert.fraudScore || 0;
    const status = alert.status || 'FLAGGED';
    const rule = alert.ruleTriggered || 'Unknown';
    const amount = alert.amount || 0;
    
    let explanation = `Fraud Alert Analysis (Fallback Mode)\n\n`;
    
    // Risk assessment
    if (score >= 0.9) {
      explanation += `⚠️ CRITICAL RISK: This transaction has a very high fraud score of ${Math.round(score * 100)}%.\n`;
      explanation += `The transaction was ${status.toLowerCase()} because it matched the rule "${rule}".\n`;
      explanation += `Amount: $${amount}\n\n`;
      explanation += `This pattern typically indicates fraudulent activity. Recommended action: BLOCK transaction immediately and contact the customer to verify.\n`;
    } else if (score >= 0.7) {
      explanation += `⚠️ HIGH RISK: This transaction shows suspicious patterns with a fraud score of ${Math.round(score * 100)}%.\n`;
      explanation += `It was ${status.toLowerCase()} due to rule: "${rule}".\n`;
      explanation += `Amount: $${amount}\n\n`;
      explanation += `Recommended action: Flag for review and contact customer to verify transaction authenticity.\n`;
    } else if (score >= 0.4) {
      explanation += `⚠️ MEDIUM RISK: This transaction has some unusual characteristics (score: ${Math.round(score * 100)}%).\n`;
      explanation += `Rule triggered: "${rule}".\n`;
      explanation += `Amount: $${amount}\n\n`;
      explanation += `Recommended action: Monitor this account for additional suspicious activity.\n`;
    } else {
      explanation += `ℹ️ LOW RISK: This transaction has a low fraud score (${Math.round(score * 100)}%).\n`;
      explanation += `However, it was flagged due to: "${rule}".\n`;
      explanation += `Amount: $${amount}\n\n`;
      explanation += `This might be a false positive. Recommended action: Allow transaction but maintain monitoring.\n`;
    }
    
    // Add additional context
    if (amount > 1000) {
      explanation += `\nNote: The transaction amount ($${amount}) is higher than average, which may contribute to the risk assessment.`;
    }
    
    if (status === 'BLOCKED') {
      explanation += `\n\nAction Taken: Transaction was BLOCKED to prevent potential fraud.`;
    } else {
      explanation += `\n\nAction Taken: Transaction was FLAGGED for review.`;
    }
    
    return explanation;
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

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Fraud Alerts</h1>
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? 'Loading...' : '⟳ Retry'}
          </button>
        </div>
        <div className="card error-card">
          <h3>Error Loading Alerts</h3>
          <p>{error}</p>
          <button className="btn" onClick={load}>Try Again</button>
        </div>
      </div>
    );
  }

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
                    <p><strong>Account ID:</strong> {selectedAlert.accountId}</p>
                    <p><strong>Amount:</strong> ${selectedAlert.amount?.toFixed(2)}</p>
                    <p><strong>Rule Triggered:</strong> {selectedAlert.ruleTriggered}</p>
                    <p><strong>Fraud Score:</strong> {Math.round((selectedAlert.fraudScore || 0) * 100)}%</p>
                    <p><strong>Status:</strong> {selectedAlert.status}</p>
                    <p><strong>Detected At:</strong> {new Date(selectedAlert.detectedAt || selectedAlert.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="explanation-box">
                    <h4>🤖 AI Explanation</h4>
                    {explanationError && (
                      <div className="error-message" style={{color: '#dc2626', marginBottom: '10px', fontSize: '12px', padding: '8px', backgroundColor: '#fee2e2', borderRadius: '4px'}}>
                        ⚠️ {explanationError}
                      </div>
                    )}
                    <div style={{whiteSpace: 'pre-wrap', lineHeight: '1.6'}}>
                      {explanation}
                    </div>
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
          <div className="loading-spinner">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="empty-state">
            <p>✅ No fraud alerts detected. Your transactions appear safe!</p>
          </div>
        ) : (
          <div className="table-box">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Account ID</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Risk Level</th>
                  <th>Rule Triggered</th>
                  <th>Detected At</th>
                  <th>AI Insight</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a, index) => {
                  const riskLevel = getRiskLevel(a.fraudScore);
                  return (
                    <tr key={a.id || a.transactionId || index}>
                      <td className="mono">{a.transactionId?.slice(0, 8)}...</td>
                      <td className="mono">{a.accountId?.slice(0, 8)}...</td>
                      <td>${a.amount?.toFixed(2)}</td>
                      <td>
                        <span className={`status-badge ${a.status === 'BLOCKED' ? 'badge-danger' : 'badge-warning'}`}>
                          {a.status || 'FLAGGED'}
                        </span>
                      </td>
                      <td>
                        <div className="score-cell">
                          <div className="score-bar">
                            <div className="score-fill" style={{ width: `${(a.fraudScore || 0) * 100}%` }}></div>
                          </div>
                          <span className="mono">{Math.round((a.fraudScore || 0) * 100)}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`risk-badge ${getRiskClass(riskLevel)}`}>
                          {riskLevel}
                        </span>
                      </td>
                      <td><code>{a.ruleTriggered || 'N/A'}</code></td>
                      <td>{new Date(a.detectedAt || a.createdAt).toLocaleString()}</td>
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