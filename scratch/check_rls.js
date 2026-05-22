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

async function checkRLS() {
  const { data, error } = await supabase.rpc('get_policies_info'); // if it doesn't exist, we will use raw query via pg_policies
  
  if (error) {
    // Let's run a query on pg_policies using custom select (if service role has access, or maybe not through regular query builder since it's a catalog)
    // We can do it by running a sql query, but Supabase doesn't have a direct sql rpc unless we have an rpc defined.
    // Let's try running a direct query or checking other database config files if any.
    console.log('Error calling RPC (normal if get_policies_info not defined):', error);
  }

  // Let's query pg_policies using supabase.from or a generic sql rpc if present.
  const { data: policies, error: polError } = await supabase
    .from('pg_policies') // usually not exposed via API unless specifically allowed
    .select('*');

  if (polError) {
    console.log('Cannot query pg_policies directly via API (expected due to API restrictions):', polError.message);
  } else {
    console.log('Policies:', policies);
  }

  // Let's try to inspect migrations or schema to find RLS policies.
  // We can search the project for "policy" or "enable row level security"
}

checkRLS();
