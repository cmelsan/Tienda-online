interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
}

export function KPICard({ title, value, subtitle }: KPICardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{title}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}
