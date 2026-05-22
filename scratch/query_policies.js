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
  console.log('Querying pg_policies on leads...');
  const { data, error } = await supabase.rpc('execute_sql', {
    query: "SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'leads';"
  });

  if (error) {
    console.error('Failed to run query via execute_sql RPC:', error);
  } else {
    console.log('Policies on leads table:');
    console.log(JSON.stringify(data, null, 2));
  }

  console.log('\nQuerying pg_policies on messages...');
  const { data: msgData, error: msgError } = await supabase.rpc('execute_sql', {
    query: "SELECT schemaname, tablename, policyname, roles, cmd, qual FROM pg_policies WHERE tablename = 'messages';"
  });

  if (msgError) {
    console.error('Failed to run messages query:', msgError);
  } else {
    console.log('Policies on messages table:');
    console.log(JSON.stringify(msgData, null, 2));
  }
}

run();
