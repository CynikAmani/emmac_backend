import express from 'express';
import { connectDB } from '../../../config/db/connect.js';

const router = express.Router();

// GET /api/getVehicleAuditLogs
router.get('/', async (req, res) => {
  try {
    const db = await connectDB();
    
    // Query to get audit logs with car details and user information
    const [logs] = await db.query(`
      SELECT 
        al.id,
        al.action,
        al.description,
        al.entity_type,
        al.entity_id,
        al.created_at,
        
        -- Car details (Make - Model (Reg Num))
        CONCAT(cd.make, ' - ', cd.model, ' (', cd.registration_number, ')') AS car_info,
        cd.registration_number,
        cd.make,
        cd.model,
        cd.color,
        
        -- User details (actor information)
        CONCAT(u.first_name, ' ', u.last_name) AS actor_name,
        u.first_name,
        u.last_name,
        u.user_type
      FROM audit_logs al
      
      -- Join with car_details for entity details (since we're only interested in cars)
      LEFT JOIN car_details cd ON al.entity_id = cd.id AND al.entity_type = 'Vehicle'
      
      -- Join with users for actor details
      LEFT JOIN users u ON al.actor_id = u.id
      WHERE al.entity_type = 'Vehicle'
      
      -- Order by most recent first
      ORDER BY al.created_at DESC
    `);

    res.json({
      success: true,
      count: logs.length,
      logs
    });

  } catch (err) {
    console.error('Get vehicle audit logs error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch vehicle audit logs' 
    });
  }
});

// Optional: GET /api/getVehicleAuditLogs/:carId
// To get audit logs for a specific vehicle
router.get('/:carId', async (req, res) => {
  const { carId } = req.params;

  if (!carId) {
    return res.status(400).json({ 
      success: false, 
      error: 'carId is required' 
    });
  }

  try {
    const db = await connectDB();
    
    const [logs] = await db.query(`
      SELECT 
        al.id,
        al.action,
        al.description,
        al.entity_type,
        al.entity_id,
        al.created_at,
        
        -- Car details (Make - Model (Reg Num))
        CONCAT(cd.make, ' - ', cd.model, ' (', cd.registration_number, ')') AS car_info,
        cd.registration_number,
        cd.make,
        cd.model,
        cd.color,
        
        -- User details (actor information)
        CONCAT(u.first_name, ' ', u.last_name) AS actor_name,
        u.first_name,
        u.last_name,
        u.user_type
      FROM audit_logs al
      
      LEFT JOIN car_details cd ON al.entity_id = cd.id AND al.entity_type = 'Vehicle'
      LEFT JOIN users u ON al.actor_id = u.id
      
      -- Filter for specific vehicle
      WHERE al.entity_type = 'Vehicle' AND al.entity_id = ?
      
      ORDER BY al.created_at DESC
    `, [carId]);

    res.json({
      success: true,
      count: logs.length,
      logs
    });

  } catch (err) {
    console.error('Get specific vehicle audit logs error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch vehicle audit logs' 
    });
  }
});

export default router;