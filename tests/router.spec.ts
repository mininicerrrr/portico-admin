import { describe, expect, it } from 'vitest'
import { routes } from '../src/router/index'

describe('router', () => {
  it('registers admin child routes', () => {
    const layout = routes.find((r) => r.path === '/')
    const names = layout?.children?.map((c) => c.name)
    expect(names).toEqual(['dashboard', 'users', 'form-demo', 'settings'])
  })
})