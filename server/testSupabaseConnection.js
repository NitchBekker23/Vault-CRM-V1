import postgres from 'postgres';

async function testSupabaseConnection() {
  console.log('Testing Supabase connection configuration...');
  
  if (!process.env.Database_Url) {
    console.log('❌ Database_Url not found');
    return false;
  }
  
  console.log('Connection string format check...');
  console.log('First 60 chars:', process.env.Database_Url.substring(0, 60) + '...');
  
  try {
    const url = new URL(process.env.Database_Url);
    console.log('Parsed hostname:', url.hostname);
    console.log('Parsed port:', url.port);
    
    if (url.hostname === 'postgres') {
      console.log('❌ Invalid hostname detected - connection string needs fixing');
      return false;
    }
    
    const sql = postgres(process.env.Database_Url, {
      ssl: { rejectUnauthorized: false },
      max: 1,
      connect_timeout: 10
    });
    
    const result = await sql`SELECT current_database(), current_user`;
    console.log('✅ Supabase connection successful');
    console.log('Database:', result[0].current_database);
    
    await sql.end();
    return true;
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    return false;
  }
}

testSupabaseConnection();