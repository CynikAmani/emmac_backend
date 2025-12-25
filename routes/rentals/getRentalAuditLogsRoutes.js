import express from "express";
import { connectDB } from "../../config/db/connect.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const db = await connectDB();
  const { filter } = req.body;

  try {
    let dateFilter = "";
    const params = [];

    const timeFilter = filter || "monthly";

    if (timeFilter !== "infinity") {
      let days = 30;

      if (timeFilter === "weekly") days = 7;
      if (timeFilter === "semester") days = 180;

      dateFilter = "AND al.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)";
      params.push(days);
    }

    const [auditLogs] = await db.query(
      `
      SELECT 
        al.id,
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
      `,
      params
    );

    return res.status(200).json({
      success: true,
      data: auditLogs,
      count: auditLogs.length,
      filter: timeFilter,
    });

  } catch (err) {
    console.error("❌ Get audit logs error:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch audit logs",
    });
  }
});

export default router;
