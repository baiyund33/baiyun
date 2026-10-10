import React, { useState, useEffect } from 'react';
import { LoginForm } from '../components/LoginForm';
import { RegisterForm } from '../components/RegisterForm';
import { DesktopWorkspace } from '../components/DesktopWorkspace';
import {
  BaiyunLogoSvg,
  AnimatedCloudBackground,
  CheckmarkSvg,
} from '../components/SvgIcons';
import { LoginResp, RegisterResp, UserSession } from '../types/auth';
import { getSavedSession, clearSession, SESSION_CHANGED_EVENT } from '../api/auth';
import './AuthPage.css';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [session, setSession] = useState<UserSession | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // 初始化检查本地是否已有有效 Session
  useEffect(() => {
    const syncSession = () => {
      const saved = getSavedSession();
      setSession(saved);
      if (!saved) setToastNotice('请登录后继续使用');
    };
    setSession(getSavedSession());
    window.addEventListener(SESSION_CHANGED_EVENT, syncSession);
    window.addEventListener('storage', syncSession);
    return () => {
      window.removeEventListener(SESSION_CHANGED_EVENT, syncSession);
      window.removeEventListener('storage', syncSession);
    };
  }, []);

  // 提示自动淡出
  useEffect(() => {
    if (toastNotice) {
      const timer = setTimeout(() => {
        setToastNotice(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastNotice]);

  // 登录成功
  const handleLoginSuccess = (data: LoginResp) => {
    const newSession: UserSession = getSavedSession() || {
      id: data.id,
      name: data.name,
      accessToken: data.accessToken,
      accessExpire: data.accessExpire,
    };
    setSession(newSession);
    setToastNotice(`欢迎回来，${data.name}！登录凭证已签发。`);
  };

  // 注册成功
  const handleRegisterSuccess = (res: RegisterResp) => {
    setToastNotice(`恭喜注册成功！用户编号：#${res.id}，现在可以登录体验。`);
    setMode('login');
  };

  // 退出登录
  const handleLogout = () => {
    clearSession();
    setSession(null);
    setToastNotice('已安全退出登录');
  };

  if (session) return <DesktopWorkspace key={session.id} session={session}
    onUpdateSession={setSession} onLogout={handleLogout} notice={toastNotice} />;

  return (
    <div className="baiyun-app-wrapper">
      {/* 1. 动态 SVG 浮云背景层 */}
      <AnimatedCloudBackground />

      {/* 2. 顶部 Toast 通知 */}
      {toastNotice && (
        <div className="toast-banner animate-slide-down">
          <CheckmarkSvg size={18} />
          <span>{toastNotice}</span>
        </div>
      )}

      {/* 3. 主界面容器 */}
      <main className="baiyun-center-container">
        {/* 品牌标识与动态 SVG Logo */}
        <header className="brand-header">
          <div className="logo-halo-wrapper">
            <BaiyunLogoSvg size={68} />
          </div>
          <h1 className="brand-title">白 云 · BAIYUN</h1>
          <p className="brand-tagline">连接彼此，从一声问候开始</p>
        </header>

        {/* 主内容区域 */}
          <div className="auth-tab-card">
            {/* 登录/注册 Tab 切换栏 */}
            <div className="tab-nav-bar" role="tablist">
              <button
                type="button"
                className={`tab-item-btn ${mode === 'login' ? 'active' : ''}`}
                onClick={() => setMode('login')}
              >
                登 录
              </button>
              <button
                type="button"
                className={`tab-item-btn ${mode === 'register' ? 'active' : ''}`}
                onClick={() => setMode('register')}
              >
                注 册
              </button>
              {/* 滑动指示器 */}
              <div className={`tab-indicator ${mode === 'register' ? 'slide-right' : ''}`} />
            </div>

            {/* 表单视窗 */}
            <div className="tab-content-viewport">
              {mode === 'login' ? (
                <div className="tab-pane animate-fade-in">
                  <LoginForm
                    onSuccess={handleLoginSuccess}
                    onSwitchToRegister={() => setMode('register')}
                  />
                </div>
              ) : (
                <div className="tab-pane animate-fade-in">
                  <RegisterForm
                    onSuccess={handleRegisterSuccess}
                    onSwitchToLogin={() => setMode('login')}
                  />
                </div>
              )}
            </div>
          </div>

        <footer className="baiyun-footer">
          <span>&copy; {new Date().getFullYear()} 白云项目 (Baiyun IM). 基于 Go-Zero 与 React 构建</span>
        </footer>
      </main>
    </div>
  );
};
