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
    <div className="space-y-12">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <KPICard
          title="Ventas Mes Actual"
          value={`€${(totalSalesMonth / 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })}`}
          icon="sales"
        />
        <KPICard title="Pedidos Pendientes" value={pendingOrders} icon="orders" />
        <KPICard
          title="Producto Más Vendido"
          value={topProduct?.name || 'N/A'}
          subtitle={topProduct ? `${topProduct.quantity} unid.` : undefined}
          icon="product"
        />
        <KPICard title="Tasa Devoluciones" value={`${returnRate.toFixed(1)}%`} icon="returns" />
        <KPICard
          title="Total Órdenes"
          value={
            (orderStatusDistribution.reduce((sum, item) => sum + item.value, 0) || 0).toString()
          }
          icon="total"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <SalesLineChart data={salesLast7Days} />
        <OrderStatusPieChart data={orderStatusDistribution} />
      </div>

      <div>
        <TopProductsBarChart data={topProducts} />
      </div>
    </div>
  );
}
