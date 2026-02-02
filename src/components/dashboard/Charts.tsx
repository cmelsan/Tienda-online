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

const COLORS = ['#be123c', '#e11d48', '#f43f5e', '#fb7185', '#fda4af'];

export function SalesLineChart({ data }: SalesChartProps) {
  return (
    <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-1 h-6 bg-gradient-to-b from-rose-400 to-rose-600 rounded-full"></div>
        <h3 className="text-sm font-bold text-rose-900">Ventas Últimos 7 Días</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#be123c" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#fda4af" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" />
          <XAxis dataKey="date" fontSize={12} stroke="#be7c8f" />
          <YAxis fontSize={12} stroke="#be7c8f" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff1f5',
              border: '2px solid #be123c',
              borderRadius: '0.75rem',
            }}
            formatter={(value) => `€${value}`}
          />
          <Line
            type="monotone"
            dataKey="sales"
            stroke="#be123c"
            strokeWidth={3}
            dot={{ fill: '#be123c', r: 5 }}
            activeDot={{ r: 7 }}
            fill="url(#colorSales)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopProductsBarChart({ data }: TopProductsChartProps) {
  return (
    <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-1 h-6 bg-gradient-to-b from-red-400 to-red-600 rounded-full"></div>
        <h3 className="text-sm font-bold text-red-900">Top 5 Productos Más Vendidos</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dc2626" stopOpacity={0.9}/>
              <stop offset="100%" stopColor="#f87171" stopOpacity={0.7}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#fee2e2" />
          <XAxis dataKey="name" fontSize={12} stroke="#be7c8f" angle={-45} textAnchor="end" />
          <YAxis fontSize={12} stroke="#be7c8f" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fef2f2',
              border: '2px solid #dc2626',
              borderRadius: '0.75rem',
            }}
          />
          <Bar dataKey="quantity" fill="url(#colorBar)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OrderStatusPieChart({ data }: OrderStatusChartProps) {
  return (
    <div className="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-1 h-6 bg-gradient-to-b from-pink-400 to-pink-600 rounded-full"></div>
        <h3 className="text-sm font-bold text-pink-900">Distribución por Estado</h3>
      </div>
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
          <Tooltip 
            contentStyle={{
              backgroundColor: '#fdf2f8',
              border: '2px solid #be123c',
              borderRadius: '0.75rem',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
