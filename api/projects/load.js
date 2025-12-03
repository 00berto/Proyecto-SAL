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
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }
    
    const result = await sql`
      SELECT id, name, created_at, updated_at, excel_data, sal_tables, company_data
      FROM projects
      WHERE id = ${id}
    `;
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      project: result[0]
    });
  } catch (error) {
    console.error('Load error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load project',
      error: error.message
    });
  }
}
