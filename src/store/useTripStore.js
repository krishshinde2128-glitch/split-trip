import { create } from 'zustand';

// Zustand store for managing local state, primarily the authorization (passcode)
const useTripStore = create((set) => ({
  // We'll store passcodes mapped by trip ID so a user can be host of multiple trips
  hostPasscodes: JSON.parse(localStorage.getItem('trip_passcodes') || '{}'),

  setHostPasscode: (tripId, passcode) => set((state) => {
    const newPasscodes = { ...state.hostPasscodes, [tripId]: passcode };
    localStorage.setItem('trip_passcodes', JSON.stringify(newPasscodes));
    return { hostPasscodes: newPasscodes };
  }),

  // Check if the current user has the correct passcode for a given trip
  // For the MVP, we assume the passcode stored matches what's on Firebase.
  // In a real app, this should be validated server-side (e.g., Firebase Cloud Functions or Security Rules).
  isHost: (tripId) => {
    const passcodes = JSON.parse(localStorage.getItem('trip_passcodes') || '{}');
    return !!passcodes[tripId];
  },
  
  getPasscode: (tripId) => {
    const passcodes = JSON.parse(localStorage.getItem('trip_passcodes') || '{}');
    return passcodes[tripId];
  }
}));

export default useTripStore;
