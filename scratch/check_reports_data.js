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

async function checkReportsData() {
  console.log('Fetching leads from Supabase...');
  const { data: leads, error: leadsErr } = await supabase
    .from('leads')
    .select(`
      id,
      created_at,
      status,
      total_amount,
      source
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (leadsErr) {
    console.error('Error fetching leads:', leadsErr);
    return;
  }

  console.log(`Successfully fetched ${leads.length} active leads.`);
  if (leads.length === 0) {
    console.log('No leads found in database.');
    return;
  }

  console.log('\nAnalyzing leads created_at dates:');
  const leadDates = leads.map(l => new Date(l.created_at));
  const minDate = new Date(Math.min(...leadDates));
  const maxDate = new Date(Math.max(...leadDates));
  console.log(`- Oldest lead created_at: ${minDate.toISOString()} (${minDate.toString()})`);
  console.log(`- Newest lead created_at: ${maxDate.toISOString()} (${maxDate.toString()})`);

  // Print first 5 and last 5
  console.log('\nOldest 5 leads:');
  leads.slice(0, 5).forEach(l => {
    console.log(`  ID: ${l.id} | created_at: ${l.created_at} | Status: ${l.status}`);
  });

  console.log('\nNewest 5 leads:');
  leads.slice(-5).forEach(l => {
    console.log(`  ID: ${l.id} | created_at: ${l.created_at} | Status: ${l.status}`);
  });

  // Calculate stats for 30d range
  const now = new Date();
  const fromDate = new Date(now);
  fromDate.setDate(now.getDate() - 29);
  fromDate.setHours(0, 0, 0, 0);
  const toDate = new Date(now);
  toDate.setHours(23, 59, 59, 999);

  console.log(`\nLocal simulation for 30d range (${fromDate.toISOString()} to ${toDate.toISOString()}):`);
  const matchingLeads = leads.filter(l => {
    const d = new Date(l.created_at);
    return d >= fromDate && d <= toDate;
  });
  console.log(`- Matches: ${matchingLeads.length} leads`);

  // Let's print the actual timezone settings
  console.log('\nLocal system timezone info:');
  console.log(`- process.env.TZ: ${process.env.TZ}`);
  console.log(`- timezone offset: ${new Date().getTimezoneOffset()} minutes`);
}

checkReportsData();
