export interface ApplyFriendRequest {
  toUserId: number;
  message?: string;
}

export interface ApplyFriendResponse {
  id: number;
}

export interface FriendApplication {
  id: number;
  fromUserId: number;
  message: string;
  status: number;
}

export interface ListFriendApplicationsResponse {
  applications: FriendApplication[];
  total: number;
}

export interface HandleFriendApplicationResponse {
  id: number;
  status: number;
}

export interface FriendInfo {
  id: number;
  friendUserId: number;
  name: string;
  createdAt: number;
}

export interface ListFriendsResponse {
  friends: FriendInfo[];
  total: number;
}

export interface DeleteFriendResponse {
  friendUserId: number;
}
