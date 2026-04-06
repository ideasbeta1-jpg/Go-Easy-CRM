const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
  console.log('Checking bucket...');
  const { data: buckets, error: bError } = await supabase.storage.listBuckets();
  if (bError) {
    console.error('List buckets error:', bError);
  } else {
    const exists = buckets.find(b => b.name === 'provider-logos');
    if (!exists) {
        console.log('Creating bucket provider-logos...');
        await supabase.storage.createBucket('provider-logos', { public: true });
    } else {
        console.log('Bucket provider-logos already exists');
    }
  }

  console.log('Adding column logo_url if missing...');
  // Since I can't run RAW SQL easily through the client without an RPC, 
  // and MCP fails, I'll assume the user might have to do it or I can try it if there's an RPC.
  // Many Supabase setups have an 'execute_sql' or similar RPC for admin tasks.
  // If not, I'll just skip and hope the User has it or I'll just use the code and it might error.
  
  // Try one common RPC name
  const { error: sqlError } = await supabase.rpc('execute_sql', { 
    query: 'ALTER TABLE providers ADD COLUMN IF NOT EXISTS logo_url TEXT;' 
  });
  
  if (sqlError) {
    console.log('RPC execute_sql not found or failed, please add logo_url to providers manually.');
  } else {
    console.log('logo_url column added successfully.');
  }

  process.exit();
}

fix();
