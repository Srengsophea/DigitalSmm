const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('digitalsmm_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.error || (data.details ? data.details.map((d: any) => d.message).join(', ') : 'Request failed');
    throw new Error(errorMsg);
  }
  return data as T;
}

export const api = {
  // ================= AUTH =================
  auth: {
    async login(login: string, password: string, twoFactorCode?: string) {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password, twoFactorCode }),
      });
      return handleResponse<any>(res);
    },
    async sendOtp(username: string, email: string, password: string) {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      return handleResponse<any>(res);
    },
    async verifyOtp(email: string, otp: string) {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      return handleResponse<any>(res);
    },
    async resendOtp(email: string) {
      const res = await fetch(`${API_BASE}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return handleResponse<any>(res);
    },
    async forgotPassword(email: string) {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return handleResponse<any>(res);
    },
    async resetPassword(email: string, otp: string, newPassword: string) {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      return handleResponse<any>(res);
    },
    async register(username: string, email: string, password: string, otp?: string) {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, otp }),
      });
      return handleResponse<any>(res);
    },
    async googleLogin(payload: { email?: string; name?: string; credential?: string; accessToken?: string }) {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return handleResponse<any>(res);
    },
    async getProfile() {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        headers: { ...getAuthHeader() },
      });
      return handleResponse<any>(res);
    },
    // Multi-Step Secure Email Change
    async requestEmailChange(currentPassword: string, newEmail: string) {
      const res = await fetch(`${API_BASE}/auth/email/request-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ currentPassword, newEmail }),
      });
      return handleResponse<any>(res);
    },
    async verifyOldEmailChange(code: string) {
      const res = await fetch(`${API_BASE}/auth/email/verify-old`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ code }),
      });
      return handleResponse<any>(res);
    },
    async verifyNewEmailChange(code: string) {
      const res = await fetch(`${API_BASE}/auth/email/verify-new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ code }),
      });
      return handleResponse<any>(res);
    },
    async changePassword(currentPassword: string, newPassword: string) {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      return handleResponse<any>(res);
    },
    // RFC 6238 TOTP Two-Factor Authentication
    async setup2FA() {
      const res = await fetch(`${API_BASE}/auth/2fa/setup`, {
        method: 'POST',
        headers: { ...getAuthHeader() },
      });
      return handleResponse<any>(res);
    },
    async verifyAndEnable2FA(code: string) {
      const res = await fetch(`${API_BASE}/auth/2fa/verify-and-enable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ code }),
      });
      return handleResponse<any>(res);
    },
    async disable2FA(payload: { password?: string; code?: string }) {
      const res = await fetch(`${API_BASE}/auth/2fa/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(payload),
      });
      return handleResponse<any>(res);
    },
    async updateTimezone(timezone: string) {
      const res = await fetch(`${API_BASE}/auth/update-timezone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ timezone }),
      });
      return handleResponse<any>(res);
    },
    async regenerateApiKey() {
      const res = await fetch(`${API_BASE}/auth/api-key/regenerate`, {
        method: 'POST',
        headers: { ...getAuthHeader() },
      });
      return handleResponse<any>(res);
    },
  },

  // ================= SERVICES =================
  services: {
    async getServices(params?: {
      platform?: string;
      category?: string;
      search?: string;
      minPrice?: number;
      maxPrice?: number;
      activeOnly?: boolean;
    }) {
      const query = new URLSearchParams();
      if (params?.platform && params.platform !== 'All') query.append('platform', params.platform);
      if (params?.category && params.category !== 'All') query.append('category', params.category);
      if (params?.search) query.append('search', params.search);
      if (params?.minPrice) query.append('minPrice', params.minPrice.toString());
      if (params?.maxPrice) query.append('maxPrice', params.maxPrice.toString());
      if (params?.activeOnly !== undefined) query.append('activeOnly', params.activeOnly.toString());

      const res = await fetch(`${API_BASE}/services?${query.toString()}`);
      return handleResponse<any>(res);
    },
    async getServiceById(id: string) {
      const res = await fetch(`${API_BASE}/services/${id}`);
      return handleResponse<any>(res);
    },
    async syncFromProvider(markupPercent?: number) {
      const res = await fetch(`${API_BASE}/services/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ markupPercent }),
      });
      return handleResponse<any>(res);
    },
  },

  // ================= ORDERS =================
  orders: {
    async createOrder(payload: { serviceId: string; link: string; quantity: number; runs?: number; interval?: number }) {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(payload),
      });
      return handleResponse<any>(res);
    },
    async createMassOrder(massOrderData: string) {
      const res = await fetch(`${API_BASE}/orders/mass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ massOrderData }),
      });
      return handleResponse<any>(res);
    },
    async getMyOrders(params?: { status?: string; platform?: string; search?: string }) {
      const query = new URLSearchParams();
      if (params?.status && params.status !== 'ALL') query.append('status', params.status);
      if (params?.platform && params.platform !== 'ALL') query.append('platform', params.platform);
      if (params?.search) query.append('search', params.search);

      const res = await fetch(`${API_BASE}/orders/my-orders?${query.toString()}`, {
        headers: { ...getAuthHeader() },
      });
      return handleResponse<any>(res);
    },
    async checkLiveStatus(orderId: string) {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        headers: { ...getAuthHeader() },
      });
      return handleResponse<any>(res);
    },
  },

  // ================= WALLET =================
  wallet: {
    async getBalance() {
      const res = await fetch(`${API_BASE}/wallet/balance`, {
        headers: { ...getAuthHeader() },
      });
      return handleResponse<any>(res);
    },
    async deposit(amount: number, method: string) {
      const res = await fetch(`${API_BASE}/wallet/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ amount, method }),
      });
      return handleResponse<any>(res);
    },
    async generateKhqr(amount: number, currency: string = 'USD') {
      const res = await fetch(`${API_BASE}/wallet/khqr/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ amount, currency }),
      });
      return handleResponse<any>(res);
    },
    async verifyKhqr(md5: string, amount: number) {
      const res = await fetch(`${API_BASE}/wallet/khqr/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ md5, amount }),
      });
      return handleResponse<any>(res);
    },
    async getTransactions() {
      const res = await fetch(`${API_BASE}/wallet/transactions`, {
        headers: { ...getAuthHeader() },
      });
      return handleResponse<any>(res);
    },
  },

  // ================= TICKETS =================
  tickets: {
    async getMyTickets() {
      const res = await fetch(`${API_BASE}/tickets/my-tickets`, {
        headers: { ...getAuthHeader() },
      });
      return handleResponse<any>(res);
    },
    async createTicket(payload: {
      subjectType: string;
      subType?: string;
      orderIds?: string;
      message: string;
      referralSource?: string;
    }) {
      const res = await fetch(`${API_BASE}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(payload),
      });
      return handleResponse<any>(res);
    },
  },

  // ================= ADMIN =================
  admin: {
    async getStats() {
      const res = await fetch(`${API_BASE}/admin/stats`, {
        headers: { ...getAuthHeader() },
      });
      return handleResponse<any>(res);
    },
    async getAllUsers() {
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: { ...getAuthHeader() },
      });
      return handleResponse<any>(res);
    },
    async adjustBalance(userId: string, amount: number, reason?: string) {
      const res = await fetch(`${API_BASE}/admin/users/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ userId, amount, reason }),
      });
      return handleResponse<any>(res);
    },
    async toggleStatus(userId: string, status: 'active' | 'suspended') {
      const res = await fetch(`${API_BASE}/admin/users/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ userId, status }),
      });
      return handleResponse<any>(res);
    },
    async getAllOrders() {
      const res = await fetch(`${API_BASE}/admin/orders`, {
        headers: { ...getAuthHeader() },
      });
      return handleResponse<any>(res);
    },
    async updateService(id: string, updates: { customRate?: number; markupPercent?: number; isActive?: boolean }) {
      const res = await fetch(`${API_BASE}/admin/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(updates),
      });
      return handleResponse<any>(res);
    },
    async batchMarkup(options: {
      markupPercent?: number;
      fixedIncrease?: number;
      platform?: string;
      category?: string;
      serviceIds?: string[];
    } | number) {
      const payload = typeof options === 'number' ? { markupPercent: options } : options;
      const res = await fetch(`${API_BASE}/admin/services/markup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(payload),
      });
      return handleResponse<any>(res);
    },
    async bulkUpdateStatus(serviceIds: string[], isActive: boolean) {
      const res = await fetch(`${API_BASE}/admin/services/bulk-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ serviceIds, isActive }),
      });
      return handleResponse<any>(res);
    },
    async getSettings() {
      const res = await fetch(`${API_BASE}/admin/settings`, {
        headers: { ...getAuthHeader() },
      });
      return handleResponse<any>(res);
    },
    async updateSettings(settings: { apiKey?: string; apiUrl?: string; defaultMarkupPercent?: number; siteName?: string }) {
      const res = await fetch(`${API_BASE}/admin/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(settings),
      });
      return handleResponse<any>(res);
    },
    async getAuditLogs() {
      const res = await fetch(`${API_BASE}/admin/audit-logs`, {
        headers: { ...getAuthHeader() },
      });
      return handleResponse<any>(res);
    },
  },
};
