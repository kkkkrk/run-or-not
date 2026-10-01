'use client';

import { useEffect, useId, useRef, type CSSProperties } from 'react';
import { playRunner, type RunnerState } from './runnerMotion';

const LABEL: Record<RunnerState, string> = {
  idle: '대기 중',
  walk: '걸어도 탈 수 있어요',
  run: '뛰면 탈 수 있어요',
  rest: '이번 열차는 못 타요',
};

interface RunnerProps {
  state: RunnerState;
  /** 캐릭터 색. 안 주면 조상 요소의 CSS 변수 --runner-color, 그것도 없으면 민트 */
  color?: string;
  /** 뒤쪽 팔다리 색을 섞을 배경색 */
  bg?: string;
  className?: string;
}

export default function Runner({ state, color, bg, className }: RunnerProps) {
  const ref = useRef<SVGSVGElement>(null);
  // 한 페이지에 여러 개 있어도 mask id가 겹치지 않게
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const anims = playRunner(svg, state);
    return () => anims.forEach((a) => a.cancel());
  }, [state]);

  const style = {
    ...(color && { '--runner-color': color }),
    ...(bg && { '--runner-bg': bg }),
  } as CSSProperties;

  const limb = (len: number) => <line className="limb" x1={0} y1={0} x2={0} y2={len} />;

  return (
    <svg
      ref={ref}
      className={className ? `runner ${className}` : 'runner'}
      style={style}
      viewBox="0 0 200 220"
      role="img"
      aria-label={LABEL[state]}
    >
      <style>{`
        .runner { color: var(--runner-color, #86d1a8); overflow: visible; }
        .runner .limb { fill: none; stroke: currentColor; stroke-width: 9; stroke-linecap: round; }
        .runner .is-back .limb { opacity: .4; }
        @supports (color: color-mix(in srgb, red, blue)) {
          .runner .is-back .limb {
            opacity: 1;
            stroke: color-mix(in srgb, currentColor 40%, var(--runner-bg, #121417));
          }
        }
        .runner .head { fill: currentColor; }
        .runner .ground line { stroke: var(--runner-ground, #2d3036); stroke-width: 6; stroke-linecap: round; }
        .runner [data-part] { transform-box: view-box; transform-origin: 0 0; }
      `}</style>

      <defs>
        <linearGradient id={`${uid}-fade`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".22" stopColor="#fff" />
          <stop offset=".78" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={`${uid}-mask`} maskUnits="userSpaceOnUse" x="0" y="196" width="200" height="32">
          <rect x="0" y="196" width="200" height="32" fill={`url(#${uid}-fade)`} />
        </mask>
      </defs>

      {/* 바닥 대시: 한 칸 38px */}
      <g mask={`url(#${uid}-mask)`}>
        <g className="ground" data-part="ground">
          {Array.from({ length: 8 }, (_, i) => {
            const x = -35 + i * 38;
            return <line key={i} x1={x} x2={x + 22} y1="212" y2="212" />;
          })}
        </g>
      </g>

      {/* 골반 = (95,125). 허벅지·정강이 38, 위팔 28, 아래팔 26 */}
      <g transform="translate(95 125)">
        <g data-part="bob">
          {/* 뒤쪽 팔 */}
          <g data-part="lean">
            <g className="is-back" transform="translate(0 -42)">
              <g data-part="armB-upper">
                {limb(28)}
                <g transform="translate(0 28)"><g data-part="armB-lower">{limb(26)}</g></g>
              </g>
            </g>
          </g>

          {/* 뒤쪽 다리 */}
          <g className="is-back">
            <g data-part="legB-thigh">
              {limb(38)}
              <g transform="translate(0 38)"><g data-part="legB-shin">{limb(38)}</g></g>
            </g>
          </g>

          {/* 앞쪽 다리 */}
          <g data-part="legF-thigh">
            {limb(38)}
            <g transform="translate(0 38)"><g data-part="legF-shin">{limb(38)}</g></g>
          </g>

          {/* 몸통 · 머리 · 앞쪽 팔 */}
          <g data-part="lean">
            <line className="limb" x1={0} y1={0} x2={0} y2={-46} />
            <circle className="head" cx={0} cy={-64} r={15} />
            <g transform="translate(0 -42)">
              <g data-part="armF-upper">
                {limb(28)}
                <g transform="translate(0 28)"><g data-part="armF-lower">{limb(26)}</g></g>
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}