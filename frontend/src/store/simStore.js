import { create } from 'zustand';

/**
 * Simulation store for timeline control
 * Manages simulation time and playback state
 */
export const useSimStore = create((set) => ({
  tiempo: 0,
  isPlaying: false,
  playbackSpeed: 1,
  simulationData: null,

  setTiempo: (t) => set({ tiempo: t }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setSimulationData: (data) => set({ simulationData: data }),

  reset: () => set({
    tiempo: 0,
    isPlaying: false,
    playbackSpeed: 1
  })
}));
