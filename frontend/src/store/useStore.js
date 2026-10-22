import { create } from 'zustand';

const useStore = create((set) => ({
  selectedGymId: null,
  setSelectedGymId: (gymId) => set({ selectedGymId: gymId }),

  anomalyCount: 0,
  setAnomalyCount: (count) => set({ anomalyCount: count }),

  anomalySeverityFilter: null, // null | 'warning' | 'critical'
  setAnomalySeverityFilter: (severity) => set({ anomalySeverityFilter: severity }),

  toasts: [],
  pushToast: (toast) => set((s) => ({ toasts: [...s.toasts, toast] })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export default useStore;
