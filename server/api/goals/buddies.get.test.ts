import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import { buildGoal, buildMilestone, buildUser } from '#server/__tests__/helpers/factories'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./buddies.get')

describe('GET /api/goals/buddies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns empty buddyAssignments when user has no buddies', async () => {
    // First select: find users where buddyId = current user — none
    mockSelect([])
    // Second select: goals query — none (buddies list is empty, filter will return no rows)
    mockSelect([])
    // Third select: milestones skipped because goalIds is empty

    const event = createAuthenticatedEvent()

    const result = await handler(event)

    expect(result).toEqual({ buddyAssignments: [] })
    // select called twice: allBuddies + buddyGoals (milestones skipped)
    expect(mockDb.select).toHaveBeenCalledTimes(2)
  })

  it('returns grouped goals for each buddy', async () => {
    const buddy = buildUser({ id: 'buddy-user-1', name: 'Buddy One', buddyId: 'user-1' })
    const buddyProfile = {
      id: buddy.id,
      name: buddy.name,
      email: buddy.email,
      image: buddy.image,
      avatarUrl: buddy.avatarUrl,
    }

    const goal1 = buildGoal({ id: 'goal-1', userId: buddy.id, status: 'active' })
    const goal2 = buildGoal({ id: 'goal-2', userId: buddy.id, status: 'completed' })

    const milestone1 = buildMilestone({ id: 'ms-1', goalId: goal1.id })
    const milestone2 = buildMilestone({ id: 'ms-2', goalId: goal2.id })

    // First select: allBuddies — returns buddy profile
    mockSelect([buddyProfile])

    // Second select: buddyGoals — returns two goals each paired with the buddy's user info
    const buddyUserInfo = {
      id: buddy.id,
      name: buddy.name,
      email: buddy.email,
      image: buddy.image,
      avatarUrl: buddy.avatarUrl,
      preferredName: null,
      pronouns: null,
      bio: null,
      roleType: buddy.roleType,
      createdAt: buddy.createdAt,
    }
    mockSelect([
      { goal: goal1, user: buddyUserInfo },
      { goal: goal2, user: buddyUserInfo },
    ])

    // Third select: milestones for both goals
    mockSelect([milestone1, milestone2])

    const event = createAuthenticatedEvent()

    const result = await handler(event)

    expect(result).toEqual({
      buddyAssignments: [
        {
          user: buddyUserInfo,
          goals: [
            { ...goal1, milestones: [milestone1] },
            { ...goal2, milestones: [milestone2] },
          ],
        },
      ],
    })
    expect(mockDb.select).toHaveBeenCalledTimes(3)
  })

  it('returns 500 on database error', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB connection lost')
    })

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
      message: 'Failed to fetch buddy goals',
    })
  })

  it('wraps 403 from buddyId filter check as 500', async () => {
    // allBuddies returns one buddy, but buddyIdFilter is a different user (not assigned)
    const buddyProfile = {
      id: 'buddy-user-1',
      name: 'Buddy One',
      email: 'buddy@example.com',
      image: null,
      avatarUrl: null,
    }

    // First select: allBuddies — returns one buddy
    mockSelect([buddyProfile])

    const event = createAuthenticatedEvent({
      query: { buddyId: 'unauthorized-user' },
    })

    // The 403 is thrown inside the try/catch which wraps everything as 500
    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
