let counter = 0
function nextId() {
  counter++
  return `test-${counter}`
}

function uuid() {
  return `00000000-0000-0000-0000-${String(counter++).padStart(12, '0')}`
}

export function buildUser(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    email: `${id}@example.com`,
    name: `User ${id}`,
    emailVerified: true,
    passwordEnabled: false,
    image: null,
    roleType: 'dev',
    buddyId: null,
    nextReviewDate: null,
    avatarUrl: null,
    lastInsightsDate: null,
    preferredName: null,
    pronouns: null,
    bio: null,
    reviewPreference: null,
    communicationPreferences: null,
    timezone: null,
    emailNotificationPreferences: {},
    onboardingTasks: [],
    role: 'user',
    banned: false,
    banReason: null,
    banExpires: null,
    workspaceId: 'workspace-1',
    isSuperAdmin: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

export function buildFeedback(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    reviewerId: 'user-1',
    revieweeId: 'user-2',
    content: 'Great work on the project!',
    createdAt: new Date('2025-01-15'),
    weekYear: '2025-W03',
    isRead: false,
    published: false,
    publishedAt: null,
    publishedBy: null,
    ...overrides,
  }
}

export function buildGoal(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    userId: 'user-1',
    goalText: 'Improve TypeScript skills',
    description: null,
    status: 'active',
    targetDate: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    completedAt: null,
    ...overrides,
  }
}

export function buildMilestone(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    goalId: uuid(),
    title: 'Complete TypeScript course',
    isCompleted: false,
    completedAt: null,
    displayOrder: 0,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

export function buildReviewSchedule(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    userId: 'user-1',
    buddyId: 'user-2',
    scheduledDate: '2025-03-01T10:00:00.000Z',
    completedDate: null,
    status: 'scheduled',
    notes: null,
    name: null,
    completionNotes: null,
    reflectionLearnings: null,
    reflectionHighlights: null,
    reflectionConcerns: null,
    buddyComments: null,
    revieweeComments: null,
    reminderSent7d: false,
    reminderSent1d: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

export function buildCheckin(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    buddyId: 'user-2',
    userId: 'user-1',
    notes: 'Good progress on goals',
    reviewScheduleId: null,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
    ...overrides,
  }
}

export function buildAchievement(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    userId: 'user-1',
    title: 'Shipped v1.0',
    description: null,
    achievedDate: '2025-01-15',
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
    ...overrides,
  }
}

export function buildWorkspace(overrides: Record<string, unknown> = {}) {
  return {
    id: 'workspace-1',
    name: 'Test Workspace',
    logoUrl: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}
