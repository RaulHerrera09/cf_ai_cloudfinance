import { create } from 'zustand';

export type User = { id: string; email: string; name: string };

type AuthStore = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isBootstrapping: boolean;
  setAuth: (accessToken: string, refreshToken: string, user?: User) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  setBootstrapping: (value: boolean) => void;
};

const REFRESH_KEY = 'cf_refresh_token';

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: localStorage.getItem(REFRESH_KEY),
  isBootstrapping: true,
  setAuth: (accessToken, refreshToken, user) => {
    localStorage.setItem(REFRESH_KEY, refreshToken);
    set((s) => ({ accessToken, refreshToken, user: user ?? s.user }));
  },
  setUser: (user) => set({ user }),
  clearAuth: () => {
    localStorage.removeItem(REFRESH_KEY);
    set({ user: null, accessToken: null, refreshToken: null });
  },
  setBootstrapping: (isBootstrapping) => set({ isBootstrapping }),
}));
