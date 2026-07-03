import { create } from 'zustand';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  error: null,
  
  initialize: () => {
    onAuthStateChanged(auth, (user) => {
      set({ user, loading: false });
    });
  },

  login: async (username, password) => {
    set({ error: null });
    const email = `${username.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}@splittrip.local`;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/configuration-not-found') {
        set({ error: 'Please enable Email/Password Authentication in your Firebase Console (Build -> Authentication -> Get Started -> Email/Password).' });
      } else {
        set({ error: err.message });
      }
    }
  },

  signup: async (username, password) => {
    set({ error: null });
    const email = `${username.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}@splittrip.local`;
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/configuration-not-found') {
        set({ error: 'Please enable Email/Password Authentication in your Firebase Console (Build -> Authentication -> Get Started -> Email/Password).' });
      } else {
        set({ error: err.message });
      }
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
  }
}));

export default useAuthStore;
