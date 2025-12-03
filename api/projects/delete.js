import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
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
    
    await sql`
      DELETE FROM projects
      WHERE id = ${id}
    `;
    
    return res.status(200).json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete project',
      error: error.message
    });
  }
}
