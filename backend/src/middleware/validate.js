const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(str) {
  return typeof str === 'string' && UUID_V4_RE.test(str);
}

function oneOf(value, allowed) {
  return allowed.includes(value);
}

module.exports = { isUuid, oneOf };
