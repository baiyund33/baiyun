import { useEffect, useState } from 'react';
import { UserSession } from '../types/auth';
import { FriendInfo } from '../types/social';
import { FriendsList } from './FriendsList';
import { FriendApplication } from './FriendApplication';
import { ReceivedFriendApplications } from './ReceivedFriendApplications';
import { UserProfile } from './UserProfile';
import { FriendDetails } from './FriendDetails';
import './DesktopWorkspace.css';

type View = 'contacts' | 'requests' | 'add' | 'profile' | 'messages';
function Icon({ name }: { name: 'contacts' | 'messages' | 'settings' | 'search' | 'cloud' | 'logout' }) {
  const paths = {
    contacts: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
    messages: <path d="M21 11a9 9 0 0 1-9 9H8l-5 2 1-6A9 9 0 1 1 21 11Z" />,
    settings: <><circle cx="12" cy="12" r="4" /><path d="m12 2 2 3 4-1 1 4 3 2-2 4 1 4-4 1-3 3-3-2-4 1-1-4-3-2 2-4-1-4 4-1Z" /></>,
    search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></>,
    cloud: <path d="M6 19a5 5 0 0 1-1-10 7 7 0 0 1 13-1 5.5 5.5 0 0 1 0 11Z" />,
    logout: <><path d="M10 4H4v16h6M13 12h9m-4-4 4 4-4 4" /></>,
  };
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function DesktopWorkspace({ session, onUpdateSession, onLogout, notice }: {
  session: UserSession; onUpdateSession: (session: UserSession) => void;
  onLogout: () => void; notice: string | null;
}) {
  const [view, setView] = useState<View>('contacts');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<FriendInfo | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [requestsVersion, setRequestsVersion] = useState(0);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!actionNotice) return;
    const timer = setTimeout(() => setActionNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [actionNotice]);
  const openRequests = () => {
    setView('requests');
    setRequestsVersion(value => value + 1);
  };
  useEffect(() => {
    const check = () => { if (Date.now() >= session.accessExpire * 1000) onLogout(); };
    check();
    const timer = setInterval(check, 1000);
    return () => clearInterval(timer);
  }, [session.accessExpire, onLogout]);
  const titles = { contacts: selected?.name || '联系人', requests: '好友通知', add: '添加好友', profile: '个人资料', messages: '消息' };
  return <div className="desktop-workspace">
    <header className="desktop-titlebar">
      <span className="desktop-brand"><Icon name="cloud" /> 白云</span>
      <button className="desktop-account" onClick={() => setView('profile')} title="查看个人资料">
        <span className="desktop-avatar">{Array.from(session.name)[0] || '云'}</span>
        <strong>{session.name}</strong><span className="desktop-account-hint">查看个人资料</span>
      </button>
      <span className="desktop-status"><i /> 已登录</span>
    </header>
    {(actionNotice || notice) && <div className="desktop-notice" role="status">{actionNotice || notice}</div>}
    <div className="desktop-body">
      <nav className="desktop-rail" aria-label="主导航">
        <button aria-label="消息" title="消息" className={view === 'messages' ? 'active' : ''} onClick={() => setView('messages')}><Icon name="messages" /></button>
        <button aria-label="联系人" title="联系人" className={['contacts', 'requests', 'add'].includes(view) ? 'active' : ''} onClick={() => { setView('contacts'); setSelected(null); setRefreshVersion(value => value + 1); }}><Icon name="contacts" /></button>
        <div className="desktop-rail-spacer" />
        <button aria-label="个人资料" title="个人资料" className={view === 'profile' ? 'active' : ''} onClick={() => setView('profile')}><Icon name="settings" /></button>
        <button aria-label="退出登录" title="退出登录" onClick={onLogout}><Icon name="logout" /></button>
      </nav>
      <aside className="desktop-sidebar" aria-label="好友管理">
        <div className="desktop-search-row"><label className="desktop-search"><Icon name="search" /><input aria-label="搜索已加载好友" placeholder="搜索已加载好友" value={search} onChange={e => setSearch(e.target.value)} /></label>
          <button className="desktop-add" aria-label="添加好友" title="添加好友" onClick={() => setView('add')}>+</button></div>
        <button className={`desktop-notification-link ${view === 'requests' ? 'active' : ''}`} onClick={openRequests}><span>好友通知</span><span>›</span></button>
        <div className="desktop-contact-label">好友 <span>CONTACTS</span></div>
        <FriendsList userId={session.id} refreshVersion={refreshVersion} search={search} selectedId={selected?.id}
          onSelect={friend => { setSelected(friend); setView('contacts'); }} />
        <div className="desktop-sidebar-footer">连接彼此，从一声问候开始</div>
      </aside>
      <main className="desktop-content">
        <header className="desktop-content-heading"><h1>{titles[view]}</h1><span>BAIYUN</span></header>
        <div className="desktop-content-scroll">
          {view === 'contacts' && !selected && <div className="desktop-empty"><Icon name="cloud" /><h2>让连接，像云一样轻盈</h2><p>选择一位好友查看资料，或开启一段新的连接。</p><button onClick={() => setView('add')}>添加好友</button></div>}
          {view === 'contacts' && selected && <FriendDetails key={selected.id} friend={selected} onDeleted={friend => {
            setSelected(current => current?.id === friend.id ? null : current);
            setRefreshVersion(value => value + 1);
            setActionNotice('已从你的好友列表移除，可重新发送申请');
          }} />}
          {view === 'requests' && <div className="desktop-panel"><ReceivedFriendApplications userId={session.id} refreshVersion={requestsVersion} onHandled={() => setRefreshVersion(v => v + 1)} /></div>}
          {view === 'add' && <div className="desktop-panel"><FriendApplication userId={session.id} /></div>}
          {view === 'profile' && <div className="desktop-panel"><UserProfile profileOnly session={session} onUpdateSession={onUpdateSession} onLogout={onLogout} /></div>}
          {view === 'messages' && <div className="desktop-empty"><Icon name="messages" /><h2>消息，从这里开始</h2><p>聊天功能尚未接入。现在可以添加好友、查看和处理申请。</p><button onClick={openRequests}>查看好友通知</button></div>}
        </div>
      </main>
    </div>
  </div>;
}

