import request from 'supertest';
import app from '../app.js';
import { db } from '../db.js';

describe('LifeVault REST API Tests', () => {
  let userAToken = '';
  let userAId = null;
  let userBToken = '';
  let userBId = null;
  let recordAId = null;

  const timestamp = Date.now();
  const userAEmail = `user_a_${timestamp}@lifevault.test`;
  const userBEmail = `user_b_${timestamp}@lifevault.test`;

  describe('GET /api/health', () => {
    test('returns status ok, db connected, and uptime', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.db).toBe('connected');
      expect(typeof res.body.uptime).toBe('number');
      expect(res.body.version).toBe('1.0.0');
    });
  });

  describe('Auth Endpoints', () => {
    test('registers User A successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'User A Test',
          email: userAEmail,
          password: 'Password123!',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(userAEmail);
      userAToken = res.body.token;
      userAId = res.body.user.id;
    });

    test('rejects registration with duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate User',
          email: userAEmail,
          password: 'AnotherPassword123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Registration failed');
    });

    test('registers User B successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'User B Test',
          email: userBEmail,
          password: 'PasswordB123!',
        });

      expect(res.status).toBe(201);
      userBToken = res.body.token;
      userBId = res.body.user.id;
    });

    test('logs in User A with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: userAEmail,
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    test('rejects login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: userAEmail,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    test('verifies GET /api/auth/me returns current user', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(userAId);
      expect(res.body.user.email).toBe(userAEmail);
    });
  });

  describe('Records CRUD & Validations', () => {
    test('creates a valid document record for User A', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'document',
          title: 'Car Insurance Certificate',
          category: 'Insurance',
          issue_date: '2026-01-01',
          expiry_date: '2026-12-31',
          notes: 'Comprehensive policy documentation',
        });

      expect(res.status).toBe(201);
      expect(res.body.record.title).toBe('Car Insurance Certificate');
      expect(res.body.record.user_id).toBe(userAId);
      recordAId = res.body.record.id;
    });

    test('rejects record when expiry date is earlier than issue date', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'document',
          title: 'Invalid Date Document',
          category: 'Identity',
          issue_date: '2026-05-10',
          expiry_date: '2026-05-01',
        });

      expect(res.status).toBe(400);
      expect(res.body.details).toContain('Expiry date cannot be earlier');
    });

    test('creates warranty record with auto calculated warranty_end_date', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'warranty',
          title: 'Dell UltraSharp Monitor',
          category: 'Warranty',
          purchase_date: '2026-01-10',
          warranty_months: 24,
          receipt_location: 'Office Drawer',
        });

      expect(res.status).toBe(201);
      expect(res.body.record.warranty_end_date).toBe('2028-01-10');
    });

    test('retrieves records with filters and search for User A', async () => {
      const res = await request(app)
        .get('/api/records?search=Insurance&category=Insurance')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.records)).toBe(true);
      expect(res.body.records.length).toBeGreaterThanOrEqual(1);
      expect(res.body.records[0].category).toBe('Insurance');
    });

    test('updates record for User A', async () => {
      const res = await request(app)
        .put(`/api/records/${recordAId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: 'Updated Car Insurance Certificate',
          category: 'Insurance',
          notes: 'Updated policy notes',
        });

      expect(res.status).toBe(200);
      expect(res.body.record.title).toBe('Updated Car Insurance Certificate');
    });
  });

  describe('Security & Ownership Enforcements', () => {
    test('prevents User B from accessing User A’s record (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/records/${recordAId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Access denied');
    });

    test('prevents User B from downloading User A’s file (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/records/${recordAId}/file`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Access denied');
    });

    test('prevents User B from updating User A’s record (403 Forbidden)', async () => {
      const res = await request(app)
        .put(`/api/records/${recordAId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          title: 'Malicious modification attempt',
          category: 'Other',
        });

      expect(res.status).toBe(403);
    });

    test('prevents User B from deleting User A’s record (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/api/records/${recordAId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('File Upload Validation', () => {
    test('rejects unsupported file type (.txt / text/plain)', async () => {
      const res = await request(app)
        .post(`/api/records/${recordAId}/file`)
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('file', Buffer.from('hello invalid file content'), {
          filename: 'test.txt',
          contentType: 'text/plain',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Unsupported file type');
    });

    test('accepts valid PDF file upload', async () => {
      const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n%%EOF');
      const res = await request(app)
        .post(`/api/records/${recordAId}/file`)
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('file', dummyPdf, {
          filename: 'valid_contract.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(200);
      expect(res.body.record.has_file).toBe(true);
      expect(res.body.file.originalName).toBe('valid_contract.pdf');
    });

    test('allows User A to download their own uploaded file', async () => {
      const res = await request(app)
        .get(`/api/records/${recordAId}/file`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });
  });

  describe('Delete Record', () => {
    test('allows User A to delete their own record', async () => {
      const res = await request(app)
        .delete(`/api/records/${recordAId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Record removed');

      // Verify record is gone
      const checkRes = await request(app)
        .get(`/api/records/${recordAId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(checkRes.status).toBe(404);
    });
  });
});
