
const { drizzle } = require("drizzle-orm/postgres-js");
const postgres = require("postgres");

// Use the same DATABASE_URL from your environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const sql = postgres(connectionString);
const db = drizzle(sql);

async function createLeadTables() {
  try {
    console.log("Creating lead management tables...");

    // Create leads table
    await sql`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR NOT NULL,
        last_name VARCHAR NOT NULL,
        email VARCHAR,
        phone VARCHAR,
        company VARCHAR,
        position VARCHAR,
        location VARCHAR,
        lead_source VARCHAR NOT NULL,
        lead_status VARCHAR DEFAULT 'new' NOT NULL CHECK (lead_status IN ('new', 'contacted', 'appointment', 'outcome')),
        outcome VARCHAR CHECK (outcome IN ('won', 'lost', 'wishlist')),
        estimated_value NUMERIC(10, 2),
        notes TEXT,
        is_open BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_contact_date TIMESTAMP,
        next_follow_up TIMESTAMP,
        assigned_to VARCHAR REFERENCES users(id),
        created_by VARCHAR NOT NULL REFERENCES users(id)
      )
    `;

    // Create lead activity log table
    await sql`
      CREATE TABLE IF NOT EXISTS lead_activity_log (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER NOT NULL REFERENCES leads(id),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        action VARCHAR NOT NULL,
        from_status VARCHAR,
        to_status VARCHAR,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log("✅ Lead management tables created successfully!");

    // Insert sample lead data
    await sql`
      INSERT INTO leads (
        first_name, last_name, email, phone, company, position, 
        location, lead_source, lead_status, estimated_value, 
        notes, created_by
      ) VALUES 
      ('John', 'Smith', 'john.smith@techsolutions.com', '+27 82 123 4567', 
       'Tech Solutions Ltd', 'CEO', 'Cape Town', 'Website', 'new', 150000, 
       'Interested in luxury watches for executive team', 
       (SELECT id FROM users WHERE email = 'nitchbekker@gmail.com' LIMIT 1)),
      ('Sarah', 'Johnson', 'sarah.j@corporategroup.com', '+27 83 987 6543', 
       'Corporate Group', 'Marketing Director', 'Johannesburg', 'Referral', 'contacted', 75000, 
       'Looking for corporate gifts - luxury pens and leather goods', 
       (SELECT id FROM users WHERE email = 'nitchbekker@gmail.com' LIMIT 1)),
      ('Michael', 'Brown', 'michael.brown@innovations.co.za', '+27 84 555 0123', 
       'Innovation Corp', 'CTO', 'Durban', 'Cold Call', 'appointment', 200000, 
       'Meeting scheduled for next week - interested in Rolex collection', 
       (SELECT id FROM users WHERE email = 'nitchbekker@gmail.com' LIMIT 1))
      ON CONFLICT DO NOTHING
    `;

    console.log("✅ Sample lead data inserted!");

  } catch (error) {
    console.error("Error creating lead tables:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

createLeadTables();
