export const tableQueries = [
  // 1. Users table
  `
  CREATE TABLE IF NOT EXISTS users (
	    id INT AUTO_INCREMENT PRIMARY KEY,
	    first_name VARCHAR(40) NOT NULL,
	    last_name VARCHAR(40) NOT NULL,
	    email VARCHAR(100) NOT NULL UNIQUE,
	    profile_image VARCHAR(150),
	    user_type ENUM('Super_user', 'Admin','Staff') NOT NULL DEFAULT 'Staff',
	    password VARCHAR(255) NOT NULL,  -- store hashed password
	    default_password BOOLEAN DEFAULT TRUE,
	    deactivated BOOLEAN DEFAULT false,
	    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
	);
  `,

  // 2. Car details table
  `
  CREATE TABLE IF NOT EXISTS car_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    registration_number VARCHAR(50) NOT NULL UNIQUE,
    make VARCHAR(30) NOT NULL,
    model VARCHAR(30) NOT NULL,
    color VARCHAR(30),
    fuel_type VARCHAR(10),
    mileage DECIMAL(10,2),
    engine_capacity VARCHAR(20),
    last_service_date DATE,
    insurance_cof_expiry_date DATE,
    next_service_mileage DECIMAL(10,2),
    status ENUM('Available','Rented','Maintenance','Inactive') DEFAULT 'Available',
    status_description TEXT,
    is_deleted BOOLEAN DEFAULT false NOT NULL,

    has_jack BOOLEAN DEFAULT FALSE,
    has_wheel_spanner BOOLEAN DEFAULT FALSE,
    has_fire_extinguisher BOOLEAN DEFAULT FALSE,
    has_triangles BOOLEAN DEFAULT FALSE,
    has_spare_tyre BOOLEAN DEFAULT FALSE,

    air_conditioner_working BOOLEAN DEFAULT TRUE,
    radio_working BOOLEAN DEFAULT TRUE,
    lights_working BOOLEAN DEFAULT TRUE,
    windows_working BOOLEAN DEFAULT TRUE,
    doors_working BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );
  `,

  // 4. Car rentals table
  `
  CREATE TABLE IF NOT EXISTS car_rentals (
     id INT AUTO_INCREMENT PRIMARY KEY,
     car_id INT NOT NULL,
     renter_full_name VARCHAR(60) NOT NULL,
     renter_phone VARCHAR(12) NOT NULL,
     renter_email VARCHAR(100),
     renter_signature BLOB,
     renter_id_image VARCHAR(100),
     license_image VARCHAR(100),
     
     -- Occupation/residence fields
     renter_residence TEXT,
     renter_occupation_type ENUM('employment', 'business') NULL,
     occupation_description VARCHAR(100), -- Single field for occupation details
     
     rental_reason VARCHAR(100),
     pick_up_location VARCHAR(80),
     destination VARCHAR(80),
     collection_datetime DATETIME NOT NULL,
     expected_return_datetime DATETIME NOT NULL,
     actual_return_datetime DATETIME NULL,
 
     abs_warning BOOLEAN DEFAULT FALSE,
     engine_check_warning BOOLEAN DEFAULT FALSE,
     temperature_warning BOOLEAN DEFAULT FALSE,
     battery_warning BOOLEAN DEFAULT FALSE,
 
     fuel_gauge VARCHAR(50),
     handler_id INT, -- Added this
     status VARCHAR(20) DEFAULT 'active', -- Added this
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 
     FOREIGN KEY (car_id) REFERENCES car_details(id),
     FOREIGN KEY (handler_id) REFERENCES users(id) ON DELETE SET NULL
 );
  `,
  `
  CREATE TABLE IF NOT EXISTS permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    permission_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );`,

  `CREATE TABLE IF NOT EXISTS staff_permissions (
     id INT AUTO_INCREMENT PRIMARY KEY,
     user_id INT NOT NULL,
     permission_id INT NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

     FOREIGN KEY (user_id) REFERENCES users(id),
     FOREIGN KEY (permission_id) REFERENCES permissions(id)
   );`,

   
   `CREATE TABLE IF NOT EXISTS audit_logs (
     id BIGINT AUTO_INCREMENT PRIMARY KEY,
     actor_id INT NOT NULL,
     action VARCHAR(100) NOT NULL,
     description VARCHAR(256) NOT NULL,
     entity_type VARCHAR(50) NOT NULL,
     entity_id INT NOT NULL,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
   );`,

   
    `
    CREATE TABLE IF NOT EXISTS rental_issues (
     id INT AUTO_INCREMENT PRIMARY KEY,
     provider_id INT NOT NULL,
     description VARCHAR(256) NOT NULL,
     rental_id INT NOT NULL,
     FOREIGN KEY (rental_id) REFERENCES car_rentals(id),
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
   );`
];

export const indexQueries = [
  // Users table indexes
  `CREATE INDEX idx_users_last_name ON users(last_name);`,
  `CREATE INDEX idx_users_user_type ON users(user_type);`,

  // Car details indexes
  `CREATE INDEX idx_car_details_registration_number ON car_details(registration_number);`,
  `CREATE INDEX idx_car_details_make ON car_details(make);`,
  `CREATE INDEX idx_car_details_model ON car_details(model);`,
  `CREATE INDEX idx_car_details_status ON car_details(status);`,

  // Car rentals indexes
  `CREATE INDEX idx_car_rentals_car_id ON car_rentals(car_id);`,
  `CREATE INDEX idx_car_rentals_collection_datetime ON car_rentals(collection_datetime);`,
  `CREATE INDEX idx_car_rentals_expected_return_datetime ON car_rentals(expected_return_datetime);`,
  `CREATE INDEX idx_car_rentals_renter_phone ON car_rentals(renter_phone);`,
  `CREATE INDEX idx_car_rentals_renter_full_name ON car_rentals(renter_full_name);`,

  // Permissions indexes
  `CREATE INDEX idx_permissions_permission_name ON permissions(permission_name);`,
  `CREATE INDEX idx_staff_permissions_user_id ON staff_permissions(user_id);`,
  `CREATE INDEX idx_staff_permissions_permission_id ON staff_permissions(permission_id);`
];
