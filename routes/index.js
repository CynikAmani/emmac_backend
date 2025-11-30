import express from 'express';
import { checkSession } from '../middleware/auth/checkSession.js'
import { checkAdmin } from '../middleware/auth/checkAdmin.js';

import loginRoutes from '../auth/login.js';
import addCarRoutes from './garage/add-cars/addCarRoutes.js';
import getAllCarsRoutes from './garage/get-cars/getAllCarsRoutes.js';
import getCarCompleteDetailsRoutes from './garage/get-cars/getCarCompleteDetailsRoutes.js';
import createUserRoutes from './users/admins/createUserRoutes.js';
import updateUserRoutes from './users/admins/updateUserRoutes.js';
import getUsersRoutes from './users/admins/getUsersRoutes.js';
import getUserDetailsRoutes from './users/admins/getUserDetailsRoutes.js';
import setPermissionsRoutes from './permissions/setPermissionsRoutes.js';
import getPermissionsRoutes from './permissions/getPermissionsRoutes.js';
import resetUserPasswordRoutes from './users/admins/resetUserPasswordRoutes.js';
import getUserPermissionsRoutes from './permissions/getUserPermissions.js';
import toggleAdministrativePermissionsRoutes from './permissions/toggleAdministrativePermissions.js';
import toggleActivationStatusRoutes from './users/admins/toggleActivationStatusRoutes.js';
import getUserProfileDetailsRoutes from './users/generic/getUserProfileDetailsRoutes.js';
import updatePasswordRoutes from './users/generic/updatePasswordRoutes.js';
import logout from '../auth/logout.js';
import getAvailableCarsRoutes from './garage/get-cars/getAvailableCarsRoutes.js';
import addOrUpdateRentalsRoutes from './rentals/addOrUpdateRentalsRoutes.js';
import getRentalsRoutes from './rentals/getRentalsRoutes.js';
import getRentalDetailsRoutes from './rentals/getRentalDetailsRoutes.js';
import getRentalRoutes from './rentals/getRentalRoutes.js';
import resolveRentalRoutes from './rentals/resolveRentalRoutes.js';
import getResolvedRentalsRoutes from './rentals/getResolvedRentalsRoutes.js';
import extendRentalRoutes from './rentals/extendRental.js';
import getFleetAnalyticsRoutes from './garage/analytics/getFleetAnalyticsRoutes.js';
import resetServiceMileageRoutes from './garage/analytics/resetServiceMileageRoutes.js';
import updateInsuranceCOFExpiryDateRoutes from './garage/analytics/updateInsuranceCOFExpiryDateRoutes.js';
import getCriticalAlertsRoutes from './alerts/getCriticalAlertsRoutes.js';
import getNumOverdueRentalsRoutes from './alerts/getNumOverdueRentalsRoutes.js';
import getDashboardStatsRoutes from './dashboard/getDashboardStats.js';
import getReportsDataRoutes from './reports/getReportsDataRoutes.js';


const router = express.Router();


//login routes
router.use('/api/login', loginRoutes);

//logout route
router.use('/api/logout', logout);


//dashboard routes
router.use('/api/getDashboardStats', checkSession, getDashboardStatsRoutes);


//users routes
router.use('/api/users/createUser', checkSession, checkAdmin, createUserRoutes);
router.use('/api/users/updateUser',checkSession, checkAdmin, updateUserRoutes);
router.use('/api/users/getUsers', checkSession, checkAdmin, getUsersRoutes);
router.use('/api/users/getUserDetails', checkSession, getUserDetailsRoutes);
router.use('/api/users/resetUserPassword', checkSession, checkAdmin, resetUserPasswordRoutes);
router.use('/api/users/toggleActivationStatus', checkSession, checkAdmin, toggleActivationStatusRoutes);
router.use('/api/users/profile', checkSession, getUserProfileDetailsRoutes);
router.use('/api/users/updatePassword', checkSession, updatePasswordRoutes);



//garage routes
router.use('/api/addCar', checkSession, addCarRoutes);
router.use('/api/getCarCollection', checkSession, getAllCarsRoutes);
router.use('/api/getCarDetails', checkSession, getCarCompleteDetailsRoutes);
router.use('/api/getAvailableCars', checkSession, getAvailableCarsRoutes);
router.use('/api/getFleetAnalytics', checkSession, getFleetAnalyticsRoutes);
router.use('/api/resetServiceMileage', checkSession, resetServiceMileageRoutes);
router.use('/api/updateInsuranceExpiryDate', checkSession, updateInsuranceCOFExpiryDateRoutes);



//permissions routes
router.use('/api/setPermissions', checkSession, checkAdmin, setPermissionsRoutes);
router.use('/api/getPermissions',checkSession, checkAdmin, getPermissionsRoutes);
router.use('/api/getUserPermissions',checkSession, checkAdmin, getUserPermissionsRoutes);
router.use('/api/toggleAdministrativePermissions', checkSession, checkAdmin, toggleAdministrativePermissionsRoutes);



//alerts routes
router.use('/api/getCriticalAlerts', checkSession, getCriticalAlertsRoutes);
router.use('/api/getNumOverdueRentals', checkSession, getNumOverdueRentalsRoutes);



//rentals routes
router.use('/api/addCarRental', checkSession, addOrUpdateRentalsRoutes);
router.use('/api/getRentals', checkSession, getRentalsRoutes);
router.use('/api/getRentalDetails', checkSession, getRentalDetailsRoutes);
router.use('/api/getRental', checkSession, getRentalRoutes);
router.use('/api/resolveRental', checkSession, resolveRentalRoutes);
router.use('/api/getResolvedRentals', checkSession, getResolvedRentalsRoutes);
router.use('/api/extendRental', checkSession, extendRentalRoutes);



//reports routes
router.use('/api/getReportsData', checkSession, getReportsDataRoutes);



// Export a default function that mounts the router to the app
export default (app) => {
  app.use('/api', router);
};
