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

async function checkAssignments() {
  // 1. Get all profiles
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('*');
  
  if (pErr) {
    console.error('Error fetching profiles:', pErr);
    return;
  }
  
  console.log('--- PROFILES ---');
  profiles.forEach(p => {
    console.log(`ID: ${p.id} | Name: ${p.full_name || p.first_name} | Role: ${p.role || 'N/A'}`);
  });

  // 2. Get leads stats grouped by assigned_to
  const { data: leads, error: lErr } = await supabase
    .from('leads')
    .select('id, assigned_to, status')
    .is('deleted_at', null);

  if (lErr) {
    console.log('Error fetching leads:', lErr);
    return;
  }

  console.log('\n--- LEADS ASSIGNMENT STATS ---');
  const stats = {};
  leads.forEach(l => {
    const key = l.assigned_to || 'unassigned';
    if (!stats[key]) stats[key] = { total: 0, statusBreakdown: {} };
    stats[key].total += 1;
    stats[key].statusBreakdown[l.status] = (stats[key].statusBreakdown[l.status] || 0) + 1;
  });

  Object.entries(stats).forEach(([agentId, data]) => {
    const profile = profiles.find(p => p.id === agentId);
    const name = agentId === 'unassigned' ? 'Unassigned' : (profile ? `${profile.full_name || profile.first_name} (ID: ${profile.id})` : `Unknown Agent (${agentId})`);
    console.log(`Agent: ${name}`);
    console.log(`  Total Leads: ${data.total}`);
    console.log(`  Status Breakdown:`, data.statusBreakdown);
  });
}

checkAssignments();
