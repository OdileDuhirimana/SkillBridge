const request = require('supertest');
const { createApp } = require('../app');

const app = createApp();

// Regression test for a documented-but-non-functional API docs setup: the
// portfolio audit found that swagger-jsdoc/swagger-ui-express were wired up
// in index.js but zero route files contained @swagger annotations, so
// /api/docs rendered an empty, useless spec. This test fails loudly if that
// regresses (e.g. someone deletes the annotations or breaks the `apis` glob
// path in app.js).
describe('API documentation (/api/openapi.json)', () => {
  it('exposes a non-empty OpenAPI spec with real documented paths', async () => {
    const res = await request(app).get('/api/openapi.json');

    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');

    const paths = Object.keys(res.body.paths || {});
    expect(paths.length).toBeGreaterThan(0);
    expect(paths).toEqual(expect.arrayContaining(['/auth/login', '/auth/register', '/jobs']));
  });
});
