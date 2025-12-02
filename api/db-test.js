import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  try {
    // Test database connection
    const result = await sql`SELECT NOW() as current_time`;
    
    return res.status(200).json({
      success: true,
      message: 'Database connection successful!',
      timestamp: result.rows[0].current_time
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
