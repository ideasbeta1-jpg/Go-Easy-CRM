require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const id = 'fb8406fe-fc86-4777-a187-8f9df3c4bfda';
  const { data, error } = await supabase
    .from('lead_notes')
    .select('*, profiles(full_name, avatar_url)')
    .eq('lead_id', id)
    .order('created_at', { ascending: false });

  console.log('Error:', error);
  console.log('Data:', data);
}

test();
