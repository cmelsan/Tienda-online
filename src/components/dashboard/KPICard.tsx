interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
}

const iconMap: { [key: string]: { icon: JSX.Element; gradient: string } } = {
  sales: {
    icon: (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    gradient: 'from-admin-success to-green-600',
  },
  orders: {
    icon: (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    gradient: 'from-admin-warning to-orange-600',
  },
  product: {
    icon: (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    gradient: 'from-admin-primary to-blue-600',
  },
  returns: {
    icon: (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3v-6" />
      </svg>
    ),
    gradient: 'from-admin-danger to-red-600',
  },
  total: {
    icon: (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    gradient: 'from-purple-500 to-purple-700',
  },
};

export function KPICard({ title, value, subtitle, icon }: KPICardProps) {
  const iconData = icon && iconMap[icon] ? iconMap[icon] : null;
  const gradientClass = iconData?.gradient || 'from-gray-500 to-gray-700';

  return (
    <div className={`bg-gradient-to-br ${gradientClass} text-white p-6 rounded-lg shadow-md min-h-[180px] flex items-center justify-between`}>
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide mb-2 opacity-90">{title}</p>
        <p className="text-4xl font-bold leading-tight break-words">{value}</p>
        {subtitle && <p className="text-sm opacity-90 mt-2">{subtitle}</p>}
      </div>
      <div className="ml-6 flex-shrink-0 opacity-30">
        {iconData?.icon}
      </div>
    </div>
  );
}
