
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PieChartData {
  name: string;
  value: number;
  color: string;
}

interface CategoryPieChartProps {
  data: PieChartData[];
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-700 p-2 border border-gray-200 dark:border-slate-600 rounded shadow-lg">
          <p className="font-bold text-gray-800 dark:text-gray-100">{`${data.name}`}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">{`Valor: ${data.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}</p>
        </div>
      );
    }
  
    return null;
  };

const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">Nenhuma despesa para exibir.</div>;
    }
    
    return (
        <ResponsiveContainer width="100%" height={300}>
        <PieChart>
            <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            >
            {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
        </PieChart>
        </ResponsiveContainer>
    );
};

export default CategoryPieChart;
