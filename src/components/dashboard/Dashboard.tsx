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
    </div>
  );
}
