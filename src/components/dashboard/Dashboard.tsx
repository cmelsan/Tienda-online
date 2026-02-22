import { KPICard } from './KPICard';
import { SalesLineChart, TopProductsBarChart, OrderStatusPieChart } from './Charts';

interface DashboardProps {
  totalSalesMonth: number;
  pendingOrders: number;
  topProduct: { name: string; quantity: number } | null;
  returnRate: number;
  salesLast7Days: Array<{ date: string; sales: number }>;
  topProducts: Array<{ name: string; quantity: number }>;
  orderStatusDistribution: Array<{ name: string; value: number }>;
}

export function Dashboard({
  totalSalesMonth,
  pendingOrders,
  topProduct,
  returnRate,
  salesLast7Days,
  topProducts,
  orderStatusDistribution,
}: DashboardProps) {
  const totalOrders = orderStatusDistribution.reduce((sum, item) => sum + item.value, 0) || 0;

  return (
    <div className="space-y-6">
      {/* KPI secundarios - estilo coherente con el panel */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Ventas mes"
          value={`€${(totalSalesMonth / 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })}`}
          icon="sales"
          accent
        />
        <KPICard title="Pedidos pendientes" value={pendingOrders} icon="orders" />
        <KPICard
          title="Producto top"
          value={topProduct?.name || 'N/A'}
          subtitle={topProduct ? `${topProduct.quantity} unid.` : undefined}
          icon="product"
        />
        <KPICard title="Tasa devoluciones" value={`${returnRate.toFixed(1)}%`} icon="returns" />
        <KPICard title="Total ordenes" value={totalOrders} icon="total" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesLineChart data={salesLast7Days} />
        <OrderStatusPieChart data={orderStatusDistribution} />
      </div>

      <TopProductsBarChart data={topProducts} />

      {/* Acciones Rápidas */}
      <div>
        <h2 className="text-lg font-black uppercase tracking-widest text-black mb-4 border-b-4 border-black pb-2">
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {[
            {
              href: '/admin/pedidos',
              label: 'Pedidos',
              desc: 'Gestionar pedidos',
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              ),
              color: 'bg-black text-white hover:bg-gray-800',
            },
            {
              href: '/admin/devoluciones',
              label: 'Devoluciones',
              desc: 'Gestionar devoluciones',
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              ),
              color: 'bg-rose-600 text-white hover:bg-rose-700',
            },
            {
              href: '/admin/facturas',
              label: 'Facturas',
              desc: 'Ver todas las facturas',
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              ),
              color: 'bg-emerald-600 text-white hover:bg-emerald-700',
            },
            {
              href: '/admin/productos',
              label: 'Productos',
              desc: 'Gestionar catálogo',
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              ),
              color: 'bg-violet-600 text-white hover:bg-violet-700',
            },
            {
              href: '/admin/newsletter',
              label: 'Newsletter',
              desc: 'Ver suscriptores',
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              ),
              color: 'bg-sky-600 text-white hover:bg-sky-700',
            },
            {
              href: '/admin/cupones',
              label: 'Cupones',
              desc: 'Gestionar descuentos',
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              ),
              color: 'bg-amber-500 text-white hover:bg-amber-600',
            },
            {
              href: '/admin/ofertas-flash',
              label: 'Flash Sales',
              desc: 'Activar/desactivar ofertas',
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M13 10V3L4 14h7v7l9-11h-7z" />
              ),
              color: 'bg-orange-500 text-white hover:bg-orange-600',
            },
            {
              href: '/admin/marcas',
              label: 'Marcas',
              desc: 'Gestionar marcas',
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              ),
              color: 'bg-pink-600 text-white hover:bg-pink-700',
            },
            {
              href: '/admin/configuracion',
              label: 'Configuración',
              desc: 'Ajustes generales',
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              ),
              color: 'bg-gray-600 text-white hover:bg-gray-700',
            },
            {
              href: '/admin/atributos',
              label: 'Atributos',
              desc: 'Categorías y subcategorías',
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              ),
              color: 'bg-teal-600 text-white hover:bg-teal-700',
            },
          ].map(({ href, label, desc, icon, color }) => (
            <a
              key={href}
              href={href}
              className={`group flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${color}`}
            >
              <svg className="w-7 h-7 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {icon}
              </svg>
              <span className="text-sm font-bold text-center leading-tight">{label}</span>
              <span className="text-[10px] opacity-80 text-center leading-tight hidden sm:block">{desc}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
