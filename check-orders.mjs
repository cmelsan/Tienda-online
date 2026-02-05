import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.PUBLIC_SUPABASE_ANON_KEY
);

async function checkOrders() {
  console.log('Checking orders table...');
  
  // Get all orders with guest_email
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, user_id, guest_email, customer_name')
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${orders.length} orders:`);
  orders.forEach(order => {
    console.log(`  - ID: ${order.id}, User: ${order.user_id}, Email: ${order.guest_email}, Name: ${order.customer_name}`);
  });

  // Check for the specific email
  const testEmail = 'melladosanchezclaudia@gmail.com';
  console.log(`\nSearching for email: ${testEmail}`);
  
  const { data: found } = await supabase
    .from('orders')
    .select('user_id, guest_email')
    .ilike('guest_email', testEmail);

  console.log(`Found ${found?.length || 0} records matching ${testEmail}`);
  if (found?.length > 0) {
    console.log('Match:', found[0]);
  }
}

checkOrders();
