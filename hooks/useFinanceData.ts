
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Transaction, PlannedTransaction, CardTransaction, Category, AppSettings, Investment, Budget } from '../types';
import { INITIAL_CATEGORIES_TEMPLATE } from '../constants';

const generateUUID = () => crypto.randomUUID();

const DEFAULT_SETTINGS: AppSettings = {
    calculateTithing: false,
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
                await supabase.from(table).upsert({ ...dataToSync, user_id: session.user.id });
            }
        } catch (e: any) {
            console.error(`Erro ao sincronizar ${table}:`, e.message);
        }
    };

    const loadData = useCallback(async () => {
        if (!supabase || !session) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [txs, pln, crd, inv, cat, bud, set] = await Promise.all([
                supabase.from('transactions').select('*').order('date', { ascending: false }),
                supabase.from('planned_transactions').select('*'),
                supabase.from('card_transactions').select('*'),
                supabase.from('investments').select('*'),
                supabase.from('categories').select('*'),
                supabase.from('budgets').select('*'),
                supabase.from('settings').select('*').single()
            ]);

            if (cat.data && cat.data.length === 0) {
                const seedCategories = INITIAL_CATEGORIES_TEMPLATE.map(c => ({
                    ...c,
                    id: generateUUID(),
                    user_id: session.user.id
                }));
                const { data: insertedCats } = await supabase.from('categories').insert(seedCategories).select();
                if (insertedCats) setCategories(insertedCats);
            } else if (cat.data) {
                setCategories(cat.data);
            }

            if (txs.data) setTransactions(txs.data);
            if (pln.data) setPlannedTransactions(pln.data);
            if (crd.data) setCardTransactions(crd.data);
            if (inv.data) setInvestments(inv.data);
            if (bud.data) setBudgets(bud.data);
            if (set.data) setSettings(set.data || DEFAULT_SETTINGS);
        } catch (err: any) {
            console.error("Erro ao carregar dados:", err);
        } finally {
            setLoading(false);
        }
    }, [session]);

    useEffect(() => { loadData(); }, [loadData]);

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

    const addPlannedTransaction = async (tx: Omit<PlannedTransaction, 'id' | 'status'>, recurrenceCount: number = 0) => {
        const items: PlannedTransaction[] = [];
        const start = new Date(tx.dueDate + 'T12:00:00Z');
        for (let i = 0; i <= recurrenceCount; i++) {
            const d = new Date(start);
            d.setUTCMonth(start.getUTCMonth() + i);
            const newItem: PlannedTransaction = {
                ...tx,
                id: generateUUID(),
                dueDate: d.toISOString().split('T')[0],
                status: 'pending'
            };
            items.push(newItem);
        }
        setPlannedTransactions(prev => [...prev, ...items]);
        if (supabase && session) {
            const dataToSync = items.map(it => ({ ...it, user_id: session.user.id }));
            await supabase.from('planned_transactions').upsert(dataToSync);
        }
    };

    const updatePlannedTransaction = async (tx: PlannedTransaction) => {
        setPlannedTransactions(prev => prev.map(t => t.id === tx.id ? tx : t));
        await syncItem('planned_transactions', tx);
    };

    const deletePlannedTransaction = async (id: string, deleteFuture: boolean = false) => {
        if (!deleteFuture) {
            setPlannedTransactions(prev => prev.filter(t => t.id !== id));
            await syncItem('planned_transactions', { id }, 'delete');
        } else {
            const target = plannedTransactions.find(t => t.id === id);
            if (!target) return;
            const toDelete = plannedTransactions.filter(t => 
                t.description === target.description && t.categoryId === target.categoryId && t.dueDate >= target.dueDate
            );
            const ids = toDelete.map(t => t.id);
            setPlannedTransactions(prev => prev.filter(t => !ids.includes(t.id)));
            if (supabase) await supabase.from('planned_transactions').delete().in('id', ids);
        }
    };

    const getMonthlySummary = useCallback((date: Date) => {
        const monthPrefix = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthTxs = transactions.filter(t => t.date.startsWith(monthPrefix));
        const income = monthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expense = monthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        return { income, expense, balance: income - expense };
    }, [transactions]);

    // LÓGICA DO BANCO DE MOVIMENTO (RESTAURAÇÃO DE DEZEMBRO)
    // Calcula o excedente de categorias "Movimento" de todo o histórico anterior ao mês visualizado.
    const getGeneratedMovementForMonth = useCallback((monthPrefix: string) => {
        if (categories.length === 0) return [];
        
        const movCategories = categories.filter(c => 
            c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === 'movimento'
        );
        if (movCategories.length === 0) return [];

        const incomeIds = movCategories.filter(c => c.type === 'income').map(c => c.id);
        const expenseIds = movCategories.filter(c => c.type === 'expense').map(c => c.id);
        
        // Data de início do mês atual (Ex: 2024-01-01)
        const firstDayOfCurrentMonth = `${monthPrefix}-01`;
        
        // Filtra transações que ocorreram ANTES do mês atual
        const historyTxs = transactions.filter(t => t.date < firstDayOfCurrentMonth);

        // Depósitos (Gastos em Movimento) aumentam o banco. Saques (Receitas em Movimento) diminuem o banco.
        const totalDeposits = historyTxs.filter(t => t.type === 'expense' && expenseIds.includes(t.categoryId)).reduce((acc, t) => acc + t.amount, 0);
        const totalWithdrawals = historyTxs.filter(t => t.type === 'income' && incomeIds.includes(t.categoryId)).reduce((acc, t) => acc + t.amount, 0);
        
        const accumulatedBalance = totalDeposits - totalWithdrawals;
        
        if (accumulatedBalance <= 0) return [];

        const movIncomeCat = movCategories.find(c => c.type === 'income');
        if (!movIncomeCat) return [];

        // ID fixado pelo mês para evitar duplicação total
        const genId = `gen_mov_acc_${monthPrefix}`;
        
        // Verifica se JÁ EXISTE um item com esse ID ou mesma descrição para este mês exato
        const alreadyExists = plannedTransactions.some(p => 
            p.id === genId || 
            (p.description === 'Saldo Acumulado Movimento' && p.dueDate.startsWith(monthPrefix))
        );
        
        if (alreadyExists) return [];

        return [{
            id: genId,
            amount: accumulatedBalance,
            type: 'income' as const,
            categoryId: movIncomeCat.id,
            description: `Saldo Acumulado Movimento`,
            dueDate: `${monthPrefix}-01`,
            status: 'pending' as const,
            isGenerated: true
        }];
    }, [transactions, categories, plannedTransactions]);

    const generatedTithing = useMemo(() => {
        if (!settings.calculateTithing || categories.length === 0) return [];
        const tithingCat = categories.find(c => (c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('dizimo')) && c.type === 'expense');
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
            if (!plannedTransactions.some(p => p.id === genId)) {
                items.push({ id: genId, amount: income * 0.1, type: 'expense', categoryId: tithingCat.id, description: `Dízimo Estimado - ${month}`, dueDate: `${month}-10`, status: 'pending', isGenerated: true });
            }
        });
        return items;
    }, [transactions, categories, settings.calculateTithing, plannedTransactions]);

    const generatedCardInvoices = useMemo(() => {
        if (categories.length === 0) return [];
        const cardCat = categories.find(c => (c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('cartao')) && c.type === 'expense');
        if (!cardCat) return [];
        const cardMonthlySum = new Map<string, number>();
        cardTransactions.forEach(cardTx => {
            const installmentValue = cardTx.totalAmount / cardTx.installments;
            const start = new Date(cardTx.purchaseDate + 'T12:00:00Z');
            for (let i = 1; i <= cardTx.installments; i++) {
                const d = new Date(start);
                d.setUTCMonth(start.getUTCMonth() + i);
                const monthKey = d.toISOString().slice(0, 7);
                const compositeKey = `${cardTx.card}|${monthKey}`;
                cardMonthlySum.set(compositeKey, (cardMonthlySum.get(compositeKey) || 0) + installmentValue);
            }
        });
        const invoices: PlannedTransaction[] = [];
        cardMonthlySum.forEach((val, compositeKey) => {
            const [cardName, month] = compositeKey.split('|');
            const genId = `gen_card_${cardName}_${month}`;
            if (!plannedTransactions.some(p => p.id === genId)) {
                invoices.push({ id: genId, amount: val, type: 'expense', categoryId: cardCat.id, description: `Fatura ${cardName} - ${month}`, dueDate: `${month}-10`, status: 'pending', isGenerated: true });
            }
        });
        return invoices;
    }, [cardTransactions, categories, plannedTransactions]);

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

    return {
        transactions, categories, budgets, plannedTransactions, cardTransactions, investments, settings, loading, error,
        getMonthlySummary, getGeneratedMovementForMonth,
        addTransaction, updateTransaction, deleteTransaction, 
        addPlannedTransaction, updatePlannedTransaction, deletePlannedTransaction,
        markPlannedTransactionAsPaid: async (planned: PlannedTransaction) => {
            await addTransaction({ amount: planned.amount, categoryId: planned.categoryId, date: planned.dueDate, description: planned.description, type: planned.type });
            const paidItem: PlannedTransaction = { ...planned, status: 'paid' };
            setPlannedTransactions(prev => {
                const exists = prev.find(t => t.id === planned.id);
                return exists ? prev.map(t => t.id === planned.id ? paidItem : t) : [...prev, paidItem];
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
        generatedCardInvoices, generatedTithing,
        totalBalance: transactions.reduce((acc, tx) => tx.type === 'income' ? acc + tx.amount : acc - tx.amount, 0),
        updateSettings: async (s: AppSettings) => {
            setSettings(s);
            if (supabase && session) await supabase.from('settings').upsert({ ...s, id: 'global', user_id: session.user.id });
        },
        addMultipleTransactions: async (txs: Omit<Transaction, 'id'>[]) => {
            const newTxs = txs.map(t => ({ ...t, id: generateUUID() }));
            setTransactions(prev => [...newTxs, ...prev]);
            if (supabase && session) await supabase.from('transactions').upsert(newTxs.map(t => ({ ...t, user_id: session.user.id })));
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
            if (original) { const { id: _, ...data } = original; await addTransaction(data); }
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
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `flux_backup.json`; a.click();
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
        clearAllData: async () => {
            if (!supabase || !session) return;
            try {
                setLoading(true);
                await Promise.all([
                    supabase.from('transactions').delete().eq('user_id', session.user.id),
                    supabase.from('planned_transactions').delete().eq('user_id', session.user.id),
                    supabase.from('card_transactions').delete().eq('user_id', session.user.id),
                    supabase.from('investments').delete().eq('user_id', session.user.id),
                    supabase.from('categories').delete().eq('user_id', session.user.id),
                    supabase.from('settings').delete().eq('user_id', session.user.id),
                ]);
                setTransactions([]); setPlannedTransactions([]); setCardTransactions([]); setInvestments([]); setCategories([]); setSettings(DEFAULT_SETTINGS);
                await loadData();
            } catch (e) { console.error("Erro ao resetar dados:", e); } finally { setLoading(false); }
        }
    };
};
