import { create } from "zustand";

export type ParentProfile = {
  id: string;
  email: string;
  name: string;
};

type AuthState = {
  profile: ParentProfile | null;
  setProfile: (profile: ParentProfile | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}));
