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
  const [hoveredTransaction, setHoveredTransaction] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

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

  const handleTransactionClick = (event, transactionId, alertData) => {
    event.stopPropagation();
    setHoverPosition({ x: event.clientX, y: event.clientY });
    setHoveredTransaction({ id: transactionId, data: alertData });
  };

  const closeHover = () => {
    setHoveredTransaction(null);
  };

  async function getExplanation(alert) {
    try {
      setSelectedAlert(alert);
      setExplaining(true);
      setExplanation('');
      setExplanationError(null);
      console.log('Setting explanation for alert:', alert);

      // Directly use the alert's explanation or a fallback
      let explanation = alert.explanation || generateFallbackExplanation(alert);

      setExplanation(explanation);
    } catch (err) {
      console.error('Failed to set explanation:', err);
      const fallback = generateFallbackExplanation(alert);
      setExplanation(fallback);
      setExplanationError('Unable to fetch AI explanation. Showing basic explanation instead.');
    } finally {
      setExplaining(false);
    }
  }
  
  // Helper function to extract amount from explanation
  function extractAmountFromExplanation(explanation) {
    if (!explanation) return null;
    const match = explanation.match(/\$(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  }
  
  // Generate explanation based on triggered rules
  function generateRuleBasedExplanation(alert) {
    const rules = alert.rulesTriggered || [];
    const primaryRule = alert.primaryRule;
    const score = alert.fraudScore || 0;
    
    let explanation = `Fraud detected based on`;
    
    if (rules.length > 0) {
      explanation += ` rules: [${rules.join(', ')}]`;
    } else if (primaryRule) {
      explanation += ` rule: ${primaryRule}`;
    } else {
      explanation += ` suspicious patterns`;
    }
    
    explanation += `\n\nFraud Score: ${Math.round(score * 100)}%`;
    
    // Add rule-specific recommendations
    if (rules.includes('HIGH_AMOUNT') || primaryRule === 'HIGH_AMOUNT') {
      const amount = extractAmountFromExplanation(alert.explanation);
      if (amount) {
        explanation += `\n\n• High transaction amount: $${amount.toLocaleString()} is unusual for this account`;
      }
    }
    
    if (rules.includes('VELOCITY_EXCEEDED') || primaryRule === 'VELOCITY_EXCEEDED') {
      explanation += `\n\n• Multiple transactions in a short time period detected`;
    }
    
    if (rules.includes('SUSPICIOUS_CATEGORY') || primaryRule === 'SUSPICIOUS_CATEGORY') {
      explanation += `\n\n• Transaction category is associated with high-risk fraud patterns`;
    }
    
    explanation += `\n\nRecommendation: ${score >= 0.7 ? 'Block transaction and contact customer immediately.' : 'Review transaction and verify with customer.'}`;
    
    return explanation;
  }
  
  // Generate a fallback explanation when the RAG service is unavailable
  function generateFallbackExplanation(alert) {
    const score = alert.fraudScore || 0;
    const status = alert.status || 'FLAGGED';
    const rules = alert.rulesTriggered || [];
    const primaryRule = alert.primaryRule;
    const amount = extractAmountFromExplanation(alert.explanation) || 0;
    
    let explanation = `Fraud Alert Analysis (Fallback Mode)\n\n`;
    
    // Risk assessment
    if (score >= 0.9) {
      explanation += `⚠️ CRITICAL RISK: This transaction has a very high fraud score of ${Math.round(score * 100)}%.\n`;
      explanation += `The transaction was ${status.toLowerCase()} because it matched ${rules.length > 0 ? rules.length : 1} fraud rule(s).\n`;
      if (amount > 0) explanation += `Amount: $${amount.toLocaleString()}\n\n`;
      
      if (rules.includes('HIGH_AMOUNT')) {
        explanation += `• High transaction amount detected - unusual pattern\n`;
      }
      if (rules.includes('VELOCITY_EXCEEDED')) {
        explanation += `• Velocity check failed - too many transactions\n`;
      }
      if (rules.includes('SUSPICIOUS_CATEGORY')) {
        explanation += `• Suspicious merchant category\n`;
      }
      
      explanation += `\nRecommended action: BLOCK transaction immediately and contact the customer to verify.\n`;
    } else if (score >= 0.7) {
      explanation += `⚠️ HIGH RISK: This transaction shows suspicious patterns with a fraud score of ${Math.round(score * 100)}%.\n`;
      explanation += `It was ${status.toLowerCase()} due to rule: ${primaryRule || rules.join(', ') || 'multiple triggers'}.\n`;
      if (amount > 0) explanation += `Amount: $${amount.toLocaleString()}\n\n`;
      
      if (rules.includes('HIGH_AMOUNT')) {
        explanation += `• Amount exceeds typical spending pattern\n`;
      }
      if (rules.includes('VELOCITY_EXCEEDED')) {
        explanation += `• Unusual transaction frequency\n`;
      }
      
      explanation += `\nRecommended action: Flag for review and contact customer to verify transaction authenticity.\n`;
    } else if (score >= 0.4) {
      explanation += `⚠️ MEDIUM RISK: This transaction has some unusual characteristics (score: ${Math.round(score * 100)}%).\n`;
      explanation += `Rule triggered: ${primaryRule || rules.join(', ') || 'multiple indicators'}.\n`;
      if (amount > 0) explanation += `Amount: $${amount.toLocaleString()}\n\n`;
      explanation += `Recommended action: Monitor this account for additional suspicious activity.\n`;
    } else {
      explanation += `ℹ️ LOW RISK: This transaction has a low fraud score (${Math.round(score * 100)}%).\n`;
      explanation += `However, it was flagged due to: ${primaryRule || rules.join(', ') || 'system check'}.\n`;
      if (amount > 0) explanation += `Amount: $${amount.toLocaleString()}\n\n`;
      explanation += `This might be a false positive. Recommended action: Allow transaction but maintain monitoring.\n`;
    }
    
    // Add additional context from original explanation if available
    if (alert.explanation && alert.explanation.includes('Recommendation:')) {
      const recommendationMatch = alert.explanation.match(/Recommendation:.*/);
      if (recommendationMatch) {
        explanation += `\n${recommendationMatch[0]}`;
      }
    }
    
    if (status === 'BLOCKED') {
      explanation += `\n\nAction Taken: Transaction was BLOCKED to prevent potential fraud.`;
    } else {
      explanation += `\n\nAction Taken: Transaction was FLAGGED for review.`;
    }
    
    return explanation;
  }

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
                    <p><strong>Fraud Score:</strong> {Math.round((selectedAlert.fraudScore || 0) * 100)}%</p>
                    <p><strong>Status:</strong> {selectedAlert.status || 'FLAGGED'}</p>
                    {selectedAlert.primaryRule && (
                      <p><strong>Primary Rule:</strong> {selectedAlert.primaryRule}</p>
                    )}
                    {selectedAlert.rulesTriggered && selectedAlert.rulesTriggered.length > 0 && (
                      <p><strong>Rules Triggered:</strong> {selectedAlert.rulesTriggered.join(', ')}</p>
                    )}
                    <p><strong>Detected At:</strong> {new Date(selectedAlert.createdAt).toLocaleString()}</p>
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

      {/* Hover Popup for Transaction Details */}
      {hoveredTransaction && (
        <div 
          className="transaction-popup"
          style={{
            position: 'fixed',
            top: hoverPosition.y + 10,
            left: hoverPosition.x + 10,
            zIndex: 1000,
            backgroundColor: 'var(--bg-color, white)',
            border: '1px solid var(--border-color, #ddd)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '12px',
            minWidth: '300px',
            maxWidth: '400px'
          }}
          onMouseLeave={closeHover}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <strong style={{ fontSize: '14px' }}>Transaction Details</strong>
            <button 
              onClick={closeHover}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                color: 'var(--text-color, #666)'
              }}
            >
              ×
            </button>
          </div>
          <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
            <p><strong>Full Transaction ID:</strong><br/>
            <code style={{ wordBreak: 'break-all', fontSize: '11px', backgroundColor: 'var(--code-bg, #f5f5f5)', padding: '2px 4px', borderRadius: '3px' }}>{hoveredTransaction.id}</code></p>
            
            {hoveredTransaction.data && (
              <>
                <p><strong>Fraud Score:</strong> {Math.round((hoveredTransaction.data.fraudScore || 0) * 100)}%</p>
                <p><strong>Status:</strong> {hoveredTransaction.data.status || 'FLAGGED'}</p>
                <p><strong>Primary Rule:</strong> {hoveredTransaction.data.primaryRule || 'N/A'}</p>
                {hoveredTransaction.data.rulesTriggered && hoveredTransaction.data.rulesTriggered.length > 0 && (
                  <p><strong>Rules Triggered:</strong> {hoveredTransaction.data.rulesTriggered.join(', ')}</p>
                )}
                <p><strong>Detected At:</strong> {new Date(hoveredTransaction.data.createdAt).toLocaleString()}</p>
                {hoveredTransaction.data.explanation && (
                  <>
                    <p><strong>Explanation:</strong></p>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary, #666)', maxHeight: '100px', overflow: 'auto' }}>
                      {hoveredTransaction.data.explanation.substring(0, 200)}...
                    </p>
                  </>
                )}
              </>
            )}
            
            <button 
              onClick={() => {
                navigator.clipboard.writeText(hoveredTransaction.id);
                alert('Transaction ID copied to clipboard!');
              }}
              style={{
                marginTop: '8px',
                padding: '4px 8px',
                fontSize: '11px',
                background: 'var(--button-bg, #f0f0f0)',
                border: '1px solid var(--border-color, #ddd)',
                borderRadius: '4px',
                cursor: 'pointer',
                width: '100%',
                color: 'var(--text-color, #333)'
              }}
            >
              📋 Copy Full ID
            </button>
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
                  <th>Fraud Score</th>
                  <th>Status</th>
                  <th>Primary Rule</th>
                  <th>Rules Triggered</th>
                  <th>Detected At</th>
                  <th>AI Insight</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a, index) => {
                  const rulesList = a.rulesTriggered || [];
                  const primaryRule = a.primaryRule || (rulesList.length > 0 ? rulesList[0] : 'N/A');
                  const shortId = a.transactionId?.slice(0, 8) + '...';
                  
                  return (
                    <tr key={a.id || a.transactionId || index}>
                      <td className="mono">
                        <span
                          className="clickable-transaction"
                          onClick={(e) => handleTransactionClick(e, a.transactionId, a)}
                          style={{
                            cursor: 'pointer',
                            color: 'var(--link-color, #3b82f6)',
                            textDecoration: 'underline',
                            display: 'inline-block'
                          }}
                          title="Click to view full transaction details"
                        >
                          {shortId}
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
                        <span className={`status-badge ${a.status === 'BLOCKED' ? 'badge-danger' : 'badge-warning'}`}>
                          {a.status || 'FLAGGED'}
                        </span>
                      </td>
                      <td><code className="rule-code">{primaryRule}</code></td>
                      <td>
                        {rulesList.length > 0 ? (
                          <div className="rules-triggered-container">
                            {rulesList.map((rule, idx) => (
                              <span key={idx} className="rule-tag">
                                {rule}
                              </span>
                            ))}
                          </div>
                        ) : '—'}
                      </td>
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

      <style>{`
        .clickable-transaction:hover {
          text-decoration: underline;
          color: var(--link-hover-color, #2563eb);
        }
        
        .transaction-popup {
          animation: fadeIn 0.2s ease-in-out;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .transaction-popup p {
          margin: 6px 0;
        }
        
        .transaction-popup code {
          background: var(--code-bg, #f5f5f5);
          padding: 2px 4px;
          border-radius: 3px;
          font-family: monospace;
          font-size: 11px;
          color: var(--code-color, #333);
        }
        
        /* Dark mode support for rules triggered tags */
        .rules-triggered-container {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        
        .rule-tag {
          display: inline-block;
          background: var(--tag-bg, #f3f4f6);
          color: var(--tag-color, #1f2937);
          padding: 4px 8px;
          margin: 0;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
          font-family: monospace;
          border: 1px solid var(--tag-border, #e5e7eb);
          transition: all 0.2s ease;
        }
        
        .rule-tag:hover {
          background: var(--tag-hover-bg, #e5e7eb);
          transform: translateY(-1px);
        }
        
        .rule-code {
          background: var(--code-bg, #f3f4f6);
          color: var(--code-color, #1f2937);
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-family: monospace;
          font-weight: 500;
          display: inline-block;
          border: 1px solid var(--border-color, #e5e7eb);
        }
        
        /* Dark mode variables - these will be overridden by your app's dark mode class */
        [data-theme="dark"] {
          --bg-color: #1f2937;
          --text-color: #f3f4f6;
          --text-secondary: #9ca3af;
          --border-color: #374151;
          --link-color: #60a5fa;
          --link-hover-color: #93c5fd;
          --tag-bg: #374151;
          --tag-color: #e5e7eb;
          --tag-border: #4b5563;
          --tag-hover-bg: #4b5563;
          --code-bg: #111827;
          --code-color: #e5e7eb;
          --button-bg: #374151;
        }
        
        /* Light mode variables (default) */
        :root {
          --bg-color: #ffffff;
          --text-color: #1f2937;
          --text-secondary: #6b7280;
          --border-color: #e5e7eb;
          --link-color: #3b82f6;
          --link-hover-color: #2563eb;
          --tag-bg: #f3f4f6;
          --tag-color: #1f2937;
          --tag-border: #e5e7eb;
          --tag-hover-bg: #e5e7eb;
          --code-bg: #f3f4f6;
          --code-color: #1f2937;
          --button-bg: #f0f0f0;
        }
        
        /* If your app uses a different dark mode class, adjust accordingly */
        .dark-mode .rule-tag,
        body.dark .rule-tag,
        .dark .rule-tag {
          background: #374151;
          color: #e5e7eb;
          border-color: #4b5563;
        }
        
        .dark-mode .rule-tag:hover,
        body.dark .rule-tag:hover,
        .dark .rule-tag:hover {
          background: #4b5563;
        }
        
        .dark-mode .rule-code,
        body.dark .rule-code,
        .dark .rule-code {
          background: #111827;
          color: #e5e7eb;
          border-color: #374151;
        }
        
        .dark-mode .transaction-popup,
        body.dark .transaction-popup,
        .dark .transaction-popup {
          background: #1f2937;
          border-color: #374151;
          color: #f3f4f6;
        }
        
        .dark-mode .transaction-popup code,
        body.dark .transaction-popup code,
        .dark .transaction-popup code {
          background: #111827;
          color: #e5e7eb;
        }
        
        .dark-mode .clickable-transaction,
        body.dark .clickable-transaction,
        .dark .clickable-transaction {
          color: #60a5fa;
        }
        
        .dark-mode .clickable-transaction:hover,
        body.dark .clickable-transaction:hover,
        .dark .clickable-transaction:hover {
          color: #93c5fd;
        }
      `}</style>
    </div>
  );
}