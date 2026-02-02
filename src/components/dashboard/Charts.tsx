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
    <div className="bg-gradient-to-br from-white to-gray-50 border border-black rounded-none p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-8 bg-gradient-to-b from-pink-400 to-pink-600 rounded-full"></div>
        <h3 className="text-lg font-black text-black uppercase tracking-wider">Ventas Últimos 7 Días</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#000000" stopOpacity={0.8}/>
              <stop offset="100%" stopColor="#ec4899" stopOpacity={0.2}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" fontSize={12} stroke="#6b7280" />
          <YAxis fontSize={12} stroke="#6b7280" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '3px solid #000',
              borderRadius: '0',
            }}
            formatter={(value) => `€${value}`}
          />
          <Line
            type="monotone"
            dataKey="sales"
            stroke="#000000"
            strokeWidth={3}
            dot={{ fill: '#000000', r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopProductsBarChart({ data }: TopProductsChartProps) {
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 border border-black rounded-none p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-8 bg-gradient-to-b from-pink-400 to-pink-600 rounded-full"></div>
        <h3 className="text-lg font-black text-black uppercase tracking-wider">Top 5 Productos Más Vendidos</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#000000" stopOpacity={0.9}/>
              <stop offset="100%" stopColor="#ec4899" stopOpacity={0.6}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" fontSize={12} stroke="#6b7280" angle={-45} textAnchor="end" />
          <YAxis fontSize={12} stroke="#6b7280" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '3px solid #000',
              borderRadius: '0',
            }}
          />
          <Bar dataKey="quantity" fill="url(#barGradient)" radius={[0, 0, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OrderStatusPieChart({ data }: OrderStatusChartProps) {
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 border border-black rounded-none p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-8 bg-gradient-to-b from-pink-400 to-pink-600 rounded-full"></div>
        <h3 className="text-lg font-black text-black uppercase tracking-wider">Distribución por Estado</h3>
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
            {data.map((entry, index) => {
              const shades = ['#000000', '#1f2937', '#374151', '#4b5563', '#6b7280'];
              return <Cell key={`cell-${index}`} fill={shades[index % shades.length]} />;
            })}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '3px solid #000',
              borderRadius: '0',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
