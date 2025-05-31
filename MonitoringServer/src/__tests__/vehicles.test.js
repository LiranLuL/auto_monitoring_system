const request = require('supertest');
const app = require('../app');
const db = require('../db');
const jwt = require('jsonwebtoken');

jest.mock('../db');
jest.mock('jsonwebtoken');

describe('Vehicles API', () => {
  const mockToken = 'mock-token';
  const mockUser = { id: 1, role: 'technician' };

  beforeEach(() => {
    jest.clearAllMocks();
    jwt.verify.mockReturnValue(mockUser);
  });

  describe('GET /api/vehicles', () => {
    test('should return all vehicles', async () => {
      const mockVehicles = [
        { id: 1, vin: 'ABC123', make: 'Toyota', model: 'Camry' },
        { id: 2, vin: 'XYZ789', make: 'Honda', model: 'Civic' }
      ];

      db.query.mockResolvedValueOnce({ rows: mockVehicles });

      const response = await request(app)
        .get('/api/vehicles')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body).toEqual(mockVehicles);
    });

    test('should handle database error', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/vehicles')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/vehicles/:id', () => {
    test('should return vehicle by id', async () => {
      const mockVehicle = { id: 1, vin: 'ABC123', make: 'Toyota', model: 'Camry' };
      db.query.mockResolvedValueOnce({ rows: [mockVehicle] });

      const response = await request(app)
        .get('/api/vehicles/1')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockVehicle);
    });

    test('should return 404 for non-existent vehicle', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/vehicles/999')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/vehicles', () => {
    test('should create new vehicle', async () => {
      const newVehicle = {
        vin: 'ABC123',
        make: 'Toyota',
        model: 'Camry',
        plate_number: 'XYZ-123',
        owner_phone: '+1234567890'
      };

      const createdVehicle = { id: 1, ...newVehicle };
      db.query.mockResolvedValueOnce({ rows: [createdVehicle] });

      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(newVehicle);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(createdVehicle);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/vehicles/:id', () => {
    test('should update vehicle', async () => {
      const updatedVehicle = {
        id: 1,
        vin: 'ABC123',
        make: 'Toyota',
        model: 'Camry',
        plate_number: 'XYZ-123',
        owner_phone: '+1234567890'
      };

      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // проверка существования
        .mockResolvedValueOnce({ rows: [updatedVehicle] }); // обновление

      const response = await request(app)
        .put('/api/vehicles/1')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updatedVehicle);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedVehicle);
    });

    test('should return 404 for non-existent vehicle', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/vehicles/999')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({});

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/vehicles/:id', () => {
    test('should delete vehicle', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // проверка существования
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // удаление

      const response = await request(app)
        .delete('/api/vehicles/1')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
    });

    test('should return 404 for non-existent vehicle', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete('/api/vehicles/999')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(404);
    });
  });
}); 