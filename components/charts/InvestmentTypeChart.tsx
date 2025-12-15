
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Investment } from '../../types';

interface InvestmentTypeChartProps {
  investments: Investment[];
}

const COLORS = ['#22c55e', '#a855f7', '#3b82f6', '#f59e0b', '#ef4444'];

const TYPE_LABELS: Record<string, string> = {
    'fixed': 'Renda Fixa',
    'stock': 'Ações/FIIs',
    'fund': 'Fundos',
    'crypto': 'Cripto',
    'other': 'Outros'
};

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-700 p-2 border border-gray-200 dark:border-slate-600 rounded shadow-lg">
          <p className="font-bold text-gray-800 dark:text-gray-100">{`${data.name}`}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">{`Saldo: ${data.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{`(${data.percent.toFixed(1)}%)`}</p>
        </div>
      );
    }
    return null;
};

const InvestmentTypeChart: React.FC<InvestmentTypeChartProps> = ({ investments }) => {
    const data = React.useMemo(() => {
        // Type casting the initial value to avoid generic type argument issues on reduce
        const grouped = investments.reduce((acc, curr) => {
            const type = curr.type;
            acc[type] = (acc[type] || 0) + curr.currentBalance;
            return acc;
        }, {} as Record<string, number>);

        // Explicitly typing reduce arguments to handle number addition correctly
        const total = Object.values(grouped).reduce((a: number, b: number) => a + b, 0);

        return Object.entries(grouped)
            .map(([key, value]: [string, number]) => ({
                name: TYPE_LABELS[key] || key,
                value: value,
                percent: total > 0 ? (value / total) * 100 : 0
            }))
            .filter((item) => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [investments]);

    if (data.length === 0) {
        return <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400 text-sm">Sem dados para gráfico.</div>;
    }

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default InvestmentTypeChart;