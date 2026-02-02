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
  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 animate-fade-in">
        <div className="animate-slide-up" style={{ animationDelay: '0s' }}>
          <KPICard
            title="Ventas Mes Actual"
            value={`€${(totalSalesMonth / 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })}`}
            accent="rose"
          />
        </div>

        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <KPICard title="Pedidos Pendientes" value={pendingOrders} accent="red" />
        </div>

        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <KPICard
            title="Producto Más Vendido"
            value={topProduct?.name || 'N/A'}
            subtitle={topProduct ? `${topProduct.quantity} unid.` : undefined}
            accent="rose"
          />
        </div>

        <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <KPICard title="Tasa Devoluciones" value={`${returnRate.toFixed(1)}%`} accent="red" />
        </div>

        <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <KPICard
            title="Total Órdenes"
            value={
              (orderStatusDistribution.reduce((sum, item) => sum + item.value, 0) || 0).toString()
            }
            accent="rose"
          />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in" style={{ animationDelay: '0.5s' }}>
        <div className="transform transition-all duration-300 hover:scale-105">
          <SalesLineChart data={salesLast7Days} />
        </div>
        <div className="transform transition-all duration-300 hover:scale-105">
          <OrderStatusPieChart data={orderStatusDistribution} />
        </div>
      </div>

      <div className="transform transition-all duration-300 hover:scale-105 animate-fade-in" style={{ animationDelay: '0.7s' }}>
        <TopProductsBarChart data={topProducts} />
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-slide-up {
          animation: slideUp 0.6s ease-out forwards;
          opacity: 0;
        }

        .animate-fade-in {
          animation: fadeIn 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
