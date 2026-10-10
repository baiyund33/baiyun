import React, { useState, useEffect } from 'react';
import { UserSession } from '../types/auth';
import { updateUserApi, deleteUserApi, pingApi } from '../api/auth';
import { FriendApplication } from './FriendApplication';
import { ReceivedFriendApplications } from './ReceivedFriendApplications';
import { FriendsList } from './FriendsList';
import {
  UserIcon,
  PhoneIcon,
  PingSvg,
  AlertTriangleSvg,
  SpinnerSvg,
  CheckmarkSvg,
} from './SvgIcons';

interface UserProfileProps {
  profileOnly?: boolean;
  session: UserSession;
  onUpdateSession: (session: UserSession) => void;
  onLogout: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  session,
  onUpdateSession,
  onLogout,
  profileOnly = false,
}) => {
  const [friendVersion, setFriendVersion] = useState(0);
  // 修改资料表单状态
  const [editName, setEditName] = useState(session.name);
  const [editPhone, setEditPhone] = useState(session.phone || '');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Ping 测试状态
  const [pingLoading, setPingLoading] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);

  // 注销账号模态框
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Token 倒计时计算
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calcTime = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, session.accessExpire - now);
      setTimeLeft(remaining);
      if (remaining === 0) {
        onLogout(); // 令牌过期自动退出
      }
    };

    calcTime();
    const timer = setInterval(calcTime, 1000);
    return () => clearInterval(timer);
  }, [session.accessExpire, onLogout]);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}分${s < 10 ? '0' : ''}${s}秒`;
  };

  // 处理 Ping 测试
  const handlePing = async () => {
    setPingLoading(true);
    setPingResult(null);
    try {
      const res = await pingApi({ name: session.name });
      setPingResult(res.message);
    } catch (err: any) {
      setPingResult(`Ping 失败: ${err.message}`);
    } finally {
      setPingLoading(false);
    }
  };

  // 处理资料修改（支持仅改姓名或仅改手机号，对齐后端 optional 特性）
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateMsg(null);
    setUpdateLoading(true);

    const payload: { name?: string; phone?: string } = {};
    if (editName.trim() && editName.trim() !== session.name) {
      payload.name = editName.trim();
    }
    if (editPhone.trim() && editPhone.trim() !== session.phone) {
      payload.phone = editPhone.trim();
    }

    if (Object.keys(payload).length === 0) {
      setUpdateMsg({ type: 'success', text: '未作任何改动' });
      setUpdateLoading(false);
      return;
    }

    try {
      await updateUserApi(session.id, payload);
      const newSession: UserSession = {
        ...session,
        name: payload.name || session.name,
        phone: payload.phone || session.phone,
      };
      onUpdateSession(newSession);
      setUpdateMsg({ type: 'success', text: '个人资料已更新成功！' });
    } catch (err: any) {
      setUpdateMsg({ type: 'error', text: err.message || '资料更新失败' });
    } finally {
      setUpdateLoading(false);
    }
  };

  // 处理注销账号
  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteUserApi(session.id);
      setShowDeleteModal(false);
      onLogout();
    } catch (err: any) {
      setDeleteError(err.message || '注销失败，请稍后重试');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="user-dashboard-card">
      {/* 顶部身份卡片 */}
      <div className="dashboard-header">
        <div className="avatar-badge">
          <div className="avatar-initial">{session.name.slice(0, 1).toUpperCase()}</div>
          <span className="online-indicator" title="已登录" />
        </div>
        <div className="user-meta">
          <h2 className="user-name">{session.name}</h2>
          <div className="user-subtags">
            <span className="tag-id">用户 ID: {session.id}</span>
            <span className="tag-token">JWT 保护中 (剩余 {formatSeconds(timeLeft)})</span>
          </div>
        </div>
        <button type="button" className="action-btn-outline logout-action" onClick={onLogout}>
          退出登录
        </button>
      </div>

      {!profileOnly && <><FriendApplication userId={session.id} />
      <ReceivedFriendApplications key={session.id} userId={session.id}
        onHandled={() => setFriendVersion(value => value + 1)} />
      <FriendsList key={`friends-${session.id}`} userId={session.id} refreshVersion={friendVersion} /></>}

      {/* 快捷测试区域：Ping 后端 API */}
      <div className="dashboard-section ping-section">
        <div className="section-title-row">
          <span className="section-title">
            <PingSvg /> API 连通性测试 (POST /api/user/ping)
          </span>
          <button
            type="button"
            className="action-btn-sm"
            onClick={handlePing}
            disabled={pingLoading}
          >
            {pingLoading ? <SpinnerSvg size={14} /> : '发送 Ping 请求'}
          </button>
        </div>
        {pingResult && <div className="ping-response-badge">响应: {pingResult}</div>}
      </div>

      {/* 修改资料表单 (PUT /api/user/:id) */}
      <div className="dashboard-section">
        <h3 className="section-title">个人资料</h3>
        <p className="section-desc">支持只更新昵称或手机号，留空项将自动保持原样。</p>

        {updateMsg && (
          <div
            className={`form-alert ${
              updateMsg.type === 'success' ? 'success-alert' : 'error-alert animate-shake'
            }`}
          >
            {updateMsg.type === 'success' ? <CheckmarkSvg size={20} /> : <span className="alert-dot" />}
            <span>{updateMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleUpdate} className="update-grid-form">
          <div className="form-field">
            <label className="field-label" htmlFor="edit-name">
              用户昵称
            </label>
            <div className="input-wrapper">
              <span className="input-icon">
                <UserIcon />
              </span>
              <input
                id="edit-name"
                type="text"
                className="field-input"
                placeholder="修改昵称"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={updateLoading}
              />
            </div>
          </div>

          <div className="form-field">
            <label className="field-label" htmlFor="edit-phone">
              手机号码
            </label>
            <div className="input-wrapper">
              <span className="input-icon">
                <PhoneIcon />
              </span>
              <input
                id="edit-phone"
                type="tel"
                className="field-input"
                placeholder="修改绑定手机号"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                disabled={updateLoading}
              />
            </div>
          </div>

          <button type="submit" className="glow-submit-btn update-btn" disabled={updateLoading}>
            {updateLoading ? (
              <span className="btn-content-loading">
                <SpinnerSvg size={16} /> 保存修改中...
              </span>
            ) : (
              '保存资料更改'
            )}
          </button>
        </form>
      </div>

      {/* 账户危险区域：注销账号 (DELETE /api/user/:id) */}
      <div className="dashboard-section danger-zone">
        <div className="danger-row">
          <div>
            <div className="danger-title">注销账户</div>
            <div className="danger-desc">删除当前用户账户，此操作不可撤销。</div>
          </div>
          <button
            type="button"
            className="danger-btn"
            onClick={() => setShowDeleteModal(true)}
          >
            申请注销
          </button>
        </div>
      </div>

      {/* 注销账号二次确认模态窗 */}
      {showDeleteModal && (
        <div className="modal-backdrop">
          <div className="modal-card animate-scale-up">
            <div className="modal-icon-center">
              <AlertTriangleSvg size={54} />
            </div>
            <h3 className="modal-title">确定要注销此账户吗？</h3>
            <p className="modal-text">
              您正在请求注销用户 <strong>{session.name}</strong> (ID: {session.id}
              )。账户删除后将退出当前页面；关联申请记录不会自动清理。
            </p>

            {deleteError && (
              <div className="form-alert error-alert animate-shake">
                <span className="alert-dot" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
              >
                取消
              </button>
              <button
                type="button"
                className="modal-confirm-delete-btn"
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <span className="btn-content-loading">
                    <SpinnerSvg size={16} /> 注销中...
                  </span>
                ) : (
                  '确认注销'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
