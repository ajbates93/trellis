import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// A reserve() that never resolves until the test says so, standing in for an
// exhausted pool.
let resolveReserve: (conn: unknown) => void
const release = vi.fn()
const reserve = vi.fn(
  () => new Promise((resolve) => { resolveReserve = resolve })
)

vi.mock('postgres', () => ({
  default: vi.fn(() => ({ reserve, options: {} })),
}))
vi.mock('drizzle-orm/postgres-js', () => ({ drizzle: vi.fn(() => ({})) }))

process.env.DATABASE_URL ??= 'postgresql://localhost:5432/test'
const { bindWorkspaceToScope } = await import('./connection')

describe('bindWorkspaceToScope when the pool is exhausted', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })
  afterEach(() => vi.useRealTimers())

  it('fails with a 503 instead of waiting forever', async () => {
    const scope = {}
    const bound = bindWorkspaceToScope(scope, { workspaceId: 'ws1' })
    const assertion = expect(bound).rejects.toMatchObject({ statusCode: 503 })
    await vi.advanceTimersByTimeAsync(10_000)
    await assertion
    expect(scope).toEqual({})
  })

  it('releases a connection that arrives after the timeout', async () => {
    const bound = bindWorkspaceToScope({}, { workspaceId: 'ws1' })
    bound.catch(() => {})
    await vi.advanceTimersByTimeAsync(10_000)

    resolveReserve({ release })
    await vi.advanceTimersByTimeAsync(0)
    expect(release).toHaveBeenCalledTimes(1)
  })
})
