interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  accent?: 'rose' | 'red';
}

export function KPICard({ title, value, subtitle, accent = 'rose' }: KPICardProps) {
  const accentClass = accent === 'red' 
    ? 'from-red-50 to-rose-50 border-red-200 hover:border-red-400' 
    : 'from-rose-50 to-pink-50 border-rose-200 hover:border-rose-400';
  
  const textAccent = accent === 'red' 
    ? 'text-red-600' 
    : 'text-rose-600';

  return (
    <div className={`bg-gradient-to-br ${accentClass} border rounded-xl p-6 transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-default`}>
      <div className="flex items-center justify-between mb-4">
        <p className={`text-xs font-bold ${textAccent} uppercase tracking-widest`}>{title}</p>
        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${accent === 'red' ? 'from-red-400 to-rose-400' : 'from-rose-400 to-pink-400'}`}></div>
      </div>
      <div className="flex items-baseline gap-2">
        <p className={`text-4xl font-black ${textAccent}`}>{value}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}
