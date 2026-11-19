<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { FormRules } from 'portico-ui'
import {
  PtAlert,
  PtButton,
  PtCard,
  PtDatePicker,
  PtForm,
  PtFormItem,
  PtInput,
  PtOption,
  PtSelect,
  PtSwitch,
  PtTextarea,
  message,
} from 'portico-ui'

const formRef = ref<InstanceType<typeof PtForm> | null>(null)

const model = reactive({
  projectName: '',
  owner: '',
  category: '',
  priority: 'normal',
  launchDate: null as string | Date | null,
  enabled: true,
  description: '',
})

const rules: FormRules = {
  projectName: [
    { required: true, message: '请输入演示项目名称', trigger: 'blur' },
    { min: 2, max: 40, message: '长度 2–40 个字符', trigger: 'blur' },
  ],
  owner: [{ required: true, message: '请输入负责人姓名', trigger: 'blur' }],
  category: [{ required: true, message: '请选择类别', trigger: 'change' }],
  description: [{ max: 200, message: '备注不超过 200 字', trigger: 'blur' }],
}

const submittedPreview = ref<string | null>(null)

async function onSubmit() {
  const valid = await formRef.value?.validate()
  if (!valid) {
    message.error('请先修正表单校验错误（演示）')
    return
  }
  submittedPreview.value = JSON.stringify(
    {
      ...model,
      launchDate: model.launchDate,
      note: '仅前端内存，未提交到服务器',
    },
    null,
    2,
  )
  message.success('演示表单校验通过，已生成本地预览 JSON')
}

function onReset() {
  model.projectName = ''
  model.owner = ''
  model.category = ''
  model.priority = 'normal'
  model.launchDate = null
  model.enabled = true
  model.description = ''
  submittedPreview.value = null
  formRef.value?.clearValidate()
}
</script>

<template>
  <p class="page-intro">包含输入框、下拉、开关与日期选择器的校验示例；提交不会产生网络请求。</p>

  <div class="dashboard-grid">
    <PtCard header="示例表单（演示）" shadow="always">
      <PtForm ref="formRef" :model="model" :rules="rules" label-width="108px" label-position="right">
        <PtFormItem label="项目名称" prop="projectName" required>
          <PtInput v-model="model.projectName" placeholder="例如：门楣导航改版（演示）" clearable />
        </PtFormItem>
        <PtFormItem label="负责人" prop="owner" required>
          <PtInput v-model="model.owner" placeholder="演示负责人" />
        </PtFormItem>
        <PtFormItem label="类别" prop="category" required>
          <PtSelect v-model="model.category" placeholder="选择演示类别">
            <PtOption label="产品迭代" value="product" />
            <PtOption label="设计规范" value="design" />
            <PtOption label="技术债清理" value="tech" />
          </PtSelect>
        </PtFormItem>
        <PtFormItem label="优先级">
          <PtSelect v-model="model.priority">
            <PtOption label="普通（演示）" value="normal" />
            <PtOption label="高（演示）" value="high" />
            <PtOption label="低（演示）" value="low" />
          </PtSelect>
        </PtFormItem>
        <PtFormItem label="上线日期">
          <PtDatePicker v-model="model.launchDate" type="date" placeholder="选择日期" clearable value-format="YYYY-MM-DD" />
        </PtFormItem>
        <PtFormItem label="启用跟踪">
          <PtSwitch
            v-model="model.enabled"
            active-text="已开启"
            inactive-text="已关闭"
          />
        </PtFormItem>
        <PtFormItem label="备注" prop="description">
          <PtTextarea v-model="model.description" :rows="4" placeholder="可选备注（演示）" show-word-limit :maxlength="200" />
        </PtFormItem>
        <PtFormItem>
          <PtButton type="primary" @click="onSubmit">校验并提交（演示）</PtButton>
          <PtButton type="default" @click="onReset">重置</PtButton>
        </PtFormItem>
      </PtForm>
    </PtCard>

    <PtCard header="提交预览" shadow="hover">
      <PtAlert
        v-if="!submittedPreview"
        type="info"
        title="尚未提交"
        description="点击「校验并提交」后，将在此显示内存中的 JSON 预览。"
        :closable="false"
        show-icon
      />
      <pre v-else class="json-preview" aria-label="提交结果预览">{{ submittedPreview }}</pre>
    </PtCard>
  </div>
</template>

<style scoped>
.json-preview {
  margin: 0;
  padding: 12px;
  border-radius: var(--pt-radius);
  background: var(--pt-bg-soft);
  border: var(--pt-border-width) solid var(--pt-border-light);
  font-size: var(--pt-font-size-s);
  overflow: auto;
  max-height: 420px;
}
</style>