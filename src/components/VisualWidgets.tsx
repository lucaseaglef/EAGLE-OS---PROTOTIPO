import React from 'react';

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
        className={`eagle-card eagle-card-interactive rounded-[16px] cursor-pointer ${className}`}
      >
        {children}
      </div>
    );
  }

  return (
    <div className={`eagle-card rounded-[16px] ${className}`}>
      {children}
    </div>
  );
}
