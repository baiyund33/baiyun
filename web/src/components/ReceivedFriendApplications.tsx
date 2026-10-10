import { useCallback, useEffect, useRef, useState } from 'react';
import { handleFriendApplicationApi, listFriendApplicationsApi } from '../api/social';
import { ListFriendApplicationsResponse } from '../types/social';
import { SpinnerSvg } from './SvgIcons';

const statuses: Record<number, { text: string; className: string }> = {
  0: { text: '待处理', className: 'pending' },
  1: { text: '已接受', className: 'accepted' },
  2: { text: '已拒绝', className: 'rejected' },
};

export function ReceivedFriendApplications({ userId, onHandled, refreshVersion = 0 }: {
  userId: number;
  onHandled: () => void;
  refreshVersion?: number;
}) {
  const [data, setData] = useState<ListFriendApplicationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [handlingId, setHandlingId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ success: boolean; text: string } | null>(null);
  const pending = useRef(false);
  const active = useRef(true);
  const sentinel = useRef<HTMLDivElement>(null);
  const nextPage = useRef(1);
  const loadingPage = useRef(false);
  const more = useRef(true);
  const [hasMore, setHasMore] = useState(true);
  const activeRequest = useRef<AbortController | null>(null);
  const deferredRefresh = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingPage.current || pending.current || !more.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    loadingPage.current = true;
    setLoading(true);
    setError(null);
    const page = nextPage.current;
    try {
      const result = await listFriendApplicationsApi(page, 20, controller.signal);
      if (controller.signal.aborted) return;
      setData(current => {
        const merged = new Map((current?.applications || []).map(item => [item.id, item]));
        result.applications.forEach(item => merged.set(item.id, item));
        return { applications: [...merged.values()], total: result.total };
      });
      nextPage.current = page + 1;
      more.current = result.applications.length > 0 && page * 20 < result.total;
      setHasMore(more.current);
    } catch (reason: unknown) {
      if (controller.signal.aborted) return;
      setError(typeof reason === 'object' && reason !== null && 'message' in reason
        ? String(reason.message) : '加载失败，请稍后重试');
    } finally {
      if (activeRequest.current === controller && !controller.signal.aborted) {
        loadingPage.current = false;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  async function handleApplication(id: number, status: 1 | 2) {
    if (pending.current || loadingPage.current) return;
    pending.current = true;
    setHandlingId(id);
    setNotice(null);
    try {
      const result = await handleFriendApplicationApi(id, status);
      if (!active.current) return;
      setData(current => current && ({
        ...current,
        applications: current.applications.map(item => item.id === result.id
          ? { ...item, status: result.status } : item),
      }));
      setRejectId(null);
      setNotice({ success: true, text: status === 1 ? '已接受这条申请' : '已拒绝这条申请' });
      // 按服务响应更新状态，保留已加载的其他页面和当前滚动位置。
      if (status === 1) onHandled();
    } catch (reason: unknown) {
      if (!active.current) return;
      setNotice({ success: false, text: typeof reason === 'object' && reason !== null && 'message' in reason
        ? String(reason.message) : '处理失败，请稍后重试' });
    } finally {
      pending.current = false;
      if (active.current) {
        setHandlingId(null);
        if (deferredRefresh.current) {
          deferredRefresh.current = false;
          void loadMore();
        }
      }
    }
  }

  useEffect(() => {
    activeRequest.current?.abort();
    loadingPage.current = false;
    more.current = true;
    nextPage.current = 1;
    setData(null);
    setError(null);
    setHasMore(true);
    setRejectId(null);
    setNotice(null);
    // 处理申请期间暂缓导航刷新，处理结束后重新从第一页查询。
    deferredRefresh.current = pending.current;
    if (!pending.current) void loadMore();
    return () => activeRequest.current?.abort();
  }, [userId, refreshVersion, loadMore]);

  useEffect(() => {
    const target = sentinel.current;
    if (!target || loading || handlingId !== null || error || !hasMore) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) void loadMore();
    }, { rootMargin: '0px 0px 100px 0px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [loading, handlingId, error, hasMore, loadMore]);

  const busy = loading || handlingId !== null;

  return (
    <section className="dashboard-section received-section" aria-labelledby="received-title">
      <div className="received-heading">
        <div>
          <h3 id="received-title" className="section-title">收到的好友申请</h3>
          <p className="section-desc">查看发给你的申请及处理状态。</p>
        </div>
      </div>

      {notice && <div role={notice.success ? 'status' : 'alert'}
        className={`form-alert ${notice.success ? 'success-alert' : 'error-alert'}`}>
        {notice.text}
      </div>}
      {handlingId !== null && <p className="application-summary" role="status">正在处理申请，请稍候...</p>}

      <div aria-busy={loading} className="received-content">
        {!loading && error && <div className="application-error" role="alert">
          <p>{error}</p>
          <button type="button" className="action-btn-outline" disabled={busy} onClick={() => void loadMore()}>重新加载</button>
        </div>}
        {data && <>
          <p className="application-summary" role="status">已加载 {data.applications.length} / {data.total} 条申请</p>
          {data.applications.length === 0 ? <div className="application-empty">暂无收到的好友申请</div> :
            <ul className="application-list">
              {data.applications.map(application => {
                const badge = statuses[application.status] || { text: '未知状态', className: 'unknown' };
                return <li key={application.id} className="application-item">
                  <div className="application-item-top">
                    <span className="application-avatar" aria-hidden="true">{String(application.fromUserId).slice(-2)}</span>
                    <div className="application-identity">
                      <strong>用户 {application.fromUserId}</strong>
                      <span>申请编号 · {application.id}</span>
                    </div>
                    <span className={`application-status ${badge.className}`}>{badge.text}</span>
                  </div>
                  <p className="application-message">{application.message.trim() || '对方没有填写附言'}</p>
                  {application.status === 0 && <div className="application-actions">
                    {rejectId === application.id ? <>
                      <span className="reject-question">确定拒绝这条申请？</span>
                      <button type="button" className="action-btn-outline reject-action" disabled={busy}
                        onClick={() => handleApplication(application.id, 2)}>确定拒绝</button>
                      <button type="button" className="action-btn-outline" disabled={busy}
                        onClick={() => setRejectId(null)}>取消</button>
                    </> : <>
                      <button type="button" className="action-btn-outline accept-action" disabled={busy}
                        aria-label={`接受用户 ${application.fromUserId} 的申请`}
                        onClick={() => handleApplication(application.id, 1)}>
                        {handlingId === application.id ? '处理中...' : '接受'}
                      </button>
                      <button type="button" className="action-btn-outline" disabled={busy}
                        aria-label={`拒绝用户 ${application.fromUserId} 的申请`}
                        onClick={() => setRejectId(application.id)}>拒绝</button>
                    </>}
                  </div>}
                </li>;
              })}
            </ul>}
        </>}
      </div>

      <div ref={sentinel} className="friends-load-more">
        {loading && <div role="status"><SpinnerSvg size={18} /> 正在加载申请...</div>}
        {!loading && !error && hasMore && <button type="button" className="action-btn-outline" disabled={busy} onClick={() => void loadMore()}>加载更多申请</button>}
        {!loading && !error && !hasMore && data && data.applications.length > 0 && <span>已到通知列表底部</span>}
      </div>
    </section>
  );
}
