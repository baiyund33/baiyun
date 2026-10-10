import React from 'react';

/**
 * 1. 动态白云品牌矢量标志（含描边画线动画与发光滤镜）
 */
export const BaiyunLogoSvg: React.FC<{ size?: number; className?: string }> = ({
  size = 56,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`baiyun-logo-svg ${className}`}
    >
      <defs>
        {/* 霓虹蓝紫天空渐变 */}
        <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        {/* 柔光光晕滤镜 */}
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 背景动态光晕环 */}
      <circle
        cx="50"
        cy="50"
        r="44"
        stroke="url(#cloudGrad)"
        strokeWidth="1.5"
        strokeDasharray="4 6"
        className="spin-ring"
      />

      {/* 云朵内部柔和填充层 */}
      <path
        d="M32 66C23.16 66 16 58.84 16 50C16 41.52 22.56 34.57 30.9 34.05C33.68 25.04 42.06 18.5 52 18.5C63.67 18.5 73.23 27.24 74.72 38.56C80.59 40.23 85 45.62 85 52C85 59.73 78.73 66 71 66H32Z"
        fill="url(#cloudGrad)"
        fillOpacity="0.18"
      />

      {/* 动态绘制外轮廓 */}
      <path
        className="cloud-path"
        d="M32 66C23.16 66 16 58.84 16 50C16 41.52 22.56 34.57 30.9 34.05C33.68 25.04 42.06 18.5 52 18.5C63.67 18.5 73.23 27.24 74.72 38.56C80.59 40.23 85 45.62 85 52C85 59.73 78.73 66 71 66H32Z"
        stroke="url(#cloudGrad)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glow)"
      />

      {/* 内部两道轻风流动线 */}
      <path
        className="breeze-line-1"
        d="M34 50H62"
        stroke="#38bdf8"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        className="breeze-line-2"
        d="M40 58H56"
        stroke="#818cf8"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
};

/**
 * 2. 全屏动态背景矢量浮云与星辉 (多层独立缓动动画)
 */
export const AnimatedCloudBackground: React.FC = () => {
  return (
    <div className="cloud-bg-container" aria-hidden="true">
      <svg
        className="cloud-bg-svg"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="skyGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="skyGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.04" />
          </linearGradient>
          <radialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 呼吸漂浮的柔光光球 */}
        <circle cx="300" cy="200" r="280" fill="url(#orbGlow)" className="glow-orb orb-1" />
        <circle cx="1180" cy="650" r="320" fill="url(#orbGlow)" className="glow-orb orb-2" />
        <circle cx="800" cy="150" r="220" fill="url(#orbGlow)" className="glow-orb orb-3" />

        {/* 远景大云朵 (慢漂浮) */}
        <path
          className="bg-cloud cloud-layer-1"
          d="M120 420C75 420 40 385 40 340C40 298 72 264 113 261C127 216 168 184 218 184C276 184 324 227 332 283C361 292 383 318 383 350C383 389 351 420 313 420H120Z"
          fill="url(#skyGrad1)"
        />

        {/* 中景云朵 */}
        <path
          className="bg-cloud cloud-layer-2"
          d="M1020 320C980 320 950 288 950 250C950 213 979 184 1016 181C1029 141 1065 112 1110 112C1162 112 1205 151 1212 201C1238 209 1258 232 1258 261C1258 296 1230 320 1195 320H1020Z"
          fill="url(#skyGrad2)"
        />

        {/* 近景轻盈小云朵 */}
        <path
          className="bg-cloud cloud-layer-3"
          d="M600 780C565 780 540 752 540 720C540 689 564 664 595 661C606 626 637 600 675 600C720 600 756 634 762 677C784 684 800 704 800 728C800 757 776 780 746 780H600Z"
          fill="url(#skyGrad1)"
        />
      </svg>
    </div>
  );
};

/**
 * 3. 动态加载旋转双环 Spinner
 */
export const SpinnerSvg: React.FC<{ size?: number; className?: string }> = ({
  size = 20,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`spinner-svg ${className}`}
  >
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeOpacity="0.2"
    />
    <path
      d="M12 3C7.02944 3 3 7.02944 3 12"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 4. 动态绘制打勾成功图标 Checkmark
 */
export const CheckmarkSvg: React.FC<{ size?: number; className?: string }> = ({
  size = 48,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`checkmark-svg ${className}`}
  >
    <circle
      className="checkmark-circle"
      cx="24"
      cy="24"
      r="20"
      stroke="#10b981"
      strokeWidth="3"
    />
    <path
      className="checkmark-check"
      d="M14 24L21 31L34 17"
      stroke="#10b981"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 5. 输入框装饰图标
 */
export const UserIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const PhoneIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

export const LockIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const EyeOpenIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeCloseIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export const AlertTriangleSvg: React.FC<{ size?: number; className?: string }> = ({
  size = 40,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#ef4444"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`alert-triangle-svg ${className}`}
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const PingSvg: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);
