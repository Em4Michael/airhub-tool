import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
  timeout: 120000, // 2 min for AI calls
});

// Attach token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("airhub_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("airhub_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
};

// Ratings
export const ratingsApi = {
  evaluatePageQuality: (url: string) =>
    api.post("/ratings/evaluate/page-quality", { url }),
  evaluateNeedsMet: (query: string, url: string) =>
    api.post("/ratings/evaluate/needs-met", { query, url }),
  generateSxSComment: (data: object) =>
    api.post("/ratings/sxs-summary", data),
    evaluateNeedsMetImage: (query: string, url: string, imageBase64: string, imageType: string) =>
    api.post("/ratings/evaluate/needs-met-image", { query, url, imageBase64, imageType }),
    evaluateYoutubeImage: (query: string, url: string, imageBase64: string, imageType: string) =>
  api.post('/ratings/evaluate/youtube-image', { query, url, imageBase64, imageType }),
  evaluateYoutube: (query: string, url: string) =>
    api.post("/ratings/evaluate/youtube", { query, url }),
  evaluateImage: (query: string, url: string) =>
    api.post("/ratings/evaluate/image", { query, url }),
  evaluateImageFull: (query: string, url: string, queryImageBase64: string, queryImageMimeType: string, resultImageBase64: string, resultImageMimeType: string) =>
    api.post("/ratings/evaluate/image-full", { query, url, queryImageBase64, queryImageMimeType, resultImageBase64, resultImageMimeType }),
  evaluateSxS: (query: string, url: string, urlB: string) =>
    api.post("/ratings/evaluate/sxs", { query, url, urlB }),
  getMyRatings: (page = 1, taskType?: string) =>
    api.get("/ratings", { params: { page, taskType } }),
  getRatingById: (id: string) => api.get(`/ratings/${id}`),
};

// Timesheets
export const timesheetApi = {
  submit: (data: { hoursWorked: number; userNotes?: string }) =>
    api.post("/timesheets", data),
  getMine: () => api.get("/timesheets/me"),
  getAll: (status?: string) => api.get("/timesheets", { params: { status } }),
  approve: (id: string, adminNotes?: string) =>
    api.patch(`/timesheets/${id}/approve`, { adminNotes }),
  reject: (id: string, adminNotes?: string) =>
    api.patch(`/timesheets/${id}/reject`, { adminNotes }),
};

// Payments
export const paymentApi = {
  getMine: () => api.get("/payments/me"),
  getAll: (status?: string) => api.get("/payments", { params: { status } }),
  pay: (id: string) => api.patch(`/payments/${id}/pay`),
  deny: (id: string, reason?: string) =>
    api.patch(`/payments/${id}/deny`, { reason }),
  leaderboard: () => api.get("/payments/leaderboard"),
};

// Admin
export const adminApi = {
  stats: () => api.get("/admin/stats"),
  getUsers: (params?: object) => api.get("/admin/users", { params }),
  approveUser: (id: string) => api.patch(`/admin/users/${id}/approve`),
  revokeUser: (id: string) => api.patch(`/admin/users/${id}/revoke`),
  updateUserProfile: (id: string, data: object) =>
    api.patch(`/admin/users/${id}/profile`, data),
  toggleActive: (id: string) => api.patch(`/admin/users/${id}/toggle-active`),
    getAllRatings: (params?: object) => api.get("/admin/ratings", { params }),
  getUsage: (params?: object) => api.get("/admin/usage", { params }),
  getUserUsage: (userId: string, params?: object) => api.get(`/admin/usage/${userId}`, { params }),
  getAnalytics: () => api.get("/admin/analytics"),
  getUserStats: (userId: string) => api.get(`/admin/users/${userId}/stats`),
};

export default api;
