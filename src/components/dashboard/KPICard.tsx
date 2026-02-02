interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
}

export function KPICard({ title, value, subtitle }: KPICardProps) {
  return (
    <div className="border border-black bg-white p-8 min-h-[180px] flex flex-col justify-between hover:shadow-lg transition-shadow">
      <p className="text-xs font-black text-black uppercase tracking-[0.15em] mb-8">{title}</p>
      <div className="flex flex-col gap-2">
        <p className="text-4xl md:text-5xl font-black text-black leading-tight break-words">{value}</p>
        {subtitle && <p className="text-xs text-gray-700 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
}
