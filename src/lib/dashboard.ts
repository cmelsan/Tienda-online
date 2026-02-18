import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Get total sales for current month (only paid orders)
 */
export async function getTotalSalesMonth(): Promise<number> {
  const { data, error } = await supabase
    .from('orders')
    .select('total_amount')
    .eq('status', 'paid')
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

  if (error) {
    console.error('Error fetching monthly sales:', error);
    return 0;
  }

  return (data || []).reduce((sum, order) => sum + (order.total_amount || 0), 0);
}

/**
 * Get count of pending orders (awaiting_payment, paid, shipped)
 */
export async function getPendingOrdersCount(): Promise<number> {
  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .in('status', ['awaiting_payment', 'paid', 'shipped']);

  if (error) {
    console.error('Error fetching pending orders:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Get top selling product
 */
export async function getTopSellingProduct(): Promise<{ name: string; quantity: number } | null> {
  const { data, error } = await supabase
    .from('order_items')
    .select('product_id, quantity, products(name)')
    .order('quantity', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    console.error('Error fetching top product:', error);
    return null;
  }

  const item = data[0];
  const productName = item.products?.name || 'Unknown';
  const quantity = item.quantity || 0;

  return { name: productName, quantity };
}

/**
 * Get return rate percentage
 */
export async function getReturnRate(): Promise<number> {
  const { data: allOrders, error: errorAll } = await supabase
    .from('orders')
    .select('id, status');

  if (errorAll || !allOrders) {
    console.error('Error fetching orders:', errorAll);
    return 0;
  }

  const totalOrders = allOrders.length;
  if (totalOrders === 0) return 0;

  const returnedOrders = allOrders.filter(
    (o) => ['return_requested', 'returned', 'partially_returned', 'refunded', 'partially_refunded'].includes(o.status)
  ).length;

  return (returnedOrders / totalOrders) * 100;
}

/**
 * Get sales data for last 7 days (for line chart)
 */
export async function getSalesLast7Days(): Promise<Array<{ date: string; sales: number }>> {
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  const { data, error } = await supabase
    .from('orders')
    .select('created_at, total_amount')
    .eq('status', 'paid')
    .gte('created_at', last7Days.toISOString());

  if (error || !data) {
    console.error('Error fetching sales data:', error);
    return [];
  }

  // Group by date
  const groupedByDate = new Map<string, number>();

  data.forEach((order) => {
    const date = new Date(order.created_at).toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
    });

    const current = groupedByDate.get(date) || 0;
    groupedByDate.set(date, current + (order.total_amount || 0));
  });

  // Convert to array and sort by date
  const result = Array.from(groupedByDate, ([date, sales]) => ({
    date,
    sales: Math.round(sales / 100), // Convert cents to euros
  }));

  // Fill missing dates
  const allDates: Array<{ date: string; sales: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });

    const existing = result.find((r) => r.date === dateStr);
    allDates.push({ date: dateStr, sales: existing?.sales || 0 });
  }

  return allDates;
}

/**
 * Get top 5 best-selling products
 */
export async function getTopProducts(): Promise<Array<{ name: string; quantity: number }>> {
  const { data, error } = await supabase
    .from('order_items')
    .select('product_id, quantity, products(name)')
    .order('quantity', { ascending: false })
    .limit(5);

  if (error || !data) {
    console.error('Error fetching top products:', error);
    return [];
  }

  return data.map((item) => ({
    name: item.products?.name || 'Unknown',
    quantity: item.quantity || 0,
  }));
}

/**
 * Get order status distribution (for donut chart)
 */
export async function getOrderStatusDistribution(): Promise<Array<{ name: string; value: number }>> {
  const { data, error } = await supabase.from('orders').select('status');

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
