import type { CSSProperties, ReactNode } from 'react';

/** 공용 색 */
export const GOLD = (a: number) => `rgba(230,200,126,${a})`;
export const CREAM = '#f0e2bf';
export const GOLD_TEXT = '#eed9a4';

/** 붉은 주 버튼 */
export const primaryBtn: CSSProperties = {
  borderRadius: 8,
  border: `1px solid ${GOLD(0.65)}`,
  background: 'linear-gradient(180deg,#94202a,#6c1218)',
  color: '#f5e9cf',
  fontWeight: 600,
  cursor: 'pointer',
};

/** 투명 보조 버튼 */
export const ghostBtn: CSSProperties = {
  borderRadius: 8,
  border: `1px solid ${GOLD(0.45)}`,
  background: 'rgba(12,5,4,.5)',
  color: 'rgba(240,226,191,.85)',
  cursor: 'pointer',
};

/** 이중 금테 패널 */
export const panel: CSSProperties = {
  background: 'rgba(22,9,7,.78)',
  border: `1px solid ${GOLD(0.5)}`,
  boxShadow: `inset 0 0 0 1px ${GOLD(0.14)}, inset 0 0 0 5px rgba(22,9,7,.6), inset 0 0 0 6px ${GOLD(
    0.22,
  )}, 0 24px 60px rgba(0,0,0,.55)`,
  borderRadius: 6,
  backdropFilter: 'blur(10px)',
};

/** 붉은 낙관(도장) 사각 */
export function Seal({ char, size = 48 }: { char: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.2,
        background: 'linear-gradient(180deg,#9c2027,#701318)',
        border: `1px solid ${GOLD(0.75)}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#f0dcae',
        fontFamily: "'Song Myung', serif",
        fontSize: size * 0.5,
        flex: 'none',
      }}
    >
      {char}
    </div>
  );
}

/** ─── ◆ ─── 구분선 */
export function Divider({ margin = '18px 0 24px' }: { margin?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD(0.45)})` }} />
      <div style={{ width: 7, height: 7, background: GOLD(0.7), transform: 'rotate(45deg)' }} />
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GOLD(0.45)}, transparent)` }} />
    </div>
  );
}

/** 말하는 중 이퀄라이저 바 */
export function SpeakingBars({ height = 10 }: { height?: number }) {
  const bar = (delay: string): CSSProperties => ({
    width: 2,
    height,
    background: '#9fdcab',
    transformOrigin: 'bottom',
    animation: `eq .8s ease ${delay} infinite`,
  });
  return (
    <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 1.5, height }}>
      <span style={bar('0s')} />
      <span style={bar('.2s')} />
      <span style={bar('.4s')} />
    </span>
  );
}

/** 배경 이미지 + 어두운 그라데이션 오버레이 풀스크린 래퍼 */
export function Backdrop({
  image,
  overlay,
  children,
  scroll = false,
}: {
  image: string;
  overlay: string;
  children: ReactNode;
  scroll?: boolean;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: `url('${image}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        overflow: scroll ? 'auto' : 'hidden',
      }}
    >
      <div style={{ position: 'fixed', inset: 0, background: overlay }} />
      {children}
    </div>
  );
}
