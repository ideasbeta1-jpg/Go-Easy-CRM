const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if(!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars", {supabaseUrl, supabaseKey});
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getData() {
  const { data: categories, error: catErr } = await supabase.from('categories').select('*');
  const { count: vehiclesCount, error: vehErr } = await supabase.from('vehicles').select('*', { count: 'exact', head: true });
  
  console.log("CATEGORIES:", JSON.stringify(categories, null, 2));
  console.log("VEHICLES COUNT:", vehiclesCount);
}

getData();
