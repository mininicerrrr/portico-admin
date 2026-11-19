import { describe, expect, it } from 'vitest'
import { demoUsersSeed } from '../src/data/demoUsers'
import { filterUsers, paginateUsers } from '../src/utils/userFilters'

describe('userFilters', () => {
  it('filters by keyword across name, email, and id', () => {
    const sample = demoUsersSeed[0]!
    const result = filterUsers(demoUsersSeed, {
      keyword: sample.name.slice(2, 6),
      role: 'all',
      status: 'all',
      sortProp: '',
      sortOrder: null,
    })
    expect(result.some((u) => u.id === sample.id)).toBe(true)
  })

  it('filters by role and status', () => {
    const result = filterUsers(demoUsersSeed, {
      keyword: '',
      role: 'admin',
      status: 'active',
      sortProp: '',
      sortOrder: null,
    })
    expect(result.every((u) => u.role === 'admin' && u.status === 'active')).toBe(true)
  })

  it('sorts ascending by name', () => {
    const result = filterUsers(demoUsersSeed, {
      keyword: '',
      role: 'all',
      status: 'all',
      sortProp: 'name',
      sortOrder: 'asc',
    })
    const names = result.map((u) => u.name)
    expect([...names].sort((a, b) => a.localeCompare(b, 'zh-CN'))).toEqual(names)
  })

  it('paginates deterministically', () => {
    const page1 = paginateUsers(demoUsersSeed, 1, 10)
    const page2 = paginateUsers(demoUsersSeed, 2, 10)
    expect(page1).toHaveLength(10)
    expect(page2[0]?.id).toBe(demoUsersSeed[10]?.id)
    expect(page2[0]?.id).not.toBe(demoUsersSeed[0]?.id)
  })
})