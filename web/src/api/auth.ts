import {
  RegisterReq,
  RegisterResp,
  LoginReq,
  LoginResp,
  UpdateUserReq,
  UpdateUserResp,
  DeleteUserResp,
  PingReq,
  PingResp,
  ApiError,
  UserSession,
} from '../types/auth';

const BASE_URL = '/api/user';
const SESSION_KEY = 'baiyun_user_session';
export const SESSION_CHANGED_EVENT = 'baiyun-session-changed';

// 本地会话管理
export function getSavedSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: UserSession = JSON.parse(raw);
    if (!session || !Number.isSafeInteger(session.id) || session.id <= 0 ||
        typeof session.name !== 'string' || typeof session.accessToken !== 'string' ||
        !session.accessToken || !Number.isFinite(session.accessExpire)) {
      clearSession();
      return null;
    }
    // 判断 token 是否已过期
    const now = Math.floor(Date.now() / 1000);
    if (session.accessExpire <= now) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function saveSession(session: UserSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
}

// 统一 HTTP 客户端封装
export async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  needAuth: boolean = false,
  baseUrl: string = BASE_URL
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (needAuth) {
    const session = getSavedSession();
    if (session && session.accessToken) {
      headers.set('Authorization', `Bearer ${session.accessToken}`);
    } else {
      throw { message: '请先登录或令牌已失效', code: 401 } satisfies ApiError;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${endpoint}`, { ...options, headers });
  } catch {
    throw { message: '无法连接服务，请检查网络后重试' } satisfies ApiError;
  }
  // 正文只读一次，兼容 JSON、纯文本及空的 401 响应。
  const text = await response.text();

  if (!response.ok) {
    let errorMessage = `请求失败 (${response.status})`;

    // 特殊处理 401 认证失效
    if (response.status === 401 && needAuth) {
      clearSession();
      errorMessage = '登录已失效或尚未登录，请重新登录';
    }

    try {
      const errorData = JSON.parse(text);
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      if (text) {
        errorMessage = text;
      }
    }

    const err: ApiError = {
      message: errorMessage,
      code: response.status,
    };
    throw err;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw { message: '服务返回的数据格式异常，请稍后重试' } satisfies ApiError;
  }
}

/**
 * 1. 服务连通性测试 (POST /api/user/ping)
 */
export async function pingApi(data: PingReq): Promise<PingResp> {
  return request<PingResp>('/ping', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 2. 用户注册 (POST /api/user/register)
 */
export async function registerApi(data: RegisterReq): Promise<RegisterResp> {
  return request<RegisterResp>('/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 3. 用户登录 (POST /api/user/login)
 * 登录成功后会自动更新本地 Session 存储
 */
export async function loginApi(data: LoginReq): Promise<LoginResp> {
  const resp = await request<LoginResp>('/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  saveSession({
    id: resp.id,
    name: resp.name,
    phone: data.phone,
    accessToken: resp.accessToken,
    accessExpire: resp.accessExpire,
  });

  return resp;
}

/**
 * 4. 修改用户资料 (PUT /api/user/:id，需 JWT)
 * 支持 name / phone 单独或同时更新，留空则跳过
 */
export async function updateUserApi(
  id: number,
  data: Omit<UpdateUserReq, 'id'>
): Promise<UpdateUserResp> {
  const resp = await request<UpdateUserResp>(
    `/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
    true
  );

  // 同步更新本地缓存中的资料
  const session = getSavedSession();
  if (session && session.id === id) {
    if (data.name) session.name = data.name;
    if (data.phone) session.phone = data.phone;
    saveSession(session);
  }

  return resp;
}

/**
 * 5. 安全注销账号 (DELETE /api/user/:id，需 JWT)
 */
export async function deleteUserApi(id: number): Promise<DeleteUserResp> {
  const resp = await request<DeleteUserResp>(
    `/${id}`,
    {
      method: 'DELETE',
    },
    true
  );

  clearSession();
  return resp;
}
