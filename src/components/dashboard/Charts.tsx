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
    <div className="bg-white border border-admin-border rounded-lg p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-6 bg-admin-primary rounded-full"></div>
        <h3 className="text-base font-bold text-admin-text">Ventas Últimos 7 Días</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="date" fontSize={12} stroke="#6B7280" />
          <YAxis fontSize={12} stroke="#6B7280" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
            formatter={(value) => `€${value}`}
          />
          <Line
            type="monotone"
            dataKey="sales"
            stroke="#3B82F6"
            strokeWidth={3}
            dot={{ fill: '#3B82F6', r: 4 }}
            activeDot={{ r: 6 }}
            fill="url(#salesGradient)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopProductsBarChart({ data }: TopProductsChartProps) {
  return (
    <div className="bg-white border border-admin-border rounded-lg p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-6 bg-admin-success rounded-full"></div>
        <h3 className="text-base font-bold text-admin-text">Top 5 Productos Más Vendidos</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 60 }}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="name" fontSize={11} stroke="#6B7280" angle={-45} textAnchor="end" height={80} />
          <YAxis fontSize={12} stroke="#6B7280" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          />
          <Bar dataKey="quantity" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OrderStatusPieChart({ data }: OrderStatusChartProps) {
  const COLORS_SEMANTIC = [
    '#3B82F6', // Blue - Paid
    '#10B981', // Green - Delivered
    '#F59E0B', // Amber - Shipped
    '#6B7280', // Gray - Pending
    '#EF4444', // Red - Cancelled
  ];

  return (
    <div className="bg-white border border-admin-border rounded-lg p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-6 bg-admin-warning rounded-full"></div>
        <h3 className="text-base font-bold text-admin-text">Distribución por Estado</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={90}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS_SEMANTIC[index % COLORS_SEMANTIC.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
