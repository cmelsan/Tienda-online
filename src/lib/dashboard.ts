import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Todos los estados que implican que el pedido fue pagado
const PAID_STATUSES = [
  'paid',
  'shipped',
  'delivered',
  'return_requested',
  'returned',
  'partially_returned',
  'refunded',
  'partially_refunded',
];

/**
 * Get total sales for current month (all statuses that were paid)
 */
export async function getTotalSalesMonth(): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const { data, error } = await supabase
    .from('orders')
    .select('total_amount')
    .in('status', PAID_STATUSES)
    .gte('created_at', startOfMonth);

  if (error) {
    console.error('Error fetching monthly sales:', error);
    return 0;
  }

  return (data || []).reduce((sum, order) => sum + (order.total_amount || 0), 0);
}

/**
 * Get count of pending orders: only 'paid' (confirmed payment, awaiting shipment)
 */
export async function getPendingOrdersCount(): Promise<number> {
  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'paid');

  if (error) {
    console.error('Error fetching pending orders:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Get top selling product (sum of quantities across all order_items)
 */
export async function getTopSellingProduct(): Promise<{ name: string; quantity: number } | null> {
  // Only count items from paid/fulfilled orders
  const { data: paidOrderIds } = await supabase
    .from('orders')
    .select('id')
    .in('status', PAID_STATUSES);
  const ids = (paidOrderIds || []).map((o: any) => o.id);

  const { data, error } = ids.length > 0
    ? await supabase
        .from('order_items')
        .select('product_id, quantity, products(name)')
        .in('order_id', ids)
    : { data: [], error: null };

  if (error || !data || data.length === 0) {
    console.error('Error fetching top product:', error);
    return null;
  }

  // Aggregate quantity per product
  const totals = new Map<string, { name: string; quantity: number }>();
  data.forEach((item) => {
    const pid = item.product_id as string;
    const name = (item.products as any)?.name || (item.products as any)?.[0]?.name || 'Desconocido';
    const qty = item.quantity || 0;
    const prev = totals.get(pid);
    totals.set(pid, { name, quantity: (prev?.quantity || 0) + qty });
  });

  if (totals.size === 0) return null;

  // Find the one with highest total quantity
  return [...totals.values()].reduce((best, cur) => cur.quantity > best.quantity ? cur : best);
}

/**
 * Get return rate percentage
 */
export async function getReturnRate(): Promise<number> {
  const { data: allOrders, error: errorAll } = await supabase
    .from('orders')
    .select('id, status')
    .in('status', PAID_STATUSES.concat(['cancelled']));

  if (errorAll || !allOrders) {
    console.error('Error fetching orders:', errorAll);
    return 0;
  }

  // Exclude awaiting_payment from denominator — those are not confirmed sales
  const totalOrders = allOrders.length;
  if (totalOrders === 0) return 0;

  const returnedOrders = allOrders.filter(
    (o) => ['return_requested', 'returned', 'partially_returned', 'refunded', 'partially_refunded'].includes(o.status)
  ).length;

  return (returnedOrders / totalOrders) * 100;
}

/**
 * Get sales data for last 7 days (for line chart)
 * Uses UTC dates to avoid timezone mismatches with Supabase
 */
export async function getSalesLast7Days(): Promise<Array<{ date: string; sales: number }>> {
  // Start of 7 days ago in UTC
  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() - 6);
  startDate.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('orders')
    .select('created_at, total_amount')
    .in('status', PAID_STATUSES)
    .gte('created_at', startDate.toISOString());

  if (error || !data) {
    console.error('Error fetching sales data:', error);
    return [];
  }

  // Group by UTC date string (YYYY-MM-DD) to avoid timezone issues
  const groupedByDate = new Map<string, number>();
  data.forEach((order) => {
    const d = new Date(order.created_at);
    // Use UTC date parts to match Supabase stored UTC timestamps
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    groupedByDate.set(key, (groupedByDate.get(key) || 0) + (order.total_amount || 0));
  });

  // Build last 7 days array (today included)
  const allDates: Array<{ date: string; sales: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    d.setUTCHours(0, 0, 0, 0);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    // Label legible: "22 feb"
    const label = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    allDates.push({ date: label, sales: Math.round((groupedByDate.get(key) || 0) / 100) });
  }

  return allDates;
}

/**
 * Get top 5 best-selling products (real aggregated totals)
 */
export async function getTopProducts(): Promise<Array<{ name: string; quantity: number }>> {
  // Only count items from paid/fulfilled orders
  const { data: paidOrderIds } = await supabase
    .from('orders')
    .select('id')
    .in('status', PAID_STATUSES);
  const ids = (paidOrderIds || []).map((o: any) => o.id);

  const { data, error } = ids.length > 0
    ? await supabase
        .from('order_items')
        .select('product_id, quantity, products(name)')
        .in('order_id', ids)
    : { data: [], error: null };

  if (error || !data) {
    console.error('Error fetching top products:', error);
    return [];
  }

  // Aggregate quantity per product
  const totals = new Map<string, { name: string; quantity: number }>();
  data.forEach((item) => {
    const pid = item.product_id as string;
    const name = (item.products as any)?.name || (item.products as any)?.[0]?.name || 'Desconocido';
    const qty = item.quantity || 0;
    const prev = totals.get(pid);
    totals.set(pid, { name, quantity: (prev?.quantity || 0) + qty });
  });

  // Sort by total quantity descending, take top 5
  return [...totals.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
}

/**
 * Get order status distribution (for donut chart)
 */
export async function getOrderStatusDistribution(): Promise<Array<{ name: string; value: number }>> {
  const { data, error } = await supabase
    .from('orders')
    .select('status')
    .not('status', 'eq', 'awaiting_payment');

  if (error || !data) {
    console.error('Error fetching order status:', error);
    return [];
  }

  const statusMap = new Map<string, number>();
  data.forEach((order) => {
    const status = order.status;
    statusMap.set(status, (statusMap.get(status) || 0) + 1);
  });

  const statusLabels: Record<string, string> = {
    awaiting_payment: 'Esperando Pago',
    paid: 'Pagado',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    return_requested: 'Devolución Solicitada',
    returned: 'Devuelto',
    partially_returned: 'Parcialmente Devuelto',
    refunded: 'Reembolsado',
    partially_refunded: 'Reembolso Parcial',
  };

  return Array.from(statusMap, ([status, value]) => ({
    name: statusLabels[status] || status,
    value,
  })).filter((item) => item.value > 0); // Only show statuses with orders
}
