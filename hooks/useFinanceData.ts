import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Transaction, PlannedTransaction, CardTransaction, Category, AppSettings, Investment, Budget } from '../types';
import { INITIAL_CATEGORIES_TEMPLATE } from '../constants';

const generateUUID = () => crypto.randomUUID();

const DEFAULT_SETTINGS: AppSettings = {
    calculateTithing: true,
};

export const useFinanceData = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [plannedTransactions, setPlannedTransactions] = useState<PlannedTransaction[]>([]);
    const [cardTransactions, setCardTransactions] = useState<CardTransaction[]>([]);
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [session, setSession] = useState<any>(null);

    useEffect(() => {
        if (!supabase) return;
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
        return () => subscription.unsubscribe();
    }, []);

    const syncItem = async (table: string, item: any, operation: 'upsert' | 'delete' = 'upsert') => {
        if (!supabase || !session) return;
        try {
            if (operation === 'delete') {
                await supabase.from(table).delete().eq('id', item.id);
            } else {
                const { isGenerated, ...dataToSync } = item;
                const { error: syncError } = await supabase.from(table).upsert({
                    ...dataToSync,
                    user_id: session.user.id
                });
                if (syncError) throw syncError;
            }
        } catch (e: any) {
            console.error(`Erro ao sincronizar ${table}:`, e.message);
            setError(`Erro de sincronização: ${e.message}`);
        }
    };

    const loadData = useCallback(async () => {
        if (!supabase || !session) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const [txs, pln, crd, inv, cat, bud] = await Promise.all([
                supabase.from('transactions').select('*').order('date', { ascending: false }),
                supabase.from('planned_transactions').select('*'),
                supabase.from('card_transactions').select('*'),
                supabase.from('investments').select('*'),
                supabase.from('categories').select('*'),
                supabase.from('budgets').select('*')
            ]);

            // SEED: Se o usuário não tem categorias, criamos as básicas
            if (cat.data && cat.data.length === 0) {
                const seedCategories = INITIAL_CATEGORIES_TEMPLATE.map(c => ({
                    ...c,
                    id: generateUUID(),
                    user_id: session.user.id
                }));
                const { data: insertedCats, error: seedError } = await supabase.from('categories').insert(seedCategories).select();
                if (!seedError && insertedCats) {
                    setCategories(insertedCats);
                }
            } else if (cat.data) {
                setCategories(cat.data);
            }

            if (txs.data) setTransactions(txs.data);
            if (pln.data) setPlannedTransactions(pln.data);
            if (crd.data) setCardTransactions(crd.data);
            if (inv.data) setInvestments(inv.data);
            if (bud.data) setBudgets(bud.data);
            setLoading(false);
        } catch (err: any) {
            console.error("Erro ao carregar dados:", err);
            setError("Não foi possível carregar os dados do servidor.");
            setLoading(false);
        }
    }, [session]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const getMonthlySummary = useCallback((date: Date) => {
        const monthPrefix = date.toISOString().slice(0, 7);
        const monthTxs = transactions.filter(t => t.date.startsWith(monthPrefix));
        const income = monthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expense = monthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        
        // Planejamento pendente (manual + gerado)
        // Note: as funções useMemo de geração já cuidam do resto
        const monthPlannedManual = plannedTransactions.filter(t => t.dueDate.startsWith(monthPrefix) && t.status === 'pending');
        const plannedIncome = monthPlannedManual.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const plannedExpense = monthPlannedManual.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

        return { income, expense, plannedIncome, plannedExpense };
    }, [transactions, plannedTransactions]);

    const addTransaction = async (tx: Omit<Transaction, 'id'>) => {
        const newTx = { ...tx, id: generateUUID() };
        setTransactions(prev => [newTx, ...prev]);
        await syncItem('transactions', newTx);
    };

    const updateTransaction = async (tx: Transaction) => {
        setTransactions(prev => prev.map(t => t.id === tx.id ? tx : t));
        await syncItem('transactions', tx);
    };

    const deleteTransaction = async (id: string) => {
        setTransactions(prev => prev.filter(t => t.id !== id));
        await syncItem('transactions', { id }, 'delete');
    };

    const addPlannedTransaction = async (pt: Omit<PlannedTransaction, 'id' | 'status'>, recurrenceCount: number = 0) => {
        const newItems: PlannedTransaction[] = [];
        const baseDate = new Date(pt.dueDate + 'T12:00:00Z');
        
        for (let i = 0; i <= recurrenceCount; i++) {
            const date = new Date(baseDate);
            date.setUTCMonth(baseDate.getUTCMonth() + i);
            newItems.push({
                ...pt,
                id: generateUUID(),
                status: 'pending',
                dueDate: date.toISOString().split('T')[0]
            });
        }
        
        setPlannedTransactions(prev => [...prev, ...newItems]);
        if (supabase && session) {
            const dataToSync = newItems.map(item => ({ ...item, user_id: session.user.id }));
            await supabase.from('planned_transactions').upsert(dataToSync);
        }
    };

    const updatePlannedTransaction = async (pt: PlannedTransaction) => {
        setPlannedTransactions(prev => prev.map(t => t.id === pt.id ? pt : t));
        await syncItem('planned_transactions', pt);
    };

    const deletePlannedTransaction = async (id: string, deleteFuture: boolean = false) => {
        const target = plannedTransactions.find(t => t.id === id);
        if (!target) return;

        let idsToDelete = [id];
        if (deleteFuture) {
            idsToDelete = plannedTransactions
                .filter(t => t.description === target.description && t.categoryId === target.categoryId && t.dueDate >= target.dueDate)
                .map(t => t.id);
        }

        setPlannedTransactions(prev => prev.filter(t => !idsToDelete.includes(t.id)));
        if (supabase) await supabase.from('planned_transactions').delete().in('id', idsToDelete);
    };

    const addCategory = async (cat: Omit<Category, 'id'>) => {
        const newCat = { ...cat, id: generateUUID() };
        setCategories(prev => [...prev, newCat]);
        await syncItem('categories', newCat);
    };

    const updateCategory = async (cat: Category) => {
        setCategories(prev => prev.map(c => c.id === cat.id ? cat : c));
        await syncItem('categories', cat);
    };

    const deleteCategory = async (id: string) => {
        setCategories(prev => prev.filter(c => c.id !== id));
        await syncItem('categories', { id }, 'delete');
    };

    const generatedTithing = useMemo(() => {
        if (!settings.calculateTithing || categories.length === 0) return [];
        // Busca insensível a caixa
        const tithingCat = categories.find(c => c.name.toLowerCase() === 'dizimo' && c.type === 'expense');
        if (!tithingCat) return [];

        const monthlyIncome = new Map<string, number>();
        transactions.filter(t => t.type === 'income').forEach(t => {
            const cat = categories.find(c => c.id === t.categoryId);
            if (cat?.includeInTithing) {
                const month = t.date.slice(0, 7);
                monthlyIncome.set(month, (monthlyIncome.get(month) || 0) + t.amount);
            }
        });

        const items: PlannedTransaction[] = [];
        monthlyIncome.forEach((income, month) => {
            const genId = `gen_tithing_${month}`;
            const isAlreadyPaid = plannedTransactions.some(p => p.id === genId && p.status === 'paid');
            
            if (!isAlreadyPaid) {
                items.push({
                    id: genId,
                    amount: income * 0.1,
                    type: 'expense',
                    categoryId: tithingCat.id,
                    description: `Dízimo Estimado - ${month}`,
                    dueDate: `${month}-10`,
                    status: 'pending',
                    isGenerated: true
                });
            }
        });
        return items;
    }, [transactions, categories, settings.calculateTithing, plannedTransactions]);

    const generatedCardInvoices = useMemo(() => {
        if (categories.length === 0) return [];
        const cardCat = categories.find(c => c.name.toLowerCase() === 'cartão' && c.type === 'expense');
        if (!cardCat) return [];
        
        const cardMonthlySum = new Map<string, number>();
        cardTransactions.forEach(cardTx => {
            const installmentValue = cardTx.totalAmount / cardTx.installments;
            const start = new Date(cardTx.purchaseDate + 'T12:00:00Z');
            const cardName = cardTx.card || 'Cartão';

            for (let i = 1; i <= cardTx.installments; i++) {
                const d = new Date(start);
                d.setUTCMonth(start.getUTCMonth() + i);
                const monthKey = d.toISOString().slice(0, 7);
                const compositeKey = `${cardName}|${monthKey}`;
                cardMonthlySum.set(compositeKey, (cardMonthlySum.get(compositeKey) || 0) + installmentValue);
            }
        });

        const invoices: PlannedTransaction[] = [];
        cardMonthlySum.forEach((val, compositeKey) => {
            const [cardName, month] = compositeKey.split('|');
            const genId = `gen_card_${cardName}_${month}`;
            const isAlreadyPaid = plannedTransactions.some(p => p.id === genId && p.status === 'paid');

            if (!isAlreadyPaid) {
                invoices.push({
                    id: genId,
                    amount: val,
                    type: 'expense',
                    categoryId: cardCat.id,
                    description: `Fatura ${cardName} - ${month}`,
                    dueDate: `${month}-10`,
                    status: 'pending',
                    isGenerated: true
                });
            }
        });
        return invoices;
    }, [cardTransactions, categories, plannedTransactions]);

    return {
        transactions, categories, budgets, plannedTransactions, cardTransactions, investments, settings, loading, error,
        // Fix: Expose getMonthlySummary so it can be accessed in App.tsx
        getMonthlySummary,
        addTransaction, updateTransaction, deleteTransaction, 
        addPlannedTransaction, updatePlannedTransaction, deletePlannedTransaction,
        markPlannedTransactionAsPaid: async (planned: PlannedTransaction) => {
            await addTransaction({ 
                amount: planned.amount, 
                categoryId: planned.categoryId, 
                date: planned.dueDate, 
                description: planned.description, 
                type: planned.type 
            });

            const paidItem: PlannedTransaction = { ...planned, status: 'paid' };
            setPlannedTransactions(prev => {
                const exists = prev.find(t => t.id === planned.id);
                if (exists) return prev.map(t => t.id === planned.id ? paidItem : t);
                return [...prev, paidItem];
            });
            await syncItem('planned_transactions', paidItem);
        },
        unmarkPlannedTransactionAsPaid: async (planned: PlannedTransaction) => {
            const pendingItem: PlannedTransaction = { ...planned, status: 'pending' };
            if (planned.id.startsWith('gen_')) {
                setPlannedTransactions(prev => prev.filter(t => t.id !== planned.id));
                await syncItem('planned_transactions', { id: planned.id }, 'delete');
            } else {
                setPlannedTransactions(prev => prev.map(t => t.id === planned.id ? pendingItem : t));
                await syncItem('planned_transactions', pendingItem);
            }
        },
        addCategory, updateCategory, deleteCategory,
        generatedCardInvoices,
        generatedTithing,
        totalBalance: transactions.reduce((acc, tx) => tx.type === 'income' ? acc + tx.amount : acc - tx.amount, 0),
        updateSettings: (s: AppSettings) => setSettings(s),
        addMultipleTransactions: async (txs: Omit<Transaction, 'id'>[]) => {
            const newTxs = txs.map(t => ({ ...t, id: generateUUID(), user_id: session?.user?.id }));
            setTransactions(prev => [...newTxs, ...prev]);
            if (supabase && session) {
                await supabase.from('transactions').upsert(newTxs);
            }
        },
        deleteMultipleTransactions: async (ids: string[]) => {
            setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
            if (supabase) await supabase.from('transactions').delete().in('id', ids);
        },
        updateMultipleTransactionsCategory: async (ids: string[], categoryId: string) => {
            setTransactions(prev => prev.map(t => ids.includes(t.id) ? { ...t, categoryId } : t));
            if (supabase) await supabase.from('transactions').update({ categoryId }).in('id', ids);
        },
        duplicateTransaction: async (id: string) => {
            const original = transactions.find(t => t.id === id);
            if (original) {
                const { id: _, ...data } = original;
                await addTransaction(data);
            }
        },
        addCardTransaction: async (tx: Omit<CardTransaction, 'id'>) => {
            const newTx = { ...tx, id: generateUUID() };
            setCardTransactions(prev => [...prev, newTx]);
            await syncItem('card_transactions', newTx);
        },
        updateCardTransaction: async (tx: CardTransaction) => {
            setCardTransactions(prev => prev.map(t => t.id === tx.id ? tx : t));
            await syncItem('card_transactions', tx);
        },
        deleteCardTransaction: async (id: string) => {
            setCardTransactions(prev => prev.filter(t => t.id !== id));
            await syncItem('card_transactions', { id }, 'delete');
        },
        addInvestment: async (inv: Omit<Investment, 'id'>) => {
            const newInv = { ...inv, id: generateUUID() };
            setInvestments(prev => [...prev, newInv]);
            await syncItem('investments', newInv);
        },
        updateInvestment: async (inv: Investment) => {
            setInvestments(prev => prev.map(i => i.id === inv.id ? inv : i));
            await syncItem('investments', inv);
        },
        deleteInvestment: async (id: string) => {
            setInvestments(prev => prev.filter(i => i.id !== id));
            await syncItem('investments', { id }, 'delete');
        },
        exportData: () => {
            const data = { transactions, plannedTransactions, cardTransactions, investments, categories, settings };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `flux_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
        },
        importData: async (j: string) => {
            try {
                const data = JSON.parse(j);
                if (data.transactions) setTransactions(data.transactions);
                if (data.categories) setCategories(data.categories);
                if (data.cardTransactions) setCardTransactions(data.cardTransactions);
                if (data.plannedTransactions) setPlannedTransactions(data.plannedTransactions);
                if (data.investments) setInvestments(data.investments);
                return true;
            } catch (e) { return false; }
        },
        clearAllData: () => { localStorage.clear(); window.location.reload(); }
    };
};
