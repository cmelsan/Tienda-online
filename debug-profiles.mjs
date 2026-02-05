import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugProfiles() {
  try {
    console.log('\n=== CHECKING PROFILES TABLE ===\n');

    // Get all profiles
    const { data: allProfiles, error: allError } = await supabase
      .from('profiles')
      .select('*');

    if (allError) {
      console.error('Error fetching all profiles:', allError);
    } else {
      console.log('Total profiles:', allProfiles?.length || 0);
      console.log('\nAll profiles:');
      if (allProfiles && allProfiles.length > 0) {
        allProfiles.forEach((profile, index) => {
          console.log(`\n${index + 1}. ID: ${profile.id}`);
          console.log(`   Email: "${profile.email}"`);
          console.log(`   Email length: ${profile.email?.length || 0}`);
          console.log(`   Email type: ${typeof profile.email}`);
          console.log(`   Other fields:`, Object.keys(profile).filter(k => k !== 'id' && k !== 'email'));
        });
      }
    }

    // Try searching with the specific email
    const testEmail = 'melladosanchezclaudia@gmail.com';
    console.log(`\n\n=== SEARCHING FOR "${testEmail}" ===\n`);

    // Method 1: ilike (case-insensitive like)
    const { data: ilike, error: ilikError } = await supabase
      .from('profiles')
      .select('id, email')
      .ilike('email', testEmail)
      .limit(1);

    console.log('Method 1 (ilike):', { success: !ilikError, count: ilike?.length || 0, error: ilikError?.message });

    // Method 2: exact match with eq
    const { data: exact, error: exactError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', testEmail)
      .limit(1);

    console.log('Method 2 (eq exact):', { success: !exactError, count: exact?.length || 0, error: exactError?.message });

    // Method 3: check if email column exists by selecting all and filtering
    const { data: all, error: allSelectError } = await supabase
      .from('profiles')
      .select('*')
      .limit(10);

    if (all && all.length > 0) {
      console.log('\nMethod 3 (manual filter):');
      const found = all.filter(p => p.email?.toLowerCase() === testEmail.toLowerCase());
      console.log('  Found:', found.length);
      if (found.length > 0) {
        console.log('  Match:', found[0]);
      }
    }

    // Method 4: List all column names
    if (all && all.length > 0) {
      console.log('\nTable columns:', Object.keys(all[0]));
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

debugProfiles();
