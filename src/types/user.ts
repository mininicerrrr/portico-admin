export type UserRole = 'admin' | 'editor' | 'viewer'

export type UserStatus = 'active' | 'inactive'

/** 演示用户；id 与后端 Long 一致，前端使用 string 避免精度丢失 */
export interface DemoUser {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  department: string
  lastLogin: string
}