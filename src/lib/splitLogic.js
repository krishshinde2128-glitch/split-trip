// Utility to calculate who owes whom based on expenses

export const calculateBalances = (members, expenses) => {
  // Initialize balances for each member
  const balances = {};
  members.forEach(member => {
    balances[member.id] = { name: member.name, balance: 0 };
  });

  // Calculate net balances based on expenses
  expenses.forEach(expense => {
    if (!expense.amount || !expense.paidBy) return;
    
    const amount = parseFloat(expense.amount);

    if (expense.isSettlement) {
      if (balances[expense.paidBy]) balances[expense.paidBy].balance += amount;
      if (expense.paidTo && balances[expense.paidTo]) balances[expense.paidTo].balance -= amount;
      return;
    }

    const amountCents = Math.round(amount * 100);
    const splitCents = Math.floor(amountCents / members.length);
    let remainder = amountCents % members.length;

    const sortedMembers = [...members].sort((a, b) => {
      if (a.id === expense.paidBy) return -1;
      if (b.id === expense.paidBy) return 1;
      return a.id.localeCompare(b.id);
    });
    
    // Add to the payer's balance
    if (balances[expense.paidBy]) {
      balances[expense.paidBy].balance += amount;
    }

    // Subtract the share from everyone's balance
    sortedMembers.forEach(member => {
      let memberShareCents = splitCents;
      if (remainder > 0) {
        memberShareCents += 1;
        remainder -= 1;
      }
      if (balances[member.id]) {
        balances[member.id].balance -= (memberShareCents / 100);
      }
    });
  });

  return balances;
};

// Calculate pairwise transactions to settle debts exactly matching "who paid for whom"
export const calculateTransactions = (members, expenses) => {
  // Initialize pairwise balances: graph[borrower][lender] = amount
  const graph = {};
  members.forEach(m => {
    graph[m.id] = {};
    members.forEach(other => {
      if (m.id !== other.id) graph[m.id][other.id] = 0;
    });
  });

  expenses.forEach(expense => {
    if (!expense.amount || !expense.paidBy) return;
    const amount = parseFloat(expense.amount);

    if (expense.isSettlement) {
      // A settlement reduces the debt from paidBy to paidTo
      const borrower = expense.paidBy;
      const lender = expense.paidTo;
      if (borrower && lender && graph[borrower] && graph[borrower][lender] !== undefined) {
        graph[lender][borrower] += amount;
      }
      return;
    }

    const amountCents = Math.round(amount * 100);
    const splitCents = Math.floor(amountCents / members.length);
    let remainder = amountCents % members.length;

    // To match Splitwise's deterministic penny distribution, we'll sort members by ID.
    // The payer gets the extra penny first (if any) to minimize their "lent" amount, 
    // then the rest goes to others.
    const sortedMembers = [...members].sort((a, b) => {
      if (a.id === expense.paidBy) return -1;
      if (b.id === expense.paidBy) return 1;
      return a.id.localeCompare(b.id);
    });

    // For each member, if they are not the payer, they owe the payer their share
    sortedMembers.forEach(member => {
      let memberShareCents = splitCents;
      if (remainder > 0) {
        memberShareCents += 1;
        remainder -= 1;
      }

      if (member.id !== expense.paidBy) {
        if (graph[member.id] && graph[member.id][expense.paidBy] !== undefined) {
          graph[member.id][expense.paidBy] += (memberShareCents / 100);
        }
      }
    });
  });

  // Net the balances pairwise
  const transactions = [];
  
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const m1 = members[i];
      const m2 = members[j];
      
      const m1OwesM2 = graph[m1.id]?.[m2.id] || 0;
      const m2OwesM1 = graph[m2.id]?.[m1.id] || 0;
      
      const net = m1OwesM2 - m2OwesM1;
      
      if (net > 0.01) {
        transactions.push({
          fromId: m1.id,
          fromName: m1.name,
          toId: m2.id,
          toName: m2.name,
          amount: parseFloat(net.toFixed(2))
        });
      } else if (net < -0.01) {
        transactions.push({
          fromId: m2.id,
          fromName: m2.name,
          toId: m1.id,
          toName: m1.name,
          amount: parseFloat((-net).toFixed(2))
        });
      }
    }
  }

  // Sort descending by amount
  transactions.sort((a, b) => b.amount - a.amount);
  
  return transactions;
};
