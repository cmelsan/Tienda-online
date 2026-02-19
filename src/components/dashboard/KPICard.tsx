interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  accent?: boolean;
}


const iconMap: { [key: string]: JSX.Element } = {
  sales: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  orders: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  product: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  returns: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3v-6" />
    </svg>
  ),
  total: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
};

export function KPICard({ title, value, subtitle, icon, accent }: KPICardProps) {
  const iconEl = icon && iconMap[icon] ? iconMap[icon] : null;

  if (accent) {
    return (
      <div className="bg-black text-white p-6 flex flex-col justify-between min-h-[120px]">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{title}</p>
          {iconEl && <span className="text-gray-600">{iconEl}</span>}
        </div>
        <div>
          <p className="text-3xl font-black mt-3 leading-tight break-words">{value}</p>
          {subtitle && <p className="text-xs text-pink-400 font-semibold mt-1">{subtitle}</p>}
          <div className="w-8 h-0.5 bg-pink-500 mt-3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 p-6 flex flex-col justify-between min-h-[120px]">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{title}</p>
        {iconEl && <span className="text-gray-300">{iconEl}</span>}
      </div>
      <div>
        <p className="text-3xl font-black text-black mt-3 leading-tight break-words">{value}</p>
        {subtitle && <p className="text-xs text-pink-500 font-semibold mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
