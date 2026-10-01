/**
 * 뛸까말까 러너 — Web Animations API 모션 정의
 *
 * 각도 규칙 (SVG rotate 기준, 캐릭터는 오른쪽을 봄)
 *   0°    = 팔다리가 바로 아래를 향함
 *   음수  = 앞으로(오른쪽) 뻗음
 *   양수  = 뒤로(왼쪽) 뻗음
 *   shin/lower 는 부모(허벅지/위팔) 기준 상대 각도
 *     - 무릎이 접히면 shin 은 양수, 팔꿈치가 접히면 lower 는 음수
 */

export type RunnerState = 'idle' | 'walk' | 'run' | 'rest';

type PartName =
  | 'bob' | 'lean'
  | 'legF-thigh' | 'legF-shin' | 'legB-thigh' | 'legB-shin'
  | 'armF-upper' | 'armF-lower' | 'armB-upper' | 'armB-lower';

interface PartTrack {
  values: number[];        // 한 사이클 동안 균등 간격으로 놓인 값 (마지막→처음으로 자동 연결)
  offset?: number;         // iterationStart (0~1). 뒷다리는 0.5 = 반 박자 늦게
}

interface StateSpec {
  duration: number;                      // 한 사이클(ms)
  groundSpeed: number;                   // 바닥 스크롤 속도(px/s), 0 이면 멈춤
  parts: Partial<Record<PartName, PartTrack>>;
}

/* ---------- 헬퍼 ---------- */

// 몇 개의 키 포즈만 적어도 부드럽게 이어지도록 주기형 Catmull-Rom 보간
// (값이 2개면 양 끝 기울기가 0 → ease-in-out 왕복이 됨). 한 사이클 ≈ 32프레임
function smoothLoop(v: number[]): number[] {
  const n = v.length;
  if (n < 2) return [v[0] ?? 0, v[0] ?? 0];
  const sub = Math.ceil(32 / n);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = v[(i - 1 + n) % n], p1 = v[i], p2 = v[(i + 1) % n], p3 = v[(i + 2) % n];
    for (let s = 0; s < sub; s++) {
      const t = s / sub, t2 = t * t, t3 = t2 * t;
      out.push(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3));
    }
  }
  out.push(out[0]);
  return out.map((x) => Math.round(x * 100) / 100);
}

// 걷기·뛰기처럼 좌우가 반 박자씩 엇갈리는 동작: 한쪽 다리/팔만 정의하면 반대쪽은 offset 0.5
function gait(g: {
  thigh: number[]; shin: number[];
  upper: number[]; lower: number[];   // index 0 = 팔이 가장 앞
  bob: number[]; lean: number[];
}): StateSpec['parts'] {
  return {
    bob: { values: g.bob },
    lean: { values: g.lean },
    'legF-thigh': { values: g.thigh },
    'legF-shin': { values: g.shin },
    'legB-thigh': { values: g.thigh, offset: 0.5 },
    'legB-shin': { values: g.shin, offset: 0.5 },
    // 앞다리가 앞으로 나갈 때 같은 쪽 팔은 뒤로 → 앞팔 0.5, 뒷팔 0
    'armF-upper': { values: g.upper, offset: 0.5 },
    'armF-lower': { values: g.lower, offset: 0.5 },
    'armB-upper': { values: g.upper },
    'armB-lower': { values: g.lower },
  };
}

const still = (v: number): PartTrack => ({ values: [v, v] });

/* ---------- 상태별 모션 ---------- */

export const RUNNER_STATES: Record<RunnerState, StateSpec> = {
  // 대기: 제자리에서 숨 쉬듯 살짝 들썩임
  idle: {
    duration: 2400,
    groundSpeed: 0,
    parts: {
      lean: { values: [0, 1, 0, -0.5] },
      'legF-thigh': still(-5), 'legF-shin': still(3),
      'legB-thigh': still(6), 'legB-shin': still(0),
      'armF-upper': { values: [-4, -6, -4, -2] },
      'armF-lower': { values: [-8, -11, -8, -6] },
      'armB-upper': { values: [6, 8, 6, 4] },
      'armB-lower': { values: [-6, -9, -6, -4] },
    },
  },

  // 걷기: "걸어도 탐" — 첨부 이미지 동작
  walk: {
    duration: 1000,
    groundSpeed: 120, // 딛는 발이 뒤로 밀리는 속도와 맞춤 (미끄러짐 방지)
    parts: gait({
      //       접지  하중  중간  미는중 차고나감 스윙  지나감 뻗음
      thigh: [-25, -15, 0, 12, 25, 15, -5, -22],
      shin:  [4, 14, 5, 6, 20, 40, 42, 16],
      upper: [-22, -16, 0, 14, 20, 14, 0, -16],
      lower: [-26, -20, -12, -8, -8, -10, -16, -22],
      bob:   [6.1, 1.3, 0.1, 2.7, 6.1, 1.3, 0.1, 2.7], // 딛는 발이 바닥에 닿도록 다리 각도로 계산한 값
      lean:  [3, 3, 3, 3, 3, 3, 3, 3],
    }),
  },

  // 전력질주: "뛰면 탐"
  run: {
    duration: 620,
    groundSpeed: 305, // 딛는 발 속도와 맞춤
    parts: gait({
      thigh: [-30, -8, 15, 34, 20, -10, -42, -52],
      shin:  [18, 32, 24, 48, 100, 118, 82, 34],
      upper: [-58, -40, -5, 30, 42, 26, -12, -46],
      lower: [-100, -92, -76, -60, -56, -66, -84, -98],
      bob:   [6, 4, 9.5, 1, 6, 4, 9.5, 1], // 접지 구간은 발이 바닥에, 3·7번은 공중
      lean:  [13, 14, 13, 12, 13, 14, 13, 12],
    }),
  },

  // 멈춤·숨고르기: "못 탐" — 무릎 짚고 헉헉
  rest: {
    duration: 1300,
    groundSpeed: 0,
    parts: {
      bob: still(14), // 무릎을 굽힌 만큼 골반을 내려 발이 바닥에 닿게
      lean: { values: [55, 59] }, // 숨 쉴 때 등이 오르내림
      'legF-thigh': still(-40), 'legF-shin': still(70),
      'legB-thigh': still(-25), 'legB-shin': still(68),
      // 상체가 움직여도 손이 무릎 위에 머물도록 역산(IK)한 각도
      'armF-upper': { values: [-25, -21] },
      'armF-lower': { values: [-33, -45] },
      'armB-upper': { values: [-34, -35] },
      'armB-lower': { values: [-4, -4] },
    },
  },
};

/* ---------- 재생 ---------- */

const GROUND_PERIOD = 38; // SVG 안 바닥 대시 한 칸(대시+간격) 길이

/**
 * svg 안의 [data-part] 요소들에 해당 상태의 애니메이션을 건다.
 * 이전 애니메이션은 즉시 취소(즉시 교체 방식).
 * 반환값: 생성된 Animation 배열 (pause/playbackRate 제어용)
 */
export function playRunner(svg: SVGSVGElement, state: RunnerState): Animation[] {
  svg.getAnimations({ subtree: true }).forEach((a) => a.cancel());

  const spec = RUNNER_STATES[state];
  const anims: Animation[] = [];
  if (!spec) return anims; // 잘못된 상태 문자열이 들어와도 죽지 않게

  for (const [part, track] of Object.entries(spec.parts) as [PartName, PartTrack][]) {
    const frames = smoothLoop(track.values).map((v) => ({
      transform: part === 'bob' ? `translateY(${v}px)` : `rotate(${v}deg)`,
    }));
    svg.querySelectorAll<SVGGElement>(`[data-part="${part}"]`).forEach((el) => {
      anims.push(
        el.animate(frames, {
          duration: spec.duration,
          iterations: Infinity,
          iterationStart: track.offset ?? 0,
          easing: 'linear', // 부드러움은 smoothLoop 가 담당
        }),
      );
    });
  }

  const ground = svg.querySelector<SVGGElement>('[data-part="ground"]');
  if (ground && spec.groundSpeed > 0) {
    anims.push(
      ground.animate(
        [{ transform: 'translateX(0)' }, { transform: `translateX(-${GROUND_PERIOD}px)` }],
        { duration: (GROUND_PERIOD / spec.groundSpeed) * 1000, iterations: Infinity },
      ),
    );
  }

  // 모션 줄이기 설정이면 첫 포즈에서 정지
//   if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
//     anims.forEach((a) => a.pause());
//   }
  return anims;
}

