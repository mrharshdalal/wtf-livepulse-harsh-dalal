import { create } from 'zustand';

const useStore = create((set) => ({
  selectedGymId: null,
  setSelectedGymId: (gymId) => set({ selectedGymId: gymId }),

  anomalyCount: 0,
  setAnomalyCount: (count) => set({ anomalyCount: count }),
}));

export default useStore;
