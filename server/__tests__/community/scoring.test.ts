import { describe, it, expect } from 'vitest'
import {
  getPlantState,
  getPlantMessage,
  computePlantHealth,
  computeStreak,
  areConsecutiveWeeks,
  computeVariety,
  computeRegularity,
  computeTotalScore,
} from '../../utils/community-scoring'

describe('getPlantState', () => {
  it('returns dead for 0-20%', () => {
    expect(getPlantState(0)).toBe('dead')
    expect(getPlantState(10)).toBe('dead')
    expect(getPlantState(20)).toBe('dead')
  })

  it('returns wilting for 21-40%', () => {
    expect(getPlantState(21)).toBe('wilting')
    expect(getPlantState(30)).toBe('wilting')
    expect(getPlantState(40)).toBe('wilting')
  })

  it('returns growing for 41-65%', () => {
    expect(getPlantState(41)).toBe('growing')
    expect(getPlantState(50)).toBe('growing')
    expect(getPlantState(65)).toBe('growing')
  })

  it('returns healthy for 66-85%', () => {
    expect(getPlantState(66)).toBe('healthy')
    expect(getPlantState(75)).toBe('healthy')
    expect(getPlantState(85)).toBe('healthy')
  })

  it('returns thriving for 86-100%', () => {
    expect(getPlantState(86)).toBe('thriving')
    expect(getPlantState(100)).toBe('thriving')
  })
})

describe('getPlantMessage', () => {
  it('returns a non-empty message for each state', () => {
    const states = ['dead', 'wilting', 'growing', 'healthy', 'thriving'] as const
    for (const state of states) {
      expect(getPlantMessage(state)).toBeTruthy()
    }
  })
})

describe('computePlantHealth', () => {
  it('returns 0% health with no feedback', () => {
    const result = computePlantHealth(0, 5)
    expect(result.healthPercent).toBe(0)
    expect(result.state).toBe('dead')
  })

  it('computes correct percentage', () => {
    // 5 users * 2 weeks = 10 expected, 7 submitted
    const result = computePlantHealth(7, 5)
    expect(result.healthPercent).toBe(70)
    expect(result.state).toBe('healthy')
  })

  it('caps at 100%', () => {
    const result = computePlantHealth(20, 5)
    expect(result.healthPercent).toBe(100)
    expect(result.state).toBe('thriving')
  })

  it('handles zero active users', () => {
    const result = computePlantHealth(0, 0)
    expect(result.healthPercent).toBe(0)
    expect(result.state).toBe('dead')
  })

  it('includes expected count', () => {
    const result = computePlantHealth(3, 5)
    expect(result.expectedCount).toBe(10)
    expect(result.feedbackCount).toBe(3)
  })
})

describe('areConsecutiveWeeks', () => {
  it('detects consecutive weeks within same year', () => {
    expect(areConsecutiveWeeks('2025-W03', '2025-W04')).toBe(true)
    expect(areConsecutiveWeeks('2025-W01', '2025-W02')).toBe(true)
  })

  it('rejects non-consecutive weeks', () => {
    expect(areConsecutiveWeeks('2025-W03', '2025-W05')).toBe(false)
    expect(areConsecutiveWeeks('2025-W10', '2025-W12')).toBe(false)
  })

  it('handles year boundary (52 → 1)', () => {
    expect(areConsecutiveWeeks('2024-W52', '2025-W01')).toBe(true)
  })

  it('rejects different years without boundary crossing', () => {
    expect(areConsecutiveWeeks('2024-W50', '2025-W01')).toBe(false)
  })
})

describe('computeStreak', () => {
  it('returns 0 for empty input', () => {
    expect(computeStreak([])).toBe(0)
  })

  it('returns 1 for a single week', () => {
    expect(computeStreak(['2025-W05'])).toBe(1)
  })

  it('counts consecutive weeks', () => {
    expect(computeStreak(['2025-W03', '2025-W04', '2025-W05'])).toBe(3)
  })

  it('only counts the most recent consecutive run', () => {
    expect(computeStreak(['2025-W01', '2025-W04', '2025-W05'])).toBe(2)
  })

  it('deduplicates week entries', () => {
    expect(computeStreak(['2025-W03', '2025-W03', '2025-W04'])).toBe(2)
  })

  it('handles unordered input', () => {
    expect(computeStreak(['2025-W05', '2025-W03', '2025-W04'])).toBe(3)
  })

  it('handles year boundary streak', () => {
    expect(computeStreak(['2024-W52', '2025-W01', '2025-W02'])).toBe(3)
  })
})

describe('computeVariety', () => {
  it('returns 0 for no feedback', () => {
    expect(computeVariety([], 'user-1')).toBe(0)
  })

  it('counts unique recipients', () => {
    const entries = [
      { reviewerId: 'user-1', revieweeId: 'user-2', weekYear: '2025-W01' },
      { reviewerId: 'user-1', revieweeId: 'user-3', weekYear: '2025-W01' },
      { reviewerId: 'user-1', revieweeId: 'user-2', weekYear: '2025-W02' },
    ]
    expect(computeVariety(entries, 'user-1')).toBe(2)
  })

  it('only counts feedback by the specified user', () => {
    const entries = [
      { reviewerId: 'user-1', revieweeId: 'user-2', weekYear: '2025-W01' },
      { reviewerId: 'user-3', revieweeId: 'user-4', weekYear: '2025-W01' },
    ]
    expect(computeVariety(entries, 'user-1')).toBe(1)
  })
})

describe('computeRegularity', () => {
  it('returns 0 for empty counts', () => {
    expect(computeRegularity([])).toBe(0)
  })

  it('returns max score (20) for perfectly regular (single value)', () => {
    expect(computeRegularity([1])).toBe(20)
  })

  it('returns high score for consistent counts', () => {
    const score = computeRegularity([2, 2, 2, 2])
    expect(score).toBe(20)
  })

  it('returns lower score for irregular counts', () => {
    const regular = computeRegularity([2, 2, 2])
    const irregular = computeRegularity([0, 5, 1])
    expect(regular).toBeGreaterThan(irregular)
  })
})

describe('computeTotalScore', () => {
  it('computes weighted sum', () => {
    // streak=3 → 30, variety=4 → 20, regularity=15
    const score = computeTotalScore(3, 4, 15)
    expect(score).toBe(65)
  })

  it('returns 0 for zero inputs', () => {
    expect(computeTotalScore(0, 0, 0)).toBe(0)
  })
})
