// Add this to your existing audit logs endpoint
import express from "express";
import { connectDB } from "../../config/db/connect.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const db = await connectDB();
  const { days } = req.query;
  
  try {
    let dateFilter = "";
    const params = [];
    
    if (days && days !== 'all') {
      const daysNum = parseInt(days);
      dateFilter = "AND al.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)";
      params.push(daysNum);
    }
    
    const [auditLogs] = await db.query(`
      SELECT 
        al.id,
        al.actor_id,
        CONCAT(u.first_name, ' ', u.last_name) AS actor_name,
        u.user_type AS actor_role,
        al.action,
        al.description,
        al.entity_type,
        al.entity_id,
        DATE_FORMAT(al.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
      FROM audit_logs al
      LEFT JOIN users u ON al.actor_id = u.id
      WHERE al.entity_type IN ('Rental', 'Rental Issue')
      ${dateFilter}
      ORDER BY al.created_at DESC
    `, params);
    
    if (auditLogs.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No audit logs found"
      });
    }
    
    const formattedLogs = auditLogs.map(log => ({
      id: log.id,
      actor_name: log.actor_name || 'Unknown User',
      actor_role: log.actor_role,
      action: log.action,
      description: log.description,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      created_at: log.created_at
    }));
    
    return res.status(200).json({
      success: true,
      data: formattedLogs,
      count: formattedLogs.length
    });
    
  } catch (err) {
    console.error("❌ Get audit logs error:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch audit logs",
      details: err.message
    });
  }
});

export default router;