import type { DemoUser, UserRole, UserStatus } from '../types/user'

export interface UserListQuery {
  keyword: string
  role: UserRole | 'all'
  status: UserStatus | 'all'
  sortProp: keyof DemoUser | ''
  sortOrder: 'asc' | 'desc' | null
}

export function filterUsers(users: DemoUser[], query: UserListQuery): DemoUser[] {
  const keyword = query.keyword.trim().toLowerCase()
  let result = users.filter((user) => {
    if (query.role !== 'all' && user.role !== query.role) return false
    if (query.status !== 'all' && user.status !== query.status) return false
    if (!keyword) return true
    const haystack = `${user.name} ${user.email} ${user.department} ${user.id}`.toLowerCase()
    return haystack.includes(keyword)
  })

  if (query.sortProp && query.sortOrder) {
    const prop = query.sortProp
    const dir = query.sortOrder === 'asc' ? 1 : -1
    result = [...result].sort((a, b) => {
      const av = a[prop]
      const bv = b[prop]
      if (av === bv) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp =
        typeof av === 'string' && typeof bv === 'string'
          ? av.localeCompare(bv, 'zh-CN', { numeric: true, sensitivity: 'base' })
          : av < bv
            ? -1
            : av > bv
              ? 1
              : 0
      return cmp * dir
    })
  }

  return result
}

export function paginateUsers<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return items.slice(start, start + pageSize)
}