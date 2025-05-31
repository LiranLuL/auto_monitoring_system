const request = require('supertest');
const app = require('../app');
const db = require('../db');
const jwt = require('jsonwebtoken');

jest.mock('../db');
jest.mock('jsonwebtoken');

describe('Works API', () => {
  const mockToken = 'mock-token';
  const mockUser = { id: 1, role: 'technician' };

  beforeEach(() => {
    jest.clearAllMocks();
    jwt.verify.mockReturnValue(mockUser);
  });

  describe('GET /api/works', () => {
    test('should return all works', async () => {
      const mockWorks = [
        {
          id: 1,
          vehicle_id: 1,
          work_type: 'Oil Change',
          description: 'Regular maintenance',
          status: 'completed'
        },
        {
          id: 2,
          vehicle_id: 1,
          work_type: 'Brake Check',
          description: 'Safety inspection',
          status: 'in_progress'
        }
      ];

      db.query.mockResolvedValueOnce({ rows: mockWorks });

      const response = await request(app)
        .get('/api/works')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body).toEqual(mockWorks);
    });

    test('should handle database error', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/works')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/works/vehicle/:vehicleId', () => {
    test('should return works for specific vehicle', async () => {
      const mockWorks = [
        {
          id: 1,
          vehicle_id: 1,
          work_type: 'Oil Change',
          description: 'Regular maintenance',
          status: 'completed'
        }
      ];

      db.query.mockResolvedValueOnce({ rows: mockWorks });

      const response = await request(app)
        .get('/api/works/vehicle/1')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockWorks);
    });
  });

  describe('POST /api/works', () => {
    test('should create new work', async () => {
      const newWork = {
        vehicle_id: 1,
        work_type: 'Oil Change',
        description: 'Regular maintenance',
        parts_used: 'Oil filter, Engine oil',
        cost: 50.00,
        status: 'pending'
      };

      const createdWork = { id: 1, ...newWork };
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // проверка существования автомобиля
        .mockResolvedValueOnce({ rows: [createdWork] }); // создание работы

      const response = await request(app)
        .post('/api/works')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(newWork);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(createdWork);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/works')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/works/:id', () => {
    test('should update work status', async () => {
      const updatedWork = {
        id: 1,
        vehicle_id: 1,
        work_type: 'Oil Change',
        status: 'completed'
      };

      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // проверка существования
        .mockResolvedValueOnce({ rows: [updatedWork] }); // обновление

      const response = await request(app)
        .put('/api/works/1')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedWork);
    });

    test('should return 404 for non-existent work', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/works/999')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ status: 'completed' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/works/:id', () => {
    test('should delete work', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // проверка существования
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // удаление

      const response = await request(app)
        .delete('/api/works/1')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
    });

    test('should return 404 for non-existent work', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete('/api/works/999')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(404);
    });
  });
}); 