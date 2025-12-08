import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Transaction, PlannedTransaction, CardTransaction } from '../types';
import { INITIAL_CATEGORIES } from '../constants';

// Helper to generate IDs
const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// Helper for UTC dates
const parseDateAsUTC = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
};

const STORAGE_KEYS = {
    TRANSACTIONS: 'lucia_transactions',
    PLANNED: 'lucia_planned_transactions',
    CARDS: 'lucia_card_transactions'
};

const MOVEMENT_BALANCE_DESC = 'Saldo Acumulado Movimento';

export const useFinanceData = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [plannedTransactions, setPlannedTransactions] = useState<PlannedTransaction[]>([]);
    const [cardTransactions, setCardTransactions] = useState<CardTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load data from LocalStorage
    useEffect(() => {
        try {
            const storedTransactions = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
            const storedPlanned = localStorage.getItem(STORAGE_KEYS.PLANNED);
            const storedCards = localStorage.getItem(STORAGE_KEYS.CARDS);

            if (storedTransactions) setTransactions(JSON.parse(storedTransactions));
            if (storedPlanned) setPlannedTransactions(JSON.parse(storedPlanned));
            if (storedCards) setCardTransactions(JSON.parse(storedCards));
        } catch (err) {
            console.error("Failed to load data from local storage", err);
            setError("Falha ao carregar dados locais.");
        } finally {
            setLoading(false);
        }
    }, []);

    // Persistence Helpers
    const saveTransactions = (data: Transaction[]) => {
        const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(sorted);
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(sorted));
    };

    const savePlanned = (data: PlannedTransaction[]) => {
        const sorted = [...data].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        setPlannedTransactions(sorted);
        localStorage.setItem(STORAGE_KEYS.PLANNED, JSON.stringify(sorted));
    };

    const saveCards = (data: CardTransaction[]) => {
        const sorted = [...data].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
        setCardTransactions(sorted);
        localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(sorted));
    };

    // --- Dynamic Card Invoices Generation ---
    // Generates invoices for all time, but marks them as paid if a matching transaction exists
    const generatedCardInvoices = useMemo(() => {
        const invoices: PlannedTransaction[] = [];
        const invoicesByCardAndMonth = new Map<string, number>();
        
        // 1. Calculate totals per month/card
        cardTransactions.forEach(cardTx => {
            const monthlyPayment = cardTx.totalAmount / cardTx.installments;
            const purchaseDate = parseDateAsUTC(cardTx.purchaseDate);

            for (let i = 1; i <= cardTx.installments; i++) {
                const dueDate = new Date(purchaseDate);
                dueDate.setUTCMonth(purchaseDate.getUTCMonth() + i);
                // Set fixed due day (e.g., 10th)
                dueDate.setUTCDate(10);
                
                const key = `${cardTx.card}_${dueDate.getUTCFullYear()}_${dueDate.getUTCMonth()}`;
                const current = invoicesByCardAndMonth.get(key) || 0;
                invoicesByCardAndMonth.set(key, current + monthlyPayment);
            }
        });

        // 2. Convert to PlannedTransaction objects
        invoicesByCardAndMonth.forEach((amount, key) => {
            const [cardName, yearStr, monthStr] = key.split('_');
            const year = parseInt(yearStr);
            const month = parseInt(monthStr);
            
            // Reconstruct date string YYYY-MM-DD
            const dueDateObj = new Date(Date.UTC(year, month, 10));
            const dueDateString = dueDateObj.toISOString().split('T')[0];
            const description = `Fatura Cartão ${cardName}`;

            // 3. Check if it's already paid
            // We look for a real transaction in the same month, same category (card), same description (approx)
            const isPaid = transactions.some(tx => {
                const txDate = parseDateAsUTC(tx.date);
                return tx.categoryId === 'cat_expense_card' &&
                       tx.description.includes(cardName) &&
                       txDate.getUTCFullYear() === year &&
                       txDate.getUTCMonth() === month;
            });

            invoices.push({
                id: `card_invoice_${key}`,
                amount: amount,
                type: 'expense',
                categoryId: 'cat_expense_card',
                description: description,
                dueDate: dueDateString,
                status: isPaid ? 'paid' : 'pending',
                isGenerated: true,
            });
        });

        return invoices;
    }, [cardTransactions, transactions]);

    // --- Transactions & Automatic Movement Logic ---

    // Logic to handle "Movement" category automation
    // If adding Expense Movement -> Increase Planned Income (Movement Balance)
    // If adding Income Movement -> Decrease Planned Income (Movement Balance)
    const updateMovementBalance = (
        currentPlanned: PlannedTransaction[],
        amountDelta: number, // Positive adds to balance, Negative removes
        dateReference: string
    ) => {
        let updated = [...currentPlanned];
        // Find existing 'Saldo Acumulado Movimento' that is pending
        let balanceItem = updated.find(p =>
            p.categoryId === 'cat_income_movement' &&
            p.status === 'pending' &&
            p.description === MOVEMENT_BALANCE_DESC
        );

        if (balanceItem) {
            const newAmount = balanceItem.amount + amountDelta;
            if (newAmount <= 0.01) {
                 // Balance depleted, remove the planned item
                 updated = updated.filter(p => p.id !== balanceItem!.id);
            } else {
                 // Update balance
                 updated = updated.map(p => p.id === balanceItem!.id ? { ...p, amount: newAmount } : p);
            }
        } else if (amountDelta > 0) {
            // Create new balance item if we are adding funds and none exists
            updated.push({
                id: generateUUID(),
                categoryId: 'cat_income_movement',
                type: 'income',
                amount: amountDelta,
                description: MOVEMENT_BALANCE_DESC,
                dueDate: dateReference,
                status: 'pending',
                isGenerated: true
            });
        }
        // If amountDelta < 0 and no item exists, we do nothing (cannot subtract from empty)
        return updated;
    };

    const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id'>) => {
        const newTx: Transaction = { ...transaction, id: generateUUID() };
        const newTransactionsList = [newTx, ...transactions]; 

        // Movement Logic
        let updatedPlanned = plannedTransactions;
        if (newTx.categoryId === 'cat_expense_movement') {
             // Expense means money went into savings -> Add to Planned Income Balance
             updatedPlanned = updateMovementBalance(updatedPlanned, newTx.amount, newTx.date);
        } else if (newTx.categoryId === 'cat_income_movement') {
             // Income means money came back from savings -> Deduct from Planned Income Balance
             updatedPlanned = updateMovementBalance(updatedPlanned, -newTx.amount, newTx.date);
        }

        saveTransactions(newTransactionsList);
        if (updatedPlanned !== plannedTransactions) savePlanned(updatedPlanned);
    }, [transactions, plannedTransactions]);

    const addMultipleTransactions = useCallback(async (newTransactions: Omit<Transaction, 'id'>[]) => {
        const formatted = newTransactions.map(t => ({ ...t, id: generateUUID() }));
        
        // Calculate Net Movement Change first to apply in one go (cleaner)
        let movementNetChange = 0;
        let refDate = new Date().toISOString().split('T')[0];

        formatted.forEach(tx => {
            if (tx.categoryId === 'cat_expense_movement') {
                movementNetChange += tx.amount;
                refDate = tx.date;
            } else if (tx.categoryId === 'cat_income_movement') {
                movementNetChange -= tx.amount;
                refDate = tx.date;
            }
        });

        let updatedPlanned = plannedTransactions;
        if (movementNetChange !== 0) {
            updatedPlanned = updateMovementBalance(updatedPlanned, movementNetChange, refDate);
        }

        saveTransactions([...transactions, ...formatted]);
        if (updatedPlanned !== plannedTransactions) savePlanned(updatedPlanned);
    }, [transactions, plannedTransactions]);

    const updateTransaction = useCallback(async (updatedTransaction: Transaction) => {
        const updatedList = transactions.map(t => t.id === updatedTransaction.id ? updatedTransaction : t);
        saveTransactions(updatedList);
    }, [transactions]);

    const deleteTransaction = useCallback(async (id: string) => {
        const filtered = transactions.filter(t => t.id !== id);
        saveTransactions(filtered);
    }, [transactions]);
    
    const deleteMultipleTransactions = useCallback(async (ids: string[]) => {
        const filtered = transactions.filter(t => !ids.includes(t.id));
        saveTransactions(filtered);
    }, [transactions]);
    
    const updateMultipleTransactionsCategory = useCallback(async (ids: string[], categoryId: string) => {
        const updatedList = transactions.map(t => ids.includes(t.id) ? { ...t, categoryId } : t);
        saveTransactions(updatedList);
    }, [transactions]);

    // --- Planned Transactions ---

    const addPlannedTransaction = useCallback(async (transaction: Omit<PlannedTransaction, 'id' | 'status'>, recurrenceCount: number = 0) => {
        const transactionsToAdd: PlannedTransaction[] = [];
        transactionsToAdd.push({ ...transaction, id: generateUUID(), status: 'pending' });

        if (recurrenceCount > 0) {
            let lastDueDate = new Date(transaction.dueDate + 'T12:00:00Z');
            for (let i = 0; i < recurrenceCount; i++) {
                const nextDueDate = new Date(lastDueDate);
                nextDueDate.setUTCMonth(nextDueDate.getUTCMonth() + 1);
                // Adjust for end of month (e.g. Jan 31 -> Feb 28)
                if (nextDueDate.getUTCMonth() !== (lastDueDate.getUTCMonth() + 1) % 12) nextDueDate.setUTCDate(0);
                
                transactionsToAdd.push({ 
                    ...transaction, 
                    id: generateUUID(),
                    dueDate: nextDueDate.toISOString().split('T')[0], 
                    status: 'pending' 
                });
                lastDueDate = nextDueDate;
            }
        }
        savePlanned([...plannedTransactions, ...transactionsToAdd]);
    }, [plannedTransactions]);

    const updatePlannedTransaction = useCallback(async (updated: PlannedTransaction) => {
        const updatedList = plannedTransactions.map(t => t.id === updated.id ? updated : t);
        savePlanned(updatedList);
    }, [plannedTransactions]);

    const deletePlannedTransaction = useCallback(async (id: string) => {
        const filtered = plannedTransactions.filter(t => t.id !== id);
        savePlanned(filtered);
    }, [plannedTransactions]);

    const markPlannedTransactionAsPaid = useCallback(async (planned: PlannedTransaction) => {
        const newTransaction: Transaction = {
            id: generateUUID(),
            amount: planned.amount,
            categoryId: planned.categoryId,
            date: planned.dueDate,
            description: planned.description,
            type: planned.type,
        };
        
        // 1. Add the real transaction
        // NOTE: We do NOT call addTransaction() here to avoid double-triggering logic (circular ref), 
        // but we DO need to handle movement logic if the planned transaction was a movement one.
        
        let updatedPlanned = plannedTransactions;
        
        // If we are paying a "Planned Movement Income", we are effectively moving money back.
        // The planned item itself (the balance) needs to be reduced/removed.
        if (planned.categoryId === 'cat_income_movement') {
             // Logic: If I pay a "Movement Income" of 1000, I receive 1000 real money.
             // The balance (which is this planned item) should be reduced by 1000.
             // Since 'mark as paid' usually just updates status, for the movement balance we might want to keep it if it's a partial pay?
             // But 'markAsPaid' implies full conversion.
             
             // However, for the 'Saldo Acumulado Movimento', the user usually won't click 'Dar Baixa' on the whole pot unless withdrawing everything.
             // If they click 'Dar Baixa', we assume they withdrew the whole amount shown.
             updatedPlanned = updatedPlanned.filter(p => p.id !== planned.id);
        } else {
            // Normal behavior for other planned items
             if (!planned.isGenerated) {
                const updatedPlannedTx: PlannedTransaction = { ...planned, status: 'paid' };
                updatedPlanned = updatedPlanned.map(t => t.id === planned.id ? updatedPlannedTx : t);
            }
        }

        saveTransactions([newTransaction, ...transactions]);
        savePlanned(updatedPlanned);

    }, [plannedTransactions, transactions]);

    // --- Card Transactions ---

    const addCardTransaction = useCallback(async (transaction: Omit<CardTransaction, 'id'>) => {
        const newCardTx: CardTransaction = { ...transaction, id: generateUUID() };
        saveCards([...cardTransactions, newCardTx]);
    }, [cardTransactions]);

    const updateCardTransaction = useCallback(async (updated: CardTransaction) => {
        const updatedList = cardTransactions.map(t => t.id === updated.id ? updated : t);
        saveCards(updatedList);
    }, [cardTransactions]);

    const deleteCardTransaction = useCallback(async (id: string) => {
        const filtered = cardTransactions.filter(t => t.id !== id);
        saveCards(filtered);
    }, [cardTransactions]);

    // --- Calculations ---

    const totalBalance = useMemo(() => transactions.reduce((sum, tx) => (tx.type === 'income' ? sum + tx.amount : sum - tx.amount), 0), [transactions]);

    const getMonthlySummary = useCallback((date: Date) => {
        const monthPrefix = date.toISOString().slice(0, 7); // "YYYY-MM"
        let income = 0;
        let expense = 0;

        // 1. Real Transactions
        transactions.filter(tx => tx.date.startsWith(monthPrefix)).forEach(tx => {
            if (tx.type === 'income') income += tx.amount; else expense += tx.amount;
        });

        // 2. Manual Planned Transactions
        // Exclude Movement Balance from "Monthly Planned Income" sum if you don't want it to skew the monthly budget view?
        // Usually, liquid assets aren't "Income to be made this month", they are "Assets".
        // However, user asked for it to be a Planned Income. We will count it.
        const pendingPlanned = plannedTransactions.filter(pt => pt.dueDate.startsWith(monthPrefix) && pt.status === 'pending');
        
        // 3. Generated Card Invoices (Pending only)
        const pendingCards = generatedCardInvoices.filter(pt => pt.dueDate.startsWith(monthPrefix) && pt.status === 'pending');

        const allPending = [...pendingPlanned, ...pendingCards];

        const plannedExpense = allPending.filter(pt => pt.type === 'expense').reduce((sum, pt) => sum + pt.amount, 0);
        const plannedIncome = allPending.filter(pt => pt.type === 'income').reduce((sum, pt) => sum + pt.amount, 0);

        return { income, expense, plannedExpense, plannedIncome };
    }, [transactions, plannedTransactions, generatedCardInvoices]);

    // --- Backup & Restore ---
    
    const exportData = () => {
        const data = {
            transactions,
            plannedTransactions,
            cardTransactions,
            exportDate: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lucia_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const importData = (jsonData: string) => {
        try {
            const data = JSON.parse(jsonData);
            if(data.transactions) saveTransactions(data.transactions);
            if(data.plannedTransactions) savePlanned(data.plannedTransactions);
            if(data.cardTransactions) saveCards(data.cardTransactions);
            return true;
        } catch(e) {
            console.error(e);
            return false;
        }
    };

    const clearAllData = () => {
        localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
        localStorage.removeItem(STORAGE_KEYS.PLANNED);
        localStorage.removeItem(STORAGE_KEYS.CARDS);
        setTransactions([]);
        setPlannedTransactions([]);
        setCardTransactions([]);
    };

    return {
        transactions,
        categories: INITIAL_CATEGORIES,
        budgets: [],
        addTransaction,
        addMultipleTransactions,
        updateTransaction,
        deleteTransaction,
        deleteMultipleTransactions,
        updateMultipleTransactionsCategory,
        totalBalance,
        getMonthlySummary,
        plannedTransactions,
        generatedCardInvoices, // Export this so App.tsx can list them
        addPlannedTransaction,
        updatePlannedTransaction,
        deletePlannedTransaction,
        markPlannedTransactionAsPaid,
        cardTransactions,
        addCardTransaction,
        updateCardTransaction,
        deleteCardTransaction,
        loading,
        error,
        exportData,
        importData,
        clearAllData
    };
};