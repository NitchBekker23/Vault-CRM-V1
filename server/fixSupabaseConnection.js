// Fix Supabase connection string format
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

// Extract project reference from Supabase URL
const url = new URL(supabaseUrl);
const projectRef = url.hostname.split('.')[0];

// Create proper Supabase connection string for Neon driver
const correctDbUrl = `postgresql://postgres:[YOUR-PASSWORD]@db.${projectRef}.supabase.com:5432/postgres`;

console.log('Current connection failing due to incorrect format');
console.log('The connection string needs your actual Supabase database password, not the anon key');
console.log('');
console.log('To fix this:');
console.log('1. Go to your Supabase Dashboard');
console.log('2. Click "Connect" in the top toolbar');
console.log('3. Copy the "Connection string" under "Transaction pooler"');
console.log('4. Replace [YOUR-PASSWORD] with your actual database password');
console.log('5. Update DATABASE_URL in Replit Secrets');
console.log('');
console.log('Example format:');
console.log(`postgresql://postgres.${projectRef}:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres`);
console.log('');
console.log('For now, reverting to your working Neon database...');