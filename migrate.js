const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function run() {
  const envContent = fs.readFileSync('./apps/admin/.env.local', 'utf8');
  const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
  const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
  const serviceKeyMatch = envContent.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/);
  
  if (!urlMatch || !keyMatch) {
    console.error('Env not found');
    return;
  }
  const supabase = createClient(urlMatch[1].trim(), serviceKeyMatch ? serviceKeyMatch[1].trim() : keyMatch[1].trim());
  const sql = fs.readFileSync('./supabase/migrations/00033_add_manual_order_rpc.sql', 'utf8');
  console.log('Running SQL...');
  
  const p1 = await supabase.rpc('run_sql', { sql });
  console.log('run_sql:', p1.error);
  
  if (p1.error && p1.error.message.includes('Could not find the function')) {
    const p2 = await supabase.rpc('exec_sql', { sql_string: sql });
    console.log('exec_sql:', p2.error);
  }
  console.log('Done');
}
run();
