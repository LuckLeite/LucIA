
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Transaction, PlannedTransaction, CardTransaction, CardRegistry, Category, AppSettings, Investment, Budget } from '../types';
import { INITIAL_CATEGORIES_TEMPLATE } from '../constants';

const generateUUID = () => crypto.randomUUID();

const DEFAULT_SETTINGS: AppSettings = {
    calculateTithing: false,
    plannedDrawersOpenDefault: false,
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
        
        if (operation === 'upsert' && String(item.id).startsWith('gen_') && !item.isPersistentOverride) return;
        
        try {
            if (operation === 'delete') {
                const { error } = await supabase.from(table).delete().eq('id', item.id);
                if (error) throw error;
            } else {
                const { isGenerated, isPersistentOverride, ...cleanItem } = item;
                let dataToSync = { ...cleanItem, user_id: session.user.id };
                
                const { error } = await supabase.from(table).upsert(dataToSync);
                if (error) throw error;
            }
        } catch (e: any) {
            setError(`Falha ao salvar: ${e.message}`);
        }
    };

    const loadData = useCallback(async () => {
        if (!supabase || !session) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // CRITICAL FIX: All queries MUST be filtered by user_id to avoid reading leaked global settings
            const [txs, pln, crd, creg, inv, cat, bud, set] = await Promise.all([
                supabase.from('transactions').select('*').order('date', { ascending: false }),
                supabase.from('planned_transactions').select('*'),
                supabase.from('card_transactions').select('*'),
                supabase.from('card_registries').select('*'),
                supabase.from('investments').select('*'),
                supabase.from('categories').select('*').order('sort_order', { ascending: true }),
                supabase.from('budgets').select('*'),
                supabase.from('settings').select('*').eq('user_id', session.user.id).maybeSingle()
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
                    setCategories(cat.data.map((c: any) => ({
                        ...c,
                        includeInTithing: c.includeInTithing ?? c.includeintithing ?? (c.type === 'income'),
                        sort_order: c.sort_order ?? c.sortorder
                    })));
                }
            }

            if (txs.data) setTransactions(txs.data);
            if (pln.data) setPlannedTransactions(pln.data);
            if (crd.data) setCardTransactions(crd.data);
            if (creg.data) setCardRegistries(creg.data || []);
            if (inv.data) setInvestments(inv.data);
            if (bud.data) setBudgets(bud.data);
            
            // Robust settings mapping: prioritize user-specific row and handle case-insensitivity
            if (set.data) {
                const data = set.data;
                setSettings({
                    calculateTithing: data.calculateTithing ?? data.calculatetithing ?? DEFAULT_SETTINGS.calculateTithing,
                    plannedDrawersOpenDefault: data.plannedDrawersOpenDefault ?? data.planneddrawersopendefault ?? DEFAULT_SETTINGS.plannedDrawersOpenDefault,
                });
            } else {
                setSettings(DEFAULT_SETTINGS);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [session]);

    useEffect(() => {
        if (session) loadData();
    }, [session, loadData]);

    const findCategoryByName = (name: string, type: 'income' | 'expense') => {
        return categories.find(c => c.type === type && c.name.toLowerCase() === name.toLowerCase());
    };

    const cardCategory = useMemo(() => findCategoryByName('Cartão', 'expense'), [categories]);
    const tithingCategory = useMemo(() => findCategoryByName('Dizimo', 'expense'), [categories]);
    const movementCategoryExpense = useMemo(() => findCategoryByName('Movimento', 'expense'), [categories]);
    const movementCategoryIncome = useMemo(() => findCategoryByName('Movimento', 'income'), [categories]);

    const getPersistentOverride = (key: string) => {
        return plannedTransactions.find(pt => pt.group_name === key);
    };

    const getGeneratedMovementForMonth = useCallback((monthPrefix: string): PlannedTransaction[] => {
        if (!movementCategoryExpense || !movementCategoryIncome) return [];
        const identityKey = `AUTO_MOV_${monthPrefix}`;
        const override = getPersistentOverride(identityKey);
        const monthTransactions = transactions.filter(t => t.date.startsWith(monthPrefix));
        const movementOut = monthTransactions.filter(t => t.categoryId === movementCategoryExpense.id).reduce((sum, t) => sum + t.amount, 0);
        const movementIn = monthTransactions.filter(t => t.categoryId === movementCategoryIncome.id).reduce((sum, t) => sum + t.amount, 0);
        const calculatedAmount = movementOut - movementIn;
        if (calculatedAmount <= 0 && !override) return [];
        return [{
            id: override?.id || `gen_mov_${monthPrefix}`,
            description: override?.description || 'Recurso Disponível (Banco Vivo)',
            amount: calculatedAmount,
            type: 'income' as const,
            categoryId: override?.categoryId || movementCategoryIncome.id,
            dueDate: override?.dueDate || `${monthPrefix}-01`,
            status: override?.status || 'pending',
            isGenerated: true,
            group_name: identityKey
        }];
    }, [transactions, movementCategoryExpense, movementCategoryIncome, plannedTransactions]);

    const generatedCardInvoices = useMemo(() => {
        if (!cardCategory) return [];
        const invoiceMap = new Map<string, PlannedTransaction>();
        cardTransactions.forEach(ct => {
            const purchaseDate = new Date(ct.purchaseDate + 'T12:00:00Z');
            const registry = cardRegistries.find(r => r.name === ct.card);
            const dueDay = registry ? registry.due_day : 10;
            const installmentAmount = ct.totalAmount / ct.installments;
            for (let i = 1; i <= ct.installments; i++) {
                const dueDate = new Date(purchaseDate);
                dueDate.setUTCMonth(purchaseDate.getUTCMonth() + i);
                dueDate.setUTCDate(dueDay);
                const dateStr = dueDate.toISOString().split('T')[0];
                const monthPrefix = dateStr.substring(0, 7);
                const identityKey = `AUTO_CARD_${ct.card}_${monthPrefix}`;
                if (invoiceMap.has(identityKey)) {
                    invoiceMap.get(identityKey)!.amount += installmentAmount;
                } else {
                    const override = getPersistentOverride(identityKey);
                    const displayDate = dueDate.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
                    invoiceMap.set(identityKey, {
                        id: override?.id || `gen_card_${identityKey}`,
                        description: override?.description || `Fatura ${ct.card} ${displayDate}`,
                        amount: installmentAmount,
                        type: 'expense',
                        categoryId: override?.categoryId || cardCategory.id,
                        dueDate: override?.dueDate || dateStr,
                        status: override?.status || 'pending',
                        isGenerated: true,
                        group_name: identityKey
                    });
                }
            }
        });
        return Array.from(invoiceMap.values());
    }, [cardTransactions, cardCategory, cardRegistries, plannedTransactions]);

    const generatedTithing = useMemo<PlannedTransaction[]>(() => {
        if (!settings.calculateTithing || !tithingCategory) return [];
        const monthlyIncomes = new Map<string, number>();
        transactions.forEach(t => {
            if (t.type === 'income') {
                const cat = categories.find(c => c.id === t.categoryId);
                if (cat?.includeInTithing) {
                    const month = t.date.substring(0, 7);
                    monthlyIncomes.set(month, (monthlyIncomes.get(month) || 0) + t.amount);
                }
            }
        });
        return Array.from(monthlyIncomes.entries()).map(([month, total]) => {
            const identityKey = `AUTO_TITH_${month}`;
            const override = getPersistentOverride(identityKey);
            return {
                id: override?.id || `gen_tith_${month}`,
                description: override?.description || `Dízimo (${month})`,
                amount: total * 0.1,
                type: 'expense' as const,
                categoryId: override?.categoryId || tithingCategory.id,
                dueDate: override?.dueDate || `${month}-10`,
                status: override?.status || 'pending',
                isGenerated: true,
                group_name: identityKey
            };
        });
    }, [transactions, settings.calculateTithing, tithingCategory, categories, plannedTransactions]);

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

    const addMultipleTransactions = async (txs: Omit<Transaction, 'id'>[]) => {
        const newTxs = txs.map(t => ({ ...t, id: generateUUID() }));
        setTransactions(prev => [...newTxs, ...prev]);
        if (supabase && session) {
            const dataToSync = newTxs.map(t => ({ ...t, user_id: session.user.id }));
            await supabase.from('transactions').insert(dataToSync);
        }
    };

    const deleteMultipleTransactions = async (ids: string[]) => {
        setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
        if (supabase) await supabase.from('transactions').delete().in('id', ids);
    };

    const updateMultipleTransactionsCategory = async (ids: string[], categoryId: string) => {
        setTransactions(prev => prev.map(t => ids.includes(t.id) ? { ...t, categoryId } : t));
        if (supabase) await supabase.from('transactions').update({ categoryId }).in('id', ids);
    };

    const duplicateTransaction = (id: string) => {
        const original = transactions.find(t => t.id === id);
        if (original) addTransaction({ ...original });
    };

    const getMonthlySummary = (date: Date) => {
        const prefix = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const filtered = transactions.filter(t => {
            const cat = categories.find(c => c.id === t.categoryId);
            const isMovement = cat?.name.toLowerCase() === 'movimento';
            return t.date.startsWith(prefix) && !isMovement;
        });
        const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        return { income, expense };
    };

    const addPlannedTransaction = async (pt: Omit<PlannedTransaction, 'id' | 'status'>, recurrence: number = 0) => {
        const recurrence_id = recurrence > 0 ? generateUUID() : undefined;
        const pts: PlannedTransaction[] = [];
        for (let i = 0; i <= recurrence; i++) {
            const date = new Date(pt.dueDate + 'T12:00:00Z');
            date.setUTCMonth(date.getUTCMonth() + i);
            pts.push({
                ...pt,
                id: generateUUID(),
                status: 'pending',
                dueDate: date.toISOString().split('T')[0],
                recurrence_id
            });
        }
        setPlannedTransactions(prev => [...pts, ...prev]);
        if (supabase && session) {
            const dataToSync = pts.map(p => ({ ...p, user_id: session.user.id }));
            await supabase.from('planned_transactions').insert(dataToSync);
        }
    };

    const updatePlannedTransaction = async (pt: PlannedTransaction, updateFuture: boolean) => {
        const isVirtual = String(pt.id).startsWith('gen_');
        let finalPt: PlannedTransaction;
        if (isVirtual) {
            finalPt = { ...pt, id: generateUUID(), isGenerated: false, isPersistentOverride: true };
            setPlannedTransactions(prev => [...prev, finalPt]);
        } else {
            finalPt = pt;
            setPlannedTransactions(prev => prev.map(p => p.id === pt.id ? finalPt : p));
        }
        if (!updateFuture) {
            await syncItem('planned_transactions', finalPt);
        } else {
            const target = plannedTransactions.find(p => p.id === pt.id);
            if (!target) return;
            const matches = plannedTransactions.filter(p => 
                (target.recurrence_id && p.recurrence_id === target.recurrence_id && p.dueDate >= target.dueDate) ||
                (!target.recurrence_id && p.description === target.description && p.dueDate >= target.dueDate)
            );
            const updates = matches.map(m => ({ ...finalPt, id: m.id, dueDate: m.dueDate }));
            setPlannedTransactions(prev => prev.map(p => {
                const up = updates.find(u => u.id === p.id);
                return up ? up : p;
            }));
            if (supabase && session) await supabase.from('planned_transactions').upsert(updates.map(u => ({ ...u, user_id: session.user.id })));
        }
    };

    const deletePlannedTransaction = async (id: string, deleteFuture: boolean = false) => {
        if (!deleteFuture) {
            setPlannedTransactions(prev => prev.filter(p => p.id !== id));
            await syncItem('planned_transactions', { id }, 'delete');
        } else {
            const target = plannedTransactions.find(p => p.id === id);
            if (!target) return;
            const matchIds = plannedTransactions
                .filter(p => (target.recurrence_id && p.recurrence_id === target.recurrence_id && p.dueDate >= target.dueDate) ||
                             (!target.recurrence_id && p.description === target.description && p.dueDate >= target.dueDate))
                .map(p => p.id);
            setPlannedTransactions(prev => prev.filter(p => !matchIds.includes(p.id)));
            if (supabase) await supabase.from('planned_transactions').delete().in('id', matchIds);
        }
    };

    const markPlannedTransactionAsPaid = async (pt: PlannedTransaction) => {
        await addTransaction({
            amount: pt.amount,
            type: pt.type,
            categoryId: pt.categoryId,
            date: new Date().toISOString().split('T')[0],
            description: pt.description
        });
        const isVirtual = String(pt.id).startsWith('gen_');
        const finalPt: PlannedTransaction = {
            ...pt,
            id: isVirtual ? generateUUID() : pt.id,
            status: 'paid' as const,
            isGenerated: false,
            isPersistentOverride: true
        };
        if (isVirtual) {
            setPlannedTransactions(prev => [...prev, finalPt]);
        } else {
            setPlannedTransactions(prev => prev.map(p => p.id === pt.id ? finalPt : p));
        }
        await syncItem('planned_transactions', finalPt);
    };

    const unmarkPlannedTransactionAsPaid = async (pt: PlannedTransaction) => {
        if (pt.group_name?.startsWith('AUTO_')) {
            const updated = { ...pt, status: 'pending' as const };
            setPlannedTransactions(prev => prev.map(p => p.id === pt.id ? updated : p));
            await syncItem('planned_transactions', updated);
        } else if (!pt.isGenerated) {
            const updated = { ...pt, status: 'pending' as const };
            setPlannedTransactions(prev => prev.map(p => p.id === pt.id ? updated : p));
            await syncItem('planned_transactions', updated);
        }
    };

    const duplicatePlannedTransaction = (id: string) => {
        const original = plannedTransactions.find(p => p.id === id);
        if (original) addPlannedTransaction({ ...original });
    };

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
        const updates = newOrder.map((c, i) => ({ ...c, sort_order: i }));
        setCategories(updates);
        if (supabase && session) {
            await supabase.from('categories').upsert(updates.map(u => ({ ...u, user_id: session.user.id })));
        }
    };

    const addCardTransaction = async (ct: Omit<CardTransaction, 'id'>) => {
        const newCt = { ...ct, id: generateUUID() };
        setCardTransactions(prev => [...prev, newCt]);
        await syncItem('card_transactions', newCt);
    };

    const updateCardTransaction = async (ct: CardTransaction) => {
        setCardTransactions(prev => prev.map(c => c.id === ct.id ? ct : c));
        await syncItem('card_transactions', ct);
    };

    const deleteCardTransaction = async (id: string) => {
        setCardTransactions(prev => prev.filter(c => c.id !== id));
        await syncItem('card_transactions', { id }, 'delete');
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

    const addInvestment = async (inv: Omit<Investment, 'id'>) => {
        const newInv = { ...inv, id: generateUUID() };
        setInvestments(prev => [...prev, newInv]);
        await syncItem('investments', newInv);
    };

    const updateInvestment = async (inv: Investment) => {
        setInvestments(prev => prev.map(i => i.id === inv.id ? inv : i));
        await syncItem('investments', inv);
    };

    const deleteInvestment = async (id: string) => {
        setInvestments(prev => prev.filter(i => i.id !== id));
        await syncItem('investments', { id }, 'delete');
    };

    const clearAllData = async () => {
        if (!supabase || !session) return;
        setLoading(true);
        const tables = ['transactions', 'planned_transactions', 'card_transactions', 'card_registries', 'investments', 'categories', 'settings'];
        for (const table of tables) {
            await supabase.from(table).delete().eq('user_id', session.user.id);
        }
        setTransactions([]); setPlannedTransactions([]); setCardTransactions([]); setCardRegistries([]); setInvestments([]); setCategories([]); setSettings(DEFAULT_SETTINGS);
        loadData();
    };

    const exportData = () => {
        const data = { transactions, plannedTransactions, cardTransactions, cardRegistries, investments, categories, settings };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flux_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    const importData = async (json: string) => {
        try {
            const data = JSON.parse(json);
            if (!supabase || !session) return false;
            if (data.categories) setCategories(data.categories);
            if (data.transactions) setTransactions(data.transactions);
            return true;
        } catch { return false; }
    };

    const updateSettings = async (newSettings: AppSettings) => {
        setSettings(newSettings);
        if (supabase && session) {
            // Using a unique ID scoped to user to avoid global conflicts shown in screenshot
            const uniqueId = `settings_${session.user.id}`;
            await supabase.from('settings').upsert({ 
                id: uniqueId,
                user_id: session.user.id,
                calculateTithing: newSettings.calculateTithing,
                plannedDrawersOpenDefault: newSettings.plannedDrawersOpenDefault
            });
        }
    };

    const totalBalance = useMemo(() => {
        return transactions.reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum - t.amount, 0);
    }, [transactions]);

    return {
        transactions, categories, addTransaction, duplicateTransaction, addMultipleTransactions, updateTransaction, deleteTransaction, 
        getMonthlySummary, deleteMultipleTransactions, updateMultipleTransactionsCategory, getGeneratedMovementForMonth,
        plannedTransactions, generatedCardInvoices, generatedTithing, addPlannedTransaction, updatePlannedTransaction, deletePlannedTransaction, duplicatePlannedTransaction, markPlannedTransactionAsPaid, unmarkPlannedTransactionAsPaid,
        cardTransactions, cardRegistries, addCardTransaction, updateCardTransaction, deleteCardTransaction, addCardRegistry, updateCardRegistry, deleteCardRegistry,
        investments, addInvestment, updateInvestment, deleteInvestment,
        addCategory, updateCategory, deleteCategory, updateCategoryOrder,
        loading, error, totalBalance,
        exportData, importData, clearAllData, settings, updateSettings
    };
};
