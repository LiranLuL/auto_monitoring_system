CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vin VARCHAR(17) UNIQUE NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INT NOT NULL
);

CREATE TABLE IF NOT EXISTS sensor_data (
    id SERIAL PRIMARY KEY,
    vehicle_id UUID REFERENCES vehicles(id),
    rpm INT NOT NULL,
    speed INT NOT NULL,
    engine_temp INT NOT NULL,
    dtc_codes JSONB,
    o2_voltage FLOAT,
    fuel_pressure FLOAT,
    intake_temp FLOAT,
    maf_sensor FLOAT,
    throttle_pos FLOAT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS maintenance (
    id SERIAL PRIMARY KEY,
    vehicle_id UUID REFERENCES vehicles(id),
    type VARCHAR(50) NOT NULL,
    mileage INT NOT NULL,
    date DATE NOT NULL
); 