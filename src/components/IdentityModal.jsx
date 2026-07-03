import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

export default function IdentityModal({ isOpen, members, onSelect, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md"
            >
              <Card className="p-6 bg-slate-800 border-slate-700">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Who are you?</h2>
                  <p className="text-slate-400 text-sm">
                    Select your name from the trip members to see your personalized stats.
                  </p>
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {members.length === 0 ? (
                    <div className="text-center text-slate-500 py-4">
                      The host hasn't added any members yet. Check back later!
                    </div>
                  ) : (
                    members.map(member => (
                      <button
                        key={member.id}
                        onClick={() => onSelect(member.id)}
                        className="w-full flex items-center gap-4 p-3 rounded-xl bg-slate-700/30 hover:bg-slate-700/60 border border-slate-600/30 transition-all text-left group"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center font-bold text-white shadow-lg group-hover:scale-110 transition-transform">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-200 text-lg">{member.name}</span>
                      </button>
                    ))
                  )}
                </div>

                {onClose && (
                  <div className="mt-4 pt-4 border-t border-slate-700/50 text-center">
                    <button 
                      onClick={onClose}
                      className="text-slate-400 hover:text-slate-300 text-sm font-medium transition-colors"
                    >
                      I'll do this later
                    </button>
                  </div>
                )}
              </Card>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
