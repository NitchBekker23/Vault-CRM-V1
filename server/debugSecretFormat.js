async function debugConnectionString() {
  console.log("Debugging Database_Url secret...");
  
  if (!process.env.Database_Url) {
    console.log("❌ Database_Url not found in environment");
    return;
  }
  
  const raw = process.env.Database_Url;
  console.log("Raw length:", raw.length);
  console.log("First 80 chars:", raw.substring(0, 80));
  console.log("Contains supabase.co:", raw.includes('supabase.co'));
  console.log("Contains db.tepalkbw:", raw.includes('db.tepalkbw'));
  
  // Check for hidden characters or encoding issues
  console.log("Encoded first 80:", encodeURIComponent(raw.substring(0, 80)));
  
  // Try manual URL parsing
  try {
    const url = new URL(raw);
    console.log("Parsed hostname:", url.hostname);
    console.log("Parsed port:", url.port);
    console.log("Parsed pathname:", url.pathname);
  } catch (error) {
    console.log("URL parsing error:", error.message);
  }
  
  // Test if it contains the expected Supabase format
  const expectedPattern = /postgresql:\/\/postgres:[^@]+@db\.tepalkbwlyfknalwbmlg\.supabase\.co:5432\/postgres/;
  const matches = expectedPattern.test(raw);
  console.log("Matches expected pattern:", matches);
}

debugConnectionString();