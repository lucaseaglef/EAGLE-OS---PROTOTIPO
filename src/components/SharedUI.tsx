import React from 'react';
import { motion } from 'motion/react';
import { Check, FileText, Menu, Plus, Search, X } from 'lucide-react';
import { Artifact, Member } from '../types/eagle';

export function StatusIndicator({
  label,
  dotClass,
  textClass,
  live = false,
}: {
  label: string;
  dotClass: string;
  textClass: string;
  live?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[12px] font-medium whitespace-nowrap shrink-0 ${textClass}`}
    >
      <span className="relative inline-flex items-center justify-center w-2 h-2 shrink-0" aria-hidden="true">
        {live && (
          <span className={`eagle-live-halo absolute inset-0 rounded-full ${dotClass}`} />
        )}
        <span className={`relative w-1.5 h-1.5 rounded-full ${dotClass}`} />
      </span>
      <span>{label}</span>
    </span>
  );
}

export function MemberAvatar({
  member,
  size = 'sm',
  showOperationalRing = false,
}: {
  member?: Member;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showOperationalRing?: boolean;
}) {
  const sizes = {
    xs: 'w-5 h-5 text-[9.5px] rounded-[7px]',
    sm: 'w-6.5 h-6.5 text-[11px] rounded-[8px]',
    md: 'w-8 h-8 text-[12px] rounded-[10px]',
    lg: 'w-10 h-10 text-[13px] rounded-[12px]',
  };

  if (!member) {
    return (
      <div
        className={`${sizes[size]} bg-[#ebeff3] dark:bg-[#1b2029] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 inline-flex items-center justify-center font-medium shrink-0 border border-[#0f1115]/8 dark:border-[#f2f4f7]/8`}
      >
        —
      </div>
    );
  }

  const isAgent = member.tipo === 'agente';
  const op = member.estadoOperacional;

  return (
    <div
      title={`${member.nome} · ${member.cargo}`}
      className={`relative ${sizes[size]} inline-flex items-center justify-center font-semibold tracking-tight shrink-0 transition-transform duration-150 ${
        isAgent
          ? 'bg-[#163744] text-[#f2f4f7] dark:bg-[#1b2c36] dark:text-[#9fdce6] border border-[#163744]/20 dark:border-[#9fdce6]/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]'
          : 'bg-[#ebeff3] text-[#0f1115] dark:bg-[#222833] dark:text-[#f2f4f7] border border-[#0f1115]/10 dark:border-[#f2f4f7]/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
      }`}
    >
      <span>{member.iniciais}</span>
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

export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (val: T) => void;
  layoutId: string;
  ariaLabel: string;
}) {
  return (
    <div
      className="eagle-segmented inline-flex items-center gap-0.5 overflow-x-auto max-w-full"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const active = value === opt.id;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`relative h-7.5 px-2.5 rounded-[8px] text-[12.5px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              active
                ? 'text-[#0f1115] dark:text-[#f2f4f7]'
                : 'text-[#0f1115]/58 dark:text-[#f2f4f7]/58 hover:text-[#0f1115] dark:hover:text-[#f2f4f7]'
            }`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 rounded-[8px] bg-white dark:bg-[#252c38] border border-[#0f1115]/8 dark:border-[#f2f4f7]/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(15,17,21,0.06)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_1px_3px_rgba(0,0,0,0.3)]"
                aria-hidden="true"
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{opt.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function PageHeader({
  title,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  filters,
  primaryAction,
  onOpenMobileMenu,
}: {
  title: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  onOpenMobileMenu: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 bg-[#ffffff]/92 dark:bg-[#15181f]/92 backdrop-blur-xs border-b border-[#0f1115]/8 dark:border-[#f2f4f7]/8 px-5 lg:px-7 py-3.5 rounded-t-[20px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Abrir menu lateral"
            className="lg:hidden eagle-btn-secondary w-9 h-9 inline-flex items-center justify-center cursor-pointer"
          >
            <Menu className="w-4 h-4" />
          </button>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-[#0f1115] dark:text-[#f2f4f7] truncate">
            {title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {onSearchChange !== undefined && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#0f1115]/40 dark:text-[#f2f4f7]/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchValue ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="eagle-input w-44 sm:w-56 h-9 pl-8 pr-7 text-[13px] placeholder:text-[#0f1115]/40 dark:placeholder:text-[#f2f4f7]/40"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="Limpar busca"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#0f1115]/40 dark:text-[#f2f4f7]/40 hover:text-[#0f1115] dark:hover:text-[#f2f4f7] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {filters}

          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="eagle-btn-primary inline-flex items-center gap-1.5 h-9 px-3.5 text-[13px] font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{primaryAction.label}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export function EmptyState({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="eagle-card flex flex-col items-center justify-center py-14 px-6 text-center">
      <p className="text-[14px] font-medium text-[#0f1115]/75 dark:text-[#f2f4f7]/75 max-w-sm">
        {title}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="eagle-btn-primary mt-4 inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}

export function ArtifactPreviewModal({
  artifact,
  author,
  onClose,
  onToggleApprove,
}: {
  artifact: Artifact;
  author?: Member;
  onClose: () => void;
  onToggleApprove?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1115]/72 backdrop-blur-xs p-4 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="eagle-modal w-full max-w-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#0f1115]/8 dark:border-[#f2f4f7]/8">
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
              {artifact.titulo}
            </h2>
            <p className="text-[12px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55 tabular-nums mt-0.5">
              {artifact.versao} · {artifact.formato} · {artifact.tamanho}
              {author ? ` · ${author.nome}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onToggleApprove && (
              <button
                type="button"
                onClick={onToggleApprove}
                className={`inline-flex items-center gap-1.5 h-8.5 px-3 rounded-[10px] text-[12.5px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                  artifact.aprovado
                    ? 'bg-[#15803d]/12 text-[#166534] dark:bg-[#4ade80]/15 dark:text-[#4ade80] border border-[#15803d]/20 dark:border-[#4ade80]/25'
                    : 'eagle-btn-primary'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{artifact.aprovado ? 'Aprovado' : 'Aprovar artefato'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar prévia"
              className="eagle-btn-secondary w-8.5 h-8.5 inline-flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 bg-[#f2f4f7] dark:bg-[#0f1115]">
          {artifact.previewUrl ? (
            <div className="rounded-[14px] overflow-hidden border border-[#0f1115]/10 dark:border-[#f2f4f7]/10 bg-[#e6e9ed] dark:bg-[#161a21]">
              <img
                src={artifact.previewUrl}
                alt={artifact.titulo}
                referrerPolicy="no-referrer"
                className="w-full max-h-[65vh] object-contain mx-auto"
              />
            </div>
          ) : (
            <div className="eagle-card p-6">
              <div className="flex items-center gap-2.5 text-[#163744] dark:text-[#9fdce6] mb-3">
                <FileText className="w-4 h-4" />
                <span className="text-[13px] font-medium">Conteúdo do documento</span>
              </div>
              <p className="text-[14px] leading-relaxed text-[#0f1115]/85 dark:text-[#f2f4f7]/85">
                {artifact.resumoConteudo ??
                  'Documento técnico preparado pela equipe da Eagle Digital House.'}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
