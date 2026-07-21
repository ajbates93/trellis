import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import { feedback, reviewSchedules } from '#server/database/schema'

const { mockDb, mockSelect, mockUpdate, mockDelete } = createMockDb()
vi.mock('../database/connection', () => ({ db: mockDb }))

const { assertNotSoleAdmin, anonymizeUser } = await import('./accountDeletion')

// Queues the mocks for a full anonymizeUser run where the user has `goalCount`
// goals. Execution order inside the routine is:
//   select goals -> [delete goal_notes, delete goal_milestones] -> delete goals
//   -> delete buddy_checkins -> delete achievements -> delete notifications
//   -> delete feedback_insights -> update (null buddy pointers)
//   -> delete sessions -> delete accounts -> update (tombstone)
function queueFullRun(goalCount: number) {
  const goalRows = Array.from({ length: goalCount }, (_, i) => ({ id: `g${i + 1}` }))
  mockSelect(goalRows)
  const chains: Record<string, ReturnType<typeof mockDelete>> = {}
  if (goalCount > 0) {
    chains.goalNotes = mockDelete([])
    chains.goalMilestones = mockDelete([])
  }
  chains.goals = mockDelete([])
  chains.buddyCheckins = mockDelete([])
  chains.achievements = mockDelete([])
  chains.notifications = mockDelete([])
  chains.feedbackInsights = mockDelete([])
  const buddyPointerChain = mockUpdate([])
  chains.sessions = mockDelete([])
  chains.accounts = mockDelete([])
  const tombstoneChain = mockUpdate([])
  return { chains, buddyPointerChain, tombstoneChain }
}

describe('anonymizeUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('tombstones name/email and clears profile fields', async () => {
    const { tombstoneChain } = queueFullRun(2)

    await anonymizeUser('user-1')

    expect(mockDb.transaction).toHaveBeenCalledTimes(1)
    expect(tombstoneChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Deleted user',
        email: 'deleted-user-1@deleted.invalid',
        emailVerified: false,
        avatarUrl: null,
        image: null,
        bio: null,
        pronouns: null,
        preferredName: null,
        communicationPreferences: null,
        buddyId: null,
      }),
    )
  })

  it('deletes goals/checkins/achievements/notifications/insights and goal children', async () => {
    const { chains } = queueFullRun(1)

    await anonymizeUser('user-1')

    // goal_notes, goal_milestones, goals, buddy_checkins, achievements,
    // notifications, feedback_insights, sessions, accounts = 9 delete calls.
    expect(mockDb.delete).toHaveBeenCalledTimes(9)
    expect(chains.goalNotes!.where).toHaveBeenCalled()
    expect(chains.goalMilestones!.where).toHaveBeenCalled()
    expect(chains.goals!.where).toHaveBeenCalled()
    expect(chains.buddyCheckins!.where).toHaveBeenCalled()
    expect(chains.achievements!.where).toHaveBeenCalled()
    expect(chains.notifications!.where).toHaveBeenCalled()
    expect(chains.feedbackInsights!.where).toHaveBeenCalled()
  })

  it('skips goal-children deletes when the user has no goals', async () => {
    const { chains } = queueFullRun(0)

    await anonymizeUser('user-1')

    // goals, buddy_checkins, achievements, notifications, feedback_insights,
    // sessions, accounts = 7 delete calls (no goal_notes/goal_milestones).
    expect(mockDb.delete).toHaveBeenCalledTimes(7)
    expect(chains.goals!.where).toHaveBeenCalled()
  })

  it('does not delete or reference feedback / review schedules', async () => {
    queueFullRun(1)

    await anonymizeUser('user-1')

    expect(mockDb.delete).not.toHaveBeenCalledWith(feedback)
    expect(mockDb.delete).not.toHaveBeenCalledWith(reviewSchedules)
    expect(mockDb.delete).toHaveBeenCalledTimes(9)
  })

  it('nulls buddy pointers and removes accounts/sessions', async () => {
    const { chains, buddyPointerChain } = queueFullRun(1)

    await anonymizeUser('user-1')

    expect(buddyPointerChain.set).toHaveBeenCalledWith({ buddyId: null })
    expect(chains.sessions!.where).toHaveBeenCalled()
    expect(chains.accounts!.where).toHaveBeenCalled()
    expect(mockDb.update).toHaveBeenCalledTimes(2)
  })

  it('wraps everything in a single transaction', async () => {
    queueFullRun(0)

    await anonymizeUser('user-1')

    expect(mockDb.transaction).toHaveBeenCalledTimes(1)
  })
})

describe('assertNotSoleAdmin', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws when the user is the only admin in the workspace', async () => {
    mockSelect([{ role: 'admin' }]) // target user lookup
    mockSelect([{ id: 'user-1' }]) // admins in workspace

    await expect(assertNotSoleAdmin('user-1', 'ws-1')).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('passes when another admin exists in the workspace', async () => {
    mockSelect([{ role: 'admin' }]) // target user lookup
    mockSelect([{ id: 'user-1' }, { id: 'user-2' }]) // admins in workspace

    await expect(assertNotSoleAdmin('user-1', 'ws-1')).resolves.toBeUndefined()
  })

  it('passes when the user is not an admin', async () => {
    mockSelect([{ role: 'user' }]) // target user lookup

    await expect(assertNotSoleAdmin('user-1', 'ws-1')).resolves.toBeUndefined()
  })
})
