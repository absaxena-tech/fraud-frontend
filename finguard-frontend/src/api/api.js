import axios from 'axios';

// Get the token from localStorage
const getToken = () => {
  return localStorage.getItem('accessToken');
};

// Create axios instance with base URL
const api = axios.create({
  baseURL: 'http://localhost:8080', // API Gateway URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Don't retry refresh endpoint
    if (originalRequest.url?.includes('/api/auth/refresh')) {
      return Promise.reject(error);
    }
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post('http://localhost:8080/api/auth/refresh', {
            refreshToken,
          });
          
          const { accessToken, refreshToken: newRefreshToken } = response.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  logout: () => api.post('/api/auth/logout'),
  refresh: (refreshToken) => api.post('/api/auth/refresh', { refreshToken }),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/api/users/me'),
  updateName: (name) => api.patch('/api/users/me/name', null, { params: { name } }),
  changePassword: (data) => api.post('/api/users/me/password', data),
  getAllUsers: () => api.get('/api/users/admin/all'),
  setEnabled: (userId, enabled) => api.patch(`/api/users/admin/${userId}/enabled`, null, { params: { enabled } }),
  promoteToAdmin: (userId) => api.patch(`/api/users/admin/${userId}/promote`),
};

// Fraud API
export const fraudAPI = {
  getMyAlerts: () => api.get('/api/fraud/alerts/my'),
  getAlerts: () => api.get('/api/fraud/alerts'),
  getTransactionAlerts: (transactionId) => api.get(`/api/fraud/alerts/transaction/${transactionId}`),
};

// Transaction API
export const transactionAPI = {
  submit: (data) => api.post('/api/transactions', data),
  getById: (id) => api.get(`/api/transactions/${id}`),
  getMyTransactions: () => api.get('/api/transactions/my'),
};

// Risk API
export const riskAPI = {
  getMyRisk: () => api.get('/api/risk/me'),
  updateProfile: (amount) => api.post(`/api/risk/me/update?amount=${amount}`),
};

// RAG API - Updated to send the correct request format
export const ragAPI = {
  // Now expects an object with transaction and ruleExplanation
  explain: (transactionData, ruleExplanation) => {
    const requestData = {
      transaction: transactionData,
      ruleExplanation: ruleExplanation || 'Transaction flagged for suspicious activity'
    };
    return api.post('/api/rag/explain', requestData);
  },
  ingest: (caseDescription) => api.post('/api/rag/ingest', caseDescription),
  seed: () => api.post('/api/rag/seed'),
};

export default api;