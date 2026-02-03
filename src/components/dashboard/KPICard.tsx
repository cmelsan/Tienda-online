interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
}

const iconMap: { [key: string]: JSX.Element } = {
  sales: (
    <svg className="w-20 h-20 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  orders: (
    <svg className="w-20 h-20 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  product: (
    <svg className="w-20 h-20 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  returns: (
    <svg className="w-20 h-20 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3v-6" />
    </svg>
  ),
  total: (
    <svg className="w-20 h-20 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
};

export function KPICard({ title, value, subtitle, icon }: KPICardProps) {
  return (
    <div className="border-4 border-black bg-white p-8 min-h-[200px] flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-black text-gray-600 uppercase tracking-widest mb-6">{title}</p>
        <p className="text-7xl font-black text-black leading-none break-words">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 font-medium mt-3">{subtitle}</p>}
      </div>
      <div className="ml-8 flex-shrink-0">
        {icon && iconMap[icon] ? iconMap[icon] : null}
      </div>
    </div>
  );
}
