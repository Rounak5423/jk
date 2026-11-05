import { create } from 'zustand';
import { User } from '../types';
import { queryClient } from '../queryClient';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  activeFleetId: string | null;
  activeFleetName: string | null;
  fleetWorkspaceOpen: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setActiveFleet: (fleetId: string, fleetName?: string) => void;
  openFleetWorkspace: () => void;
  closeFleetWorkspace: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const savedToken = localStorage.getItem('jk_token');
  const savedUser = localStorage.getItem('jk_user');
  const parsedUser: User | null = savedUser ? JSON.parse(savedUser) : null;
  const savedFleetId = localStorage.getItem('jk_active_fleet_id') || (parsedUser ? parsedUser.fleet_id : null);
  const savedFleetName = localStorage.getItem('jk_active_fleet_name') || (parsedUser ? parsedUser.fleet_name : null);
  const savedWorkspaceOpen = localStorage.getItem('jk_fleet_workspace_open') === 'true';

  return {
    token: savedToken,
    user: parsedUser,
    isAuthenticated: !!savedToken,
    activeFleetId: savedFleetId,
    activeFleetName: savedFleetName,
    fleetWorkspaceOpen: savedWorkspaceOpen,

    login: (token: string, user: User) => {
      localStorage.setItem('jk_token', token);
      localStorage.setItem('jk_user', JSON.stringify(user));
      if (user.fleet_id) {
        localStorage.setItem('jk_active_fleet_id', user.fleet_id);
      }
      if (user.fleet_name) {
        localStorage.setItem('jk_active_fleet_name', user.fleet_name);
      }
      localStorage.setItem('jk_fleet_workspace_open', 'false');
      set({
        token,
        user,
        isAuthenticated: true,
        activeFleetId: user.fleet_id,
        activeFleetName: user.fleet_name || null,
        fleetWorkspaceOpen: false,
      });
    },

    logout: () => {
      localStorage.removeItem('jk_token');
      localStorage.removeItem('jk_user');
      localStorage.removeItem('jk_active_fleet_id');
      localStorage.removeItem('jk_active_fleet_name');
      localStorage.removeItem('jk_fleet_workspace_open');
      try {
        queryClient.clear();
      } catch (e) {
        // ignore
      }
      set({ token: null, user: null, isAuthenticated: false, activeFleetId: null, activeFleetName: null, fleetWorkspaceOpen: false });
    },

    setActiveFleet: (fleetId: string, fleetName?: string) => {
      localStorage.setItem('jk_active_fleet_id', fleetId);
      if (fleetName) {
        localStorage.setItem('jk_active_fleet_name', fleetName);
      }
      try {
        queryClient.clear();
      } catch (e) {
        // ignore
      }
      set((state) => ({
        activeFleetId: fleetId,
        activeFleetName: fleetName || state.activeFleetName,
        user: state.user ? { ...state.user, fleet_id: fleetId, fleet_name: fleetName || state.user.fleet_name } : null,
      }));
    },

    openFleetWorkspace: () => {
      localStorage.setItem('jk_fleet_workspace_open', 'true');
      set({ fleetWorkspaceOpen: true });
    },

    closeFleetWorkspace: () => {
      localStorage.setItem('jk_fleet_workspace_open', 'false');
      set({ fleetWorkspaceOpen: false });
    },
  };
});
