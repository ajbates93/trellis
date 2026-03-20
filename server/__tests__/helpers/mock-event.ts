import { createEvent, type H3Event } from 'h3'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'

interface MockUser {
  id: string
  email: string
  name: string
  role?: string
  workspaceId?: string
  isSuperAdmin?: boolean
  [key: string]: unknown
}

interface MockEventOptions {
  method?: string
  path?: string
  body?: Record<string, unknown>
  query?: Record<string, string>
  params?: Record<string, string>
  headers?: Record<string, string>
  session?: { user: MockUser } | null
  user?: MockUser | null
  workspace?: { id: string; name: string } | null
}

const defaultUser: MockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  workspaceId: 'workspace-1',
}

const adminUser: MockUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin',
  workspaceId: 'workspace-1',
}

export function createMockEvent(options: MockEventOptions = {}): H3Event {
  const {
    method = 'GET',
    path = '/',
    body,
    query = {},
    params = {},
    headers = {},
    session,
    user,
    workspace,
  } = options

  // Build query string
  const queryString = Object.entries(query)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
  const url = queryString ? `${path}?${queryString}` : path

  const socket = new Socket()
  const req = new IncomingMessage(socket)
  req.method = method
  req.url = url

  // Set headers
  for (const [key, value] of Object.entries(headers)) {
    req.headers[key.toLowerCase()] = value
  }
  if (body) {
    req.headers['content-type'] = 'application/json'
  }

  const res = new ServerResponse(req)
  const event = createEvent(req, res)

  // Set context
  event.context.params = params
  if (session !== undefined) {
    event.context.session = session
  }
  if (user !== undefined) {
    event.context.user = user
  }
  if (workspace !== undefined) {
    event.context.workspace = workspace
  }

  // Store raw body object for mocked validateBody to use.
  // Endpoints that use readBody() directly should mock readBody globally.
  if (body) {
    ;(event as any)._mockBody = body
  }

  return event
}

export function createAuthenticatedEvent(
  overrides: Partial<MockEventOptions> = {}
): H3Event {
  const user = { ...defaultUser, ...overrides.session?.user }
  return createMockEvent({
    ...overrides,
    session: { user },
    user,
  })
}

export function createAdminEvent(
  overrides: Partial<MockEventOptions> = {}
): H3Event {
  const user = { ...adminUser, ...overrides.session?.user }
  return createMockEvent({
    ...overrides,
    session: { user },
    user,
    workspace: overrides.workspace !== undefined
      ? overrides.workspace
      : { id: 'workspace-1', name: 'Test Workspace' },
  })
}

export function createUnauthenticatedEvent(
  overrides: Partial<MockEventOptions> = {}
): H3Event {
  return createMockEvent({
    ...overrides,
    session: null,
    user: null,
  })
}
