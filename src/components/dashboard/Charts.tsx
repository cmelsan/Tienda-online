import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartData {
  date?: string;
  sales?: number;
  name?: string;
  quantity?: number;
  value?: number;
}

interface SalesChartProps {
  data: Array<{ date: string; sales: number }>;
}

interface TopProductsChartProps {
  data: Array<{ name: string; quantity: number }>;
}

interface OrderStatusChartProps {
  data: Array<{ name: string; value: number }>;
}

const COLORS = ['#1f2937', '#374151', '#6b7280', '#9ca3af', '#d1d5db'];

export function SalesLineChart({ data }: SalesChartProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-sm font-bold text-gray-900 mb-4">Ventas Últimos 7 Días</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="date" fontSize={12} stroke="#9ca3af" />
          <YAxis fontSize={12} stroke="#9ca3af" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
            formatter={(value) => `€${value}`}
          />
          <Line
            type="monotone"
            dataKey="sales"
            stroke="#1f2937"
            strokeWidth={2}
            dot={{ fill: '#1f2937', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopProductsBarChart({ data }: TopProductsChartProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-sm font-bold text-gray-900 mb-4">Top 5 Productos Más Vendidos</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="name" fontSize={12} stroke="#9ca3af" angle={-45} textAnchor="end" />
          <YAxis fontSize={12} stroke="#9ca3af" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
          />
          <Bar dataKey="quantity" fill="#1f2937" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OrderStatusPieChart({ data }: OrderStatusChartProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-sm font-bold text-gray-900 mb-4">Distribución por Estado</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
