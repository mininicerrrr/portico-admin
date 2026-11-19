import { describe, expect, it, beforeEach } from 'vitest'
import { THEME_STORAGE_KEY, initThemeFromStorage } from '../src/composables/useTheme'

describe('useTheme storage', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('pt-dark')
    document.documentElement.removeAttribute('data-pt-theme')
  })

  it('applies dark class from localStorage', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    initThemeFromStorage()
    expect(document.documentElement.classList.contains('pt-dark')).toBe(true)
    expect(document.documentElement.getAttribute('data-pt-theme')).toBe('dark')
  })

  it('removes dark attributes for light theme', () => {
    document.documentElement.classList.add('pt-dark')
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    initThemeFromStorage()
    expect(document.documentElement.classList.contains('pt-dark')).toBe(false)
  })
})