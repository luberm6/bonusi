export function requireEnvUrl(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for this test run`);
  }
  return value;
}
