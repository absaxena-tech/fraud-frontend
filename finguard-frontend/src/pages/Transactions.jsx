import React, { useEffect, useState, useCallback, useRef } from 'react';
import { transactionAPI } from '../api/api';
import { v4 as uuidv4 } from 'uuid';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
    latitude: null,    
    longitude: null,   
    ipAddress: '',
    deviceId: '',
  });

  // Currency options with symbols
  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
    { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
    { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
    { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', flag: '🇨🇭' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', flag: '🇨🇳' },
    { code: 'SGD', symbol: '$', name: 'Singapore Dollar', flag: '🇸🇬' },
  ];

  // Category options with icons
  const categories = [
    { value: '', label: 'Select category', icon: '', color: '#6c757d' },
    { value: 'RETAIL', label: 'Retail', icon: '', color: '#4c9aff' },
    { value: 'GROCERY', label: 'Grocery', icon: '', color: '#52c41a' },
    { value: 'RESTAURANT', label: 'Restaurant', icon: '', color: '#fa8c16' },
    { value: 'ENTERTAINMENT', label: 'Entertainment', icon: '', color: '#eb2f96' },
    { value: 'TRAVEL', label: 'Travel', icon: '', color: '#13c2c2' },
    { value: 'CRYPTO', label: 'Crypto', icon: '', color: '#f5222d' },
    { value: 'GAMBLING', label: 'Gambling', icon: '', color: '#fa541c' },
    { value: 'HEALTHCARE', label: 'Healthcare', icon: '', color: '#2f9e44' },
    { value: 'EDUCATION', label: 'Education', icon: '', color: '#7048e8' },
    { value: 'UTILITIES', label: 'Utilities', icon: '', color: '#f76707' },
    { value: 'SUBSCRIPTION', label: 'Subscription', icon: '', color: '#5f3dc6' },
  ];

  const IP_SERVICES = [
    { url: 'https://api.ipify.org?format=json', parser: (data) => data.ip },
    { url: 'https://api.ip.sb/ip', parser: (data) => data.trim() },
    { url: 'https://api.my-ip.io/ip.json', parser: (data) => data.ip },
  ];

  const LOCATION_SERVICES = [
    {
      url: 'https://ipapi.co/json/',
      parser: (data) => ({
        location: `${data.city}, ${data.country_name}`,
        city: data.city,
        country: data.country_name,
        latitude: data.latitude,
        longitude: data.longitude,
      })
    },
    {
      url: 'https://ip-api.com/json/',
      parser: (data) => ({
        location: `${data.city}, ${data.country}`,
        city: data.city,
        country: data.country,
        latitude: data.lat,
        longitude: data.lon,
      })
    },
    {
      url: 'https://geolocation-db.com/json/',
      parser: (data) => ({
        location: `${data.city}, ${data.country_name}`,
        city: data.city,
        country: data.country_name,
        latitude: data.latitude,
        longitude: data.longitude,
      })
    }
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
      }, 100);
    }

    const cachedIp = sessionStorage.getItem('detected_ip');
    if (cachedIp && !forceRefresh) {
      setIpDetectionStatus('success');
      return cachedIp;
    }

    for (const service of IP_SERVICES) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(service.url, { 
          signal: controller.signal,
          mode: 'cors'
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error();
        
        let data = await response.json();
        let ip = service.parser(data);
        
        if (ip && /^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
          sessionStorage.setItem('detected_ip', ip);
          setIpDetectionStatus('success');
          toast.success('IP address detected successfully', {
            theme: document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light',
          });
          return ip;
        }
      } catch (error) {
        console.warn(`IP detection failed for ${service.url}:`, error);
        continue;
      }
    }
    
    setIpDetectionStatus('error');
    toast.error('Failed to detect IP address. Please enter manually.', {
      theme: document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light',
    });
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
    
    for (const service of LOCATION_SERVICES) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(service.url, { 
          signal: controller.signal,
          mode: 'cors'
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error();
        
        const data = await response.json();
        const locationData = service.parser(data);
        
        if (locationData.city && locationData.city !== 'null' && locationData.city !== 'undefined') {
          setLocationDetails(locationData);
          setLocationDetectionStatus('success');
          sessionStorage.setItem('location_data', JSON.stringify(locationData));
          toast.success('Location detected successfully', {
            theme: document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light',
          });
          return locationData;
        }
      } catch (error) {
        console.warn(`Location detection failed for ${service.url}:`, error);
        continue;
      }
    }
    
    setLocationDetectionStatus('error');
    toast.error('Failed to detect location. Please enter manually.', {
      theme: document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light',
    });
    return null;
  }, []);

  const detectGpsLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.info('GPS not supported in your browser', {
        theme: document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light',
      });
      return null;
    }

    toast.info('Requesting GPS location...', {
      theme: document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light',
    });

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { 
          timeout: 10000,
          maximumAge: 60000,
          enableHighAccuracy: true
        });
      });
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&zoom=10&addressdetails=1`,
        { 
          headers: { 'User-Agent': 'FinGuard-Fraud-Detection/1.0' },
          timeout: 5000
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const city = data.address?.city || data.address?.town || data.address?.village || '';
        const country = data.address?.country || '';
        
        if (city && country) {
          toast.success('GPS location detected successfully', {
            theme: document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light',
          });
          return {
            location: `${city}, ${country}`,
            city: city,
            country: country,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
        }
      }
    } catch (error) {
      console.warn('GPS location detection failed:', error);
      toast.error('GPS location failed. Falling back to IP-based location.', {
        theme: document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light',
      });
    }
    
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
    
    let locationData = await detectGpsLocation();
    if (!locationData) {
      locationData = await detectLocation();
    }
    
    setNewTransaction(prev => ({
      ...prev,
      deviceId,
      ipAddress,
      location: locationData?.location || prev.location,
      latitude: locationData?.latitude || null,
      longitude: locationData?.longitude || null,
    }));
  }, [getDeviceId, detectIpAddress, detectLocation, detectGpsLocation]);

  async function fetchTransactions(silent = false) {
    try {
      if (!silent) setLoading(true);
      const res = await transactionAPI.getMyTransactions();
      const uniqueTransactions = (res.data || []).reduce((acc, current) => {
        const exists = acc.find(item => item.id === current.id);
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []);
      setTransactions(uniqueTransactions);
      // if (!silent && uniqueTransactions.length > 0) {
      //   toast.info(`Loaded ${uniqueTransactions.length} transactions`, {
      //     theme: document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light',
      //   });
      // }
    } catch (err) {
      console.error('Failed to fetch transactions', err);
      toast.error('Failed to load transactions', {
        theme: document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light',
      });
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    let timeoutId;
    const hasPending = transactions.some(tx => tx.status === 'PENDING');
    
    if (hasPending) {
      timeoutId = setTimeout(() => {
        fetchTransactions(true);
      }, 3000);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [transactions]);

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Validation
    if (!newTransaction.amount || parseFloat(newTransaction.amount) <= 0) {
      toast.error('Please enter a valid amount', {
        theme: document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light',
      });
      return;
    }
    
    if (!newTransaction.merchant) {
      toast.warning('Please enter merchant name', {
        theme: document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light',
      });
      return;
    }
    
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
        latitude: newTransaction.latitude,
        longitude: newTransaction.longitude,
        timestamp: new Date().toISOString(),
      });
      
      setTransactions(prev => {
        const exists = prev.some(tx => tx.id === response.data.id);
        if (exists) return prev;
        return [response.data, ...prev];
      });
      
      setNewTransaction({
        amount: '',
        currency: 'USD',
        merchant: '',
        merchantCategory: '',
        location: '',
        latitude: null,
        longitude: null,
        ipAddress: '',
        deviceId: '',
      });
      
      await initializeTransactionContext();
      
      toast.success(`Transaction of ${newTransaction.amount} ${newTransaction.currency} submitted successfully!`, {
        theme: document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light',
        position: 'top-right',
        autoClose: 5000,
      });
    } catch (err) {
      console.error('Failed to submit transaction', err);
      toast.error('Failed to submit transaction. Please try again.', {
        theme: document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light',
        position: 'top-right',
      });
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
      case 'PENDING': return 'badge-pending';
      case 'SUCCESS': return 'badge-success';
      default: return 'badge-success';
    }
  };

  const handleRefreshIp = async () => {
    const newIp = await detectIpAddress(true);
    setNewTransaction(prev => ({ ...prev, ipAddress: newIp }));
  };

  const handleRefreshLocation = async () => {
    setLocationDetectionStatus('detecting');
    
    let locationData = await detectGpsLocation();
    
    if (!locationData) {
      locationData = await detectLocation(true);
    }
    
    if (locationData) {
      setNewTransaction(prev => ({ 
        ...prev, 
        location: locationData.location,
        latitude: locationData.latitude,
        longitude: locationData.longitude
      }));
      setLocationDetails(locationData);
      setLocationDetectionStatus('success');
    } else {
      setLocationDetectionStatus('error');
    }
  };

  const getCurrentCurrencySymbol = () => {
    const currency = currencies.find(c => c.code === newTransaction.currency);
    return currency ? currency.symbol : '$';
  };

  return (
    <div className="page">
      <ToastContainer 
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light'}
      />
      
      <div className="card" style={{ 
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>Submit New Transaction</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                Amount *
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'var(--text-secondary)'
                }}>
                  {getCurrentCurrencySymbol()}
                </span>
                <input
                  type="number"
                  name="amount"
                  value={newTransaction.amount}
                  onChange={handleChange}
                  required
                  step="0.01"
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 32px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '16px',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                Currency
              </label>
              <select 
                name="currency" 
                value={newTransaction.currency} 
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                {currencies.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.flag} {currency.code} - {currency.name} ({currency.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                Merchant *
              </label>
              <input
                type="text"
                name="merchant"
                value={newTransaction.merchant}
                onChange={handleChange}
                placeholder="e.g., Amazon, Walmart, Starbucks"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                Category
              </label>
              <select 
                name="merchantCategory" 
                value={newTransaction.merchantCategory} 
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.icon} {category.label}
                  </option>
                ))}
              </select>
              {newTransaction.merchantCategory && (
                <div style={{ 
                  marginTop: '6px', 
                  fontSize: '12px',
                  color: categories.find(c => c.value === newTransaction.merchantCategory)?.color 
                }}>
                  {categories.find(c => c.value === newTransaction.merchantCategory)?.icon} 
                  {categories.find(c => c.value === newTransaction.merchantCategory)?.label} category selected
                </div>
              )}
            </div>
          </div>
          
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--text-secondary)' }}>
              Location
            </label>
            <div className="input-group" style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                name="location"
                value={newTransaction.location}
                onChange={handleChange}
                placeholder="Auto-detected or manually enter"
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)'
                }}
              />
              <button 
                type="button" 
                onClick={handleRefreshLocation} 
                className="btn-secondary" 
                disabled={locationDetectionStatus === 'detecting'}
                style={{
                  padding: '10px 20px',
                  background: 'var(--btn-secondary-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)'
                }}
              >
                {locationDetectionStatus === 'detecting' ? 'Detecting...' : 'Detect'}
              </button>
            </div>
            {locationDetectionStatus === 'error' && (
              <small className="error-text" style={{ color: '#ff4d4f', marginTop: '4px', display: 'block' }}>
                ⚠️ Unable to detect location. Please enter manually.
              </small>
            )}
            {locationDetectionStatus === 'success' && newTransaction.location && (
              <small className="success-text" style={{ color: '#52c41a', marginTop: '4px', display: 'block' }}>
                ✓ Location detected: {newTransaction.location}
              </small>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--text-secondary)' }}>
              IP Address
            </label>
            <div className="input-group" style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                name="ipAddress"
                value={newTransaction.ipAddress}
                onChange={handleChange}
                placeholder="Auto-detected IP"
                readOnly
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace'
                }}
              />
              <button 
                type="button" 
                onClick={handleRefreshIp} 
                className="btn-secondary" 
                disabled={ipRefreshCooldown > 0}
                style={{
                  padding: '10px 20px',
                  background: 'var(--btn-secondary-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  cursor: ipRefreshCooldown > 0 ? 'not-allowed' : 'pointer',
                  color: 'var(--text-primary)',
                  opacity: ipRefreshCooldown > 0 ? 0.6 : 1
                }}
              >
                {ipRefreshCooldown > 0 ? `⏱️ ${ipRefreshCooldown}s` : 'Refresh'}
              </button>
            </div>
            {ipDetectionStatus === 'error' && (
              <small className="error-text" style={{ color: '#ff4d4f', marginTop: '4px', display: 'block' }}>
                ⚠️ Unable to detect IP address. Please enter manually.
              </small>
            )}
            {ipDetectionStatus === 'success' && newTransaction.ipAddress && (
              <small className="success-text" style={{ color: '#52c41a', marginTop: '4px', display: 'block' }}>
                ✓ IP detected: {newTransaction.ipAddress}
              </small>
            )}
          </div>
          
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={submitting}
            style={{
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              transition: 'all 0.3s ease'
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Transaction'}
          </button>
        </form>
      </div>
      
      <div className="card" style={{ 
        marginTop: '24px',
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>Transaction History</h3>
        {loading ? (
          <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No transactions found.</p>
        ) : (
          <div className="table-box" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--table-header-bg)', borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)' }}>ID</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)' }}>Amount</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)' }}>Merchant</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)' }}>Category</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)' }}>Location</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td className="mono" style={{ padding: '12px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                      {tx.id?.slice(0, 8)}...
                    </td>
                    <td style={{ padding: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>
                      {tx.amount} {tx.currency}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-primary)' }}>{tx.merchant || '-'}</td>
                    <td style={{ padding: '12px' }}>
                      {tx.merchantCategory && (
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          background: categories.find(c => c.value === tx.merchantCategory)?.color + '20',
                          color: categories.find(c => c.value === tx.merchantCategory)?.color
                        }}>
                          {categories.find(c => c.value === tx.merchantCategory)?.icon} {tx.merchantCategory}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-primary)' }}>{tx.location || '-'}</td>
                    <td style={{ padding: '12px' }}>
                      <span className={`status-badge ${getStatusBadgeClass(tx.status)}`} style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {tx.status === 'PENDING' && <span className="badge-spinner"></span>}
                        {tx.status === 'SUCCESS' }
                        {tx.status === 'BLOCKED' }
                        {tx.status === 'FLAGGED' }
                        {tx.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
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