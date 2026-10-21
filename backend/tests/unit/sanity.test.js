const { isUuid } = require('../../src/middleware/validate');

describe('validate.isUuid', () => {
  test('accepts a valid UUID v4', () => {
    expect(isUuid('123e4567-e89b-42d3-a456-426614174000')).toBe(true);
  });

  test('rejects a non-UUID string', () => {
    expect(isUuid('not-a-uuid')).toBe(false);
  });
});
