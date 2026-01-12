
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Transaction, PlannedTransaction, CardTransaction, CardRegistry, Category, AppSettings, Investment, Budget } from '../types';
import { INITIAL_CATEGORIES_TEMPLATE } from '../constants';

const generateUUID = () => crypto.randomUUID();

const DEFAULT_SETTINGS: AppSettings = {
    calculateTithing: false,
};

const addMonthsWithEndOfMonthCheck = (startDate: Date, monthsToAdd: number) => {
    const d = new Date(startDate);
    const day = d.getUTCDate();
    d.setUTCMonth(d.getUTCMonth() + monthsToAdd);
    if (d.getUTCDate() < day) {
        d.setUTCDate(0);
    }
    return d;
};

const getMonthDiff = (date1: string, date2: string) => {
    const d1 = new Date(date1 + 'T12:00:00Z');
    const d2 = new Date(date2 + 'T12:00:00Z');
    return (d2.getUTCFullYear() - d1.getUTCFullYear()) * 12 + (d2.getUTCMonth() - d1.getUTCMonth());
};

export const useFinanceData = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [plannedTransactions, setPlannedTransactions] = useState<PlannedTransaction[]>([]);
    const [cardTransactions, setCardTransactions] = useState<CardTransaction[]>([]);
    const [cardRegistries, setCardRegistries] = useState<CardRegistry[]>([]);
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
        if (operation === 'upsert' && String(item.id).startsWith('gen_')) return;

        try {
            if (operation === 'delete') {
                const { error } = await supabase.from(table).delete().eq('id', item.id);
                if (error) throw error;
            } else {
                let dataToSync = { ...item, user_id: session.user.id };
                if (table === 'categories') {
                    (dataToSync as any).include_in_tithing = item.includeInTithing;
                }
                const { error } = await supabase.from(table).upsert(dataToSync);
                if (error) throw error;
            }
        } catch (e: any) {
            console.error(`Erro crítico ao sincronizar ${table}:`, JSON.stringify(e, null, 2));
            setError(`Falha ao salvar no banco: ${e.message || 'Erro desconhecido'}`);
        }
    };

    const loadData = useCallback(async () => {
        if (!supabase || !session) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [txs, pln, crd, creg, inv, cat, bud, set] = await Promise.all([
                supabase.from('transactions').select('*').order('date', { ascending: false }),
                supabase.from('planned_transactions').select('*'),
                supabase.from('card_transactions').select('*'),
                supabase.from('card_registries').select('*'),
                supabase.from('investments').select('*'),
                supabase.from('categories').select('*').order('sort_order', { ascending: true }),
                supabase.from('budgets').select('*'),
                supabase.from('settings').select('*').single()
            ]);

            if (cat.data) {
                if (cat.data.length === 0) {
                    const seedCategories = INITIAL_CATEGORIES_TEMPLATE.map((c, idx) => ({
                        ...c,
                        id: generateUUID(),
                        user_id: session.user.id,
                        sort_order: idx
                    }));
                    const { data: insertedCats } = await supabase.from('categories').insert(seedCategories).select();
                    if (insertedCats) setCategories(insertedCats);
                } else {
                    const normalizedCategories = cat.data.map((c: any) => ({
                        ...c,
                        includeInTithing: c.includeInTithing ?? c.include_in_tithing ?? c.includeintithing ?? (c.type === 'income'),
                        sort_order: c.sort_order ?? c.sortorder
                    }));
                    setCategories(normalizedCategories);
                }
            }

            if (txs.data) setTransactions(txs.data);
            if (pln.data) setPlannedTransactions(pln.data);
            if (crd.data) setCardTransactions(crd.data);
            if (creg.data) setCardRegistries(creg.data || []);
            if (inv.data) setInvestments(inv.data);
            if (bud.data) setBudgets(bud.data);
            if (set.data) setSettings(set.data || DEFAULT_SETTINGS);
        } catch (err: any) {
            console.error("Erro ao carregar dados:", err);
            setError("Erro ao carregar dados do servidor.");
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

    const duplicateTransaction = async (id: string) => {
        const original = transactions.find(t => t.id === id);
        if (original) {
            const { id: _, ...data } = original;
            await addTransaction(data);
        }
    };

    const addPlannedTransaction = async (tx: Omit<PlannedTransaction, 'id' | 'status'>, recurrenceCount: number = 0) => {
        const items: PlannedTransaction[] = [];
        const start = new Date(tx.dueDate + 'T12:00:00Z');
        const rId = generateUUID();
        
        for (let i = 0; i <= recurrenceCount; i++) {
            const d = addMonthsWithEndOfMonthCheck(start, i);
            const newItem: PlannedTransaction = {
                ...tx,
                id: generateUUID(),
                dueDate: d.toISOString().split('T')[0],
                status: 'pending',
                is_budget_goal: tx.is_budget_goal || false,
                group_name: tx.group_name || 'Geral',
                recurrence_id: rId 
            };
            items.push(newItem);
        }
        setPlannedTransactions(prev => [...prev, ...items]);
        if (supabase && session) {
            const dataToSync = items.map(it => ({ ...it, user_id: session.user.id }));
            await supabase.from('planned_transactions').upsert(dataToSync);
        }
    };

    const updatePlannedTransaction = async (tx: PlannedTransaction, updateFuture: boolean = false) => {
        if (!updateFuture) {
            let finalTx = { ...tx };
            if (String(tx.id).startsWith('gen_')) {
                finalTx.id = generateUUID();
                finalTx.isGenerated = true;
                finalTx.recurrence_id = generateUUID();
                setPlannedTransactions(prev => [...prev, finalTx]);
            } else {
                setPlannedTransactions(prev => prev.map(t => t.id === tx.id ? finalTx : t));
            }
            await syncItem('planned_transactions', finalTx);
        } else {
            const target = plannedTransactions.find(t => t.id === tx.id);
            if (!target) return;
            const toUpdate = plannedTransactions.filter(t => (target.recurrence_id ? t.recurrence_id === target.recurrence_id : (t.description === target.description && t.categoryId === target.categoryId)) && t.dueDate >= target.dueDate && !String(t.id).startsWith('gen_'));
            const originalBaseDate = target.dueDate;
            const newBaseDate = tx.dueDate;
            const startOfNewSeries = new Date(newBaseDate + 'T12:00:00Z');
            const updatedList = plannedTransactions.map(t => {
                if (toUpdate.some(u => u.id === t.id)) {
                    const monthOffset = getMonthDiff(originalBaseDate, t.dueDate);
                    const newDate = addMonthsWithEndOfMonthCheck(startOfNewSeries, monthOffset).toISOString().split('T')[0];
                    return { ...t, amount: tx.amount, categoryId: tx.categoryId, description: tx.description, is_budget_goal: tx.is_budget_goal, group_name: tx.group_name, dueDate: newDate };
                }
                return t;
            });
            setPlannedTransactions(updatedList);
            if (supabase && session) {
                const dataToSync = updatedList.filter(t => toUpdate.some(u => u.id === t.id)).map(t => ({...t, user_id: session.user.id}));
                await supabase.from('planned_transactions').upsert(dataToSync);
            }
        }
    };

    const deletePlannedTransaction = async (id: string, deleteFuture: boolean = false) => {
        if (String(id).startsWith('gen_')) return;
        if (!deleteFuture) {
            setPlannedTransactions(prev => prev.filter(t => t.id !== id));
            await syncItem('planned_transactions', { id }, 'delete');
        } else {
            const target = plannedTransactions.find(t => t.id === id);
            if (!target) return;
            const toDelete = plannedTransactions.filter(t => (target.recurrence_id ? t.recurrence_id === target.recurrence_id : (t.description === target.description && t.categoryId === target.categoryId)) && t.dueDate >= target.dueDate);
            const ids = toDelete.map(t => t.id);
            setPlannedTransactions(prev => prev.filter(t => !ids.includes(t.id)));
            if (supabase) await supabase.from('planned_transactions').delete().in('id', ids);
        }
    };

    const duplicatePlannedTransaction = async (id: string) => {
        const original = plannedTransactions.find(t => t.id === id);
        if (original) {
            let recurrenceCount = 0;
            if (original.recurrence_id) {
                recurrenceCount = plannedTransactions.filter(t => t.recurrence_id === original.recurrence_id).length - 1;
            }
            const { id: _, status: __, recurrence_id: ___, isGenerated: ____, ...data } = original;
            await addPlannedTransaction(data as any, recurrenceCount);
        }
    };

    const getMonthlySummary = useCallback((date: Date) => {
        const monthPrefix = date.toISOString().slice(0, 7);
        const monthTxs = transactions.filter(t => t.date.startsWith(monthPrefix));
        const normalizeStr = (s: string) => s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const movCategoryIds = categories.filter(c => normalizeStr(c.name) === 'movimento').map(c => c.id);
        const income = monthTxs.filter(t => t.type === 'income' && !movCategoryIds.includes(t.categoryId)).reduce((acc, t) => acc + t.amount, 0);
        const expense = monthTxs.filter(t => t.type === 'expense' && !movCategoryIds.includes(t.categoryId)).reduce((acc, t) => acc + t.amount, 0);
        return { income, expense };
    }, [transactions, categories]);

    const getGeneratedMovementForMonth = useCallback((monthPrefix: string) => {
        if (categories.length === 0) return [];
        const normalizeStr = (s: string) => s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const movCategoryIds = categories.filter(c => normalizeStr(c.name) === 'movimento').map(c => c.id);
        if (movCategoryIds.length === 0) return [];
        const firstDay = `${monthPrefix}-01`;
        const [year, month] = monthPrefix.split('-').map(Number);
        const lastDay = new Date(year, month, 0).toISOString().split('T')[0];
        const monthTxs = transactions.filter(t => t.date >= firstDay && t.date <= lastDay && movCategoryIds.includes(t.categoryId));
        const totalExpenses = monthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        const totalIncomes = monthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        if (totalExpenses === 0 && totalIncomes === 0) return [];
        const remainingBalance = totalExpenses - totalIncomes;
        const isPaid = remainingBalance <= 0.01;
        const persisted = plannedTransactions.find(p => p.dueDate.startsWith(monthPrefix) && movCategoryIds.includes(p.categoryId) && p.isGenerated === true && p.type === 'income');
        const movIncomeCat = categories.find(c => normalizeStr(c.name) === 'movimento' && c.type === 'income');
        if (!movIncomeCat) return [];
        return [{
            id: persisted ? persisted.id : `gen_mov_acc_${monthPrefix}`,
            amount: isPaid ? totalIncomes : remainingBalance,
            type: 'income' as const,
            categoryId: movIncomeCat.id,
            description: persisted ? persisted.description : isPaid ? `Saldo Movimento Concluído` : `Saldo Restante Movimento`,
            dueDate: persisted ? persisted.dueDate : firstDay,
            status: isPaid ? 'paid' : (persisted ? persisted.status : 'pending'),
            isGenerated: true,
            is_budget_goal: false,
            group_name: 'Automáticos',
            recurrence_id: `gen_mov_${monthPrefix}`
        }];
    }, [transactions, categories, plannedTransactions]);

    const generatedTithing = useMemo(() => {
        // Se o dízimo estiver desligado nas configurações, não faz nada
        if (!settings.calculateTithing || categories.length === 0) return [];
        
        const normalizeStr = (s: string) => s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // Encontra a categoria "Dízimo" (para lançar a despesa planejada)
        const tithingCat = categories.find(c => 
            c.type === 'expense' && 
            normalizeStr(c.name).includes('dizimo')
        );
        if (!tithingCat) return [];

        const catMap = new Map<string, Category>(categories.map(c => [c.id, c]));
        const incomeByMonth = new Map<string, number>();

        // LÓGICA ESTREITA: Baseia-se exclusivamente no checkbox 'includeInTithing'
        transactions.forEach(t => {
            if (t.type !== 'income') return;
            const month = t.date.slice(0, 7);
            const cat = catMap.get(t.categoryId);
            
            // SOMENTE se o checkbox estiver marcado
            if (cat && cat.includeInTithing === true) {
                incomeByMonth.set(month, (incomeByMonth.get(month) || 0) + t.amount);
            }
        });

        const items: PlannedTransaction[] = [];
        incomeByMonth.forEach((totalIncome, month) => {
            if (totalIncome <= 0) return;
            const expectedTithing = totalIncome * 0.1;

            // Verifica o que já foi pago manualmente desse dízimo no mês
            const alreadyPaidReal = transactions.filter(t => 
                t.date.startsWith(month) && t.categoryId === tithingCat.id
            ).reduce((acc, t) => acc + t.amount, 0);

            const remainingTithing = Math.max(0, expectedTithing - alreadyPaidReal);
            const isPaid = remainingTithing <= 0.01;

            const persisted = plannedTransactions.find(p => 
                p.dueDate.startsWith(month) && p.categoryId === tithingCat.id && p.isGenerated === true
            );
            
            items.push({ 
                id: persisted ? persisted.id : `gen_tithing_${month}`, 
                amount: isPaid ? alreadyPaidReal : (persisted ? persisted.amount : remainingTithing), 
                type: 'expense', 
                categoryId: tithingCat.id, 
                description: persisted ? persisted.description : (isPaid ? `Dízimo - ${month} (Pago)` : `Dízimo - ${month}`), 
                dueDate: persisted ? persisted.dueDate : `${month}-10`, 
                status: isPaid ? 'paid' : (persisted ? persisted.status : 'pending'), 
                isGenerated: true, 
                is_budget_goal: false,
                group_name: 'Automáticos',
                recurrence_id: `gen_tithing_${month}`
            });
        });
        return items;
    }, [transactions, categories, settings.calculateTithing, plannedTransactions]);

    const generatedCardInvoices = useMemo(() => {
        if (categories.length === 0) return [];
        const normalizeStr = (s: string) => s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const cardCat = categories.find(c => (normalizeStr(c.name).includes('cartao')) && c.type === 'expense');
        if (!cardCat) return [];
        const invoices: PlannedTransaction[] = [];
        const cardGroups = new Map<string, number>();
        cardTransactions.forEach(tx => {
            const cardName = tx.card.trim() || 'Sem Nome';
            const monthly = tx.totalAmount / tx.installments;
            const start = new Date(tx.purchaseDate + 'T12:00:00Z');
            for (let i = 1; i <= tx.installments; i++) {
                const d = addMonthsWithEndOfMonthCheck(start, i);
                const mKey = d.toISOString().slice(0, 7);
                const compositeKey = `${cardName}@@@${mKey}`;
                cardGroups.set(compositeKey, (cardGroups.get(compositeKey) || 0) + monthly);
            }
        });
        cardGroups.forEach((val, compositeKey) => {
            const [cardName, month] = compositeKey.split('@@@');
            const description = `Fatura ${cardName} - ${month}`;
            const alreadyPaidReal = transactions.filter(t => t.date.startsWith(month) && t.categoryId === cardCat.id && t.description.includes(cardName)).reduce((acc, t) => acc + t.amount, 0);
            const isPaid = alreadyPaidReal >= (val - 0.01);
            const persisted = plannedTransactions.find(p => p.dueDate.startsWith(month) && p.categoryId === cardCat.id && p.description === description && p.isGenerated === true);
            const reg = cardRegistries.find(r => r.name.toLowerCase() === cardName.toLowerCase());
            const dueDay = reg ? reg.due_day : 10;
            const dueDate = `${month}-${String(dueDay).padStart(2, '0')}`;
            invoices.push({ id: persisted ? persisted.id : `gen_card_${cardName}_${month}`, amount: val, type: 'expense', categoryId: cardCat.id, description: persisted ? persisted.description : description, dueDate: persisted ? persisted.dueDate : dueDate, status: isPaid ? 'paid' : (persisted ? persisted.status : 'pending'), isGenerated: true, i_budget_goal: false, group_name: 'Automáticos', recurrence_id: `gen_card_${cardName}_${month}` });
        });
        return invoices;
    }, [cardTransactions, categories, plannedTransactions, transactions, cardRegistries]);

    const addCategory = async (cat: Omit<Category, 'id'>) => {
        const newCat = { ...cat, id: generateUUID(), sort_order: categories.length };
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

    const updateCategoryOrder = async (newOrder: Category[]) => {
        setCategories(newOrder);
        if (supabase && session) {
            const updates = newOrder.map((cat, idx) => ({ ...cat, user_id: session.user.id, sort_order: idx }));
            await supabase.from('categories').upsert(updates);
        }
    };

    const addCardRegistry = async (reg: Omit<CardRegistry, 'id'>) => {
        const newReg = { ...reg, id: generateUUID() };
        setCardRegistries(prev => [...prev, newReg]);
        await syncItem('card_registries', newReg);
    };

    const updateCardRegistry = async (reg: CardRegistry) => {
        setCardRegistries(prev => prev.map(r => r.id === reg.id ? reg : r));
        await syncItem('card_registries', reg);
    };

    const deleteCardRegistry = async (id: string) => {
        setCardRegistries(prev => prev.filter(r => r.id !== id));
        await syncItem('card_registries', { id }, 'delete');
    };

    return {
        transactions, categories, budgets, plannedTransactions, cardTransactions, cardRegistries, investments, settings, loading, error,
        getMonthlySummary, getGeneratedMovementForMonth,
        addTransaction, updateTransaction, deleteTransaction, duplicateTransaction,
        addPlannedTransaction, updatePlannedTransaction, deletePlannedTransaction, duplicatePlannedTransaction,
        markPlannedTransactionAsPaid: async (planned: PlannedTransaction) => {
            const todayISO = new Date().toISOString().split('T')[0];
            await addTransaction({ amount: planned.amount, categoryId: planned.categoryId, date: todayISO, description: planned.description, type: planned.type });
            if (!String(planned.id).startsWith('gen_')) {
                const paidPlanned = { ...planned, status: 'paid' as const };
                setPlannedTransactions(prev => prev.map(t => t.id === planned.id ? paidPlanned : t));
                await syncItem('planned_transactions', paidPlanned);
            }
        },
        unmarkPlannedTransactionAsPaid: async (planned: PlannedTransaction) => {
            if (String(planned.id).startsWith('gen_')) return;
            const matchingTx = transactions.find(t => t.amount === planned.amount && t.categoryId === planned.categoryId && t.description === planned.description);
            if (matchingTx) await deleteTransaction(matchingTx.id);
            const pendingItem: PlannedTransaction = { ...planned, status: 'pending' as const };
            setPlannedTransactions(prev => prev.map(t => t.id === planned.id ? pendingItem : t));
            await syncItem('planned_transactions', pendingItem);
        },
        addCategory, updateCategory, deleteCategory, updateCategoryOrder,
        addCardRegistry, updateCardRegistry, deleteCardRegistry,
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
            const data = { transactions, plannedTransactions, cardTransactions, cardRegistries, investments, categories, settings };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `flux_backup.json`; a.click();
        },
        importData: async (json: string) => {
            try {
                const data = JSON.parse(json);
                if (data.transactions) setTransactions(data.transactions);
                if (data.categories) setCategories(data.categories);
                if (data.cardTransactions) setCardTransactions(data.cardTransactions);
                if (data.cardRegistries) setCardRegistries(data.cardRegistries);
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
                    supabase.from('card_registries').delete().eq('user_id', session.user.id),
                    supabase.from('investments').delete().eq('user_id', session.user.id),
                    supabase.from('categories').delete().eq('user_id', session.user.id),
                    supabase.from('settings').delete().eq('user_id', session.user.id),
                ]);
                setTransactions([]); setPlannedTransactions([]); setCardTransactions([]); setCardRegistries([]); setInvestments([]); setCategories([]); setSettings(DEFAULT_SETTINGS);
                await loadData();
            } catch (e) { console.error("Erro ao resetar dados:", e); } finally { setLoading(false); }
        }
    };
};
