import postgres from 'postgres';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { execSync } = require('child_process');

async function testSupabaseAPI() {
  console.log("Testing Supabase API accessibility...");
  
  try {
    const response = await fetch('https://tepalkbwlyfknalwbmlg.supabase.co/rest/v1/', {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log(`API Status: ${response.status}`);
    if (response.status === 401) {
      console.log("✅ Supabase project is accessible (401 = authentication required)");
      return true;
    }
  } catch (error) {
    console.log(`❌ API test failed: ${error.message}`);
    return false;
  }
}

async function checkDNSResolution() {
  console.log("Testing DNS resolution for Supabase hosts...");
  
  const hosts = [
    'db.tepalkbwlyfknalwbmlg.supabase.co',
    'aws-0-us-east-1.pooler.supabase.com',
    'supabase.com'
  ];
  
  for (const host of hosts) {
    try {
      execSync(`nslookup ${host}`, { encoding: 'utf8', timeout: 5000 });
      console.log(`✅ ${host} resolves correctly`);
    } catch (error) {
      console.log(`❌ ${host} DNS resolution failed`);
    }
  }
}

async function diagnosticTest() {
  console.log("Running comprehensive Supabase connectivity test...\n");
  
  await testSupabaseAPI();
  await checkDNSResolution();
  
  console.log("\n📋 Connection String Requirements:");
  console.log("Format should be: postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres");
  console.log("Or direct: postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres");
  console.log("\nEnsure you're using the exact connection string from Supabase Dashboard → Database → Connection string (URI tab)");
}

diagnosticTest();