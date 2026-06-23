const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Helper to get auth token
const getAuthHeaders = () => {
  const token = localStorage.getItem('locafy_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Helper to perform token refresh
async function handleTokenRefresh() {
  const refreshToken = localStorage.getItem('locafy_refresh_token');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const res = await fetch(API_BASE + '/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refreshToken })
  });

  if (!res.ok) {
    throw new Error('Refresh token request failed');
  }

  const data = await res.json();
  if (data.ok && data.accessToken) {
    localStorage.setItem('locafy_token', data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('locafy_refresh_token', data.refreshToken);
    }
    return data.accessToken;
  }
  throw new Error('Invalid refresh response data');
}

// Wrapper for fetch requests with automatic 401 token refresh retry
async function fetchWithAuth(method, path, body) {
  const url = API_BASE + path;
  const isGet = method === 'GET';

  const headers = {
    'Accept': 'application/json',
    ...getAuthHeaders()
  };

  const isFormData = body instanceof FormData;

  if (!isGet && body !== undefined && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const options = {
    method,
    headers,
    body: isFormData ? body : ((!isGet && body !== undefined) ? JSON.stringify(body) : undefined)
  };


  let res = await fetch(url, options);

  // If unauthorized, and we are not calling login or refresh itself, try to refresh token once
  if (res.status === 401 && path !== '/auth/login' && path !== '/auth/refresh') {
    try {
      const newToken = await handleTokenRefresh();
      // Retry the original request with the new access token
      options.headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, options);
    } catch (err) {
      // Clear storage and redirect on failure
      localStorage.removeItem('locafy_token');
      localStorage.removeItem('locafy_refresh_token');
      localStorage.removeItem('locafy_user');
      
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
      }
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `API ${method} ${path} -> Status ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// Generic fetch wrappers
async function apiGet(path) {
  return fetchWithAuth('GET', path);
}

async function apiSend(method, path, body) {
  return fetchWithAuth(method, path, body);
}

export const LocafyApi = {
  // Auth
  login: (credentials) => apiSend('POST', '/auth/login', credentials),
  register: (data) => apiSend('POST', '/auth/register', data),
  sendOtp: (email) => apiSend('POST', '/auth/send-otp', { email }),
  verifyOtp: (payload) => apiSend('POST', '/auth/verify-otp', payload),
  getMe: () => apiGet('/auth/me'),


  // Profile
  updateProfile: (data) => apiSend('PATCH', '/accounts/profile', data),
  getMyProfile: () => apiGet('/accounts/profile'),

  // Listings (public)
  getListings: (params) => apiGet('/listings' + (params ? '?' + new URLSearchParams(params).toString() : '')),
  getListing: (id) => apiGet(`/listings/${id}`),
  // Listings (seller)
  createListing: (data) => apiSend('POST', '/listings', data),
  updateListing: (id, data) => apiSend('PATCH', `/listings/${id}`, data),
  deleteListing: (id) => apiSend('DELETE', `/listings/${id}`),
  // Listings (admin)
  updateListingStatus: (id, data) => apiSend('PATCH', `/listings/${id}/status`, data),

  // Properties (seller)
  getMyProperties: () => apiGet('/properties/my'),
  createProperty: (data) => apiSend('POST', '/properties', data),
  updateProperty: (id, data) => apiSend('PATCH', `/properties/${id}`, data),
  deleteProperty: (id) => apiSend('DELETE', `/properties/${id}`),

  // Rooms (seller)
  getRoomsByProperty: (pid) => apiGet(`/rooms/by-property/${pid}`),
  createRoom: (data) => apiSend('POST', '/rooms', data),
  updateRoom: (id, data) => apiSend('PATCH', `/rooms/${id}`, data),
  deleteRoom: (id) => apiSend('DELETE', `/rooms/${id}`),

  // Appointments
  getAppointments: () => apiGet('/appointments'),
  createAppointment: (data) => apiSend('POST', '/appointments', data),
  updateAppointmentStatus: (id, data) => apiSend('PATCH', `/appointments/${id}/status`, data),

  // Conversations & Messages
  getConversations: () => apiGet('/conversations'),
  getOrCreateConversation: (data) => apiSend('POST', '/conversations', data),
  getMessages: (conversationId) => apiGet(`/messages/${conversationId}`),
  sendMessage: (data) => apiSend('POST', '/messages', data),

  // Notifications
  getNotifications: () => apiGet('/notifications'),
  markNotificationRead: (id) => apiSend('PATCH', `/notifications/${id}/read`),

  // Favorites
  getFavorites: () => apiGet('/favorites'),
  toggleFavorite: (listingId) => apiSend('POST', '/favorites/toggle', { listingId }),

  // Service Packages
  getServicePackages: () => apiGet('/service-packages'),
  getMySubscription: () => apiGet('/subscriptions/my'),
  getMyTransactions: () => apiGet('/transactions/my'),

  // Reports
  createReport: (data) => apiSend('POST', '/reports', data),

  // Admin
  getAdminAccounts: () => apiGet('/accounts'),
  toggleAccountActive: (id) => apiSend('PATCH', `/accounts/${id}/toggle-active`),
  verifySeller: (id, data) => apiSend('PATCH', `/accounts/${id}/verify`, data),
  getAdminReports: () => apiGet('/reports'),
  
  // File Upload
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiSend('POST', '/upload', formData);
  }
};

