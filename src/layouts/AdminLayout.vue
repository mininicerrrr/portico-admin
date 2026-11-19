<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PtBreadcrumb, PtBreadcrumbItem, PtButton, PtMenu, PtMenuItem, PtSwitch } from 'portico-ui'
import NavIcon from '../components/NavIcon.vue'
import { useTheme } from '../composables/useTheme'

const route = useRoute()
const router = useRouter()
const { isDark, setTheme } = useTheme()

const menuCollapsed = ref(false)
const mobileNavOpen = ref(false)
const isNarrow = ref(false)

const activeMenu = computed(() => {
  if (route.name === 'dashboard') return '/'
  return `/${String(route.name ?? '')}`
})

const breadcrumbs = computed(() => (route.meta.breadcrumb as string[]) ?? ['首页'])
const pageTitle = computed(() => (route.meta.title as string) ?? 'Portico Admin')

const navItems = [
  { index: '/', label: '概览', icon: 'dashboard' as const, name: 'dashboard' },
  { index: '/users', label: '用户列表', icon: 'users' as const, name: 'users' },
  { index: '/form-demo', label: '示例表单', icon: 'form' as const, name: 'form-demo' },
  { index: '/settings', label: '设置', icon: 'settings' as const, name: 'settings' },
]

function onMenuSelect(index: string) {
  const item = navItems.find((n) => n.index === index)
  if (item) {
    router.push({ name: item.name })
    if (isNarrow.value) mobileNavOpen.value = false
  }
}

function toggleSidebar() {
  if (isNarrow.value) {
    mobileNavOpen.value = !mobileNavOpen.value
  } else {
    menuCollapsed.value = !menuCollapsed.value
  }
}

function updateViewport() {
  isNarrow.value = window.matchMedia('(max-width: 768px)').matches
  if (!isNarrow.value) mobileNavOpen.value = false
}

onMounted(() => {
  updateViewport()
  window.addEventListener('resize', updateViewport)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateViewport)
})

watch(
  () => route.fullPath,
  () => {
    if (isNarrow.value) mobileNavOpen.value = false
  },
)
</script>

<template>
  <div class="admin-shell pt-theme">
    <aside
      class="admin-sidebar"
      :class="{
        'is-collapsed': menuCollapsed && !isNarrow,
        'is-open': mobileNavOpen && isNarrow,
      }"
      aria-label="主导航"
    >
      <div class="admin-sidebar__brand">
        <span class="admin-sidebar__brand-mark" aria-hidden="true">
          <svg class="pt-icon" viewBox="0 0 24 24" style="width: 16px; height: 16px">
            <path d="M5 5h14v14H5z" />
            <path d="M5 12h14" />
          </svg>
        </span>
        <span v-if="!menuCollapsed || isNarrow">Portico Admin</span>
      </div>
      <nav class="admin-sidebar__nav">
        <PtMenu
          mode="vertical"
          :collapse="menuCollapsed && !isNarrow"
          :default-active="activeMenu"
          @select="onMenuSelect"
        >
          <PtMenuItem v-for="item in navItems" :key="item.index" :index="item.index">
            <template #icon>
              <NavIcon :name="item.icon" />
            </template>
            {{ item.label }}
          </PtMenuItem>
        </PtMenu>
      </nav>
    </aside>

    <div
      v-if="isNarrow && mobileNavOpen"
      class="admin-sidebar-backdrop"
      role="presentation"
      @click="mobileNavOpen = false"
    />

    <div class="admin-main">
      <header class="admin-header">
        <div class="admin-header__left">
          <PtButton type="default" size="small" aria-label="切换侧边栏" @click="toggleSidebar">
            菜单
          </PtButton>
          <div>
            <h1 class="admin-header__title">{{ pageTitle }}</h1>
            <p class="admin-header__meta">演示后台 · 本地内存数据</p>
          </div>
        </div>
        <PtBreadcrumb>
          <PtBreadcrumbItem v-for="(crumb, i) in breadcrumbs" :key="`${crumb}-${i}`">
            <span :class="{ 'admin-header__title': i === breadcrumbs.length - 1 }">{{ crumb }}</span>
          </PtBreadcrumbItem>
        </PtBreadcrumb>
        <PtSwitch
          :model-value="isDark"
          active-text="暗色"
          inactive-text="亮色"
          aria-label="切换明暗主题"
          @update:model-value="(v) => setTheme(v ? 'dark' : 'light')"
        />
      </header>

      <main id="main-content" class="admin-content" tabindex="-1">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-sidebar-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: var(--pt-overlay);
}
</style>