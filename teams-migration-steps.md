# Teams Migration - Step by Step

## Immediate Steps

### 1. Fork to Teams Account
- Click the three dots menu (⋯) in your current Repl
- Select "Fork"
- Choose your Teams account as destination
- Name it "The Vault CRM" or similar

### 2. Configure Environment Variables in Teams
After forking, add these secrets in your Teams Repl:

```
DATABASE_URL=your_supabase_connection_string
BREVO_API_KEY=your_brevo_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Update Teams Domain Configuration
The forked project will need the Teams domain updated for authentication.

### 4. Test Functionality
- Database connectivity
- User authentication
- File uploads
- CSV import system

## Data Preservation
Your Supabase database remains intact - all inventory, users, and sales data transfers automatically since it's cloud-hosted.

## Next Steps After Fork
1. Test the application in Teams environment
2. Verify all features work correctly
3. Update any Teams-specific configurations
4. Begin using the Teams version as your primary development environment