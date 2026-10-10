import { useEffect, useRef, useState } from 'react';
import { deleteFriendApi } from '../api/social';
import { FriendInfo } from '../types/social';

export function FriendDetails({ friend, onDeleted }: {
  friend: FriendInfo; onDeleted: (friend: FriendInfo) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const active = useRef(true);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  useEffect(() => {
    if (confirming) confirmButton.current?.focus();
  }, [confirming]);
  function cancel() {
    if (pending.current) return;
    setConfirming(false);
    setError(null);
    deleteButton.current?.focus();
  }
  async function remove() {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setError(null);
    try {
      await deleteFriendApi(friend.friendUserId);
      // 即使用户已经切换详情，成功删除后仍通知工作区刷新好友。
      onDeleted(friend);
    } catch (reason: unknown) {
      if (active.current) setError(typeof reason === 'object' && reason !== null && 'message' in reason
        ? String(reason.message) : '删除失败，请稍后重试');
    } finally {
      pending.current = false;
      if (active.current) setLoading(false);
    }
  }
  return <div className="desktop-friend-detail">
    <span className="desktop-detail-avatar">{Array.from(friend.name || '?')[0]}</span>
    <h2>{friend.name || '昵称暂未提供'}</h2>
    <p>用户 ID · {friend.friendUserId}</p>
    <div className="desktop-detail-divider" />
    <p>{friend.createdAt > 0 ? `成为好友于 ${new Date(friend.createdAt * 1000).toLocaleDateString('zh-CN')}` : '添加时间暂未提供'}</p>
    <span className="desktop-coming">聊天功能正在准备中</span>
    <div className="friend-delete-area">
      {!confirming && <button ref={deleteButton} type="button" className="danger-btn"
        onClick={() => setConfirming(true)}>删除好友</button>}
      {confirming && <div className="friend-delete-confirm" role="alertdialog" aria-labelledby="friend-delete-title"
        aria-describedby="friend-delete-description" onKeyDown={event => { if (event.key === 'Escape') cancel(); }}>
        <h3 id="friend-delete-title">删除这位好友？</h3>
        <p id="friend-delete-description">只从你的好友列表移除{friend.name || '对方'}，对方的好友记录会保留。之后可以重新发送申请。</p>
        {error && <div role="alert" className="form-alert error-alert">{error}</div>}
        <div className="friend-delete-actions">
          <button type="button" className="action-btn-outline" disabled={loading} onClick={cancel}>取消</button>
          <button ref={confirmButton} type="button" className="danger-btn" disabled={loading} onClick={() => void remove()}>{loading ? '删除中...' : '确认删除好友'}</button>
        </div>
      </div>}
    </div>
  </div>;
}
