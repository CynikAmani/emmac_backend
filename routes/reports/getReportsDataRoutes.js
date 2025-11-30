import express from 'express';
import { connectDB } from '../../config/db/connect.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const db = await connectDB();
  
  try {
    // Rental Volume & Time Analysis
    const [totalRentals] = await db.query('SELECT COUNT(*) as total_rentals FROM car_rentals');
    const [rentalsThisYear] = await db.query('SELECT COUNT(*) as rentals_this_year FROM car_rentals WHERE YEAR(collection_datetime) = YEAR(CURDATE())');
    const [rentalsThisMonth] = await db.query('SELECT COUNT(*) as rentals_this_month FROM car_rentals WHERE YEAR(collection_datetime) = YEAR(CURDATE()) AND MONTH(collection_datetime) = MONTH(CURDATE())');
    const [avgRentalsPerMonth] = await db.query(`SELECT AVG(monthly_count) as avg_rentals_per_month FROM (SELECT MONTH(collection_datetime) as month, COUNT(*) as monthly_count FROM car_rentals WHERE YEAR(collection_datetime) = YEAR(CURDATE()) GROUP BY MONTH(collection_datetime)) as monthly_counts`);
    const [peakRentalMonth] = await db.query('SELECT MONTH(collection_datetime) as month, COUNT(*) as rental_count FROM car_rentals WHERE YEAR(collection_datetime) = YEAR(CURDATE()) GROUP BY MONTH(collection_datetime) ORDER BY rental_count DESC LIMIT 1');
    const [mostRentalsSingleDay] = await db.query('SELECT DATE(collection_datetime) as rental_date, COUNT(*) as rental_count FROM car_rentals GROUP BY DATE(collection_datetime) ORDER BY rental_count DESC LIMIT 1');

    // Rental Performance
    const [overdueCount] = await db.query('SELECT COUNT(*) as overdue_count FROM car_rentals WHERE actual_return_datetime IS NOT NULL AND actual_return_datetime > expected_return_datetime');
    const [onTimeCount] = await db.query('SELECT COUNT(*) as on_time_count FROM car_rentals WHERE actual_return_datetime IS NOT NULL AND actual_return_datetime <= expected_return_datetime');
    const [overdueRate] = await db.query(`SELECT ROUND((SUM(CASE WHEN actual_return_datetime > expected_return_datetime THEN 1 ELSE 0 END) * 100.0 / COUNT(CASE WHEN actual_return_datetime IS NOT NULL THEN 1 END)), 2) as overdue_rate_percentage FROM car_rentals WHERE actual_return_datetime IS NOT NULL`);

    // Fleet Utilization
    const [fleetUtilization] = await db.query('SELECT (SELECT COUNT(*) FROM car_details WHERE status = "Rented") as currently_rented, (SELECT COUNT(*) FROM car_details WHERE status = "Available") as available_cars');
    const [rentalDurationTrends] = await db.query('SELECT AVG(DATEDIFF(expected_return_datetime, collection_datetime)) as avg_rental_duration_days FROM car_rentals');
    const [frequentlyRentedVehicles] = await db.query('SELECT cd.id, cd.registration_number, cd.make, cd.model, COUNT(cr.id) as rental_count FROM car_rentals cr JOIN car_details cd ON cr.car_id = cd.id GROUP BY cd.id, cd.registration_number, cd.make, cd.model ORDER BY rental_count DESC LIMIT 5');

    // Popular Locations
    const [topPickupLocations] = await db.query('SELECT pick_up_location, COUNT(*) as location_count FROM car_rentals WHERE pick_up_location IS NOT NULL AND pick_up_location != "" GROUP BY pick_up_location ORDER BY location_count DESC LIMIT 5');
    const [topDestinations] = await db.query('SELECT destination, COUNT(*) as destination_count FROM car_rentals WHERE destination IS NOT NULL AND destination != "" GROUP BY destination ORDER BY destination_count DESC LIMIT 5');

    const reportData = {
      rentalVolumeTimeAnalysis: {
        totalRentalsToDate: totalRentals[0].total_rentals,
        totalRentalsThisYear: rentalsThisYear[0].rentals_this_year,
        totalRentalsThisMonth: rentalsThisMonth[0].rentals_this_month,
        averageRentalsPerMonth: parseFloat(avgRentalsPerMonth[0].avg_rentals_per_month || 0),
        peakRentalMonth: peakRentalMonth[0] || { month: null, rental_count: 0 },
        mostRentalsInSingleDay: mostRentalsSingleDay[0] || { rental_date: null, rental_count: 0 }
      },
      rentalPerformance: {
        rentalsReturnedOverdue: overdueCount[0].overdue_count,
        rentalsReturnedOnTime: onTimeCount[0].on_time_count,
        overdueRatePercentage: parseFloat(overdueRate[0].overdue_rate_percentage || 0)
      },
      fleetUtilization: {
        carsCurrentlyRented: fleetUtilization[0].currently_rented,
        carsAvailable: fleetUtilization[0].available_cars,
        rentalDurationTrends: {
          averageRentalDurationDays: parseFloat(rentalDurationTrends[0].avg_rental_duration_days || 0)
        },
        mostFrequentlyRentedVehicles: frequentlyRentedVehicles
      },
      popularLocations: {
        topPickUpLocations: topPickupLocations,
        topDestinations: topDestinations
      }
    };

    res.json({
      success: true,
      data: reportData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Reports generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate reports',
      error: error.message
    });
  }
});

export default router; 