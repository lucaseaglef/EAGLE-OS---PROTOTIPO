import React, { useId } from 'react';

/**
 * Anel de progresso SVG preciso (sem bibliotecas pesadas)
 * Usado para capacidade de agentes, progresso de projetos e metas.
 */
export function MicroRing({
  value,
  max = 100,
  size = 44,
  strokeWidth = 4,
  label,
  tone = 'accent',
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  tone?: 'accent' | 'success' | 'warning' | 'danger';
}) {
  const safeMax = Math.max(1, max);
  const pct = Math.max(0, Math.min(100, (value / safeMax) * 100));
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  const strokeColor =
    tone === 'success'
      ? 'stroke-[#15803d] dark:stroke-[#4ade80]'
      : tone === 'warning'
        ? 'stroke-[#b45309] dark:stroke-[#fbbf24]'
        : tone === 'danger'
          ? 'stroke-[#b91c1c] dark:stroke-[#f87171]'
          : 'stroke-[#163744] dark:stroke-[#9fdce6]';

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-[#e6e9ed] dark:stroke-[#232934]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className={`${strokeColor} transition-all duration-300`}
        />
      </svg>
      {label !== undefined && (
        <span className="absolute text-[11px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
          {label}
        </span>
      )}
    </div>
  );
}

export interface ProportionSegment {
  key: string;
  value: number;
  colorClass: string;
  label?: string;
}

/**
 * Barra horizontal proporcional segmentada em CSS raiz.
 */
export function ProportionBar({
  segments,
  heightClass = 'h-2',
  showLegend = false,
}: {
  segments: ProportionSegment[];
  heightClass?: string;
  showLegend?: boolean;
}) {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);

  return (
    <div className="space-y-2">
      <div
        className={`${heightClass} w-full rounded-full bg-[#e6e9ed] dark:bg-[#202631] overflow-hidden flex gap-0.5`}
      >
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((seg) => (
              <div
                key={seg.key}
                className={`h-full ${seg.colorClass} transition-all duration-300 first:rounded-l-full last:rounded-r-full`}
                style={{ width: `${(seg.value / total) * 100}%` }}
                title={seg.label ? `${seg.label}: ${seg.value}` : undefined}
              />
            ))}
      </div>

      {showLegend && (
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11.5px] text-[#0f1115]/58 dark:text-[#f2f4f7]/58">
          {segments
            .filter((s) => s.label)
            .map((seg) => (
              <span key={seg.key} className="inline-flex items-center gap-1.5 tabular-nums">
                <span className={`w-1.5 h-1.5 rounded-full ${seg.colorClass}`} aria-hidden="true" />
                <span>{seg.label}</span>
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

export interface SparkBarItem {
  key: string;
  label: string;
  value: number;
  tone?: 'accent' | 'success' | 'warning' | 'muted';
}

/**
 * Mini gráfico de barras SVG para comparação visual rápida.
 */
export function SparkBars({
  items,
  height = 42,
}: {
  items: SparkBarItem[];
  height?: number;
}) {
  const maxVal = Math.max(1, ...items.map((i) => Math.abs(i.value)));

  const fillFor = (tone?: SparkBarItem['tone']) => {
    switch (tone) {
      case 'success':
        return 'fill-[#15803d] dark:fill-[#4ade80]';
      case 'warning':
        return 'fill-[#b45309] dark:fill-[#fbbf24]';
      case 'muted':
        return 'fill-[#cbd2db] dark:fill-[#2d3544]';
      default:
        return 'fill-[#163744] dark:fill-[#9fdce6]';
    }
  };

  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {items.map((item) => {
        const ratio = Math.max(0.14, Math.abs(item.value) / maxVal);
        const barH = Math.round(ratio * (height - 4));
        return (
          <div
            key={item.key}
            title={`${item.label}: ${item.value}`}
            className="flex-1 h-full flex items-end"
          >
            <svg width="100%" height={height} className="overflow-visible">
              <rect
                x="0"
                y={height - barH}
                width="100%"
                height={barH}
                rx="4"
                className={`${fillFor(item.tone)} transition-all duration-300`}
              />
            </svg>
          </div>
        );
      })}
    </div>
  );
}

/* ========================================================================== */
/* GRÁFICOS DE ALTA PRECISÃO PARA O PAINEL BENTO                              */
/* ========================================================================== */

export interface ActivityBarDatum {
  key: string;
  label: string;
  value: number;
  highlight?: boolean;
  callout?: string;
}

/**
 * Gráfico de barras semanais com barra ativa hachurada diagonal + badge flutuante.
 */
export function HatchedActivityBars({
  data,
  onSelectBar,
}: {
  data: ActivityBarDatum[];
  onSelectBar?: (datum: ActivityBarDatum) => void;
}) {
  const uid = useId().replace(/:/g, '');
  const maxVal = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="w-full pt-5">
      <div className="grid grid-cols-7 gap-2 items-end h-[112px]">
        {data.map((d) => {
          const pct = Math.max(18, Math.round((d.value / maxVal) * 100));
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => onSelectBar?.(d)}
              title={`${d.label}: ${d.value}`}
              className="relative h-full flex flex-col justify-end items-center group cursor-pointer focus:outline-none"
            >
              {d.highlight && d.callout && (
                <span className="mb-1.5 px-2 py-0.5 rounded-[7px] bg-[#9fdce6] text-[#0f1115] dark:bg-[#9fdce6] dark:text-[#0f1115] text-[10.5px] font-semibold tabular-nums whitespace-nowrap shadow-[0_2px_6px_rgba(22,55,68,0.14)]">
                  {d.callout}
                </span>
              )}

              <div
                className="w-full rounded-[9px] overflow-hidden transition-all duration-300 relative"
                style={{ height: `${pct}%` }}
              >
                {d.highlight ? (
                  <svg className="w-full h-full block" aria-hidden="true">
                    <defs>
                      <pattern
                        id={`hatch-${uid}`}
                        width="7"
                        height="7"
                        patternTransform="rotate(42 0 0)"
                        patternUnits="userSpaceOnUse"
                      >
                        <rect width="7" height="7" className="fill-[#e6f3f6] dark:fill-[#152d37]" />
                        <line
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="7"
                          strokeWidth="3"
                          className="stroke-[#163744]/70 dark:stroke-[#9fdce6]/75"
                        />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill={`url(#hatch-${uid})`} />
                  </svg>
                ) : (
                  <div className="w-full h-full bg-[#ebeff3] dark:bg-[#1e242f] group-hover:bg-[#dfe5ec] dark:group-hover:bg-[#272f3d] transition-colors" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2 text-center">
        {data.map((d) => (
          <span
            key={d.key}
            className={`text-[11px] tabular-nums ${
              d.highlight
                ? 'font-semibold text-[#0f1115] dark:text-[#f2f4f7]'
                : 'text-[#0f1115]/44 dark:text-[#f2f4f7]/44'
            }`}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Gráfico de área comparativa com preenchimento hachurado entre duas séries + marcador de destaque.
 */
export function HatchedComparisonChart({
  labels,
  currentSeries,
  previousSeries,
  currentLabel,
  previousLabel,
  calloutLabel,
  calloutIndex = 4,
}: {
  labels: string[];
  currentSeries: number[];
  previousSeries: number[];
  currentLabel: string;
  previousLabel: string;
  calloutLabel: string;
  calloutIndex?: number;
}) {
  const uid = useId().replace(/:/g, '');
  const width = 440;
  const height = 114;
  const padX = 8;
  const padY = 16;

  const allVals = [...currentSeries, ...previousSeries];
  const minVal = Math.min(...allVals) * 0.85;
  const maxVal = Math.max(1, ...allVals) * 1.08;
  const range = Math.max(1, maxVal - minVal);

  const count = Math.max(2, labels.length);
  const toX = (i: number) => padX + (i / (count - 1)) * (width - padX * 2);
  const toY = (v: number) =>
    height - padY - ((v - minVal) / range) * (height - padY * 2);

  const topPoints = currentSeries.map((v, i) => [toX(i), toY(v)] as const);
  const botPoints = previousSeries.map((v, i) => [toX(i), toY(v)] as const);

  const toPath = (pts: ReadonlyArray<readonly [number, number]>) =>
    pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');

  const areaPath = `${toPath(topPoints)} ${[...botPoints]
    .reverse()
    .map((p) => `L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(' ')} Z`;

  const safeIdx = Math.min(Math.max(0, calloutIndex), topPoints.length - 1);
  const calloutPt = topPoints[safeIdx];
  const midY = (topPoints[safeIdx][1] + botPoints[safeIdx][1]) / 2;

  return (
    <div className="w-full">
      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-[116px] overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id={`comp-hatch-${uid}`}
              width="6"
              height="6"
              patternTransform="rotate(42 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="6"
                strokeWidth="2.2"
                className="stroke-[#163744]/28 dark:stroke-[#9fdce6]/32"
              />
            </pattern>
          </defs>

          <path d={areaPath} fill={`url(#comp-hatch-${uid})`} />

          <path
            d={toPath(botPoints)}
            fill="none"
            strokeWidth="1.5"
            className="stroke-[#0f1115]/22 dark:stroke-[#f2f4f7]/25"
          />

          <path
            d={toPath(topPoints)}
            fill="none"
            strokeWidth="2"
            className="stroke-[#163744] dark:stroke-[#9fdce6]"
          />

          <text
            x={padX}
            y={topPoints[0][1] - 7}
            className="fill-[#0f1115]/48 dark:fill-[#f2f4f7]/48 text-[10px] font-medium"
          >
            {currentLabel}
          </text>
          <text
            x={padX}
            y={botPoints[0][1] + 13}
            className="fill-[#0f1115]/38 dark:fill-[#f2f4f7]/38 text-[10px] font-medium"
          >
            {previousLabel}
          </text>
        </svg>

        {calloutPt && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded-[7px] bg-[#9fdce6] text-[#0f1115] text-[10.5px] font-semibold tabular-nums shadow-[0_2px_6px_rgba(22,55,68,0.16)] pointer-events-none"
            style={{
              left: `${(calloutPt[0] / width) * 100}%`,
              top: `${(midY / height) * 100}%`,
            }}
          >
            {calloutLabel}
          </div>
        )}
      </div>

      <div className="mt-1 grid grid-cols-7 text-center">
        {labels.map((lbl, idx) => (
          <span
            key={lbl}
            className={`text-[11px] ${
              idx === safeIdx
                ? 'font-semibold text-[#0f1115] dark:text-[#f2f4f7]'
                : 'text-[#0f1115]/44 dark:text-[#f2f4f7]/44'
            }`}
          >
            {lbl}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Gráfico de curva spline suave com pontos vazados e badge de pico.
 */
export function SplineTrendChart({
  labels,
  values,
  peakIndex = 3,
  peakCallout,
}: {
  labels: string[];
  values: number[];
  peakIndex?: number;
  peakCallout: string;
}) {
  const width = 280;
  const height = 96;
  const padX = 14;
  const padY = 24;

  const minVal = Math.min(...values) * 0.8;
  const maxVal = Math.max(1, ...values) * 1.1;
  const range = Math.max(1, maxVal - minVal);

  const count = Math.max(2, values.length);
  const pts = values.map((v, i) => ({
    x: padX + (i / (count - 1)) * (width - padX * 2),
    y: height - 14 - ((v - minVal) / range) * (height - padY - 14),
  }));

  const buildSmoothPath = (points: Array<{ x: number; y: number }>) => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const mx = ((curr.x + next.x) / 2).toFixed(1);
      d += ` C ${mx} ${curr.y.toFixed(1)}, ${mx} ${next.y.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
    }
    return d;
  };

  const safePeak = Math.min(Math.max(0, peakIndex), pts.length - 1);
  const peakPt = pts[safePeak];

  return (
    <div className="w-full">
      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-[96px] overflow-visible"
          aria-hidden="true"
        >
          <path
            d={buildSmoothPath(pts)}
            fill="none"
            strokeWidth="1.8"
            className="stroke-[#0f1115]/30 dark:stroke-[#f2f4f7]/35"
          />

          {pts.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r={idx === safePeak ? 4 : 3}
              strokeWidth="2"
              className={
                idx === safePeak
                  ? 'fill-[#9fdce6] stroke-[#163744] dark:fill-[#9fdce6] dark:stroke-[#0f1115]'
                  : 'fill-white dark:fill-[#15181f] stroke-[#0f1115]/45 dark:stroke-[#f2f4f7]/45'
              }
            />
          ))}
        </svg>

        {peakPt && (
          <div
            className="absolute -translate-x-1/2 -translate-y-full px-2 py-0.5 rounded-[7px] bg-[#9fdce6] text-[#0f1115] text-[10.5px] font-semibold tabular-nums shadow-[0_2px_6px_rgba(22,55,68,0.16)] pointer-events-none"
            style={{
              left: `${(peakPt.x / width) * 100}%`,
              top: `${Math.max(18, ((peakPt.y - 8) / height) * 100)}%`,
            }}
          >
            {peakCallout}
          </div>
        )}
      </div>

      <div className="grid grid-cols-7 text-center">
        {labels.map((lbl, idx) => (
          <span
            key={lbl}
            className={`text-[10.5px] ${
              idx === safePeak
                ? 'font-semibold text-[#0f1115] dark:text-[#f2f4f7]'
                : 'text-[#0f1115]/42 dark:text-[#f2f4f7]/42'
            }`}
          >
            {lbl}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Arte geométrica autoral em Petróleo e Ciano para o card-herói do Painel.
 */
export function StudioSculptureGraphic() {
  const spheres = [
    { cx: 196, cy: 46, r: 22, shade: 'dark' },
    { cx: 164, cy: 68, r: 19, shade: 'mid' },
    { cx: 218, cy: 76, r: 16, shade: 'light' },
    { cx: 186, cy: 96, r: 24, shade: 'bright' },
    { cx: 144, cy: 98, r: 15, shade: 'dark' },
    { cx: 216, cy: 114, r: 20, shade: 'mid' },
    { cx: 168, cy: 132, r: 21, shade: 'dark' },
    { cx: 126, cy: 128, r: 16, shade: 'bright' },
    { cx: 88, cy: 142, r: 18, shade: 'mid' },
    { cx: 56, cy: 158, r: 14, shade: 'bright' },
    { cx: 110, cy: 164, r: 17, shade: 'light' },
    { cx: 150, cy: 168, r: 20, shade: 'bright' },
    { cx: 196, cy: 154, r: 16, shade: 'light' },
    { cx: 112, cy: 58, r: 8, shade: 'mid' },
    { cx: 236, cy: 52, r: 9, shade: 'light' },
    { cx: 78, cy: 112, r: 7, shade: 'bright' },
    { cx: 232, cy: 148, r: 8, shade: 'dark' },
  ] as const;

  return (
    <svg
      viewBox="0 0 260 190"
      className="w-full h-full select-none pointer-events-none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="eagle-sph-bright" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#e2f8fb" />
          <stop offset="55%" stopColor="#9fdce6" />
          <stop offset="100%" stopColor="#3e7f91" />
        </radialGradient>
        <radialGradient id="eagle-sph-mid" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#9fdce6" />
          <stop offset="50%" stopColor="#2f6678" />
          <stop offset="100%" stopColor="#163744" />
        </radialGradient>
        <radialGradient id="eagle-sph-dark" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#4f8b9c" />
          <stop offset="55%" stopColor="#163744" />
          <stop offset="100%" stopColor="#0b1f27" />
        </radialGradient>
        <radialGradient id="eagle-sph-light" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#eefafd" />
          <stop offset="55%" stopColor="#b7e7ef" />
          <stop offset="100%" stopColor="#5898aa" />
        </radialGradient>
      </defs>

      {spheres.map((s, idx) => (
        <circle
          key={idx}
          cx={s.cx}
          cy={s.cy}
          r={s.r}
          fill={`url(#eagle-sph-${s.shade})`}
        />
      ))}
    </svg>
  );
}

/**
 * Container modular Bento de elevação única.
 */
export function BentoCard({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        className={`eagle-card eagle-card-interactive rounded-[20px] cursor-pointer ${className}`}
      >
        {children}
      </div>
    );
  }

  return (
    <div className={`eagle-card rounded-[20px] ${className}`}>
      {children}
    </div>
  );
}
