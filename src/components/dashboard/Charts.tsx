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

export function SalesLineChart({ data }: SalesChartProps) {
  return (
    <div className="bg-white border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Evolucion</p>
          <h3 className="text-sm font-black text-black">Ventas ultimos 7 dias</h3>
        </div>
        <div className="w-8 h-0.5 bg-pink-500"></div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey="date" fontSize={11} stroke="#9CA3AF" tickLine={false} axisLine={false} />
          <YAxis fontSize={11} stroke="#9CA3AF" tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#000',
              border: 'none',
              borderRadius: '0',
              color: '#fff',
              fontSize: '12px',
              padding: '8px 12px',
            }}
            formatter={(value) => [`€${value}`, 'Ventas']}
            labelStyle={{ color: '#9CA3AF', fontSize: '10px' }}
          />
          <Line
            type="monotone"
            dataKey="sales"
            stroke="#EC4899"
            strokeWidth={2.5}
            dot={{ fill: '#000', r: 3, strokeWidth: 2, stroke: '#EC4899' }}
            activeDot={{ r: 5, fill: '#EC4899' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopProductsBarChart({ data }: TopProductsChartProps) {
  const maxQuantity = Math.max(...data.map(d => d.quantity || 0));
  
  return (
    <div className="bg-white border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Ranking</p>
          <h3 className="text-sm font-black text-black">Top 5 productos mas vendidos</h3>
        </div>
        <div className="w-8 h-0.5 bg-pink-500"></div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart 
          data={data} 
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          layout="vertical"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} vertical={true} />
          <XAxis 
            type="number" 
            fontSize={11} 
            stroke="#9CA3AF"
            tickLine={false}
            axisLine={false}
            domain={[0, Math.ceil(maxQuantity * 1.1)]}
          />
          <YAxis 
            type="category"
            dataKey="name" 
            fontSize={11} 
            stroke="#9CA3AF"
            tickLine={false}
            axisLine={false}
            width={180}
          />
          <Tooltip
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            contentStyle={{
              backgroundColor: '#000',
              border: 'none',
              borderRadius: '0',
              color: '#fff',
              fontSize: '12px',
              padding: '8px 12px',
            }}
            formatter={(value) => [`${value} ventas`, 'Cantidad']}
            labelStyle={{ color: '#9CA3AF', fontSize: '10px' }}
          />
          <Bar 
            dataKey="quantity" 
            fill="#000"
            radius={[0, 2, 2, 0]}
            barSize={22}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OrderStatusPieChart({ data }: OrderStatusChartProps) {
  // Escala de negro a rosa para mantener coherencia de marca
  const BRAND_COLORS = [
    '#000000', // negro
    '#1f2937', // gris muy oscuro
    '#EC4899', // rosa principal
    '#6b7280', // gris medio
    '#f9a8d4', // rosa claro
    '#374151', // gris oscuro
    '#fce7f3', // rosa muy claro
  ];

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-white border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Estados</p>
          <h3 className="text-sm font-black text-black">Distribucion por estado</h3>
        </div>
        <div className="w-8 h-0.5 bg-pink-500"></div>
      </div>
      <div className="flex gap-6 items-center">
        <ResponsiveContainer width="55%" height={240}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={BRAND_COLORS[index % BRAND_COLORS.length]} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#000',
                border: 'none',
                borderRadius: '0',
                color: '#fff',
                fontSize: '12px',
                padding: '8px 12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Leyenda custom */}
        <div className="flex-1 space-y-2">
          {data.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-none flex-shrink-0" style={{ backgroundColor: BRAND_COLORS[index % BRAND_COLORS.length] }}></span>
                <span className="text-xs text-gray-600 truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-bold text-black">{item.value}</span>
                <span className="text-[10px] text-gray-400">{total > 0 ? Math.round((item.value / total) * 100) : 0}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
