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
  // Calcular el máximo para referencia
  const maxQuantity = Math.max(...data.map(d => d.quantity || 0));
  
  return (
    <div className="bg-white border border-admin-border rounded-lg p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-6 bg-admin-success rounded-full"></div>
        <h3 className="text-base font-bold text-admin-text">Top 5 Productos Más Vendidos</h3>
      </div>
      <ResponsiveContainer width="100%" height={450}>
        <BarChart 
          data={data} 
          margin={{ top: 20, right: 30, left: 0, bottom: 100 }}
          layout="vertical"
        >
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.7} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0.9} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={true} vertical={false} />
          <XAxis 
            type="number" 
            fontSize={12} 
            stroke="#6B7280"
            domain={[0, Math.ceil(maxQuantity * 1.1)]}
          />
          <YAxis 
            type="category"
            dataKey="name" 
            fontSize={12} 
            stroke="#6B7280"
            width={200}
          />
          <Tooltip
            cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
            contentStyle={{
              backgroundColor: '#fff',
              border: '2px solid #10B981',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              padding: '10px',
            }}
            formatter={(value) => [`${value} ventas`, 'Cantidad']}
            labelStyle={{ color: '#000' }}
          />
          <Bar 
            dataKey="quantity" 
            fill="url(#barGradient)" 
            radius={[0, 8, 8, 0]}
            barSize={35}
          />
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
