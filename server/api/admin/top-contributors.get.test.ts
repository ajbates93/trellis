import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../__tests__/helpers/mock-db'
import {
  createAdminEvent,
  createAuthenticatedEvent,
} from '../../__tests__/helpers/mock-event'
import { buildUser } from '../../__tests__/helpers/factories'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))
vi.mock('../../utils/workspace', () => ({
  getWorkspaceId: vi.fn().mockReturnValue('workspace-1'),
}))

const { default: handler } = await import('./top-contributors.get')

describe('GET /api/admin/top-contributors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty contributors list when no users exist', async () => {
    mockSelect([])

    const event = createAdminEvent()
    const result = await handler(event) as { contributors: unknown[] }

    expect(result).toEqual({ contributors: [] })
    expect(mockDb.select).toHaveBeenCalledTimes(1)
  })

  it('returns contributors with feedbackCount included', async () => {
    const user = buildUser({ id: 'user-2', name: 'Alice', roleType: 'dev' })
    const contributorRow = {
      userId: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      image: user.image,
      roleType: user.roleType,
      feedbackCount: 7,
    }

    mockSelect([contributorRow])

    const event = createAdminEvent()
    const result = await handler(event) as { contributors: any[] }

    expect(result.contributors).toHaveLength(1)
    expect(result.contributors[0]).toMatchObject({
      userId: 'user-2',
      name: 'Alice',
      email: user.email,
      roleType: 'dev',
      feedbackCount: 7,
    })
  })

  it('returns multiple contributors in the order returned by the database', async () => {
    const rows = [
      { userId: 'u1', name: 'Top', email: 'top@example.com', avatarUrl: null, image: null, roleType: 'dev', feedbackCount: 20 },
      { userId: 'u2', name: 'Second', email: 'second@example.com', avatarUrl: null, image: null, roleType: 'design', feedbackCount: 15 },
      { userId: 'u3', name: 'Third', email: 'third@example.com', avatarUrl: null, image: null, roleType: 'qa', feedbackCount: 10 },
    ]

    mockSelect(rows)

    const event = createAdminEvent()
    const result = await handler(event) as { contributors: any[] }

    expect(result.contributors).toHaveLength(3)
    expect(result.contributors[0].userId).toBe('u1')
    expect(result.contributors[1].userId).toBe('u2')
    expect(result.contributors[2].userId).toBe('u3')
  })

  it('includes users with zero feedback (feedbackCount = 0)', async () => {
    const row = {
      userId: 'user-no-fb',
      name: 'Quiet User',
      email: 'quiet@example.com',
      avatarUrl: null,
      image: null,
      roleType: 'management',
      feedbackCount: 0,
    }

    mockSelect([row])

    const event = createAdminEvent()
    const result = await handler(event) as { contributors: any[] }

    expect(result.contributors[0].feedbackCount).toBe(0)
  })

  it('works for a non-admin authenticated user (no auth guard)', async () => {
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event) as { contributors: unknown[] }

    expect(result).toEqual({ contributors: [] })
  })

  it('throws 500 when the database errors', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB failure')
    })

    const event = createAdminEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
