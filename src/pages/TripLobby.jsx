import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, collection, onSnapshot, addDoc, serverTimestamp, deleteDoc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import useTripStore from '../store/useTripStore';
import useAuthStore from '../store/useAuthStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Users, Receipt, Plus, UserPlus, CheckCircle2, ArrowRightLeft, ShieldCheck, Share2, Home, Calendar, Trash2, Edit2, Check, X } from 'lucide-react';
import { calculateBalances, calculateTransactions } from '../lib/splitLogic';
import AddExpenseModal from '../components/AddExpenseModal';
import PasscodePromptModal from '../components/PasscodePromptModal';
import IdentityModal from '../components/IdentityModal';
import { motion } from 'framer-motion';

export default function TripLobby() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [newMemberName, setNewMemberName] = useState('');
  
  // Modals state
  const [isExpenseModalOpen, setExpenseModalOpen] = useState(false);
  const [isPasscodeModalOpen, setPasscodeModalOpen] = useState(false);
  const [passcodeError, setPasscodeError] = useState('');
  const [pendingAction, setPendingAction] = useState(null); // stores the action to execute after auth

  // Editing trip name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  // User and Identity state
  const { user } = useAuthStore();
  const [userIdentity, setUserIdentity] = useState(null);
  const [isIdentityModalOpen, setIdentityModalOpen] = useState(false);
  const [hasPromptedIdentity, setHasPromptedIdentity] = useState(false);

  // Host verification
  const isHostLocal = useTripStore((state) => state.isHost(id));
  const setHostPasscode = useTripStore((state) => state.setHostPasscode);
  const isHost = trip?.hostUid ? (trip.hostUid === user?.uid) : isHostLocal;

  // Real-time subscriptions
  useEffect(() => {
    const unsubTrip = onSnapshot(doc(db, 'trips', id), (doc) => {
      if (doc.exists()) setTrip({ id: doc.id, ...doc.data() });
    });

    const unsubMembers = onSnapshot(collection(db, 'trips', id, 'members'), (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubExpenses = onSnapshot(collection(db, 'trips', id, 'expenses'), (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubTrip();
      unsubMembers();
      unsubExpenses();
    };
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    const fetchIdentity = async () => {
      const docSnap = await getDoc(doc(db, 'users', user.uid, 'tripIdentities', id));
      if (docSnap.exists()) {
        setUserIdentity(docSnap.data().memberId);
      } else if (members.length > 0 && !isIdentityModalOpen && !hasPromptedIdentity) {
        setIdentityModalOpen(true);
        setHasPromptedIdentity(true);
      }
    };
    fetchIdentity();
  }, [user, id, members.length, isIdentityModalOpen, hasPromptedIdentity]);

  const handleClaimIdentity = async (memberId) => {
    await setDoc(doc(db, 'users', user.uid, 'tripIdentities', id), { memberId }, { merge: true });
    setUserIdentity(memberId);
    setIdentityModalOpen(false);
  };

  // Derived state
  const balances = calculateBalances(members, expenses);
  const transactions = calculateTransactions(members, expenses);
  
  // Group expenses by day
  const groupedExpenses = expenses.reduce((acc, exp) => {
    const day = exp.day || 1;
    if (!acc[day]) acc[day] = [];
    acc[day].push(exp);
    return acc;
  }, {});
  const sortedDays = Object.keys(groupedExpenses).sort((a, b) => b - a);

  // Action wrapper (checks host status first)
  const requireHost = (actionFn) => {
    if (isHost) {
      actionFn();
    } else {
      setPendingAction(() => actionFn);
      setPasscodeModalOpen(true);
    }
  };

  const handlePasscodeSubmit = (code) => {
    if (trip && trip.passcode === code) {
      setHostPasscode(id, code);
      setPasscodeModalOpen(false);
      setPasscodeError('');
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } else {
      setPasscodeError('Incorrect passcode');
    }
  };

  const addMember = async (e) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    
    requireHost(async () => {
      await addDoc(collection(db, 'trips', id, 'members'), {
        name: newMemberName,
        createdAt: serverTimestamp()
      });
      setNewMemberName('');
    });
  };

  const addExpense = async (expenseData) => {
    await addDoc(collection(db, 'trips', id, 'expenses'), {
      ...expenseData,
      createdAt: serverTimestamp()
    });
  };

  const deleteExpense = (expId) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    requireHost(async () => {
      await deleteDoc(doc(db, 'trips', id, 'expenses', expId));
    });
  };

  const settleDebt = (transaction) => {
    requireHost(async () => {
      // To "settle" a debt in this MVP, we just add a counter-expense 
      // representing the payment from debtor to creditor.
      await addDoc(collection(db, 'trips', id, 'expenses'), {
        description: `Settlement: ${transaction.fromName} paid ${transaction.toName}`,
        amount: transaction.amount,
        paidBy: transaction.fromId, // The person who owed money pays it
        paidTo: transaction.toId,   // The person receiving the settlement
        isSettlement: true,
        createdAt: serverTimestamp()
      });
    });
  };

  const endDay = () => {
    requireHost(async () => {
      await updateDoc(doc(db, 'trips', id), {
        currentDay: (trip.currentDay || 1) + 1
      });
    });
  };

  const startEditingName = () => {
    requireHost(() => {
      setEditedName(trip.name);
      setIsEditingName(true);
    });
  };

  const saveTripName = async () => {
    if (!editedName.trim() || editedName.trim() === trip.name) {
      setIsEditingName(false);
      return;
    }
    await updateDoc(doc(db, 'trips', id), { name: editedName.trim() });
    setIsEditingName(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied to clipboard!');
  };

  if (!trip) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading Trip...</div>;

  const myIdentity = members.find(m => m.id === userIdentity);
  const myBalance = userIdentity && balances[userIdentity] ? balances[userIdentity].balance : 0;
  const myTransactions = transactions.filter(t => t.fromId === userIdentity || t.toId === userIdentity);

  return (
    <div className="min-h-screen pb-20 relative">
      {/* Background elements */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto p-4 space-y-6 relative z-10 pt-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-md">
          <div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/')} 
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                title="Back to Home"
              >
                <Home size={20} />
              </button>
              
              {isEditingName ? (
                <div className="flex items-center gap-1">
                  <Input 
                    value={editedName} 
                    onChange={(e) => setEditedName(e.target.value)} 
                    className="text-xl font-bold h-10 w-48 bg-slate-800/80 border-slate-600"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && saveTripName()}
                  />
                  <button onClick={saveTripName} className="p-2 text-emerald-400 hover:bg-slate-700/50 rounded-lg transition-colors">
                    <Check size={18} />
                  </button>
                  <button onClick={() => setIsEditingName(false)} className="p-2 text-slate-400 hover:bg-slate-700/50 rounded-lg transition-colors">
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h1 className="text-3xl font-bold text-white">{trip.name}</h1>
                  <button 
                    onClick={startEditingName}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-white transition-all rounded-lg"
                    title="Rename Trip"
                  >
                    <Edit2 size={18} />
                  </button>
                </div>
              )}

              {isHost ? (
                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-md flex items-center gap-1 font-medium">
                  <ShieldCheck size={14} /> Host
                </span>
              ) : (
                <span className="bg-slate-500/20 text-slate-400 text-xs px-2 py-1 rounded-md font-medium">
                  Public Viewer
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm mt-1">
              {members.length} Members • {expenses.length} Expenses • Day {trip.currentDay || 1}
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            {isHost && (
              <Button onClick={endDay} variant="primary" className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700">
                <Calendar size={16} className="mr-2" /> End Day {trip.currentDay || 1}
              </Button>
            )}
            <Button onClick={copyLink} variant="secondary" className="flex-1 md:flex-none">
              <Share2 size={16} className="mr-2" /> Share Link
            </Button>
          </div>
        </div>

        {/* Personalized Stats Card */}
        {myIdentity ? (
          <Card className={`p-6 border-slate-700/50 ${myBalance > 0 ? 'bg-emerald-900/20' : myBalance < 0 ? 'bg-red-900/20' : 'bg-slate-800/40'}`}>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h3 className="text-lg font-medium text-slate-300">Welcome, {myIdentity.name}</h3>
                {myBalance === 0 ? (
                  <p className="text-2xl font-bold text-slate-400">You are completely settled up!</p>
                ) : myBalance > 0 ? (
                  <p className="text-3xl font-bold text-emerald-400">You are owed {trip.currency || '$'}{myBalance.toFixed(2)} overall</p>
                ) : (
                  <p className="text-3xl font-bold text-red-400">You owe {trip.currency || '$'}{Math.abs(myBalance).toFixed(2)} overall</p>
                )}
              </div>
              <div className="space-y-2">
                {myTransactions.map((tx, i) => {
                  if (tx.fromId === userIdentity) {
                    return (
                      <div key={i} className="text-sm font-medium text-red-400">
                        You owe {tx.toName} {trip.currency || '$'}{tx.amount.toFixed(2)}
                      </div>
                    );
                  }
                  if (tx.toId === userIdentity) {
                    return (
                      <div key={i} className="text-sm font-medium text-emerald-400">
                        {tx.fromName} owes you {trip.currency || '$'}{tx.amount.toFixed(2)}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </Card>
        ) : (
          members.length > 0 && (
            <Card className="p-6 bg-slate-800/40 border-slate-700/50 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-slate-300 font-medium">Claim your name to see your personalized stats!</div>
              <Button onClick={() => setIdentityModalOpen(true)} variant="secondary" className="whitespace-nowrap">
                Who are you?
              </Button>
            </Card>
          )
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Members Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Users size={20} className="text-blue-400" /> Members
              </h2>
            </div>
            <Card className="p-4 bg-slate-800/40 border-slate-700/50">
              <form onSubmit={addMember} className="flex gap-2 mb-4">
                <Input
                  placeholder="Name"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="h-10 text-sm"
                />
                <Button type="submit" size="sm" className="h-10 px-3">
                  <UserPlus size={16} />
                </Button>
              </form>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {members.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">No members yet</p>
                ) : (
                  members.map(m => (
                    <div key={m.id} className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/50 border border-slate-700/30">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center font-bold text-white text-xs">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-200">{m.name}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Center Column: Expenses */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Receipt size={20} className="text-emerald-400" /> Expenses
              </h2>
              <Button 
                onClick={() => requireHost(() => setExpenseModalOpen(true))}
                size="sm" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus size={16} className="mr-1" /> Add
              </Button>
            </div>
            
            <Card className="p-0 bg-slate-800/40 border-slate-700/50 overflow-hidden">
              <div className="divide-y divide-slate-700/50 max-h-[500px] overflow-y-auto">
                {expenses.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <Receipt size={40} className="mx-auto mb-3 opacity-20" />
                    <p>No expenses added yet.</p>
                  </div>
                ) : (
                  sortedDays.map(dayStr => {
                    const day = Number(dayStr);
                    const dayExpenses = groupedExpenses[day].sort((a,b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
                    
                    const firstExpenseDate = dayExpenses[dayExpenses.length - 1]?.createdAt?.toDate();
                    const dateString = firstExpenseDate ? firstExpenseDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
                    
                    return (
                      <div key={`day-${day}`}>
                        <div className="bg-slate-800/80 px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md flex justify-between items-center">
                          <span>Day {day}</span>
                          {dateString && <span className="text-[10px] font-medium text-slate-500 normal-case tracking-normal">{dateString}</span>}
                        </div>
                        <div className="divide-y divide-slate-700/50">
                          {dayExpenses.map(exp => (
                            <motion.div 
                              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                              key={exp.id} 
                              className={`p-4 flex items-center justify-between hover:bg-slate-700/20 transition-colors group ${exp.isSettlement ? 'bg-emerald-500/5' : ''}`}
                            >
                              <div>
                                <p className="font-medium text-slate-200">{exp.description}</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  Paid by <span className="text-slate-300 font-medium">{members.find(m => m.id === exp.paidBy)?.name || 'Unknown'}</span>
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className={`font-bold ${exp.isSettlement ? 'text-emerald-400' : 'text-slate-100'}`}>
                                  {trip.currency || '$'}{parseFloat(exp.amount).toFixed(2)}
                                </div>
                                <button 
                                  onClick={() => deleteExpense(exp.id)}
                                  className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                                  title="Delete Expense"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Balances & Settlement Section */}
            <div className="pt-4">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <ArrowRightLeft size={20} className="text-purple-400" /> Settlement Plan
              </h2>
              <div className="grid gap-3">
                {transactions.length === 0 ? (
                  <Card className="p-4 bg-slate-800/40 border-slate-700/50 text-center text-slate-400 text-sm">
                    All settled up! No debts currently.
                  </Card>
                ) : (
                  transactions.map((tx, idx) => (
                    <Card key={idx} className="p-4 bg-slate-800/40 border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-red-400">{tx.fromName}</span>
                        <span className="text-slate-500 text-sm">owes</span>
                        <span className="font-semibold text-emerald-400">{tx.toName}</span>
                        <span className="font-bold text-white bg-slate-700/50 px-3 py-1 rounded-lg ml-2">
                          {trip.currency || '$'}{tx.amount.toFixed(2)}
                        </span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => settleDebt(tx)}
                        className="w-full sm:w-auto"
                      >
                        <CheckCircle2 size={16} className="mr-2 text-emerald-400" /> 
                        Record Payment
                      </Button>
                    </Card>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onAdd={addExpense}
        members={members}
        currency={trip.currency || '$'}
        currentDay={trip.currentDay || 1}
      />

      <PasscodePromptModal
        isOpen={isPasscodeModalOpen}
        onClose={() => {
          setPasscodeModalOpen(false);
          setPendingAction(null);
        }}
        onSubmit={handlePasscodeSubmit}
        error={passcodeError}
      />

      <IdentityModal 
        isOpen={isIdentityModalOpen}
        members={members}
        onSelect={handleClaimIdentity}
        onClose={() => setIdentityModalOpen(false)}
      />
    </div>
  );
}
