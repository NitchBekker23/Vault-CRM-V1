import fetch from 'node-fetch';

async function testSupabaseAPI() {
  console.log("Testing Supabase REST API connectivity...");
  
  // Try connecting via Supabase's REST API first
  const projectRef = "tepalkbwlyfknalwbmlg";
  const apiUrl = `https://${projectRef}.supabase.co/rest/v1/`;
  
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log("API Response status:", response.status);
    console.log("API connectivity:", response.ok ? "✅ Working" : "❌ Failed");
    
    // If API works, the issue is specifically with the database port
    if (response.ok) {
      console.log("Supabase API is accessible, database port may be blocked");
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("API test failed:", error.message);
    return false;
  }
}

async function checkDNSResolution() {
  console.log("Checking DNS resolution...");
  
  try {
    const response = await fetch('https://db.tepalkbwlyfknalwbmlg.supabase.co', {
      method: 'HEAD',
      timeout: 5000
    });
    console.log("DNS resolution: ✅ Working");
    return true;
  } catch (error) {
    console.error("DNS resolution: ❌ Failed -", error.message);
    return false;
  }
}

async function diagnosticTest() {
  console.log("Running Supabase connectivity diagnostics...");
  
  const dnsOk = await checkDNSResolution();
  const apiOk = await testSupabaseAPI();
  
  if (!dnsOk) {
    console.log("\n🔍 Issue: DNS resolution failed");
    console.log("Solutions:");
    console.log("1. Check if Supabase project is paused");
    console.log("2. Verify project URL is correct");
    console.log("3. Try creating a new project in different region");
  } else if (dnsOk && !apiOk) {
    console.log("\n🔍 Issue: DNS works but API fails");
    console.log("Solutions:");
    console.log("1. Check project status in Supabase dashboard");
    console.log("2. Verify project is fully initialized");
  } else {
    console.log("\n🔍 Issue: API works but database port blocked");
    console.log("Solutions:");
    console.log("1. Use different connection pooler port");
    console.log("2. Try direct connection port 5432");
  }
}

diagnosticTest();