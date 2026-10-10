import React, { useState } from 'react';
import { registerApi } from '../api/auth';
import { RegisterResp } from '../types/auth';
import {
  UserIcon,
  PhoneIcon,
  LockIcon,
  EyeOpenIcon,
  EyeCloseIcon,
  SpinnerSvg,
} from './SvgIcons';

interface RegisterFormProps {
  onSuccess: (data: RegisterResp) => void;
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setErrorMsg('请输入用户昵称');
      return;
    }
    if (!cleanPhone) {
      setErrorMsg('请输入手机号');
      return;
    }
    if (!password) {
      setErrorMsg('请输入密码');
      return;
    }

    // 后端规则一致性：拒绝包含空格/制表符/换行
    if (/[ \t\r\n]/.test(password)) {
      setErrorMsg('密码不能包含空格、制表符或换行符');
      return;
    }

    // 后端 bcrypt 限制：最大 72 字节
    if (new TextEncoder().encode(password).length > 72) {
      setErrorMsg('密码不能超过 72 字节，中文通常占 3 字节');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      const res = await registerApi({
        name: cleanName,
        phone: cleanPhone,
        password,
      });
      onSuccess(res);
    } catch (err: any) {
      setErrorMsg(err.message || '注册失败，手机号可能已被占用');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-form-card" onSubmit={handleSubmit} noValidate>
      <div className="form-header">
        <h2 className="form-title">创建新账号</h2>
        <p className="form-subtitle">填写基本信息即可快速加入白云系统</p>
      </div>

      {errorMsg && (
        <div className="form-alert error-alert animate-shake">
          <span className="alert-dot" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 用户昵称 */}
      <div className="form-field">
        <label className="field-label" htmlFor="reg-name">
          用户昵称
        </label>
        <div className="input-wrapper">
          <span className="input-icon">
            <UserIcon />
          </span>
          <input
            id="reg-name"
            type="text"
            className="field-input"
            placeholder="例如：云中客"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      {/* 手机号 */}
      <div className="form-field">
        <label className="field-label" htmlFor="reg-phone">
          手机号
        </label>
        <div className="input-wrapper">
          <span className="input-icon">
            <PhoneIcon />
          </span>
          <input
            id="reg-phone"
            type="tel"
            className="field-input"
            placeholder="11 位手机号码"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      {/* 密码 */}
      <div className="form-field">
        <label className="field-label" htmlFor="reg-password">
          设置密码
        </label>
        <div className="input-wrapper">
          <span className="input-icon">
            <LockIcon />
          </span>
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            className="field-input has-action"
            placeholder="不含空格，最多 72 字节"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
          />
          <button
            type="button"
            className="password-toggle-btn"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            aria-label={showPassword ? '隐藏密码' : '显示密码'}
          >
            {showPassword ? <EyeCloseIcon /> : <EyeOpenIcon />}
          </button>
        </div>
      </div>

      {/* 确认密码 */}
      <div className="form-field">
        <label className="field-label" htmlFor="reg-confirm">
          确认密码
        </label>
        <div className="input-wrapper">
          <span className="input-icon">
            <LockIcon />
          </span>
          <input
            id="reg-confirm"
            type={showPassword ? 'text' : 'password'}
            className="field-input"
            placeholder="再次输入相同密码"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
          />
        </div>
      </div>

      {/* 注册提交按钮 */}
      <button type="submit" className="glow-submit-btn" disabled={loading}>
        {loading ? (
          <span className="btn-content-loading">
            <SpinnerSvg size={18} />
            <span>提交注册中...</span>
          </span>
        ) : (
          <span>立即注册</span>
        )}
      </button>

      {/* 底部跳转 */}
      <div className="form-switch-prompt">
        <span>已有白云系统账号？</span>
        <button type="button" className="switch-text-btn" onClick={onSwitchToLogin}>
          直接登录
        </button>
      </div>
    </form>
  );
};
