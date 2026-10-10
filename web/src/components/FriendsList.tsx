import { useCallback, useEffect, useRef, useState } from 'react';
import { listFriendsApi } from '../api/social';
import { FriendInfo } from '../types/social';
import { SpinnerSvg } from './SvgIcons';

const PAGE_SIZE = 20;

function formatCreatedAt(timestamp: number) {
  const date = new Date(timestamp * 1000);
  if (!Number.isFinite(timestamp) || timestamp <= 0 || Number.isNaN(date.getTime())) return '添加时间暂未提供';
  return `添加于 ${date.toLocaleDateString('zh-CN')}`;
}

export function FriendsList({ userId, refreshVersion, search = '', onSelect, selectedId }: {
  userId: number; refreshVersion: number; search?: string;
  onSelect?: (friend: FriendInfo) => void; selectedId?: number;
}) {
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const nextPage = useRef(1);
  const busy = useRef(false);
  const more = useRef(true);
  const activeRequest = useRef<AbortController | null>(null);

  const loadMore = useCallback(async () => {
    // 同一时间只加载一页，失败后保持页码供重试。
    if (busy.current || !more.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    busy.current = true;
    setLoading(true);
    setError(null);
    const page = nextPage.current;
    try {
      const result = await listFriendsApi(page, PAGE_SIZE, controller.signal);
      if (controller.signal.aborted) return;
      setFriends(previous => {
        // 页码分页遇到新增数据时可能重复，按好友关系ID去重。
        const merged = new Map(previous.map(friend => [friend.id, friend]));
        result.friends.forEach(friend => merged.set(friend.id, friend));
        return [...merged.values()];
      });
      setTotal(result.total);
      nextPage.current = page + 1;
      more.current = result.friends.length > 0 && page * PAGE_SIZE < result.total;
      setHasMore(more.current);
    } catch (reason: unknown) {
      if (controller.signal.aborted) return;
      setError(typeof reason === 'object' && reason !== null && 'message' in reason
        ? String(reason.message) : '好友列表加载失败，请稍后重试');
    } finally {
      if (activeRequest.current === controller && !controller.signal.aborted) {
        busy.current = false;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    activeRequest.current?.abort();
    busy.current = false;
    more.current = true;
    nextPage.current = 1;
    setFriends([]);
    setTotal(null);
    setHasMore(true);
    setError(null);
    void loadMore();
    return () => activeRequest.current?.abort();
  }, [userId, refreshVersion, loadMore]);

  useEffect(() => {
    const target = sentinel.current;
    // 搜索只过滤已加载的数据，不自动下载所有页面；仍可手动加载更多。
    if (!target || loading || error || !hasMore || search.trim()) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) void loadMore();
    }, { root: target.closest('.desktop-sidebar'), rootMargin: '0px 0px 100px 0px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [loading, error, hasMore, search, loadMore]);

  const visibleFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(search.trim().toLowerCase()) || String(friend.friendUserId).includes(search.trim()));

  return (
    <section className="dashboard-section friends-section" aria-labelledby="friends-title">
      <div className="received-heading">
        <div>
          <h3 id="friends-title" className="section-title">我的好友</h3>
          <p className="section-desc">每一段连接，都从一句问候开始。</p>
        </div>
      </div>
      <div className="received-content" aria-busy={loading}>
        {total !== null && <p className="application-summary" role="status">已加载 {friends.length} / {total} 位好友</p>}
        {friends.length > 0 && <ul className="application-list friends-grid">
          {visibleFriends.map(friend => <li key={friend.id} className={`application-item friend-card ${selectedId === friend.id ? 'selected' : ''}`}>
            {onSelect && <button className="friend-select" type="button" onClick={() => onSelect(friend)} aria-label={`查看好友 ${friend.name || friend.friendUserId}`} />}
            <div className="application-item-top">
              <span className="application-avatar friend-avatar" aria-hidden="true">{Array.from(friend.name || '?')[0]}</span>
              <div className="application-identity">
                <strong>{friend.name || '昵称暂未提供'}</strong>
                <span>用户 ID · {friend.friendUserId}</span>
              </div>
            </div>
            <p className="friend-added-time">{formatCreatedAt(friend.createdAt)}</p>
          </li>)}
        </ul>}
        {!loading && !error && total === 0 && <div className="application-empty">暂无好友，试着发送一条好友申请吧</div>}
        {search.trim() && friends.length > 0 && visibleFriends.length === 0 && <p className="application-empty">已加载的好友中没有匹配项</p>}
        {error && <div className="application-error" role="alert">
          <p>{error}</p>
          <button type="button" className="action-btn-outline" onClick={() => void loadMore()}>重新加载</button>
        </div>}
        <div ref={sentinel} className="friends-load-more">
          {loading && <div role="status"><SpinnerSvg size={18} /> 正在加载好友...</div>}
          {!loading && !error && hasMore && <button type="button" className="action-btn-outline" onClick={() => void loadMore()}>加载更多好友</button>}
          {!loading && !error && !hasMore && friends.length > 0 && <span>已到列表底部</span>}
        </div>
      </div>
    </section>
  );
}
