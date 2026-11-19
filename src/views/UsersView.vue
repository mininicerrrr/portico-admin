<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { TableColumn, TableSortOrder } from 'portico-ui'
import {
  PtButton,
  PtCard,
  PtDrawer,
  PtForm,
  PtFormItem,
  PtInput,
  PtOption,
  PtPagination,
  PtSelect,
  PtSwitch,
  PtTable,
  PtTag,
  message,
} from 'portico-ui'
import { demoUsersSeed } from '../data/demoUsers'
import type { DemoUser, UserRole, UserStatus } from '../types/user'
import { filterUsers, paginateUsers } from '../utils/userFilters'

const users = ref<DemoUser[]>(demoUsersSeed.map((u) => ({ ...u })))

const keyword = ref('')
const roleFilter = ref<UserRole | 'all'>('all')
const statusFilter = ref<UserStatus | 'all'>('all')
const currentPage = ref(1)
const pageSize = ref(10)
const sortProp = ref<keyof DemoUser | ''>('')
const sortOrder = ref<TableSortOrder>(null)

const drawerOpen = ref(false)
const editing = ref<DemoUser | null>(null)
const editForm = reactive({
  name: '',
  email: '',
  role: 'viewer' as UserRole,
  status: 'active' as UserStatus,
  department: '',
})

/** 固定列宽 + 横向滚动（PtTable `pt-table__wrap` overflow:auto），文本列用插槽省略 */
const columns = computed<TableColumn[]>(() => [
  { prop: 'name', label: '姓名', width: 132, sortable: 'custom', showOverflowTooltip: true } as TableColumn,
  {
    prop: 'email',
    label: '邮箱',
    width: 260,
    sortable: 'custom',
    showOverflowTooltip: true,
  } as TableColumn,
  { prop: 'department', label: '部门', width: 96, sortable: 'custom', showOverflowTooltip: true } as TableColumn,
  { prop: 'role', label: '角色', width: 96, sortable: 'custom', slot: 'role' },
  { prop: 'status', label: '状态', width: 88, sortable: 'custom', slot: 'status' },
  {
    prop: 'lastLogin',
    label: '最近登录（演示）',
    width: 184,
    sortable: 'custom',
    showOverflowTooltip: true,
  } as TableColumn,
  { prop: 'actions', label: '操作', width: 96, slot: 'actions' },
])

const filteredUsers = computed(() =>
  filterUsers(users.value, {
    keyword: keyword.value,
    role: roleFilter.value,
    status: statusFilter.value,
    sortProp: sortProp.value,
    sortOrder: sortOrder.value,
  }),
)

const pageData = computed(
  () => paginateUsers(filteredUsers.value, currentPage.value, pageSize.value) as unknown as Record<string, unknown>[],
)

const total = computed(() => filteredUsers.value.length)

function roleLabel(role: UserRole) {
  return role === 'admin' ? '管理员' : role === 'editor' ? '编辑' : '访客'
}

function statusType(status: UserStatus) {
  return status === 'active' ? 'success' : 'info'
}

function statusLabel(status: UserStatus) {
  return status === 'active' ? '启用' : '停用'
}

function onSortChange(payload: { prop: string; order: TableSortOrder }) {
  sortProp.value = (payload.prop as keyof DemoUser) || ''
  sortOrder.value = payload.order
}

function resetFilters() {
  keyword.value = ''
  roleFilter.value = 'all'
  statusFilter.value = 'all'
  currentPage.value = 1
}

function openEdit(row: DemoUser) {
  editing.value = row
  editForm.name = row.name
  editForm.email = row.email
  editForm.role = row.role
  editForm.status = row.status
  editForm.department = row.department
  drawerOpen.value = true
}

function saveEdit() {
  if (!editing.value) return
  if (!editForm.name.trim() || !editForm.email.trim()) {
    message.warning('请填写姓名与邮箱（演示校验）')
    return
  }
  const idx = users.value.findIndex((u) => u.id === editing.value!.id)
  if (idx >= 0) {
    users.value[idx] = {
      ...users.value[idx]!,
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      role: editForm.role,
      status: editForm.status,
      department: editForm.department.trim(),
    }
    message.success('已更新内存中的演示用户（刷新页面将还原）')
  }
  drawerOpen.value = false
}
</script>

<template>
  <p class="page-intro">用户列表 · 搜索、筛选、排序与分页均为前端演示逻辑，数据来自 <code>demoUsersSeed</code>。</p>

  <PtCard class="users-table-card" header="用户列表（演示）" shadow="always">
    <div class="filters-row">
      <div class="filter-field filter-field--grow">
        <label class="filter-label" for="user-keyword">搜索</label>
        <PtInput
          id="user-keyword"
          v-model="keyword"
          clearable
          placeholder="姓名、邮箱、部门或 ID"
          @input="currentPage = 1"
        />
      </div>
      <div class="filter-field">
        <label class="filter-label" for="user-role">角色</label>
        <PtSelect id="user-role" v-model="roleFilter" placeholder="全部角色" @change="currentPage = 1">
          <PtOption label="全部角色" value="all" />
          <PtOption label="管理员" value="admin" />
          <PtOption label="编辑" value="editor" />
          <PtOption label="访客" value="viewer" />
        </PtSelect>
      </div>
      <div class="filter-field">
        <label class="filter-label" for="user-status">状态</label>
        <PtSelect id="user-status" v-model="statusFilter" placeholder="全部状态" @change="currentPage = 1">
          <PtOption label="全部状态" value="all" />
          <PtOption label="启用" value="active" />
          <PtOption label="停用" value="inactive" />
        </PtSelect>
      </div>
      <div class="filter-field" style="flex: 0 0 auto">
        <label class="filter-label" aria-hidden="true">&nbsp;</label>
        <PtButton type="default" @click="resetFilters">重置筛选</PtButton>
      </div>
    </div>

    <div class="table-toolbar">
      <span class="table-summary">共 {{ total }} 条演示记录 · 当前第 {{ currentPage }} 页</span>
    </div>

    <PtTable
      :columns="columns"
      :data="pageData"
      stripe
      border
      highlight-current-row
      row-key="id"
      @sort-change="onSortChange"
    >
      <template #role="{ row }">
        <PtTag :type="row.role === 'admin' ? 'primary' : row.role === 'editor' ? 'warning' : 'info'" effect="light">
          {{ roleLabel(row.role as UserRole) }}
        </PtTag>
      </template>
      <template #status="{ row }">
        <PtTag :type="statusType(row.status as UserStatus)" effect="plain">
          {{ statusLabel(row.status as UserStatus) }}
        </PtTag>
      </template>
      <template #actions="{ row }">
        <PtButton type="primary" size="small" @click="openEdit(row as unknown as DemoUser)">编辑</PtButton>
      </template>
    </PtTable>

    <div class="pagination-wrap">
      <PtPagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        background
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
      />
    </div>
  </PtCard>

  <PtDrawer v-model="drawerOpen" title="编辑演示用户" placement="right" size="420px">
    <p class="page-intro">抽屉内修改仅写入当前会话内存，不会调用后端 API。</p>
    <div class="drawer-form-grid">
      <PtForm label-width="96px" label-position="right">
        <PtFormItem label="用户 ID">
          <PtInput :model-value="editing?.id ?? ''" disabled />
        </PtFormItem>
        <PtFormItem label="姓名" required>
          <PtInput v-model="editForm.name" placeholder="演示姓名" />
        </PtFormItem>
        <PtFormItem label="邮箱" required>
          <PtInput v-model="editForm.email" type="email" placeholder="demo@example.portico" />
        </PtFormItem>
        <PtFormItem label="部门">
          <PtInput v-model="editForm.department" />
        </PtFormItem>
        <PtFormItem label="角色">
          <PtSelect v-model="editForm.role">
            <PtOption label="管理员" value="admin" />
            <PtOption label="编辑" value="editor" />
            <PtOption label="访客" value="viewer" />
          </PtSelect>
        </PtFormItem>
        <PtFormItem label="启用">
          <PtSwitch
            :model-value="editForm.status === 'active'"
            active-text="已开启"
            inactive-text="已关闭"
            @update:model-value="(v) => (editForm.status = v ? 'active' : 'inactive')"
          />
        </PtFormItem>
      </PtForm>
    </div>
    <template #footer>
      <PtButton type="default" @click="drawerOpen = false">取消</PtButton>
      <PtButton type="primary" @click="saveEdit">保存（演示）</PtButton>
    </template>
  </PtDrawer>
</template>