import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.PUBLIC_SUPABASE_ANON_KEY
);

async function checkUsers() {
  // Check profiles
  console.log('\n=== PROFILES TABLE ===');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*');
  
  console.log(`Profiles count: ${profiles?.length || 0}`);
  if (profiles?.length) {
    profiles.forEach(p => {
      console.log(`  - ID: ${p.id}, Email: ${p.email}`);
    });
  }

  // Check newsletter
  console.log('\n=== NEWSLETTER_SUBSCRIBERS TABLE ===');
  const { data: newsletters } = await supabase
    .from('newsletter_subscribers')
    .select('email, subscribed_at')
    .order('subscribed_at', { ascending: false })
    .limit(5);

  console.log(`Found ${newsletters?.length || 0} newsletter subscribers:`);
  newsletters?.forEach(n => {
    console.log(`  - ${n.email} (${n.subscribed_at})`);
  });

  // Check orders with specific emails
  console.log('\n=== ORDERS WITH CUSTOMER EMAILS ===');
  const { data: orders } = await supabase
    .from('orders')
    .select('id, user_id, guest_email, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log(`Found ${orders?.length || 0} recent orders:`);
  orders?.forEach(o => {
    console.log(`  - Email: ${o.guest_email}, User ID: ${o.user_id}, Date: ${o.created_at}`);
  });

  // Check user_addresses
  console.log('\n=== USER_ADDRESSES TABLE ===');
  const { data: addresses } = await supabase
    .from('user_addresses')
    .select('user_id, address_type, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log(`Found ${addresses?.length || 0} user addresses:`);
  addresses?.forEach(a => {
    console.log(`  - User ID: ${a.user_id}, Type: ${a.address_type}`);
  });

  // Try to find the user from auth.users indirectly
  console.log('\n=== TRYING TO FIND AUTH.USERS ===');
  console.log('Looking for user with ID: 5b21fb46-c39b-4ba0-a819-f90f6d3b74e3');

  // This user placed multiple orders
  const { data: ordersForUser } = await supabase
    .from('orders')
    .select('guest_email, created_at')
    .eq('user_id', '5b21fb46-c39b-4ba0-a819-f90f6d3b74e3')
    .limit(1);

  if (ordersForUser?.length) {
    console.log(`  - Associated email (from orders): ${ordersForUser[0].guest_email}`);
  }
}

checkUsers();
