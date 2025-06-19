# Teams Migration - Project Context

## Current Status
- **Production System**: 4 users, 50+ inventory items
- **Database**: Supabase PostgreSQL with all business data
- **Features**: Complete inventory + sales management + CSV imports
- **Authentication**: Replit Auth (needs Teams domain update)

## Critical Issues Fixed
- ES module import errors in CSV processing
- Database schema mismatches for client creation
- Authentication session preservation
- Sales transaction validation

## Key Environment Variables Needed
```
DATABASE_URL=your_supabase_connection_string
BREVO_API_KEY=your_brevo_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Current Working Features
- ✅ Inventory management with cost prices
- ✅ Sales tracking with South African Rands (R)
- ✅ CSV bulk imports with validation
- ✅ Store and sales person attribution
- ✅ Client management with VIP status
- ✅ Role-based access control

## Known Issues to Address
- CSV import data format validation needs completion
- Teams domain authentication configuration
- File upload path verification

## Next Steps After Migration
1. Add environment variables
2. Test database connection
3. Verify authentication with Teams domain
4. Complete CSV import debugging

## User Preferences
- Simple, everyday language communication
- Focus on practical business functionality
- South African Rand currency throughout
- Authentic business data integration