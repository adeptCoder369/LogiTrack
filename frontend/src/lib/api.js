import axios from 'axios';
import { enqueueOfflineRequest, isMutation, isOnline } from './offline';
// ================================================================================================================
export const BACKEND_URL = (
  process.env.REACT_APP_BACKEND_URL
).replace(/\/api$/, '/api/v1');

const API_BASE = `${BACKEND_URL}/api/v1`;
const DOWNLOAD_TOKEN_KEY = 'download_token';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.skipOfflineQueue || !isMutation(config)) {
      return config;
    }

    if (!(await isOnline())) {
      const queued = await enqueueOfflineRequest(config);
      return {
        ...config,
        headers: { ...config.headers },
        offlineQueued: true,
        offlineQueueId: queued.id,
        data: {
          queued: true,
          offlineQueueId: queued.id,
        },
        status: 202,
        statusText: 'Queued offline',
      };
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem(DOWNLOAD_TOKEN_KEY);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ---- Download token -------------------------------------------------------
// The browser loads file and export URLs itself (<img src>, window.open) and
// cannot attach an Authorization header, so those URLs carry a short-lived,
// download-scoped token as ?t=. It is stored so the URL builders below can stay
// synchronous; refreshDownloadToken() is called on login and on a timer.
export const refreshDownloadToken = async () => {
  if (!localStorage.getItem('token')) return null;
  try {
    const { data } = await api.post('/auth/download-token');
    localStorage.setItem(DOWNLOAD_TOKEN_KEY, data.token);
    return data.token;
  } catch (e) {
    return null;
  }
};

export const clearDownloadToken = () => localStorage.removeItem(DOWNLOAD_TOKEN_KEY);

const withDownloadToken = (url) => {
  const t = localStorage.getItem(DOWNLOAD_TOKEN_KEY);
  if (!t) return url;
  return `${url}${url.includes('?') ? '&' : '?'}t=${encodeURIComponent(t)}`;
};

// Auth
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  // OTP endpoints
  sendOtp: (data) => api.post('/otp/send', data),
  verifyOtp: (data) => api.post('/otp/verify', data),
  resendOtp: (data) => api.post('/otp/resend', data),
  // Login with OTP
  requestLoginOtp: (data) => api.post('/auth/login-otp', data),
  verifyLoginOtp: (data) => api.post('/auth/login-otp/verify', data),
  // Password reset
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  // First-time setup
  firstTimeSetup: (data) => api.post('/auth/first-time-setup', data),
  // Country codes
  getCountryCodes: () => api.get('/country-codes'),
};

// Admin
export const adminApi = {
  createUser: (data) => api.post('/admin/users', data),
};

// Companies
export const companiesApi = {
  getAll: () => api.get('/companies'),
  getOne: (id) => api.get(`/companies/${id}`),
  create: (data) => api.post('/companies', data),
  update: (id, data) => api.put(`/companies/${id}`, data),
  delete: (id) => api.delete(`/companies/${id}`),
  // Company Users
  getUsers: (companyId) => api.get(`/companies/${companyId}/users`),
  addUser: (companyId, data) => api.post(`/companies/${companyId}/users`, data),
  updateUser: (companyId, userId, data) => api.put(`/companies/${companyId}/users/${userId}`, data),
  deleteUser: (companyId, userId) => api.delete(`/companies/${companyId}/users/${userId}`),

  // Purchase Orders
  getPurchaseOrders: (companyId) => api.get(`/companies/${companyId}/purchase-orders`),

};

// Transporters
export const transportersApi = {
  getAll: () => api.get('/transporters'),
  getOne: (id) => api.get(`/transporters/${id}`),
  create: (data) => api.post('/transporters', data),
  update: (id, data) => api.put(`/transporters/${id}`, data),
  delete: (id) => api.delete(`/transporters/${id}`),
  // User management
  getUsers: (transporterId) => api.get(`/transporters/${transporterId}/users`),
  getSystemUsers: (transporterId) => api.get(`/transporters/${transporterId}/system-users`),
  addUser: (transporterId, userData) => api.post(`/transporters/${transporterId}/users`, userData),
  updateUser: (transporterId, userId, userData) => api.put(`/transporters/${transporterId}/users/${userId}`, userData),
  deleteUser: (transporterId, userId) => api.delete(`/transporters/${transporterId}/users/${userId}`),
};

// Trucks
export const trucksApi = {
  getAll: () => api.get('/trucks'),
  getOne: (id) => api.get(`/trucks/${id}`),
  create: (data) => api.post('/trucks', data),
  update: (id, data) => api.put(`/trucks/${id}`, data),
  delete: (id) => api.delete(`/trucks/${id}`),
  addDriver: (truckId, driver) => api.post(`/trucks/${truckId}/drivers`, driver),
  removeDriver: (truckId, driverMobile) => api.delete(`/trucks/${truckId}/drivers/${driverMobile}`),
  downloadDocuments: (truckId) => withDownloadToken(`${API_BASE}/trucks/${truckId}/download-documents`),
  downloadDocumentsChecklist: (truckId) => withDownloadToken(`${API_BASE}/trucks/${truckId}/download-documents-checklist`),
};

// Railway Sidings
export const railwaySidingsApi = {
  getAll: () => api.get('/railway-sidings'),
  getOne: (id) => api.get(`/railway-sidings/${id}`),
  create: (data) => api.post('/railway-sidings', data),
  update: (id, data) => api.put(`/railway-sidings/${id}`, data),
  delete: (id) => api.delete(`/railway-sidings/${id}`),
};

// Railway Zones
export const railwayZonesApi = {
  getAll: () => api.get('/railway-zones'),
  getOne: (id) => api.get(`/railway-zones/${id}`),
  create: (data) => api.post('/railway-zones', data),
  update: (id, data) => api.put(`/railway-zones/${id}`, data),
  delete: (id) => api.delete(`/railway-zones/${id}`),
};

// Products
export const productsApi = {
  getAll: () => api.get('/products'),
  getOne: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

// Depots
export const depotsApi = {
  getAll: () => api.get('/depots'),
  getOne: (id) => api.get(`/depots/${id}`),
  create: (data) => api.post('/depots', data),
  update: (id, data) => api.put(`/depots/${id}`, data),
  delete: (id) => api.delete(`/depots/${id}`),
};

// Depot Inventory
export const depotInventoryApi = {
  getAll: () => api.get('/depot-inventory'),
  getByDepot: (depotId) => api.get(`/depot-inventory/${depotId}`),
  getLedger: (depotId, productId, dateFrom, dateTo) =>
    api.get(`/depot-inventory/ledger/${depotId}/${productId}`, {
      params: { date_from: dateFrom || undefined, date_to: dateTo || undefined }
    }),
};

// Company Inventory
export const companyInventoryApi = {
  getAll: () => api.get('/company-inventory'),
  getByCompany: (companyId) => api.get(`/company-inventory/${companyId}`),
  getLedger: (companyId, productId, dateFrom, dateTo) =>
    api.get(`/company-inventory/ledger/${companyId}/${productId}`, {
      params: { date_from: dateFrom || undefined, date_to: dateTo || undefined }
    }),
};

// Delivery Orders
export const deliveryOrdersApi = {
  getAll: (status) => api.get('/delivery-orders', { params: { status } }),
  getOne: (id) => api.get(`/delivery-orders/${id}`),
  create: (data) => api.post('/delivery-orders', data),
  update: (id, data) => api.put(`/delivery-orders/${id}`, data),
  delete: (id) => api.delete(`/delivery-orders/${id}`),
};

// Liftings
export const liftingsApi = {
  getAll: (params) => api.get('/liftings', { params }),
  getOne: (id) => api.get(`/liftings/${id}`),
  update: (id, data) => api.put(`/liftings/${id}`, data),
  create: (data) => api.post('/liftings', data),
  verify: (id, data) => api.put(`/liftings/${id}/verify`, data),
  reject: (id, data) => api.put(`/liftings/${id}/reject`, data),
  delete: (id) => api.delete(`/liftings/${id}`),
};

// Export
export const exportApi = {
  liftings: (params) => withDownloadToken(`${API_BASE}/export/liftings?format=excel&${new URLSearchParams(params).toString()}`),
  inventory: () => withDownloadToken(`${API_BASE}/export/inventory?format=excel`),
  deliveryOrders: (status) => withDownloadToken(`${API_BASE}/export/delivery-orders?format=excel${status ? `&status=${status}` : ''}`),
  users: () => withDownloadToken(`${API_BASE}/export/users?format=excel`),
};

// Import
export const importApi = {
  getTemplate: (entity) => withDownloadToken(`${API_BASE}/import/template/${entity}`),
  bulkImport: (entity, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/import/${entity}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

// Downloads / Gatepass
export const downloadsApi = {
  getDriverGatepass: (truckId) => withDownloadToken(`${API_BASE}/trucks/${truckId}/download-driver-gatepass`),
  getHelperGatepass: (truckId) => withDownloadToken(`${API_BASE}/trucks/${truckId}/download-helper-gatepass`),
};

// Users
export const usersApi = {
  getAll: () => api.get('/users'),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// Permissions
export const permissionsApi = {
  getAll: () => api.get('/permissions'),
  update: (data) => api.put('/permissions', data),
  toggle: (module, role) => api.put(`/permissions/${encodeURIComponent(module)}/${encodeURIComponent(role)}`),
  reset: () => api.post('/permissions/reset'),
};

// Tenants (Phase 0)
export const tenantApi = {
  getConfig: () => api.get('/tenant/config'),
  getAll: () => api.get('/tenants'),
  create: (data) => api.post('/tenants', data),
  update: (id, data) => api.put(`/tenants/${id}`, data),
};

// Product Access
export const productAccessApi = {
  getAll: () => api.get('/product-access'),
  getUserAccess: (userId) => api.get(`/product-access/user/${userId}`),
  updateUserAccess: (userId, assignedProducts) => api.put(`/product-access/user/${userId}`, {
    user_id: userId,
    assigned_products: assignedProducts
  }),
  grantProductAccess: (productId, userIds) => api.post(`/product-access/product/${productId}/grant`, {
    product_id: productId,
    user_ids: userIds
  }),
  revokeProductAccess: (productId, userIds) => api.post(`/product-access/product/${productId}/revoke`, {
    product_id: productId,
    user_ids: userIds
  }),
  getMyProducts: () => api.get('/product-access/my-products'),
};

// Depot Access
export const depotAccessApi = {
  getAll: () => api.get('/depot-access'),
  getUserAccess: (userId) => api.get(`/depot-access/user/${userId}`),
  updateUserAccess: (userId, assignedDepots) => api.put(`/depot-access/user/${userId}`, {
    user_id: userId,
    assigned_depots: assignedDepots
  }),
  grantDepotAccess: (depotId, userIds) => api.post(`/depot-access/depot/${depotId}/grant`, {
    depot_id: depotId,
    user_ids: userIds
  }),
  revokeDepotAccess: (depotId, userIds) => api.post(`/depot-access/depot/${depotId}/revoke`, {
    depot_id: depotId,
    user_ids: userIds
  }),
  getMyDepots: () => api.get('/depot-access/my-depots'),
};

// Analytics
export const analyticsApi = {
  getDashboard: () => api.get('/analytics/dashboard'),
};

// Reports
export const reportsApi = {
  getSummary: () => api.get('/reports/summary'),
  getDatewiseLiftings: (params) => api.get('/reports/liftings/date-wise', { params }),
  exportDatewiseLiftings: (params) => `${API_BASE}/reports/liftings/export?format=excel&${new URLSearchParams(params).toString()}`,
};

// Purchase Orders
export const purchaseOrdersApi = {
  getAll: (status) => api.get('/purchase-orders', { params: { status } }),
  getOne: (id) => api.get(`/purchase-orders/${id}`),
  create: (data) => api.post('/purchase-orders', data),
  update: (id, data) => api.put(`/purchase-orders/${id}`, data),
  complete: (id, data) => api.put(`/purchase-orders/${id}/complete`, data),
  getStatement: (id) => api.get(`/purchase-orders/${id}/statement`),
  delete: (id) => api.delete(`/purchase-orders/${id}`),
  exportStatement: (id, format) => withDownloadToken(`${API_BASE}/purchase-orders/${id}/statement/export?format=${format}`)
};

export const pickupApi = {
  getAll: (params) => api.get('/pickups', { params }),
  getByDate: (date) => api.get('/pickups', { params: { date } }),
  create: (data) => api.post('/pickups', data),
  updateStatus: (id, data) =>
    api.put(`/pickups/${id}/status`, data),
  reschedule: (id, data) =>
    api.put(`/pickups/${id}/reschedule`, data),
  convertToLifting: (id) =>
    api.post(`/pickups/${id}/convert-to-lifting`),
  verify: (id, data) =>
    api.put(`/pickups/${id}/verify`, data),
  reject: (id, data) =>
    api.put(`/pickups/${id}/reject`, data),
  updateTransporter: (id, data) =>
    api.put(`/pickups/${id}/transporter`, data),
  updateCompany: (id, data) =>
    api.put(`/pickups/${id}/company`, data),
  uploadTareSlip: (id, data) =>
    api.put(`/pickups/${id}/tare-slip`, data),
  uploadWeightmentSlip: (id, data) =>
    api.put(`/pickups/${id}/weightment-slip`, data),
  updateWeightment: (id, data) =>
    api.put(`/pickups/${id}/weightment`, data),
  finalVerify: (id, data) =>
    api.put(`/pickups/${id}/final-verify`, data)
};

// Verified Trucks
export const verifiedTrucksApi = {
  getAll: (params) => api.get('/verified-trucks', { params }),
  getOne: (id) => api.get(`/verified-trucks/${id}`),
  create: (data) => api.post('/verified-trucks', data),
  update: (id, data) => api.put(`/verified-trucks/${id}`, data),
  delete: (id) => api.delete(`/verified-trucks/${id}`),
};

// File Upload
export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getFileUrl = (fileId) => withDownloadToken(`${API_BASE}/uploads/${fileId}`);

export default api;
