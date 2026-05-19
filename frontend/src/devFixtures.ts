export async function loadDevFixtures() {
  if (!import.meta.env.DEV) {
    return null
  }

  const fixtures = await import('../dev/fixtures/index')
  return fixtures
}
