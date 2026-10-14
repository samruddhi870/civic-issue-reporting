// DFD 1.0-9.0 - API Client Service & HTTP Helper
const API_BASE = '/api';

export const getAuthToken = () => localStorage.getItem('civic_token');
export const setAuthToken = (token) => localStorage.setItem('civic_token', token);
export const removeAuthToken = () => localStorage.removeItem('civic_token');

export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body exists and not FormData, default to application/json
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = (data && data.error) ? data.error : (typeof data === 'string' ? data : 'API Request Failed');
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// Authentication Endpoints (DFD 1.0)
export const authApi = {
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  getCurrentUser: () => apiRequest('/auth/me'),
};

// Issues Endpoints (DFD 2.0, 3.0, 4.0, 5.0, 8.0)
export const issuesApi = {
  createIssue: (formData) => apiRequest('/issues', { method: 'POST', body: formData }),
  checkDuplicates: (category, lat, lng) => 
    apiRequest(`/issues/duplicates?category=${encodeURIComponent(category)}&latitude=${lat}&longitude=${lng}`),
  getIssues: (params = {}) => {
    const searchParams = new URLSearchParams(params).toString();
    return apiRequest(`/issues${searchParams ? `?${searchParams}` : ''}`);
  },
  getMyReports: () => apiRequest('/issues/my-reports'),
  getAssignedIssues: (params = {}) => {
    const searchParams = new URLSearchParams(params).toString();
    return apiRequest(`/issues/assigned${searchParams ? `?${searchParams}` : ''}`);
  },
  getIssueById: (id) => apiRequest(`/issues/${id}`),
  updateStatus: (id, payload) => {
    if (payload instanceof FormData) {
      return apiRequest(`/issues/${id}/status`, { method: 'PATCH', body: payload });
    }
    return apiRequest(`/issues/${id}/status`, { method: 'PATCH', body: JSON.stringify(payload) });
  },
  toggleUpvote: (id) => apiRequest(`/issues/${id}/upvote`, { method: 'POST' }),
  addComment: (id, content) => apiRequest(`/issues/${id}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
  confirmResolution: (id, payload) => apiRequest(`/issues/${id}/confirm`, { method: 'POST', body: JSON.stringify(payload) }),
  reopenIssue: (id, payload) => apiRequest(`/issues/${id}/reopen`, { method: 'POST', body: JSON.stringify(payload) }),
};

// Department & Administrative Endpoints (DFD 3.0 & 9.0)
export const departmentsApi = {
  getDepartments: () => apiRequest('/departments'),
};

// Notification Endpoints (DFD 7.0)
export const notificationsApi = {
  getNotifications: (params = {}) => {
    const searchParams = new URLSearchParams(params).toString();
    return apiRequest(`/notifications${searchParams ? `?${searchParams}` : ''}`);
  },
  markAsRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllAsRead: () => apiRequest('/notifications/mark-all-read', { method: 'POST' }),
};

// SLA & Escalation Engine Endpoints (DFD 4.0 & 6.0)
export const slaApi = {
  getSlaMatrix: () => apiRequest('/sla/matrix'),
  triggerCheck: () => apiRequest('/sla/trigger-check', { method: 'POST' }),
};

// Analytics & Reports Endpoints (DFD 9.0)
export const analyticsApi = {
  getSummary: () => apiRequest('/analytics/summary'),
  getByDepartment: () => apiRequest('/analytics/by-department'),
  getByCategory: () => apiRequest('/analytics/by-category'),
  getLeaderboard: () => apiRequest('/analytics/leaderboard'),
  getHeatmap: () => apiRequest('/analytics/heatmap'),
  getCsvExportUrl: () => `${API_BASE}/analytics/export/csv`,
  getPdfExportUrl: () => `${API_BASE}/analytics/export/pdf`,
};



