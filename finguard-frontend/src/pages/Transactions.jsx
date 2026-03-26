import React, { useEffect, useState } from 'react';
import { transactionAPI } from '../api/api';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    amount: '',
    currency: 'USD',
    merchant: '',
    merchantCategory: '',
    location: '',
    ipAddress: '',
    deviceId: '',
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    try {
      setLoading(true);
      const res = await transactionAPI.getMyTransactions();
      setTransactions(res.data || []);
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await transactionAPI.submit({
        ...newTransaction,
        amount: parseFloat(newTransaction.amount),
        timestamp: new Date().toISOString(),
      });
      
      setTransactions([response.data, ...transactions]);
      setNewTransaction({
        amount: '',
        currency: 'USD',
        merchant: '',
        merchantCategory: '',
        location: '',
        ipAddress: '',
        deviceId: '',
      });
      
      alert('Transaction submitted successfully!');
    } catch (err) {
      console.error('Failed to submit transaction', err);
      alert('Failed to submit transaction: ' + (err.response?.data?.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  }

  const handleChange = (e) => {
    setNewTransaction({
      ...newTransaction,
      [e.target.name]: e.target.value,
    });
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'BLOCKED': return 'badge-danger';
      case 'FLAGGED': return 'badge-warning';
      default: return 'badge-success';
    }
  };

  return (
    <div className="page">
      <h1>Transactions</h1>
      
      <div className="card">
        <h3>Submit New Transaction</h3>
        <form onSubmit={handleSubmit} className="transaction-form">
          <div className="form-row">
            <div className="form-group">
              <label>Amount *</label>
              <input
                type="number"
                name="amount"
                value={newTransaction.amount}
                onChange={handleChange}
                required
                step="0.01"
                placeholder="0.00"
              />
            </div>
            
            <div className="form-group">
              <label>Currency</label>
              <select name="currency" value={newTransaction.currency} onChange={handleChange}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="INR">INR</option>
              </select>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Merchant</label>
              <input
                type="text"
                name="merchant"
                value={newTransaction.merchant}
                onChange={handleChange}
                placeholder="e.g., Amazon, Walmart"
              />
            </div>
            
            <div className="form-group">
              <label>Category</label>
              <input
                type="text"
                name="merchantCategory"
                value={newTransaction.merchantCategory}
                onChange={handleChange}
                placeholder="e.g., RETAIL, CRYPTO, GAMBLING"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                name="location"
                value={newTransaction.location}
                onChange={handleChange}
                placeholder="e.g., New York, USA"
              />
            </div>
            
            <div className="form-group">
              <label>IP Address</label>
              <input
                type="text"
                name="ipAddress"
                value={newTransaction.ipAddress}
                onChange={handleChange}
                placeholder="e.g., 192.168.1.1"
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Device ID</label>
            <input
              type="text"
              name="deviceId"
              value={newTransaction.deviceId}
              onChange={handleChange}
              placeholder="Device identifier"
            />
          </div>
          
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Transaction'}
          </button>
        </form>
      </div>
      
      <div className="card">
        <h3>Transaction History</h3>
        {loading ? (
          <p>Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p>No transactions found. Submit your first transaction above!</p>
        ) : (
          <div className="table-box">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Amount</th>
                  <th>Merchant</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="mono">{tx.id.slice(0, 8)}...</td>
                    <td className="mono">{tx.amount} {tx.currency}</td>
                    <td>{tx.merchant || '-'}</td>
                    <td>{tx.merchantCategory || '-'}</td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(tx.status)}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td>{new Date(tx.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}