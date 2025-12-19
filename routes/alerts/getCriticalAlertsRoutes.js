import express from 'express';
import { connectDB } from '../../config/db/connect.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const db = await connectDB();
    
    const alertCounts = await getMinimalAlertCounts(db);
    res.json(alertCounts);

  } catch (err) {
    console.error('Minimal alerts error:', err);
    res.status(500).json({ error: 'Failed to fetch alert counts' });
  }
});

const getMinimalAlertCounts = async (db) => {
  const [
    expiredInsuranceCount,
    expiringInsuranceCount,
    servicePastDueCount,
    serviceDueSoonCount
  ] = await Promise.all([
    getExpiredInsuranceCount(db),
    getExpiringInsuranceCount(db),
    getServicePastDueCount(db),
    getServiceDueSoonCount(db)
  ]);

  return {
    expiredInsurance: expiredInsuranceCount,
    expiringInsurance: expiringInsuranceCount,
    servicePastDue: servicePastDueCount,
    serviceDueSoon: serviceDueSoonCount,
    totalAlerts: expiredInsuranceCount + expiringInsuranceCount + servicePastDueCount + serviceDueSoonCount
  };
};

const getExpiredInsuranceCount = async (db) => {
  const [rows] = await db.query(`
    SELECT COUNT(*) as count
    FROM car_details 
    WHERE is_deleted = false 
      AND insurance_cof_expiry_date < CURDATE()
  `);
  return rows[0].count;
};

const getExpiringInsuranceCount = async (db) => {
  const [rows] = await db.query(`
    SELECT COUNT(*) as count
    FROM car_details 
    WHERE is_deleted = false 
      AND insurance_cof_expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
  `);
  return rows[0].count;
};

const getServicePastDueCount = async (db) => {
  const [rows] = await db.query(`
    SELECT COUNT(*) as count
    FROM car_details 
    WHERE is_deleted = false 
      AND next_service_mileage >= 5000
  `);
  return rows[0].count;
};

const getServiceDueSoonCount = async (db) => {
  const [rows] = await db.query(`
    SELECT COUNT(*) as count
    FROM car_details 
    WHERE is_deleted = false 
      AND next_service_mileage BETWEEN 4500 AND 4999
  `);
  return rows[0].count;
};

export default router;