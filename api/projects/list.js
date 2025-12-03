import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

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
    
    const projects = await sql`
      SELECT id, name, created_at, updated_at
      FROM projects
      ORDER BY updated_at DESC
    `;
    
    return res.status(200).json({
      success: true,
      projects: projects
    });
  } catch (error) {
    console.error('List error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to list projects',
      error: error.message
    });
  }
}
