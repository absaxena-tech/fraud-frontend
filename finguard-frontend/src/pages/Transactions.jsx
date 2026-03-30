import React, { useEffect, useState, useCallback, useRef } from 'react';
import { transactionAPI } from '../api/api';
import { v4 as uuidv4 } from 'uuid';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ipDetectionStatus, setIpDetectionStatus] = useState('idle');
  const [locationDetectionStatus, setLocationDetectionStatus] = useState('idle');
  const [locationDetails, setLocationDetails] = useState(null);
  const ipRefreshCountdown = useRef(null);
  const [ipRefreshCooldown, setIpRefreshCooldown] = useState(0);
  
  const [newTransaction, setNewTransaction] = useState({
    amount: '',
    currency: 'USD',
    merchant: '',
    merchantCategory: '',
    location: '',
    ipAddress: '',
    deviceId: '',
  });

  const IP_SERVICES = [
    { url: 'https://api.ipify.org?format=json', parser: (data) => data.ip },
    { url: 'https://ipapi.co/json/', parser: (data) => data.ip },
    { url: 'https://api.ip.sb/ip', parser: (data) => data.trim() },
  ];

  const getDeviceId = useCallback(() => {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = uuidv4();
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }, []);

  const detectIpAddress = useCallback(async (forceRefresh = false) => {
    if (ipRefreshCooldown > 0 && !forceRefresh) {
      return newTransaction.ipAddress;
    }

    setIpDetectionStatus('detecting');
    
    if (forceRefresh) {
      sessionStorage.removeItem('detected_ip');
      setIpRefreshCooldown(10);
      if (ipRefreshCountdown.current) clearInterval(ipRefreshCountdown.current);
      ipRefreshCountdown.current = setInterval(() => {
        setIpRefreshCooldown(prev => {
          if (prev <= 1) {
            clearInterval(ipRefreshCountdown.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    const cachedIp = sessionStorage.getItem('detected_ip');
    if (cachedIp && !forceRefresh) {
      setIpDetectionStatus('success');
      return cachedIp;
    }

    for (const service of IP_SERVICES) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(service.url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error();
        
        let data = await response.json();
        let ip = service.parser(data);
        
        if (ip && /^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
          sessionStorage.setItem('detected_ip', ip);
          setIpDetectionStatus('success');
          return ip;
        }
      } catch (error) {
        continue;
      }
    }
    
    setIpDetectionStatus('error');
    return '';
  }, [ipRefreshCooldown, newTransaction.ipAddress]);

  const detectLocation = useCallback(async (forceRefresh = false) => {
    setLocationDetectionStatus('detecting');
    
    if (forceRefresh) {
      sessionStorage.removeItem('location_data');
    }
    
    const cachedLocation = sessionStorage.getItem('location_data');
    if (cachedLocation && !forceRefresh) {
      try {
        const locationData = JSON.parse(cachedLocation);
        setLocationDetails(locationData);
        setLocationDetectionStatus('success');
        return locationData;
      } catch (e) {}
    }
    
    // Try GPS first
    if (navigator.geolocation && !forceRefresh) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`,
          { headers: { 'User-Agent': 'TransactionApp/1.0' } }
        );
        
        if (response.ok) {
          const data = await response.json();
          const locationData = {
            location: `${data.address?.city || data.address?.town || ''}, ${data.address?.country || ''}`,
            city: data.address?.city || '',
            country: data.address?.country || '',
          };
          
          if (locationData.location) {
            setLocationDetails(locationData);
            setLocationDetectionStatus('success');
            sessionStorage.setItem('location_data', JSON.stringify(locationData));
            return locationData;
          }
        }
      } catch (error) {}
    }
    
    // Fallback to IP-based location
    try {
      const response = await fetch('https://ipapi.co/json/', { timeout: 5000 });
      if (response.ok) {
        const data = await response.json();
        const locationData = {
          location: `${data.city}, ${data.country_name}`,
          city: data.city,
          country: data.country_name,
        };
        
        if (locationData.city) {
          setLocationDetails(locationData);
          setLocationDetectionStatus('success');
          sessionStorage.setItem('location_data', JSON.stringify(locationData));
          return locationData;
        }
      }
    } catch (error) {}
    
    setLocationDetectionStatus('error');
    return null;
  }, []);

  useEffect(() => {
    fetchTransactions();
    initializeTransactionContext();
    return () => {
      if (ipRefreshCountdown.current) clearInterval(ipRefreshCountdown.current);
    };
  }, []);

  const initializeTransactionContext = useCallback(async () => {
    const deviceId = getDeviceId();
    const ipAddress = await detectIpAddress();
    const locationData = await detectLocation();
    
    setNewTransaction(prev => ({
      ...prev,
      deviceId,
      ipAddress,
      location: locationData?.location || prev.location,
    }));
  }, [getDeviceId, detectIpAddress, detectLocation]);

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
      let ipAddress = newTransaction.ipAddress;
      if (!ipAddress) ipAddress = await detectIpAddress();
      
      let locationData = newTransaction.location;
      if (!locationData && locationDetails) locationData = locationDetails.location;
      
      const response = await transactionAPI.submit({
        ...newTransaction,
        amount: parseFloat(newTransaction.amount),
        ipAddress,
        location: locationData,
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
      
      await initializeTransactionContext();
      alert('Transaction submitted successfully!');
    } catch (err) {
      console.error('Failed to submit transaction', err);
      alert('Failed to submit transaction');
    } finally {
      setSubmitting(false);
    }
  }

  const handleChange = (e) => {
    setNewTransaction({ ...newTransaction, [e.target.name]: e.target.value });
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'BLOCKED': return 'badge-danger';
      case 'FLAGGED': return 'badge-warning';
      default: return 'badge-success';
    }
  };

  const handleRefreshIp = async () => {
    const newIp = await detectIpAddress(true);
    setNewTransaction(prev => ({ ...prev, ipAddress: newIp }));
  };

  const handleRefreshLocation = async () => {
    const locationData = await detectLocation(true);
    if (locationData) {
      setNewTransaction(prev => ({ ...prev, location: locationData.location }));
    }
  };

  return (
    <div className="page">
      
      <div className="card">
        <h3>Submit New Transaction</h3>
        <form onSubmit={handleSubmit}>
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
              <select name="merchantCategory" value={newTransaction.merchantCategory} onChange={handleChange}>
                <option value="">Select category</option>
                <option value="RETAIL">Retail</option>
                <option value="GROCERY">Grocery</option>
                <option value="RESTAURANT">Restaurant</option>
                <option value="ENTERTAINMENT">Entertainment</option>
                <option value="TRAVEL">Travel</option>
                <option value="CRYPTO">Crypto</option>
                <option value="GAMBLING">Gambling</option>
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label>Location</label>
            <div className="input-group">
              <input
                type="text"
                name="location"
                value={newTransaction.location}
                onChange={handleChange}
                placeholder="Auto-detected or manually enter"
              />
              <button type="button" onClick={handleRefreshLocation} className="btn-secondary" disabled={locationDetectionStatus === 'detecting'}>
                {locationDetectionStatus === 'detecting' ? 'Detecting...' : 'Detect'}
              </button>
            </div>
            {locationDetectionStatus === 'error' && (
              <small className="error-text">Unable to detect location</small>
            )}
          </div>

          <div className="form-group">
            <label>IP Address</label>
            <div className="input-group">
              <input
                type="text"
                name="ipAddress"
                value={newTransaction.ipAddress}
                onChange={handleChange}
                placeholder="Auto-detected IP"
              />
              <button type="button" onClick={handleRefreshIp} className="btn-secondary" disabled={ipRefreshCooldown > 0}>
                {ipRefreshCooldown > 0 ? `Wait ${ipRefreshCooldown}s` : 'Refresh'}
              </button>
            </div>
            {ipDetectionStatus === 'error' && (
              <small className="error-text">Unable to detect IP address</small>
            )}
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
          <p>No transactions found.</p>
        ) : (
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
                  <td>{tx.amount} {tx.currency}</td>
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
        )}
      </div>
    </div>
  );
}