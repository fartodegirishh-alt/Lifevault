/**
 * LifeVault Central API Service
 * All frontend requests go through this file exclusively.
 * Base URL defaults to VITE_API_URL or '/api'
 */

// If VITE_API_URL is set in environment, use it. Otherwise, default to relative '/api'
// In standalone dev with separate ports, VITE_API_URL can be set to http://localhost:5000/api
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

// Listeners for API activity logging panel
const activityListeners = new Set();
const activityLogs = [];
const MAX_LOGS = 50;

export function subscribeToApiActivity(listener) {
  activityListeners.add(listener);
  return () => activityListeners.delete(listener);
}

export function getApiActivityLogs() {
  return [...activityLogs];
}

export function clearApiActivityLogs() {
  activityLogs.length = 0;
  activityListeners.forEach(listener => listener([...activityLogs]));
}

function notifyLog(entry) {
  activityLogs.unshift(entry);
  if (activityLogs.length > MAX_LOGS) {
    activityLogs.pop();
  }
  activityListeners.forEach(listener => listener([...activityLogs]));
}

// Token & Auth storage
const TOKEN_KEY = 'lifevault_auth_token';
const USER_KEY = 'lifevault_auth_user';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAuth(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);

  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Core HTTP client wrapper with telemetry timing and activity logging
 */
async function request(endpoint, options = {}) {
  const startTime = performance.now();
  const url = `${API_BASE_URL}${endpoint}`;
  const method = options.method || 'GET';
  const token = getStoredToken();

  const headers = {
    ...options.headers,
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Auto set JSON header if body is not FormData
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let logEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    method,
    endpoint,
    fullUrl: url,
    timestamp: new Date().toLocaleTimeString(),
    startTime,
    status: 'Pending...',
    durationMs: 0,
    isError: false,
    details: null,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const durationMs = Math.round(performance.now() - startTime);
    logEntry.durationMs = durationMs;
    logEntry.status = response.status;
    logEntry.isError = !response.ok;

    // Handle 204 No Content
    if (response.status === 204) {
      notifyLog(logEntry);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (!response.ok) {
        logEntry.details = data.error || data.details || `HTTP ${response.status}`;
        notifyLog(logEntry);
        const error = new Error(data.error || 'Server error');
        error.status = response.status;
        error.details = data.details;
        error.data = data;
        throw error;
      }
      notifyLog(logEntry);
      return data;
    }

    // Non-JSON (e.g. blobs, text)
    if (!response.ok) {
      const text = await response.text();
      logEntry.details = text || `HTTP ${response.status}`;
      notifyLog(logEntry);
      const error = new Error(text || 'Request failed');
      error.status = response.status;
      throw error;
    }

    notifyLog(logEntry);
    return response;
  } catch (err) {
    const durationMs = Math.round(performance.now() - startTime);
    logEntry.durationMs = durationMs;
    logEntry.status = err.status || 'Failed';
    logEntry.isError = true;
    logEntry.details = err.details || err.message || 'Network / connection error';
    notifyLog(logEntry);
    throw err;
  }
}

/* ==========================================================================
   API METHODS
   ========================================================================== */

export const api = {
  // System Health
  async getHealth() {
    return request('/health');
  },

  // Auth
  async register({ name, email, password }) {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    if (data.token && data.user) {
      setStoredAuth(data.token, data.user);
    }
    return data;
  },

  async login({ email, password }) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token && data.user) {
      setStoredAuth(data.token, data.user);
    }
    return data;
  },

  async getMe() {
    return request('/auth/me');
  },

  logout() {
    clearStoredAuth();
  },

  // Records
  async getRecords({ search = '', category = '', status = '' } = {}) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category && category !== 'All') params.append('category', category);
    if (status && status !== 'All') params.append('status', status);

    const qs = params.toString();
    return request(`/records${qs ? `?${qs}` : ''}`);
  },

  async getRecord(id) {
    return request(`/records/${id}`);
  },

  async createRecord(payload) {
    return request('/records', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateRecord(id, payload) {
    return request(`/records/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteRecord(id) {
    return request(`/records/${id}`, {
      method: 'DELETE',
    });
  },

  // File Attachments
  async uploadFile(id, file) {
    const formData = new FormData();
    formData.append('file', file);

    return request(`/records/${id}/file`, {
      method: 'POST',
      body: formData,
    });
  },

  async downloadFile(id, originalFilename = 'document') {
    const token = getStoredToken();
    const url = `${API_BASE_URL}/records/${id}/file`;

    const startTime = performance.now();
    const logEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      method: 'GET',
      endpoint: `/records/${id}/file (download)`,
      fullUrl: url,
      timestamp: new Date().toLocaleTimeString(),
      status: 'Pending...',
      durationMs: 0,
      isError: false,
    };

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const durationMs = Math.round(performance.now() - startTime);
      logEntry.durationMs = durationMs;
      logEntry.status = response.status;
      logEntry.isError = !response.ok;

      if (!response.ok) {
        let errMsg = `Failed to download file (${response.status})`;
        try {
          const errData = await response.json();
          errMsg = errData.error || errData.details || errMsg;
        } catch {
          // ignore json parse error
        }
        logEntry.details = errMsg;
        notifyLog(logEntry);
        throw new Error(errMsg);
      }

      const blob = await response.blob();
      notifyLog(logEntry);

      // Trigger browser download via object URL
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = originalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);

      return { success: true };
    } catch (err) {
      logEntry.isError = true;
      logEntry.status = err.status || 'Failed';
      logEntry.details = err.message;
      notifyLog(logEntry);
      throw err;
    }
  },

  // Reminders & Upcoming
  async getUpcoming(days = 30) {
    return request(`/upcoming?days=${days}`);
  },

  async getNotifications() {
    return request('/notifications');
  },

  async markNotificationRead(id) {
    return request(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  async markAllNotificationsRead() {
    return request('/notifications/read-all', {
      method: 'POST',
    });
  },

  async runReminderCheck() {
    return request('/notifications/run-cron', {
      method: 'POST',
    });
  },
};

export default api;
