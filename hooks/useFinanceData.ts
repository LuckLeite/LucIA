// Fix: Import Dispatch and SetStateAction to resolve React namespace errors
import { useState, useEffect, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import type { Transaction, Category, Budget, PlannedTransaction, CardTransaction } from '../types';
import { INITIAL_CATEGORIES } from '../constants';

const useLocalStorage = <T,>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
};


export const useFinanceData = () => {
    const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', []);
    const [plannedTransactions, setPlannedTransactions] = useLocalStorage<PlannedTransaction[]>('planned_transactions', []);
    const [cardTransactions, setCardTransactions] = useLocalStorage<CardTransaction[]>('card_transactions', []);
    const [categories, setCategories] = useLocalStorage<any[]>('categories', INITIAL_CATEGORIES.map(c => ({...c, icon: c.icon.name})));
    const [budgets, setBudgets] = useLocalStorage<Budget[]>('budgets', []);
    const [lastDeletedTransaction, setLastDeletedTransaction] = useState<Transaction | null>(null);

    // Regular Transactions
    const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
        const newTransaction: Transaction = { ...transaction, id: crypto.randomUUID() };
        setTransactions(prev => [...prev, newTransaction].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };

    const addMultipleTransactions = (newTransactions: Omit<Transaction, 'id'>[]) => {
      const transactionsToAdd = newTransactions.map(tx => ({ ...tx, id: crypto.randomUUID() }));
      setTransactions(prev => [...prev, ...transactionsToAdd].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };

    const updateTransaction = (updatedTransaction: Transaction) => {
        setTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };

    const deleteTransaction = useCallback((id: string) => {
        const transactionToDelete = transactions.find(t => t.id === id);
        if (transactionToDelete) {
            setLastDeletedTransaction(transactionToDelete);
            setTransactions(prev => prev.filter(t => t.id !== id));
            return true;
        }
        return false;
    }, [transactions, setTransactions]);

    const deleteMultipleTransactions = useCallback((ids: string[]) => {
        setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
    }, [setTransactions]);
    
    const updateMultipleTransactionsCategory = useCallback((ids: string[], categoryId: string) => {
        setTransactions(prev => prev.map(t => 
            ids.includes(t.id) ? { ...t, categoryId } : t
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, [setTransactions]);

    const undoDelete = useCallback(() => {
        if (lastDeletedTransaction) {
            addTransaction(lastDeletedTransaction);
            setLastDeletedTransaction(null);
        }
    }, [lastDeletedTransaction]);

    const clearLastDeleted = () => {
        setLastDeletedTransaction(null);
    }

    // Planned Transactions
    const addPlannedTransaction = (transaction: Omit<PlannedTransaction, 'id'|'status'>, recurrenceCount: number = 0) => {
        const newPlanned: PlannedTransaction = { ...transaction, id: crypto.randomUUID(), status: 'pending' };
        
        const transactionsToAdd: PlannedTransaction[] = [newPlanned];

        if (recurrenceCount > 0) {
            const originalDate = new Date(transaction.dueDate + 'T12:00:00Z');
            let lastDueDate = originalDate;

            for (let i = 0; i < recurrenceCount; i++) {
                const nextTransactionData = { ...transaction };
                
                const nextDueDate = new Date(lastDueDate);
                nextDueDate.setUTCMonth(nextDueDate.getUTCMonth() + 1);

                // Adjust day if the next month is shorter (e.g., Jan 31 -> Feb 28/29)
                if (nextDueDate.getUTCMonth() !== (lastDueDate.getUTCMonth() + 1) % 12) {
                    // This means we skipped a month (e.g. date was 31, next month only has 28 days)
                    // so it rolled over. `setUTCDate(0)` gets the last day of the correct month.
                    nextDueDate.setUTCDate(0);
                }

                nextTransactionData.dueDate = nextDueDate.toISOString().split('T')[0];
                const nextMonthPlanned: PlannedTransaction = { ...nextTransactionData, id: crypto.randomUUID(), status: 'pending' };
                transactionsToAdd.push(nextMonthPlanned);
                lastDueDate = nextDueDate;
            }
        }
        
        setPlannedTransactions(prev => [...prev, ...transactionsToAdd].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
    };

    const updatePlannedTransaction = (updated: PlannedTransaction) => {
        setPlannedTransactions(prev => prev.map(t => t.id === updated.id ? updated : t).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
    };
    
    const deletePlannedTransaction = (id: string) => {
        setPlannedTransactions(prev => prev.filter(t => t.id !== id));
    };

    const markPlannedTransactionAsPaid = useCallback((id: string) => {
        const planned = plannedTransactions.find(pt => pt.id === id);
        if (planned) {
            addTransaction({
                amount: planned.amount,
                categoryId: planned.categoryId,
                date: planned.dueDate,
                description: planned.description,
                type: planned.type,
            });
            updatePlannedTransaction({ ...planned, status: 'paid' });
        }
    }, [plannedTransactions]);

    // Card Transactions
    const addCardTransaction = (transaction: Omit<CardTransaction, 'id'>) => {
        const newCardTransaction: CardTransaction = { ...transaction, id: crypto.randomUUID() };
        setCardTransactions(prev => [...prev, newCardTransaction].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()));
    };

    const updateCardTransaction = (updated: CardTransaction) => {
        setCardTransactions(prev => prev.map(t => t.id === updated.id ? updated : t).sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()));
    };

    const deleteCardTransaction = (id: string) => {
        setCardTransactions(prev => prev.filter(t => t.id !== id));
    };


    const totalBalance = useMemo(() => {
        // Fix: Add explicit types for reduce arguments to prevent type error with '+' operator
        return transactions.reduce((sum: number, tx: Transaction) => {
            return tx.type === 'income' ? sum + tx.amount : sum - tx.amount;
        }, 0);
    }, [transactions]);

    const getMonthlySummary = useCallback((date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();

        let income = 0;
        let expense = 0;

        transactions
            .filter(tx => {
                const txDate = new Date(tx.date);
                return txDate.getFullYear() === year && txDate.getMonth() === month;
            })
            .forEach(tx => {
                if (tx.type === 'income') {
                    income += tx.amount;
                } else {
                    expense += tx.amount;
                }
            });
        
        const pendingPlanned = plannedTransactions
            .filter(pt => {
                const txDate = new Date(pt.dueDate);
                return txDate.getFullYear() === year && txDate.getMonth() === month && pt.status === 'pending';
            });

        const plannedExpense = pendingPlanned
            .filter(pt => pt.type === 'expense')
            .reduce((sum, pt) => sum + pt.amount, 0);
            
        const plannedIncome = pendingPlanned
            .filter(pt => pt.type === 'income')
            .reduce((sum, pt) => sum + pt.amount, 0);


        return { income, expense, plannedExpense, plannedIncome };
    }, [transactions, plannedTransactions]);
    
    return {
        transactions,
        categories: INITIAL_CATEGORIES,
        budgets,
        addTransaction,
        addMultipleTransactions,
        updateTransaction,
        deleteTransaction,
        deleteMultipleTransactions,
        updateMultipleTransactionsCategory,
        lastDeletedTransaction,
        undoDelete,
        clearLastDeleted,
        totalBalance,
        getMonthlySummary,
        // Planned
        plannedTransactions,
        addPlannedTransaction,
        updatePlannedTransaction,
        deletePlannedTransaction,
        markPlannedTransactionAsPaid,
        // Card
        cardTransactions,
        addCardTransaction,
        updateCardTransaction,
        deleteCardTransaction,
    };
};