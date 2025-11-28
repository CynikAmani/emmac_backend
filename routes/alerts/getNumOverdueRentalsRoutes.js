import express from 'express';
import { connectDB } from '../../config/db/connect.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const db = await connectDB();
    
    const overdueRentalsCount = await getOverdueRentalsCount(db);
    res.json(overdueRentalsCount);

  } catch (err) {
    console.error('Overdue rentals error:', err);
    res.status(500).json({ error: 'Failed to fetch overdue rentals count' });
  }
});

const getOverdueRentalsCount = async (db) => {
  const [rows] = await db.query(`
    SELECT COUNT(*) as count
    FROM car_rentals 
    WHERE status != 'resolved' 
      AND expected_return_datetime < NOW()
      AND actual_return_datetime IS NULL
  `);
  
  return {
    overdueRentals: rows[0].count
  };
};

export default router;