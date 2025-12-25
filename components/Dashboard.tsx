
import React from 'react';
import type { Category } from '../types';
import BalanceLineChart from './charts/BalanceLineChart';

interface BalanceChartData {
    date: string;
    balance: number;
}

interface DashboardProps {
  categories: Category[];
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyPlannedExpense: number;
  monthlyPlannedIncome: number;
  balanceChartData: BalanceChartData[];
  currentBalance: number;
}

const StatCard: React.FC<{ title: string; amount: number; color?: string; icon: React.ReactNode }> = ({ title, amount, color, icon }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md flex items-center justify-between">
        <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className={`text-2xl font-bold ${color || 'text-gray-900 dark:text-gray-100'}`}>
                {amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
        </div>
        <div className="p-3 rounded-full bg-primary-100 dark:bg-slate-700 text-primary-600 dark:text-primary-400">
            {icon}
        </div>
    </div>
);

const BalanceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const IncomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>;
const ExpenseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>;
const PlannedExpenseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/></svg>;
const PlannedIncomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M12 14v4"/><path d="M10 16h4"/></svg>;

const Dashboard: React.FC<DashboardProps> = ({ monthlyIncome, monthlyExpense, monthlyPlannedExpense, monthlyPlannedIncome, balanceChartData, currentBalance }) => {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <StatCard title="Saldo no Mês" amount={currentBalance} color={currentBalance >= 0 ? 'text-income' : 'text-expense'} icon={<BalanceIcon />} />
        <StatCard title="Receitas (Mês)" amount={monthlyIncome} color="text-income" icon={<IncomeIcon />} />
        <StatCard title="Receitas Planejadas" amount={monthlyPlannedIncome} color="text-cyan-500" icon={<PlannedIncomeIcon />} />
        <StatCard title="Despesas (Mês)" amount={monthlyExpense} color="text-expense" icon={<ExpenseIcon />} />
        <StatCard title="Gastos Planejados" amount={monthlyPlannedExpense} color="text-yellow-500" icon={<PlannedExpenseIcon />} />
      </div>
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Evolução do Saldo no Mês</h3>
            <BalanceLineChart data={balanceChartData} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
