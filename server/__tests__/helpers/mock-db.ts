import { vi } from 'vitest'

type MockFn = ReturnType<typeof vi.fn>

interface ChainableQuery {
  from: MockFn
  where: MockFn
  innerJoin: MockFn
  leftJoin: MockFn
  orderBy: MockFn
  limit: MockFn
  groupBy: MockFn
  returning: MockFn
  set: MockFn
  values: MockFn
  onConflictDoUpdate: MockFn
  onConflictDoNothing: MockFn
  as: MockFn
  then: (resolve: (value: unknown) => void) => void
}

function createChain(resolveValue: unknown[] = []): ChainableQuery {
  const chain: Partial<ChainableQuery> = {}

  const self = () => chain as ChainableQuery

  chain.from = vi.fn().mockImplementation(self)
  chain.where = vi.fn().mockImplementation(self)
  chain.innerJoin = vi.fn().mockImplementation(self)
  chain.leftJoin = vi.fn().mockImplementation(self)
  chain.orderBy = vi.fn().mockImplementation(self)
  chain.limit = vi.fn().mockImplementation(self)
  chain.groupBy = vi.fn().mockImplementation(self)
  chain.returning = vi.fn().mockImplementation(self)
  chain.set = vi.fn().mockImplementation(self)
  chain.values = vi.fn().mockImplementation(self)
  chain.onConflictDoUpdate = vi.fn().mockImplementation(self)
  chain.onConflictDoNothing = vi.fn().mockImplementation(self)
  chain.as = vi.fn().mockImplementation(self)

  // Make the chain thenable so `await db.select().from().where()` resolves
  chain.then = (resolve: (value: unknown) => void) => resolve(resolveValue)

  return chain as ChainableQuery
}

export interface MockDb {
  select: MockFn
  selectDistinct: MockFn
  insert: MockFn
  update: MockFn
  delete: MockFn
  query: Record<string, unknown>
}

interface MockDbResult {
  mockDb: MockDb
  /** Configure what `db.select().from().where()...` resolves to */
  mockSelect: (data: unknown[]) => ChainableQuery
  /** Configure what `db.selectDistinct().from().where()...` resolves to */
  mockSelectDistinct: (data: unknown[]) => ChainableQuery
  /** Configure what `db.insert().values().returning()...` resolves to */
  mockInsert: (data: unknown[]) => ChainableQuery
  /** Configure what `db.update().set().where().returning()...` resolves to */
  mockUpdate: (data: unknown[]) => ChainableQuery
  /** Configure what `db.delete().from().where()...` resolves to */
  mockDelete: (data: unknown[]) => ChainableQuery
}

export function createMockDb(): MockDbResult {
  const mockDb: MockDb = {
    select: vi.fn(),
    selectDistinct: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: {},
  }

  function mockSelect(data: unknown[] = []) {
    const chain = createChain(data)
    mockDb.select.mockReturnValueOnce(chain)
    return chain
  }

  function mockSelectDistinct(data: unknown[] = []) {
    const chain = createChain(data)
    mockDb.selectDistinct.mockReturnValueOnce(chain)
    return chain
  }

  function mockInsert(data: unknown[] = []) {
    const chain = createChain(data)
    mockDb.insert.mockReturnValueOnce(chain)
    return chain
  }

  function mockUpdate(data: unknown[] = []) {
    const chain = createChain(data)
    mockDb.update.mockReturnValueOnce(chain)
    return chain
  }

  function mockDelete(data: unknown[] = []) {
    const chain = createChain(data)
    mockDb.delete.mockReturnValueOnce(chain)
    return chain
  }

  return { mockDb, mockSelect, mockSelectDistinct, mockInsert, mockUpdate, mockDelete }
}
