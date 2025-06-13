// URL encode the Supabase connection string
const originalUrl = "postgres://postgres:[#Thevault2436]@db.tepalkbwlyfknalwbmlg.supabase.co:6543/postgres";

// Extract components
const urlParts = originalUrl.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

if (urlParts) {
  const [, username, password, host, port, database] = urlParts;
  
  // Remove brackets and URL encode special characters
  const cleanPassword = password.replace(/^\[|\]$/g, '');
  const encodedPassword = encodeURIComponent(cleanPassword);
  
  const fixedUrl = `postgresql://${username}:${encodedPassword}@${host}:${port}/${database}`;
  
  console.log("Original URL:", originalUrl);
  console.log("Fixed URL:", fixedUrl);
  console.log("\nUpdate your Database_Url secret with the fixed URL above");
} else {
  console.log("Could not parse URL");
}