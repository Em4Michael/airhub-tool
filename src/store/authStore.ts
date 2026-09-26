import { create } from "zustand";

interface User {
  id: string;
  name: string;
  email: string;
  role: "rater" | "admin";
  isApproved: boolean;
  hourlyRate?: number;
  totalEarnings?: number;
  phone?: string;
  bankAccount?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== "undefined" ? localStorage.getItem("airhub_token") : null,
  isLoading: false,
  setAuth: (user, token) => {
    localStorage.setItem("airhub_token", token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem("airhub_token");
    set({ user: null, token: null });
  },
  setLoading: (v) => set({ isLoading: v }),
}));