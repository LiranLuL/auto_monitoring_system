const { Pool } = require('pg');
const db = require('../db');

// Мок для pg Pool
jest.mock('pg', () => {
  const mPool = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('Database Connection', () => {
  let pool;

  beforeEach(() => {
    pool = new Pool();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should connect to database successfully', async () => {
    pool.connect.mockResolvedValueOnce();
    
    await expect(db.connect()).resolves.not.toThrow();
    expect(pool.connect).toHaveBeenCalled();
  });

  test('should handle database connection error', async () => {
    const error = new Error('Connection failed');
    pool.connect.mockRejectedValueOnce(error);
    
    await expect(db.connect()).rejects.toThrow('Connection failed');
  });

  test('should execute query successfully', async () => {
    const mockResult = { rows: [{ id: 1, name: 'Test' }] };
    pool.query.mockResolvedValueOnce(mockResult);
    
    const result = await db.query('SELECT * FROM test');
    expect(result).toEqual(mockResult);
    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM test');
  });

  test('should handle query error', async () => {
    const error = new Error('Query failed');
    pool.query.mockRejectedValueOnce(error);
    
    await expect(db.query('SELECT * FROM test')).rejects.toThrow('Query failed');
  });
}); 