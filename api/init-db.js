import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  try {
    const databaseUrl = process.env.sal_DB_DATABASE_URL || 
                        process.env.sal_DB_POSTGRES_URL ||
                        process.env.DATABASE_URL || 
                        process.env.POSTGRES_URL;
    
    if (!databaseUrl) {
      return res.status(500).json({
        success: false,
        message: 'No database connection string found'
      });
    }
    
    const sql = neon(databaseUrl);
    
    // Create projects table
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        excel_data JSONB,
        sal_tables JSONB,
        company_data JSONB
      )
    `;
    
    return res.status(200).json({
      success: true,
      message: 'Database tables created successfully!'
    });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create database tables',
      error: error.message
    });
  }
}
