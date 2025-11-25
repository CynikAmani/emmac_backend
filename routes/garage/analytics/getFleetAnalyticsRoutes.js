import express from 'express';
import { connectDB } from '../../../config/db/connect.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const db = await connectDB();
    
    const analytics = await getEssentialAnalytics(db);
    res.json(analytics);

  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

const getEssentialAnalytics = async (db) => {
  const [
    fleetOverview,
    urgentAlerts,
    systemHealth,
    safetyCompliance,
    serviceAlerts
  ] = await Promise.all([
    getFleetOverview(db),
    getUrgentAlerts(db),
    getSystemHealth(db),
    getSafetyCompliance(db),
    getServiceAlerts(db)
  ]);

  return {
    fleetOverview,
    urgentAlerts,
    systemHealth,
    safetyCompliance,
    serviceAlerts
  };
};

const getFleetOverview = async (db) => {
  const [rows] = await db.query(`
    SELECT 
      COUNT(*) as totalCars,
      SUM(status = 'Available') as available,
      SUM(status = 'Rented') as rented,
      SUM(status = 'Maintenance') as maintenance,
      ROUND((SUM(status = 'Rented') / COUNT(*)) * 100, 1) as utilizationRate
    FROM car_details 
    WHERE is_deleted = false
  `);
  return rows[0];
};

const getServiceAlerts = async (db) => {
  const [dueForServiceRows] = await db.query(`
    SELECT 
      id, registration_number, make, model, color, fuel_type, 
      mileage, engine_capacity, last_service_date, insurance_cof_expiry_date,
      next_service_mileage, status, status_description,
      has_jack, has_wheel_spanner, has_fire_extinguisher, has_triangles, has_spare_tyre,
      air_conditioner_working, radio_working, lights_working, windows_working, doors_working,
      created_at, updated_at
    FROM car_details 
    WHERE is_deleted = false 
      AND next_service_mileage >= 5000
  `);

  const [serviceSoonRows] = await db.query(`
    SELECT 
      id, registration_number, make, model, color, fuel_type, 
      mileage, engine_capacity, last_service_date, insurance_cof_expiry_date,
      next_service_mileage, status, status_description,
      has_jack, has_wheel_spanner, has_fire_extinguisher, has_triangles, has_spare_tyre,
      air_conditioner_working, radio_working, lights_working, windows_working, doors_working,
      created_at, updated_at
    FROM car_details 
    WHERE is_deleted = false 
      AND next_service_mileage >= 4500 
      AND next_service_mileage < 5000
  `);

  return {
    dueForService: {
      count: dueForServiceRows.length,
      cars: dueForServiceRows.map(car => ({
        car_id: car.id,
        make: car.make,
        model: car.model,
        registration_number: car.registration_number,
        mileage: car.mileage,
        next_service_mileage: car.next_service_mileage,
        serviceStatus: 'Due',
        mileageRemaining: 0,
        alertLevel: 'high'
      }))
    },
    serviceSoon: {
      count: serviceSoonRows.length,
      cars: serviceSoonRows.map(car => ({
        car_id: car.id,
        make: car.make,
        model: car.model,
        registration_number: car.registration_number,
        mileage: car.mileage,
        next_service_mileage: car.next_service_mileage,
        serviceStatus: 'Soon',
        mileageRemaining: 5000 - car.next_service_mileage,
        alertLevel: 'medium'
      }))
    }
  };
};

const getUrgentAlerts = async (db) => {
  const moment = (await import('moment')).default;
  const currentDate = moment();

  const [expiredRows] = await db.query(`
    SELECT id, make, model, registration_number, insurance_cof_expiry_date
    FROM car_details 
    WHERE is_deleted = false 
      AND insurance_cof_expiry_date < CURDATE()
  `);

  const [expiringRows] = await db.query(`
    SELECT id, make, model, registration_number, insurance_cof_expiry_date
    FROM car_details 
    WHERE is_deleted = false 
      AND insurance_cof_expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 45 DAY)
  `);

  const [safetyRows] = await db.query(`
    SELECT id, make, model, registration_number
    FROM car_details 
    WHERE is_deleted = false 
      AND (has_fire_extinguisher = false OR has_triangles = false)
  `);

  const expiredWithTime = expiredRows.map(car => ({
    car_id: car.id,
    make: car.make,
    model: car.model,
    registration_number: car.registration_number,
    insurance_cof_expiry_date: car.insurance_cof_expiry_date,
    daysElapsed: currentDate.diff(moment(car.insurance_cof_expiry_date), 'days'),
    timeElapsed: currentDate.to(moment(car.insurance_cof_expiry_date), true)
  }));

  const expiringWithTime = expiringRows.map(car => ({
    car_id: car.id,
    make: car.make,
    model: car.model,
    registration_number: car.registration_number,
    insurance_cof_expiry_date: car.insurance_cof_expiry_date,
    daysRemaining: moment(car.insurance_cof_expiry_date).diff(currentDate, 'days'),
    timeRemaining: currentDate.to(moment(car.insurance_cof_expiry_date))
  }));

  return {
    expiredInsurance: {
      count: expiredWithTime.length,
      cars: expiredWithTime
    },
    expiringSoon: {
      count: expiringWithTime.length,
      cars: expiringWithTime
    },
    criticalSafety: {
      count: safetyRows.length,
      cars: safetyRows.map(car => ({
        car_id: car.id,
        make: car.make,
        model: car.model,
        registration_number: car.registration_number
      }))
    }
  };
};

const getSystemHealth = async (db) => {
  const [healthStats] = await db.query(`
    SELECT
      ROUND(AVG(air_conditioner_working = true) * 100, 1) as acWorking,
      ROUND(AVG(lights_working = true) * 100, 1) as lightsWorking,
      ROUND(AVG(doors_working = true) * 100, 1) as doorsWorking
    FROM car_details 
    WHERE is_deleted = false
  `);

  const [problemRows] = await db.query(`
    SELECT id, make, model, registration_number,
           CONCAT_WS(', ',
             CASE WHEN air_conditioner_working = false THEN 'AC' END,
             CASE WHEN lights_working = false THEN 'Lights' END,
             CASE WHEN doors_working = false THEN 'Doors' END
           ) as issues
    FROM car_details 
    WHERE is_deleted = false
      AND (air_conditioner_working = false OR lights_working = false OR doors_working = false)
  `);

  return {
    ...healthStats[0],
    problemCars: problemRows.map(car => ({
      car_id: car.id,
      make: car.make,
      model: car.model,
      registration_number: car.registration_number,
      issues: car.issues
    }))
  };
};

const getSafetyCompliance = async (db) => {
  const [complianceStats] = await db.query(`
    SELECT
      ROUND(AVG(has_fire_extinguisher = true) * 100, 1) as fireExtinguisher,
      ROUND(AVG(has_triangles = true) * 100, 1) as triangles,
      ROUND(AVG(has_spare_tyre = true) * 100, 1) as spareTyre
    FROM car_details 
    WHERE is_deleted = false
  `);

  const [nonCompliantRows] = await db.query(`
    SELECT id, make, model, registration_number,
           CONCAT_WS(', ',
             CASE WHEN has_fire_extinguisher = false THEN 'Fire Extinguisher' END,
             CASE WHEN has_triangles = false THEN 'Triangles' END,
             CASE WHEN has_spare_tyre = false THEN 'Spare Tyre' END
           ) as missing
    FROM car_details 
    WHERE is_deleted = false
      AND (has_fire_extinguisher = false OR has_triangles = false OR has_spare_tyre = false)
  `);

  return {
    ...complianceStats[0],
    nonCompliantCars: nonCompliantRows.map(car => ({
      car_id: car.id,
      make: car.make,
      model: car.model,
      registration_number: car.registration_number,
      missing: car.missing
    }))
  };
};

export default router;