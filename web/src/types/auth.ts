/**
 * 严格对应 apps/user/api/user.api 的最新接口类型定义
 */

// 1. Ping 接口
export interface PingReq {
  name: string;
}

export interface PingResp {
  message: string;
}

// 2. 注册接口
export interface RegisterReq {
  name: string;
  phone: string;
  password: string;
}

export interface RegisterResp {
  id: number;
}

// 3. 登录接口
export interface LoginReq {
  phone: string;
  password: string;
}

export interface LoginResp {
  id: number;
  name: string;
  accessToken: string;
  accessExpire: number;
}

// 4. 更新资料接口（需要 JWT Auth 认证，支持部分字段可选修改）
export interface UpdateUserReq {
  id: number;
  name?: string;
  phone?: string;
}

export interface UpdateUserResp {
  id: number;
}

// 5. 注销用户接口（需要 JWT Auth 认证）
export interface DeleteUserReq {
  id: number;
}

export interface DeleteUserResp {
  id: number;
}

// 统一 API 错误格式
export interface ApiError {
  message: string;
  code?: number;
}

// 前端本地存储的用户登录态
export interface UserSession {
  id: number;
  name: string;
  phone?: string;
  accessToken: string;
  accessExpire: number;
}
