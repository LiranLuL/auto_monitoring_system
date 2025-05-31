process.env.JWT_SECRET = 'test-secret-key';
process.env.DB_NAME = 'test_car_monitoring';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.ANALYSIS_SERVICE_URL = 'http://localhost:5001';
process.env.ANALYSIS_API_TOKEN = 'test-analysis-token';

global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  };