import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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
    const { name, excelData, salTables, companyData } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Project name is required'
      });
    }
    
    const result = await sql`
      INSERT INTO projects (name, excel_data, sal_tables, company_data, updated_at)
      VALUES (${name}, ${JSON.stringify(excelData)}, ${JSON.stringify(salTables)}, ${JSON.stringify(companyData)}, CURRENT_TIMESTAMP)
      RETURNING id, name, created_at, updated_at
    `;
    
    return res.status(200).json({
      success: true,
      message: 'Project saved successfully!',
      project: result[0]
    });
  } catch (error) {
    console.error('Save error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save project',
      error: error.message
    });
  }
}
