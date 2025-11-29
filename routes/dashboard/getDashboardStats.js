import express from 'express';
import { connectDB } from '../../config/db/connect.js';

const router = express.Router();

// GET /api/dashboard
router.get('/', async (req, res) => {
  let db;
  try {
    db = await connectDB();
    
    // Execute all queries in parallel for better performance
    const [
      quickStats,
      rentalsSummary,
      carUsage,
      monthlyTrend,
      lastRentalInfo
    ] = await Promise.all([
      getQuickStats(db),
      getRentalsSummary(db),
      getCarUsage(db),
      getMonthlyTrend(db),
      getLastRentalInfo(db)
    ]);

    res.json({
      status: "success",
      data: {
        quick_stats: quickStats,
        rentals_summary: rentalsSummary,
        car_usage: carUsage,
        monthly_trend: monthlyTrend,
        last_rental_info: lastRentalInfo
      }
    });

  } catch (error) {
    console.error('Dashboard route error:', error);
    res.status(500).json({
      status: "error",
      message: "Failed to load dashboard data"
    });
  }
});

// Helper functions
async function getQuickStats(db) {
  const [totalCars] = await db.execute(
    "SELECT COUNT(*) as total FROM car_details WHERE is_deleted = false"
  );

  const [carsByStatus] = await db.execute(
    `SELECT status, COUNT(*) as count 
     FROM car_details 
     WHERE is_deleted = false 
     GROUP BY status`
  );

  const [totalRentals] = await db.execute(
    "SELECT COUNT(*) as total FROM car_rentals"
  );

  const statusCounts = {
    available: 0,
    rented: 0,
    maintenance: 0,
    inactive: 0
  };

  carsByStatus.forEach(row => {
    statusCounts[row.status.toLowerCase()] = row.count;
  });

  return {
    total_cars: totalCars[0].total,
    available_cars: statusCounts.available,
    rented_cars: statusCounts.rented,
    maintenance_cars: statusCounts.maintenance,
    total_rentals: totalRentals[0].total
  };
}

async function getRentalsSummary(db) {
  const [rentalStatus] = await db.execute(`
    SELECT 
      COUNT(CASE WHEN actual_return_datetime IS NULL AND expected_return_datetime > NOW() THEN 1 END) as active_rentals,
      COUNT(CASE WHEN actual_return_datetime IS NULL AND expected_return_datetime < NOW() THEN 1 END) as overdue_rentals,
      COUNT(CASE WHEN actual_return_datetime IS NOT NULL THEN 1 END) as resolved_rentals
    FROM car_rentals
  `);

  const [avgDelay] = await db.execute(`
    SELECT AVG(TIMESTAMPDIFF(HOUR, expected_return_datetime, actual_return_datetime)) as avg_delay_hours
    FROM car_rentals 
    WHERE actual_return_datetime IS NOT NULL AND actual_return_datetime > expected_return_datetime
  `);

  return {
    active_rentals: rentalStatus[0].active_rentals,
    overdue_rentals: rentalStatus[0].overdue_rentals,
    resolved_rentals: rentalStatus[0].resolved_rentals,
    average_delay_hours: avgDelay[0].avg_delay_hours || 0
  };
}

async function getCarUsage(db) {
  const [mostUsed] = await db.execute(`
    SELECT c.id, c.registration_number, c.make, c.model, COUNT(r.id) as total_rentals
    FROM car_details c
    LEFT JOIN car_rentals r ON c.id = r.car_id
    WHERE c.is_deleted = false
    GROUP BY c.id
    ORDER BY total_rentals DESC
    LIMIT 1
  `);

  const [leastUsed] = await db.execute(`
    SELECT c.id, c.registration_number, c.make, c.model, COUNT(r.id) as total_rentals
    FROM car_details c
    LEFT JOIN car_rentals r ON c.id = r.car_id
    WHERE c.is_deleted = false
    GROUP BY c.id
    HAVING total_rentals > 0
    ORDER BY total_rentals ASC
    LIMIT 1
  `);

  return {
    most_used_car: mostUsed[0] || null,
    least_used_car: leastUsed[0] || null
  };
}

async function getMonthlyTrend(db) {
  const [dailyRentals] = await db.execute(`
    SELECT DATE(collection_datetime) as day, COUNT(*) as rentals
    FROM car_rentals 
    WHERE YEAR(collection_datetime) = YEAR(CURDATE()) 
      AND MONTH(collection_datetime) = MONTH(CURDATE())
    GROUP BY DATE(collection_datetime)
    ORDER BY day
  `);

  const [previousMonth] = await db.execute(`
    SELECT COUNT(*) as total
    FROM car_rentals 
    WHERE YEAR(collection_datetime) = YEAR(CURDATE() - INTERVAL 1 MONTH)
      AND MONTH(collection_datetime) = MONTH(CURDATE() - INTERVAL 1 MONTH)
  `);

  const currentMonth = new Date().toISOString().slice(0, 7);

  return {
    current_month: currentMonth,
    daily_rentals: dailyRentals,
    total_this_month: dailyRentals.reduce((sum, day) => sum + day.rentals, 0),
    previous_month_total: previousMonth[0].total || 0
  };
}

async function getLastRentalInfo(db) {
  const [lastRental] = await db.execute(`
    SELECT 
      MAX(collection_datetime) as last_rental_date,
      TIMESTAMPDIFF(HOUR, MAX(collection_datetime), NOW()) as hours_elapsed
    FROM car_rentals
  `);

  if (!lastRental[0].last_rental_date) {
    return {
      time_elapsed: "No rentals yet",
      time_elapsed_hours: null,
      last_rental_date: null
    };
  }

  const hours = lastRental[0].hours_elapsed;
  let timeElapsed;
  
  if (hours < 1) {
    timeElapsed = "Less than an hour ago";
  } else if (hours < 24) {
    timeElapsed = `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(hours / 24);
    timeElapsed = `${days} day${days > 1 ? 's' : ''} ago`;
  }

  return {
    time_elapsed: timeElapsed,
    time_elapsed_hours: hours,
    last_rental_date: lastRental[0].last_rental_date
  };
}

export default router;