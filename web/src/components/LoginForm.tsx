import React, { useState } from 'react';
import { loginApi } from '../api/auth';
import { LoginResp } from '../types/auth';
import { PhoneIcon, LockIcon, EyeOpenIcon, EyeCloseIcon, SpinnerSvg } from './SvgIcons';

interface LoginFormProps {
  onSuccess: (data: LoginResp) => void;
  onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onSwitchToRegister }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      setErrorMsg('请输入注册手机号');
      return;
    }
    if (!password) {
      setErrorMsg('请输入登录密码');
      return;
    }

    setLoading(true);
    try {
      const res = await loginApi({ phone: cleanPhone, password });
      onSuccess(res);
    } catch (err: any) {
      setErrorMsg(err.message || '登录失败，请检查账号密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-form-card" onSubmit={handleSubmit} noValidate>
      <div className="form-header">
        <h2 className="form-title">账号登录</h2>
        <p className="form-subtitle">欢迎进入白云云端服务体系</p>
      </div>

      {errorMsg && (
        <div className="form-alert error-alert animate-shake">
          <span className="alert-dot" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 手机号输入框 */}
      <div className="form-field">
        <label className="field-label" htmlFor="login-phone">
          手机号
        </label>
        <div className="input-wrapper">
          <span className="input-icon">
            <PhoneIcon />
          </span>
          <input
            id="login-phone"
            type="tel"
            className="field-input"
            placeholder="请输入手机号"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
            autoComplete="username"
          />
        </div>
      </div>

      {/* 密码输入框 */}
      <div className="form-field">
        <label className="field-label" htmlFor="login-password">
          登录密码
        </label>
        <div className="input-wrapper">
          <span className="input-icon">
            <LockIcon />
          </span>
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            className="field-input has-action"
            placeholder="请输入密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="current-password"
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

      {/* 提交按钮 */}
      <button type="submit" className="glow-submit-btn" disabled={loading}>
        {loading ? (
          <span className="btn-content-loading">
            <SpinnerSvg size={18} />
            <span>正在验证并登录...</span>
          </span>
        ) : (
          <span>登 录</span>
        )}
      </button>

      {/* 底部跳转 */}
      <div className="form-switch-prompt">
        <span>尚未注册账号？</span>
        <button type="button" className="switch-text-btn" onClick={onSwitchToRegister}>
          免费注册新账户
        </button>
      </div>
    </form>
  );
};
