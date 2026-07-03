import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, ShieldAlert } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

export default function PasscodePromptModal({ isOpen, onClose, onSubmit, error }) {
  const [passcode, setPasscode] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!passcode.trim()) return;
    onSubmit(passcode);
    setPasscode(''); // clear on submit
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-sm"
        >
          <Card className="border border-red-500/20 bg-slate-900/90 relative overflow-hidden">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="flex flex-col items-center text-center mb-6 mt-4">
              <div className="bg-red-500/10 p-3 rounded-full text-red-400 mb-4">
                <ShieldAlert size={32} />
              </div>
              <h2 className="text-xl font-bold text-white">Host Access Required</h2>
              <p className="text-sm text-slate-400 mt-2">
                You need the host passcode to make changes to this trip.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Enter Passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="text-center text-lg tracking-widest"
                  autoFocus
                  required
                />
                {error && (
                  <p className="text-red-400 text-sm text-center animate-pulse">{error}</p>
                )}
              </div>

              <Button type="submit" variant="danger" className="w-full">
                <Lock size={16} className="mr-2" /> Unlock
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
