<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { PtAlert, PtButton, PtCard, PtDivider, PtSpace, PtTag } from 'portico-ui'
import { demoUsersSeed } from '../data/demoUsers'

const router = useRouter()

const stats = computed(() => {
  const total = demoUsersSeed.length
  const active = demoUsersSeed.filter((u) => u.status === 'active').length
  const admins = demoUsersSeed.filter((u) => u.role === 'admin').length
  const inactive = total - active
  return [
    { label: '演示用户总数', value: total, hint: 'demoUsersSeed 内存数组' },
    { label: '启用中（演示）', value: active, hint: 'status === active' },
    { label: '管理员（演示）', value: admins, hint: 'role === admin' },
    { label: '停用（演示）', value: inactive, hint: 'status === inactive' },
  ]
})

const recent = computed(() => demoUsersSeed.slice(0, 5))
</script>

<template>
  <PtAlert
    class="demo-banner"
    type="info"
    title="演示数据说明"
    description="本页指标来自本地种子数据，不与任何生产系统连接，也不代表真实运营情况。"
    :closable="false"
    show-icon
  />

  <p class="page-intro">
    欢迎使用 Portico Admin v1。该外壳使用 <strong>portico-ui@0.1.0</strong> 的门楣/门槛视觉（石色纸面
    <code>#f3f1ec</code>、墨色画布 <code>#0d0e11</code>、主色 <code>#3b7ddd</code>）。
  </p>

  <div class="stats-grid">
    <PtCard v-for="item in stats" :key="item.label" shadow="hover">
      <div class="stat-card">
        <div class="stat-card__label">{{ item.label }}</div>
        <div class="stat-card__value">{{ item.value }}</div>
        <div class="stat-card__hint">{{ item.hint }}</div>
      </div>
    </PtCard>
  </div>

  <div class="dashboard-grid">
    <PtCard header="快捷入口（演示）" shadow="always">
      <PtSpace wrap :size="12">
        <PtButton type="primary" @click="router.push({ name: 'users' })">管理演示用户</PtButton>
        <PtButton type="default" @click="router.push({ name: 'form-demo' })">打开示例表单</PtButton>
        <PtButton type="default" @click="router.push({ name: 'settings' })">外观与主题</PtButton>
      </PtSpace>
      <PtDivider content-position="left">最近登录（演示）</PtDivider>
      <ul class="quick-list">
        <li v-for="user in recent" :key="user.id">
          <span>{{ user.name }}</span>
          <span>{{ user.lastLogin }}</span>
        </li>
      </ul>
    </PtCard>

    <PtCard header="系统便笺" shadow="hover">
      <PtTag type="primary" effect="light">仅前端交互</PtTag>
      <p class="page-intro" style="margin-top: 12px">
        用户编辑、表单提交与设置变更均保存在当前会话的内存状态中，刷新页面后会恢复为种子数据（主题偏好除外）。
      </p>
      <PtDivider />
      <p class="page-intro" style="margin: 0">无障碍：主导航支持键盘聚焦；窄屏下侧栏以抽屉形式打开。</p>
    </PtCard>
  </div>
</template>