import express from 'express';
import moment from 'moment';
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

  const [delayData] = await db.execute(`
    SELECT 
      expected_return_datetime,
      actual_return_datetime,
      TIMESTAMPDIFF(SECOND, expected_return_datetime, actual_return_datetime) as delay_seconds
    FROM car_rentals 
    WHERE actual_return_datetime IS NOT NULL 
      AND actual_return_datetime > expected_return_datetime
  `);

  // Calculate average delay using moment for better accuracy
  let averageDelay = { days: 0, hours: 0, formatted: "0 days 0 hours" };
  
  if (delayData.length > 0) {
    const totalDelaySeconds = delayData.reduce((sum, row) => {
      return sum + row.delay_seconds;
    }, 0);
    
    const avgDelaySeconds = totalDelaySeconds / delayData.length;
    const duration = moment.duration(avgDelaySeconds, 'seconds');
    
    const days = Math.floor(duration.asDays());
    const hours = Math.floor(duration.asHours() % 24);
    
    averageDelay = {
      days: days,
      hours: hours,
      formatted: `${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`
    };
  }

  return {
    active_rentals: rentalStatus[0].active_rentals,
    overdue_rentals: rentalStatus[0].overdue_rentals,
    resolved_rentals: rentalStatus[0].resolved_rentals,
    average_delay: averageDelay
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
  const currentDate = moment();
  const currentMonthStart = currentDate.startOf('month').format('YYYY-MM-DD');
  const today = currentDate.format('YYYY-MM-DD');

  const [dailyRentals] = await db.execute(`
    SELECT DATE(collection_datetime) as day, COUNT(*) as rentals
    FROM car_rentals 
    WHERE DATE(collection_datetime) BETWEEN ? AND ?
    GROUP BY DATE(collection_datetime)
    HAVING rentals > 0
    ORDER BY day
  `, [currentMonthStart, today]);

  const [previousMonth] = await db.execute(`
    SELECT COUNT(*) as total
    FROM car_rentals 
    WHERE YEAR(collection_datetime) = YEAR(CURDATE() - INTERVAL 1 MONTH)
      AND MONTH(collection_datetime) = MONTH(CURDATE() - INTERVAL 1 MONTH)
  `);

  return {
    current_month: currentDate.format('YYYY-MM'),
    daily_rentals: dailyRentals,
    total_this_month: dailyRentals.reduce((sum, day) => sum + day.rentals, 0),
    previous_month_total: previousMonth[0].total || 0
  };
}

async function getLastRentalInfo(db) {
  const [lastRental] = await db.execute(`
    SELECT 
      MAX(collection_datetime) as last_rental_date
    FROM car_rentals
  `);

  if (!lastRental[0].last_rental_date) {
    return {
      time_elapsed: "No rentals yet",
      time_elapsed_hours: null,
      last_rental_date: null
    };
  }

  const lastRentalDate = moment(lastRental[0].last_rental_date);
  const now = moment();
  const duration = moment.duration(now.diff(lastRentalDate));
  
  const hours = Math.floor(duration.asHours());
  let timeElapsed;

  if (hours < 1) {
    const minutes = Math.floor(duration.asMinutes());
    if (minutes < 1) {
      timeElapsed = "Just now";
    } else {
      timeElapsed = `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
  } else if (hours < 24) {
    timeElapsed = `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(duration.asDays());
    timeElapsed = `${days} day${days !== 1 ? 's' : ''} ago`;
  }

  return {
    time_elapsed: timeElapsed,
    time_elapsed_hours: hours,
    last_rental_date: lastRental[0].last_rental_date
  };
}

export default router;