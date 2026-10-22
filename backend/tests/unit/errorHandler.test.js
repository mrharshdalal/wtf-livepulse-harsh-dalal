const errorHandler = require('../../src/middleware/errorHandler');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

describe('errorHandler', () => {
  test('uses the error status and message outside production', () => {
    const res = mockRes();
    const err = new Error('boom');
    err.status = 418;
    errorHandler(err, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json).toHaveBeenCalledWith({ error: 'boom' });
  });

  test('defaults to 500 when the error has no status', () => {
    const res = mockRes();
    errorHandler(new Error('oops'), {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
