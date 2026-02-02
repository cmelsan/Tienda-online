interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
}

export function KPICard({ title, value, subtitle }: KPICardProps) {
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 border border-black rounded-none p-8 hover:shadow-2xl transition-all duration-300 group">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <p className="text-xs font-black text-black uppercase tracking-[0.2em] mb-4">{title}</p>
          <div className="flex items-baseline gap-3">
            <p className="text-5xl md:text-6xl font-black text-black leading-none">{value}</p>
            {subtitle && <p className="text-sm text-gray-600 font-semibold">{subtitle}</p>}
          </div>
        </div>
        <div className="w-1 h-12 bg-gradient-to-b from-pink-400 to-pink-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </div>
    </div>
  );
}
