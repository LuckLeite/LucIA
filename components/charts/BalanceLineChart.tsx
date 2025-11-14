import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface LineChartData {
  date: string;
  balance: number;
}

interface BalanceLineChartProps {
  data: LineChartData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-700 p-2 border border-gray-200 dark:border-slate-600 rounded shadow-lg">
          <p className="font-bold text-gray-800 dark:text-gray-100">{`Dia ${label}`}</p>
          <p style={{ color: payload[0].stroke }}>
            {`Saldo: ${payload[0].value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
          </p>
        </div>
      );
    }
    return null;
};

const BalanceLineChart: React.FC<BalanceLineChartProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">Dados insuficientes para o gráfico.</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)} tick={{ fontSize: 12 }} domain={['dataMin - 100', 'dataMax + 100']} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} />
                <Line type="monotone" dataKey="balance" name="Saldo" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default BalanceLineChart;