import { useId } from 'react';

export interface OvalGuideProps { className?: string }

export default function OvalGuide({ className = '' }: OvalGuideProps) {
  const maskId = useId();
  return (
    <svg className={`oval-guide ${className}`} viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="-1000" y="-1000" width="2400" height="2300">
          <rect x="-1000" y="-1000" width="2400" height="2300" fill="white" />
          <ellipse cx="200" cy="150" rx="82" ry="120" fill="black" />
        </mask>
      </defs>
      {/* Phủ cả khoảng letterbox của SVG; ellipse vẫn giữ tỷ lệ gốc. */}
      <rect x="-1000" y="-1000" width="2400" height="2300" className="oval-shade" mask={`url(#${maskId})`} />
      <ellipse cx="200" cy="150" rx="82" ry="120" fill="none" className="oval-outline" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
