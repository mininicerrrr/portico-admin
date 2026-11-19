<script setup lang="ts">
import { ref } from 'vue'
import {
  PtAlert,
  PtButton,
  PtCard,
  PtDivider,
  PtForm,
  PtFormItem,
  PtRadio,
  PtRadioGroup,
  PtSwitch,
  message,
} from 'portico-ui'
import { useTheme, type ThemeMode } from '../composables/useTheme'

const { theme, setTheme } = useTheme()

const compactMode = ref(false)
const demoNotify = ref(true)

function onThemePick(mode: ThemeMode) {
  setTheme(mode)
  message.success(mode === 'dark' ? '已切换为暗色（localStorage 持久化）' : '已切换为亮色（localStorage 持久化）')
}

function savePreferences() {
  try {
    localStorage.setItem(
      'portico-admin-preferences',
      JSON.stringify({ compactMode: compactMode.value, demoNotify: demoNotify.value }),
    )
    message.success('演示偏好已写入 localStorage（非生产配置）')
  } catch {
    message.warning('无法写入 localStorage')
  }
}
</script>

<template>
  <p class="page-intro">管理外观主题与纯演示偏好。不包含认证、租户或生产环境开关。</p>

  <PtCard class="settings-section" header="外观主题" shadow="always">
    <PtForm label-width="108px">
      <PtFormItem label="颜色模式">
        <PtRadioGroup
          :model-value="theme"
          @update:model-value="(v) => onThemePick(v === 'dark' ? 'dark' : 'light')"
        >
          <PtRadio label="亮色" value="light" />
          <PtRadio label="暗色" value="dark" />
        </PtRadioGroup>
      </PtFormItem>
      <PtFormItem label="快捷切换">
        <PtSwitch
          :model-value="theme === 'dark'"
          active-text="暗色"
          inactive-text="亮色"
          @update:model-value="(v) => onThemePick(v ? 'dark' : 'light')"
        />
      </PtFormItem>
    </PtForm>
    <PtAlert
      type="info"
      :closable="false"
      show-icon
      title="Portico 令牌"
      description="主题由 portico-ui 导出的 --pt-* CSS 变量驱动；暗色通过 html.pt-dark 启用。"
    />
  </PtCard>

  <PtCard class="settings-section" header="演示偏好" shadow="hover">
    <PtForm label-width="108px">
      <PtFormItem label="紧凑布局">
        <PtSwitch v-model="compactMode" active-text="已开启" inactive-text="已关闭" />
      </PtFormItem>
      <PtFormItem label="操作提示">
        <PtSwitch v-model="demoNotify" active-text="已开启" inactive-text="已关闭" />
      </PtFormItem>
      <PtFormItem>
        <PtButton type="primary" @click="savePreferences">保存演示偏好</PtButton>
      </PtFormItem>
    </PtForm>
    <PtDivider />
    <p class="page-intro" style="margin: 0">
      以上开关仅用于展示表单控件交互，不会改变全局布局逻辑（除主题外）。
    </p>
  </PtCard>
</template>