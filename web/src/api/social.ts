import { request } from './auth';
import {
  ApplyFriendRequest, ApplyFriendResponse, ListFriendApplicationsResponse,
  HandleFriendApplicationResponse, ListFriendsResponse, DeleteFriendResponse,
} from '../types/social';

export function applyFriendApi(data: ApplyFriendRequest): Promise<ApplyFriendResponse> {
  // 申请人由后端从 JWT 获取，正文不包含申请人 ID。
  return request('/friend/apply', {
    method: 'POST',
    body: JSON.stringify(data),
  }, true, '/api/social');
}

export function listFriendApplicationsApi(
  page: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<ListFriendApplicationsResponse> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return request(`/friend/applications?${query}`, {
    method: 'GET', signal,
  }, true, '/api/social');
}

export function handleFriendApplicationApi(
  id: number, status: 1 | 2,
): Promise<HandleFriendApplicationResponse> {
  return request(`/friend/applications/${id}`, {
    method: 'POST', body: JSON.stringify({ status }),
  }, true, '/api/social');
}

export function listFriendsApi(
  page: number, pageSize: number, signal?: AbortSignal,
): Promise<ListFriendsResponse> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return request(`/friends?${query}`, { method: 'GET', signal }, true, '/api/social');
}

export function deleteFriendApi(friendUserId: number): Promise<DeleteFriendResponse> {
  return request(`/friends/${friendUserId}`, { method: 'DELETE' }, true, '/api/social');
}
