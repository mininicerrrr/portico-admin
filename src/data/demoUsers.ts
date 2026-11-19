import type { DemoUser } from '../types/user'

const departments = ['产品部', '研发部', '运营部', '设计部', '客服部']
const names = [
  '演示·林青',
  '演示·陈墨',
  '演示·王砚',
  '演示·赵阈',
  '演示·周耘',
  '演示·吴霁',
  '演示·郑阙',
  '演示·孙阑',
  '演示·钱扉',
  '演示·冯桁',
  '演示·褚柱',
  '演示·卫梁',
  '演示·蒋磉',
  '演示·沈阶',
  '演示·韩桡',
  '演示·杨拱',
  '演示·朱枋',
  '演示·秦槛',
  '演示·尤檐',
  '演示·许椽',
  '演示·何牖',
  '演示·吕闼',
  '演示·施枬',
  '演示·张阈',
  '演示·孔楣',
  '演示·曹磂',
  '演示·严簷',
  '演示·华磴',
]

const roles: DemoUser['role'][] = ['admin', 'editor', 'viewer']
const statuses: DemoUser['status'][] = ['active', 'inactive']

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** 内存演示数据 — 非真实用户 */
export const demoUsersSeed: DemoUser[] = names.map((name, index) => {
  const id = String(9200000000000001000n + BigInt(index))
  const day = (index % 28) + 1
  return {
    id,
    name,
    email: `demo.user${index + 1}@example.portico`,
    role: roles[index % roles.length]!,
    status: statuses[index % 3 === 0 ? 1 : 0]!,
    department: departments[index % departments.length]!,
    lastLogin: `2026-11-${pad(day)} ${10 + (index % 8)}:${(index * 7) % 60}:00`,
  }
})