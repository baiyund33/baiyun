import { FormEvent, useRef, useState } from 'react';
import { applyFriendApi } from '../api/social';
import { CheckmarkSvg, SpinnerSvg } from './SvgIcons';

export function FriendApplication({ userId }: { userId: number }) {
  const [target, setTarget] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const pending = useRef(false);
  const [notice, setNotice] = useState<{ success: boolean; text: string } | null>(null);
  const messageLength = Array.from(message.trim()).length;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    setNotice(null);
    const targetText = target.trim();
    const toUserId = Number(targetText);
    if (!/^\d+$/.test(targetText) || !Number.isSafeInteger(toUserId) || toUserId <= 0) {
      setNotice({ success: false, text: '请输入有效的正整数用户 ID' });
      return;
    }
    if (toUserId === userId) {
      setNotice({ success: false, text: '不能添加自己为好友' });
      return;
    }
    if (messageLength > 255) {
      setNotice({ success: false, text: '申请附言不能超过 255 个字符' });
      return;
    }
    pending.current = true;
    setLoading(true);
    try {
      const result = await applyFriendApi({ toUserId, message: message.trim() });
      setNotice({ success: true, text: `申请已发送给用户 ${toUserId}，申请编号：${result.id}。等待对方处理。` });
      setTarget('');
      setMessage('');
    } catch (error: unknown) {
      const text = typeof error === 'object' && error !== null && 'message' in error
        ? String(error.message) : '申请发送失败，请稍后重试';
      setNotice({ success: false, text });
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  return (
    <section className="dashboard-section friend-section" aria-labelledby="friend-title">
      <div className="friend-heading">
        <div>
          <h3 id="friend-title" className="section-title">添加好友</h3>
          <p className="section-desc">输入对方的用户 ID，写下一句问候。</p>
        </div>
        <span className="friend-chip">我的 ID · {userId}</span>
      </div>
      <form className="friend-form" onSubmit={submit} noValidate aria-busy={loading}>
        <div className="form-field">
          <label className="field-label" htmlFor="friend-user-id">对方的用户 ID</label>
          <input id="friend-user-id" className="field-input friend-input" inputMode="numeric"
            placeholder="例如：17" value={target} disabled={loading} required
            onChange={event => { setTarget(event.target.value); setNotice(null); }} />
        </div>
        <div className="form-field">
          <label className="field-label" htmlFor="friend-message">申请附言 <span className="optional-label">选填</span></label>
          <textarea id="friend-message" className="field-input friend-input friend-message"
            rows={3} placeholder="你好，很高兴认识你" value={message} disabled={loading}
            aria-describedby="friend-message-count"
            onChange={event => { setMessage(event.target.value); setNotice(null); }} />
          <span id="friend-message-count" className={`message-count ${messageLength > 255 ? 'over-limit' : ''}`}>
            {messageLength} / 255
          </span>
        </div>
        {notice && <div role={notice.success ? 'status' : 'alert'}
          className={`form-alert ${notice.success ? 'success-alert' : 'error-alert'}`}>
          {notice.success ? <CheckmarkSvg size={20} /> : <span className="alert-dot" />}
          <span>{notice.text}</span>
        </div>}
        <button type="submit" className="glow-submit-btn" disabled={loading}>
          {loading ? <span className="btn-content-loading"><SpinnerSvg size={16} /> 正在发送...</span> : '发送好友申请'}
        </button>
      </form>
    </section>
  );
}
