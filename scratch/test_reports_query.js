const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Credentials missing from .env.local!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Testing the page.tsx reports query...');
  const { data, error } = await supabase
    .from('leads')
    .select(`
      id,
      created_at,
      status,
      total_amount,
      agreed_daily_price,
      pickup_date,
      return_date,
      source,
      utm_source,
      utm_medium,
      utm_campaign,
      category_id,
      category:categories(id, name, daily_price, base_daily_cost),
      pickup_location_id,
      location:locations!leads_pickup_location_id_fkey(id, name),
      provider_id,
      provider:providers(id, name),
      assigned_to
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('QUERY FAILED!', error);
  } else {
    console.log(`QUERY SUCCEEDED! Fetched ${data.length} leads.`);
    if (data.length > 0) {
      console.log('Sample lead data:', JSON.stringify(data[0], null, 2));
    }
  }
}

run();
