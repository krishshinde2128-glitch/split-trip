import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import useTripStore from '../store/useTripStore';
import useAuthStore from '../store/useAuthStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Plane, Lock, ArrowRight, Loader2, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CreateTrip() {
  const [tripName, setTripName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [currency, setCurrency] = useState('$');
  const [loading, setLoading] = useState(false);
  const [trips, setTrips] = useState([]);
  const navigate = useNavigate();
  const setHostPasscode = useTripStore((state) => state.setHostPasscode);
  const { user, logout } = useAuthStore();

  useEffect(() => {
    const q = query(collection(db, 'trips'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setTrips(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!tripName.trim() || !passcode.trim()) return;

    setLoading(true);
    try {
      const tripRef = await addDoc(collection(db, 'trips'), {
        name: tripName,
        passcode: passcode, // In production, hash this!
        currency: currency,
        currentDay: 1,
        createdAt: serverTimestamp(),
        hostUid: user?.uid || null
      });

      // Save passcode locally so this device is recognized as Host
      setHostPasscode(tripRef.id, passcode);
      
      navigate(`/trip/${tripRef.id}`);
    } catch (error) {
      console.error("Error creating trip: ", error);
      alert("Failed to create trip. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden space-y-8">
      {/* Abstract Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/20 rounded-full blur-[120px]" />

      <div className="absolute top-4 right-4 z-20">
        <Button onClick={logout} variant="secondary" size="sm" className="text-slate-400 hover:text-white">
          <LogOut size={16} className="mr-2" /> Log Out
        </Button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <Card className="glass border-slate-700/50">
          <div className="text-center mb-8">
            <div className="mx-auto bg-blue-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-blue-400">
              <Plane size={32} />
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              Start a New Trip
            </h1>
            <p className="text-slate-400 mt-2">Create a localized ledger for your group</p>
          </div>

          <form onSubmit={handleCreate} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Group Name</label>
              <Input
                placeholder="e.g., Goa Trip 2024"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Currency</label>
              <select
                className="flex h-12 w-full rounded-xl bg-slate-800/50 border border-slate-700 px-4 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                required
              >
                <option value="$">USD ($)</option>
                <option value="€">EUR (€)</option>
                <option value="£">GBP (£)</option>
                <option value="₹">INR (₹)</option>
                <option value="A$">AUD (A$)</option>
                <option value="C$">CAD (C$)</option>
                <option value="¥">JPY (¥)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Lock size={16} className="text-slate-400" />
                Host Passcode
              </label>
              <Input
                type="password"
                placeholder="Set a secret passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                required
              />
              <p className="text-xs text-slate-500">
                You'll need this to add expenses and settle debts. It will be saved automatically on this device.
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full mt-6" 
              size="lg"
              disabled={loading || !tripName || !passcode}
            >
              {loading ? (
                <Loader2 className="animate-spin mr-2" />
              ) : (
                <>
                  Create Trip <ArrowRight className="ml-2" size={20} />
                </>
              )}
            </Button>
          </form>
        </Card>
      </motion.div>

      {/* Recent Trips Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-md z-10"
      >
        <Card className="glass border-slate-700/50 p-5">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <Plane size={20} className="text-emerald-400"/> Recent Trips
          </h2>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {trips.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No trips found yet.</p>
            ) : (
              trips.map(trip => (
                <div 
                  key={trip.id} 
                  onClick={() => navigate(`/trip/${trip.id}`)}
                  className="p-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-xl cursor-pointer transition-all flex justify-between items-center group"
                >
                  <span className="font-medium text-slate-200">{trip.name}</span>
                  <ArrowRight size={16} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                </div>
              ))
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
