import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../server/index';

describe('API Endpoints', () => {
  let authToken: string;

  beforeAll(async () => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
    process.env.SESSION_SECRET = 'test-secret';
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'HTC Trading Platform');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should respond to ping', async () => {
      await request(app)
        .get('/ping')
        .expect(200, 'pong');
    });
  });

  describe('Instruments API', () => {
    it('should list instruments with pagination', async () => {
      const response = await request(app)
        .get('/api/instruments')
        .query({ limit: 10, offset: 0 })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(10);
    });

    it('should validate pagination parameters', async () => {
      await request(app)
        .get('/api/instruments')
        .query({ limit: -1 })
        .expect(400);

      await request(app)
        .get('/api/instruments')
        .query({ limit: 101 })
        .expect(400);
    });

    it('should get instrument details', async () => {
      // First get an instrument ID from the list
      const listResponse = await request(app)
        .get('/api/instruments')
        .query({ limit: 1 });
      
      if (listResponse.body.length > 0) {
        const instrumentId = listResponse.body[0].id;
        
        const response = await request(app)
          .get(`/api/instruments/${instrumentId}`)
          .expect(200);

        expect(response.body).toHaveProperty('instrument');
        expect(response.body).toHaveProperty('price');
        expect(response.body.instrument).toHaveProperty('id', instrumentId);
      }
    });

    it('should return 404 for non-existent instrument', async () => {
      await request(app)
        .get('/api/instruments/99999')
        .expect(404);
    });
  });

  describe('Security', () => {
    it('should have rate limiting', async () => {
      const promises = Array(101).fill(null).map(() =>
        request(app).get('/api/instruments')
      );

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should have security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    it('should reject malformed requests', async () => {
      await request(app)
        .post('/api/watchlists')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);
    });
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      await request(app)
        .get('/api/watchlists')
        .expect(401);
    });

    it('should handle login validation', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid-email' })
        .expect(400);
    });
  });
});

describe('WebSocket Connection', () => {
  it('should establish WebSocket connection', (done) => {
    const WebSocket = require('ws');
    const ws = new WebSocket('ws://localhost:3000/ws');

    ws.on('open', () => {
      ws.close();
      done();
    });

    ws.on('error', (error: Error) => {
      done(error);
    });
  });

  it('should handle subscription messages', (done) => {
    const WebSocket = require('ws');
    const ws = new WebSocket('ws://localhost:3000/ws');

    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        symbols: ['AAPL', 'GOOGL']
      }));
    });

    ws.on('message', (data: Buffer) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'connected') {
        ws.close();
        done();
      }
    });

    ws.on('error', (error: Error) => {
      done(error);
    });
  });
});
