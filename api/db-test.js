import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  try {
    // Neon uses DATABASE_URL by default
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    
    if (!databaseUrl) {
      // Debug: show what env vars are available
      const envVars = Object.keys(process.env).filter(key => 
        key.includes('DATABASE') || key.includes('POSTGRES') || key.includes('NEON')
      );
      
      return res.status(500).json({
        success: false,
        message: 'No database connection string found',
        availableEnvVars: envVars
      });
    }
    
    const sql = neon(databaseUrl);
    const result = await sql`SELECT NOW() as current_time`;
    
    return res.status(200).json({
      success: true,
      message: 'Database connection successful!',
      timestamp: result[0].current_time
    });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
}
