const request = require('supertest');
const app = require('../app');
const db = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

jest.mock('../db');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    test('should login user successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        password: 'hashedPassword',
        role: 'technician'
      };

      db.query.mockResolvedValueOnce({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValueOnce(true);
      jwt.sign.mockReturnValueOnce('mock-token');

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.token).toBe('mock-token');
    });

    test('should return 401 for invalid credentials', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'wrong@test.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/register', () => {
    test('should register new user successfully', async () => {
      const newUser = {
        username: 'testuser',
        email: 'test@test.com',
        password: 'password123',
        role: 'technician'
      };

      bcrypt.hash.mockResolvedValueOnce('hashedPassword');
      db.query
        .mockResolvedValueOnce({ rows: [] }) // проверка существующего email
        .mockResolvedValueOnce({ rows: [{ id: 1, ...newUser }] }); // создание пользователя

      const response = await request(app)
        .post('/auth/register')
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', newUser.email);
    });

    test('should return 400 for existing email', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'existing@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Authentication Middleware', () => {
    test('should allow access with valid token', async () => {
      const mockUser = { id: 1, role: 'technician' };
      jwt.verify.mockReturnValueOnce(mockUser);

      const response = await request(app)
        .get('/protected-route')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).not.toBe(401);
    });

    test('should deny access without token', async () => {
      const response = await request(app)
        .get('/protected-route');

      expect(response.status).toBe(401);
    });

    test('should deny access with invalid token', async () => {
      jwt.verify.mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .get('/protected-route')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });
}); 