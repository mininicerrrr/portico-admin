import { computed, ref, watch } from 'vue'

export const THEME_STORAGE_KEY = 'portico-admin-theme'

export type ThemeMode = 'light' | 'dark'

function readStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    /* ignore */
  }
  return 'light'
}

const theme = ref<ThemeMode>(readStoredTheme())

function applyThemeToDocument(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (mode === 'dark') {
    root.classList.add('pt-dark')
    root.setAttribute('data-pt-theme', 'dark')
  } else {
    root.classList.remove('pt-dark')
    root.removeAttribute('data-pt-theme')
  }
}

export function initThemeFromStorage() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') {
      theme.value = stored
    }
  } catch {
    /* ignore */
  }
  applyThemeToDocument(theme.value)
}

export function useTheme() {
  watch(
    theme,
    (mode) => {
      applyThemeToDocument(mode)
      try {
        localStorage.setItem(THEME_STORAGE_KEY, mode)
      } catch {
        /* ignore */
      }
    },
    { immediate: true },
  )

  const isDark = computed(() => theme.value === 'dark')

  function setTheme(mode: ThemeMode) {
    theme.value = mode
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  return { theme, isDark, setTheme, toggleTheme }
}