import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown } from 'lucide-react';
import { AgentOperationalStatus, Member } from '../types/eagle';
import avatarLucasImg from '../assets/images/avatar_lucas_v3_1794636817675.jpg';
import avatarMarianaImg from '../assets/images/avatar_mariana_v3_1794636818808.jpg';
import avatarRafaelImg from '../assets/images/avatar_rafael_v2_1794636616595.jpg';
import avatarCamilaImg from '../assets/images/avatar_camila_v3_1794636819729.jpg';
import avatarClaraImg from '../assets/images/avatar_clara_v2_1794636617161.jpg';
import avatarCaioImg from '../assets/images/avatar_caio_v3_1794636821170.jpg';
import avatarHelenaImg from '../assets/images/avatar_helena_v3_1794636821451.jpg';
import avatarBrunoImg from '../assets/images/avatar_bruno_v2_1794636619369.jpg';
import avatarSofiaImg from '../assets/images/avatar_sofia_v3_1794636822447.jpg';
import avatarMateusImg from '../assets/images/avatar_mateus_v3_1794636820976.jpg';

/* ========================================================================== */
/* BADGE PADRÃO GLOBAL                                                        */
/* ========================================================================== */

export type BadgeVariant =
  | 'neutral'
  | 'petroleo'
  | 'cyan'
  | 'success'
  | 'warning'
  | 'danger'
  | 'dark';

const BADGE_CLASSES: Record<BadgeVariant, string> = {
  neutral:
    'bg-[#ebeff3] text-[#0f1115]/78 dark:bg-[#202632] dark:text-[#f2f4f7]/80 border border-[#0f1115]/6 dark:border-[#f2f4f7]/8',
  petroleo:
    'bg-[#163744]/10 text-[#163744] dark:bg-[#9fdce6]/16 dark:text-[#9fdce6] border border-[#163744]/12 dark:border-[#9fdce6]/20',
  cyan:
    'bg-[#9fdce6] text-[#0f1115] border border-[#163744]/10',
  success:
    'bg-[#15803d]/12 text-[#166534] dark:bg-[#4ade80]/16 dark:text-[#4ade80] border border-[#15803d]/15 dark:border-[#4ade80]/20',
  warning:
    'bg-[#b45309]/12 text-[#92400e] dark:bg-[#fbbf24]/16 dark:text-[#fbbf24] border border-[#b45309]/15 dark:border-[#fbbf24]/20',
  danger:
    'bg-[#b91c1c]/12 text-[#991b1b] dark:bg-[#f87171]/16 dark:text-[#f87171] border border-[#b91c1c]/15 dark:border-[#f87171]/20',
  dark:
    'bg-[#0f1115] text-[#f2f4f7] dark:bg-[#f2f4f7] dark:text-[#0f1115] border border-transparent',
};

export function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
  className = '',
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}) {
  const sizeClass =
    size === 'xs'
      ? 'h-5 px-2 text-[10.5px] rounded-[7px]'
      : size === 'md'
        ? 'h-7 px-3 text-[12px] rounded-[10px]'
        : 'h-6 px-2.5 text-[11px] rounded-[8px]';

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold whitespace-nowrap shrink-0 tabular-nums ${sizeClass} ${BADGE_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

/* ========================================================================== */
/* BOTÕES PADRÃO GLOBAL                                                       */
/* ========================================================================== */

export type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'cyan' | 'ghost';

const BUTTON_CLASSES: Record<ButtonVariant, string> = {
  primary: 'eagle-btn-primary',
  secondary: 'eagle-btn-secondary',
  dark: 'bg-[#0f1115] hover:bg-[#1e242e] text-[#f2f4f7] dark:bg-[#f2f4f7] dark:hover:bg-white dark:text-[#0f1115] border border-transparent shadow-xs',
  cyan: 'bg-[#9fdce6] hover:bg-[#8bd2de] text-[#0f1115] border border-[#163744]/10 shadow-xs',
  ghost:
    'bg-transparent hover:bg-[#0f1115]/6 dark:hover:bg-[#f2f4f7]/8 text-[#0f1115]/75 dark:text-[#f2f4f7]/80 border border-transparent',
};

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  shape = 'rounded',
  className = '',
  type = 'button',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  shape?: 'rounded' | 'pill';
}) {
  const sizeClass =
    size === 'xs'
      ? 'h-7 px-2.5 text-[11.5px] gap-1'
      : size === 'sm'
        ? 'h-8 px-3 text-[12px] gap-1.5'
        : size === 'lg'
          ? 'h-10 px-4 text-[13.5px] gap-2'
          : 'h-9 px-3.5 text-[13px] gap-1.5';

  const radiusClass = shape === 'pill' ? 'rounded-full' : 'rounded-[10px]';

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${sizeClass} ${radiusClass} ${BUTTON_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export type IconButtonVariant = 'neutral' | 'cyan' | 'glass' | 'dark' | 'petroleo';

const ICON_BTN_CLASSES: Record<IconButtonVariant, string> = {
  neutral:
    'border border-[#0f1115]/8 dark:border-[#f2f4f7]/10 bg-[#f2f4f7]/85 dark:bg-[#1b2029] hover:bg-[#e6e9ed] dark:hover:bg-[#252c39] text-[#0f1115]/75 dark:text-[#f2f4f7]/80',
  cyan:
    'bg-[#9fdce6] hover:bg-[#8bd2de] text-[#0f1115] border border-white/80 dark:border-[#0f1115]/50 shadow-[0_3px_10px_rgba(22,55,68,0.14)]',
  glass:
    'backdrop-blur-md backdrop-saturate-150 bg-white/74 dark:bg-[#141922]/74 hover:bg-white dark:hover:bg-[#1e242f] border border-white/80 dark:border-white/15 text-[#0f1115] dark:text-[#f2f4f7]',
  dark:
    'bg-[#0f1115] hover:bg-[#1e242e] text-white border border-white/10',
  petroleo:
    'bg-white/14 hover:bg-white/24 text-white border border-white/18',
};

export function ActionIconButton({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  type = 'button',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: IconButtonVariant;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClass =
    size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-9.5 h-9.5' : 'w-8 h-8';

  return (
    <button
      type={type}
      className={`${sizeClass} rounded-full inline-flex items-center justify-center shrink-0 transition-all cursor-pointer active:scale-95 disabled:opacity-45 ${ICON_BTN_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ========================================================================== */
/* ABAS ESTILO PASTA ARQUITETURAL                                             */
/* ========================================================================== */

export interface TabItem<T extends string> {
  id: T;
  label: string;
  count?: number;
}

export function FolderTabs<T extends string>({
  items,
  value,
  onChange,
  layoutId,
  className = '',
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  layoutId: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={`inline-flex items-center gap-1 overflow-x-auto max-w-full ${className}`}
    >
      {items.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`relative h-9 px-3.5 text-[12.5px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer rounded-t-[12px] ${
              active
                ? 'text-[#0f1115] dark:text-[#f2f4f7] font-semibold'
                : 'text-[#0f1115]/55 dark:text-[#f2f4f7]/55 hover:text-[#0f1115] dark:hover:text-[#f2f4f7]'
            }`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 bg-white dark:bg-[#15181f] rounded-t-[12px] border-t border-x border-[#0f1115]/8 dark:border-[#f2f4f7]/10"
                aria-hidden="true"
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span
                  className={`text-[11px] tabular-nums ${
                    active
                      ? 'text-[#163744] dark:text-[#9fdce6]'
                      : 'text-[#0f1115]/40 dark:text-[#f2f4f7]/40'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ========================================================================== */
/* SISTEMA GLOBAL DE AVATARES (HUMANO + ORB EXPRESSIVO EAGLE IA + CLIENTE)    */
/* ========================================================================== */

const AGENT_ORB_PALETTES: Record<
  string,
  { core: string; mid: string; edge: string; glow: string }
> = {
  'ag-clara': {
    core: '#e2f9fc',
    mid: '#76cfd9',
    edge: '#163744',
    glow: '#9fdce6',
  },
  'ag-caio': {
    core: '#dcfaef',
    mid: '#4db99c',
    edge: '#133d38',
    glow: '#6ee7b7',
  },
  'ag-helena': {
    core: '#fef3d8',
    mid: '#d6a456',
    edge: '#3d2a16',
    glow: '#fcd34d',
  },
  'ag-bruno': {
    core: '#e2ecff',
    mid: '#5c93d6',
    edge: '#162944',
    glow: '#93c5fd',
  },
  'ag-sofia': {
    core: '#ffe4e6',
    mid: '#d97884',
    edge: '#441822',
    glow: '#fda4af',
  },
  'ag-mateus': {
    core: '#e0f4ff',
    mid: '#4fa8c4',
    edge: '#103140',
    glow: '#7dd3fc',
  },
};

const HUMAN_PORTRAIT_TONES: Record<string, string> = {
  'mem-lucas':
    'from-[#163744] via-[#224f61] to-[#0f1115] text-[#f2f4f7] ring-[#9fdce6]/25',
  'mem-mariana':
    'from-[#314152] via-[#455a6f] to-[#1e2733] text-[#f2f4f7] ring-white/20',
  'mem-rafael':
    'from-[#3b332e] via-[#574941] to-[#231d19] text-[#f2f4f7] ring-white/20',
  'mem-camila':
    'from-[#2b4240] via-[#3c5c59] to-[#192826] text-[#f2f4f7] ring-white/20',
};

/**
 * Orb vivo da Eagle com olhos e boca expressivos conforme o estado operacional.
 */
export function EagleAgentOrb({
  agentId,
  status = 'parado',
  sizePx = 32,
}: {
  agentId: string;
  status?: AgentOperationalStatus;
  sizePx?: number;
}) {
  const palette = AGENT_ORB_PALETTES[agentId] ?? AGENT_ORB_PALETTES['ag-clara'];
  const gradId = `orb-${agentId.replace(/[^a-z0-9]/gi, '')}-${sizePx}`;
  const isWorking = status === 'trabalhando';
  const isProblem = status === 'problema';

  return (
    <svg
      width={sizePx}
      height={sizePx}
      viewBox="0 0 40 40"
      className="block shrink-0 select-none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={gradId} cx="35%" cy="28%" r="72%">
          <stop offset="0%" stopColor={palette.core} />
          <stop offset="52%" stopColor={palette.mid} />
          <stop offset="100%" stopColor={palette.edge} />
        </radialGradient>
      </defs>

      {/* Esfera principal do Orb */}
      <circle cx="20" cy="20" r="19" fill={`url(#${gradId})`} />

      {/* Reflexo vítreo superior */}
      <ellipse cx="14.5" cy="11" rx="7.5" ry="4" fill="rgba(255,255,255,0.34)" />

      {/* Visor escuro interno estilo Eagle */}
      <rect
        x="9"
        y="14"
        width="22"
        height="13.5"
        rx="6.75"
        fill="rgba(11, 17, 23, 0.78)"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="0.8"
      />

      {/* Olhos */}
      {isProblem ? (
        <>
          <circle cx="15" cy="19.5" r="2.1" fill="#fca5a5" />
          <circle cx="25" cy="19.5" r="2.1" fill="#fca5a5" />
        </>
      ) : isWorking ? (
        <>
          <ellipse cx="15" cy="19.5" rx="2" ry="2.4" fill={palette.glow} />
          <ellipse cx="25" cy="19.5" rx="2" ry="2.4" fill={palette.glow} />
          <circle cx="15.6" cy="18.6" r="0.7" fill="#ffffff" />
          <circle cx="25.6" cy="18.6" r="0.7" fill="#ffffff" />
        </>
      ) : (
        <>
          <line
            x1="13.2"
            y1="19.5"
            x2="16.8"
            y2="19.5"
            stroke={palette.glow}
            strokeWidth="1.9"
            strokeLinecap="round"
          />
          <line
            x1="23.2"
            y1="19.5"
            x2="26.8"
            y2="19.5"
            stroke={palette.glow}
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </>
      )}

      {/* Boca expressiva */}
      {isProblem ? (
        <path
          d="M 16.5 24.4 Q 20 22.3 23.5 24.4"
          fill="none"
          stroke="#fca5a5"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ) : isWorking ? (
        <path
          d="M 16.2 23 Q 20 25.6 23.8 23"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M 17 23.6 Q 20 24.7 23 23.6"
          fill="none"
          stroke="rgba(255,255,255,0.72)"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

const MEMBER_AVATAR_IMAGES: Record<string, string> = {
  'mem-lucas': avatarLucasImg,
  'mem-mariana': avatarMarianaImg,
  'mem-rafael': avatarRafaelImg,
  'mem-camila': avatarCamilaImg,
  'ag-clara': avatarClaraImg,
  'ag-caio': avatarCaioImg,
  'ag-helena': avatarHelenaImg,
  'ag-bruno': avatarBrunoImg,
  'ag-sofia': avatarSofiaImg,
  'ag-mateus': avatarMateusImg,
};

/**
 * Avatar global da Eagle OS para pessoas e agentes de IA.
 * Renderiza retratos vívidos imersos na profissão dentro de cápsula Orb metálica,
 * com fallback automático caso a imagem falhe ou o membro seja novo.
 */
export function GlobalMemberAvatar({
  member,
  size = 'sm',
  showOperationalRing = false,
}: {
  member?: Member;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showOperationalRing?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  const dims: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', { box: string; px: number; text: string }> = {
    xs: { box: 'w-6 h-6 rounded-full', px: 24, text: 'text-[9.5px]' },
    sm: { box: 'w-7.5 h-7.5 rounded-full', px: 30, text: 'text-[10.5px]' },
    md: { box: 'w-9.5 h-9.5 rounded-full', px: 38, text: 'text-[12px]' },
    lg: { box: 'w-12 h-12 rounded-full', px: 48, text: 'text-[13.5px]' },
    xl: { box: 'w-16 h-16 rounded-full', px: 64, text: 'text-[16px]' },
  };

  const spec = dims[size];

  if (!member) {
    return (
      <div
        className={`${spec.box} ${spec.text} bg-[#ebeff3] dark:bg-[#1b2029] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 inline-flex items-center justify-center font-semibold shrink-0 border border-[#0f1115]/8 dark:border-[#f2f4f7]/10`}
      >
        —
      </div>
    );
  }

  const isAgent = member.tipo === 'agente';
  const op = member.estadoOperacional;
  const resolvedAvatar = !imgFailed
    ? (MEMBER_AVATAR_IMAGES[member.id] ?? member.avatarUrl)
    : undefined;
  const humanTone =
    HUMAN_PORTRAIT_TONES[member.id] ??
    'from-[#26323f] via-[#374656] to-[#171e26] text-[#f2f4f7] ring-white/15';

  const ringClass = isAgent
    ? op === 'trabalhando'
      ? 'ring-[#9fdce6]/80 shadow-[0_3px_12px_rgba(22,55,68,0.28)]'
      : op === 'problema'
        ? 'ring-[#f87171]/80 shadow-[0_3px_12px_rgba(185,28,28,0.25)]'
        : 'ring-[#163744]/25 dark:ring-white/20 shadow-[0_2px_8px_rgba(15,17,21,0.18)]'
    : 'ring-[#163744]/20 dark:ring-[#9fdce6]/30 shadow-[0_2px_8px_rgba(15,17,21,0.16)]';

  return (
    <div
      title={`${member.nome} · ${member.cargo}`}
      className={`relative ${spec.box} inline-flex items-center justify-center shrink-0 select-none`}
    >
      {resolvedAvatar ? (
        <div
          className={`${spec.box} rounded-full overflow-hidden ring-1 ${ringClass} bg-[#0e1b22] relative`}
        >
          <img
            src={resolvedAvatar}
            alt={`${member.nome} — ${member.cargo}`}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover scale-[1.06] transition-transform duration-300"
          />
          <span
            className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/25"
            aria-hidden="true"
          />
        </div>
      ) : isAgent ? (
        <div className={`rounded-full overflow-hidden ring-1 ${ringClass}`}>
          <EagleAgentOrb agentId={member.id} status={op} sizePx={spec.px} />
        </div>
      ) : (
        <div
          className={`${spec.box} ${spec.text} bg-gradient-to-br ${humanTone} ring-1 inline-flex items-center justify-center font-semibold tracking-tight shadow-[inset_0_1px_1px_rgba(255,255,255,0.28),0_2px_6px_rgba(15,17,21,0.12)] relative overflow-hidden`}
        >
          <span
            className="pointer-events-none absolute -top-1/2 -left-1/4 w-full h-full rounded-full bg-white/15 blur-[2px]"
            aria-hidden="true"
          />
          <span className="relative z-10">{member.iniciais}</span>
        </div>
      )}

      {showOperationalRing && isAgent && op && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#15181f] ${
            op === 'trabalhando'
              ? 'bg-[#15803d] dark:bg-[#4ade80]'
              : op === 'problema'
                ? 'bg-[#b91c1c] dark:bg-[#f87171]'
                : 'bg-[#6b7280] dark:bg-[#9ca3af]'
          }`}
          aria-hidden="true"
        >
          {op === 'trabalhando' && (
            <span className="eagle-live-halo absolute -inset-0.5 rounded-full bg-[#15803d] dark:bg-[#4ade80]" />
          )}
        </span>
      )}
    </div>
  );
}

/* ========================================================================== */
/* SELETORES MODERNOS (CUSTOM DROPDOWN + SEGMENTED CHOICE)                    */
/* ========================================================================== */

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

export function CustomSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder = 'Selecionar...',
  className = '',
}: {
  value: T;
  onChange: (val: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const active = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="eagle-input w-full h-9.5 px-3 text-[13px] flex items-center justify-between gap-2 text-left cursor-pointer"
      >
        <span className="truncate font-medium text-[#0f1115] dark:text-[#f2f4f7]">
          {active?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#0f1115]/48 dark:text-[#f2f4f7]/48 shrink-0 transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-[12px] bg-[#ffffff]/96 dark:bg-[#191d26]/96 backdrop-blur-xl border border-[#0f1115]/10 dark:border-[#f2f4f7]/14 shadow-[0_14px_34px_rgba(15,17,21,0.14)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.48)] p-1 max-h-56 overflow-y-auto"
          >
            {options.map((opt) => {
              const selected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full px-2.5 py-2 rounded-[9px] text-left text-[12.5px] flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    selected
                      ? 'bg-[#163744]/10 text-[#163744] dark:bg-[#9fdce6]/16 dark:text-[#9fdce6] font-semibold'
                      : 'text-[#0f1115]/82 dark:text-[#f2f4f7]/82 hover:bg-[#0f1115]/5 dark:hover:bg-[#f2f4f7]/6'
                  }`}
                >
                  <div className="min-w-0 truncate">
                    <span>{opt.label}</span>
                    {opt.hint && (
                      <span className="ml-1.5 text-[11px] opacity-60">{opt.hint}</span>
                    )}
                  </div>
                  {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SegmentedChoice<T extends string>({
  value,
  onChange,
  options,
  className = '',
}: {
  value: T;
  onChange: (val: T) => void;
  options: SelectOption<T>[];
  className?: string;
}) {
  return (
    <div
      className={`eagle-segmented grid gap-1 w-full ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`h-8 px-2 rounded-[8px] text-[12px] font-medium transition-all cursor-pointer truncate ${
              active
                ? 'bg-white dark:bg-[#252c38] text-[#0f1115] dark:text-[#f2f4f7] shadow-[0_1px_2px_rgba(15,17,21,0.08)] border border-[#0f1115]/8 dark:border-white/10'
                : 'text-[#0f1115]/58 dark:text-[#f2f4f7]/58 hover:text-[#0f1115] dark:hover:text-[#f2f4f7]'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
