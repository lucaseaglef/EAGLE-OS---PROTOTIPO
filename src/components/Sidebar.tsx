import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Bot,
  Briefcase,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Compass,
  FolderKanban,
  GitBranch,
  Globe,
  Inbox,
  LayoutGrid,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Repeat,
  Search,
  Sun,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useEagle } from '../context/EagleContext';
import { NavSection, ThemePreference } from '../types/eagle';
import { BrandMark, EagleEmblem } from './BrandMark';
import { MemberAvatar } from './SharedUI';

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const NOVEMBER_DAYS = Array.from({ length: 30 }, (_, i) => i + 1);
const WEEK_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function Sidebar({
  mobileOpen,
  onCloseMobile,
  onOpenPortal,
}: {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenPortal?: () => void;
}) {
  const {
    state,
    activeSection,
    setActiveSection,
    setSelectedTaskId,
    selectedDateFilter,
    setSelectedDateFilter,
    themePreference,
    setThemePreference,
    setIsSearchOpen,
    getMember,
  } = useEagle();

  const [sheetCollapsed, setSheetCollapsed] = useState(false);

  const lucas = getMember('mem-lucas');
  const pendingDecisionsCount = state.decisions.filter((d) => d.status === 'pendente').length;
  const openTasksCount = state.tasks.filter(
    (t) => t.estado !== 'concluida' && t.estado !== 'cancelada'
  ).length;
  const workingAgents = state.members.filter(
    (m) => m.tipo === 'agente' && m.estadoOperacional === 'trabalhando'
  );

  const taskDatesMap = useMemo(() => {
    const map = new Set<string>();
    state.tasks.forEach((t) => {
      if (t.estado !== 'concluida' && t.estado !== 'cancelada') map.add(t.prazo);
    });
    return map;
  }, [state.tasks]);

  const groups: { title: string; items: NavItem[] }[] = [
    {
      title: 'Trabalho',
      items: [
        { id: 'painel', label: 'Painel', icon: LayoutGrid },
        { id: 'tarefas', label: 'Tarefas', icon: CheckSquare, badge: openTasksCount },
        { id: 'decisoes', label: 'Decisões', icon: Inbox, badge: pendingDecisionsCount },
        { id: 'projetos', label: 'Projetos', icon: FolderKanban },
      ],
    },
    {
      title: 'Empresa',
      items: [
        { id: 'clientes', label: 'Clientes', icon: Briefcase },
        { id: 'financeiro', label: 'Financeiro', icon: Wallet },
      ],
    },
    {
      title: 'Organização',
      items: [
        { id: 'agentes', label: 'Agentes', icon: Bot },
        { id: 'equipe', label: 'Equipe', icon: Users },
        { id: 'rotinas', label: 'Rotinas', icon: Repeat },
        { id: 'metas', label: 'Metas', icon: GitBranch },
        { id: 'habilidades', label: 'Habilidades', icon: Compass },
      ],
    },
  ];

  const railShortcuts: {
    id: NavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'painel', label: 'Painel', icon: LayoutGrid },
    { id: 'tarefas', label: 'Tarefas', icon: CheckSquare },
    { id: 'decisoes', label: 'Decisões', icon: Inbox, badge: pendingDecisionsCount },
    { id: 'projetos', label: 'Projetos', icon: FolderKanban },
    { id: 'clientes', label: 'Clientes', icon: Briefcase },
    { id: 'financeiro', label: 'Financeiro', icon: Wallet },
    { id: 'agentes', label: 'Agentes', icon: Bot },
  ];

  const handleNavigate = (section: NavSection) => {
    setActiveSection(section);
    if (section !== 'tarefas') {
      setSelectedDateFilter(null);
    }
    onCloseMobile();
  };

  const handleSelectDay = (day: number) => {
    const iso = `2026-11-${String(day).padStart(2, '0')}`;
    if (selectedDateFilter === iso) {
      setSelectedDateFilter(null);
    } else {
      setSelectedDateFilter(iso);
      setActiveSection('tarefas');
      setSelectedTaskId(null);
      onCloseMobile();
    }
  };

  const cycleTheme = () => {
    const next: Record<ThemePreference, ThemePreference> = {
      system: 'light',
      light: 'dark',
      dark: 'system',
    };
    setThemePreference(next[themePreference]);
  };

  const renderContextSheet = (isMobile = false) => (
    <aside
      className={`h-full flex flex-col select-none overflow-hidden ${
        isMobile
          ? 'w-[272px] bg-white dark:bg-[#15181f] border-r border-[#0f1115]/10 dark:border-[#f2f4f7]/10'
          : 'w-[228px] eagle-sheet'
      }`}
    >
      {/* Topo da folha contextual */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#0f1115]/6 dark:border-[#f2f4f7]/6">
        <button
          type="button"
          onClick={() => handleNavigate('painel')}
          className="text-left focus:outline-none cursor-pointer"
        >
          <BrandMark />
        </button>

        {isMobile ? (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Fechar menu"
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#0f1115]/60 dark:text-[#f2f4f7]/60 hover:bg-[#0f1115]/5 dark:hover:bg-[#f2f4f7]/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setSheetCollapsed(true)}
            title="Modo foco (recolher índice)"
            aria-label="Recolher índice lateral"
            className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-[#0f1115]/45 dark:text-[#f2f4f7]/45 hover:text-[#0f1115] dark:hover:text-[#f2f4f7] hover:bg-[#0f1115]/5 dark:hover:bg-[#f2f4f7]/6 transition-colors cursor-pointer"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Atalho de busca global */}
      <div className="px-3 pt-3 pb-2">
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="eagle-input w-full h-8.5 px-2.5 flex items-center justify-between text-[12.5px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55 hover:text-[#0f1115] dark:hover:text-[#f2f4f7] cursor-pointer"
        >
          <span className="inline-flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            <span>Busca rápida</span>
          </span>
          <span className="text-[11px] font-medium text-[#0f1115]/38 dark:text-[#f2f4f7]/38 tabular-nums">
            ⌘K
          </span>
        </button>
      </div>

      {/* Navegação em 3 grupos */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-2 space-y-4" aria-label="Menu principal">
        {groups.map((group) => (
          <div key={group.title}>
            <div className="px-2.5 pb-1 text-[11px] font-medium text-[#0f1115]/42 dark:text-[#f2f4f7]/42">
              {group.title}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleNavigate(item.id)}
                      className={`relative w-full flex items-center justify-between gap-2 px-2.5 h-8 rounded-[9px] text-[13px] transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'text-[#163744] dark:text-[#9fdce6] font-semibold'
                          : 'text-[#0f1115]/72 dark:text-[#f2f4f7]/72 hover:text-[#0f1115] dark:hover:text-[#f2f4f7] hover:bg-[#0f1115]/4 dark:hover:bg-[#f2f4f7]/5'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId={isMobile ? 'nav-pill-mobile' : 'nav-pill-desktop'}
                          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                          className="absolute inset-0 rounded-[9px] bg-[#ebeff3] dark:bg-[#1e2530] border border-[#0f1115]/7 dark:border-[#f2f4f7]/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                          aria-hidden="true"
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-3.5 h-3.5 shrink-0 ${
                            active
                              ? 'text-[#163744] dark:text-[#9fdce6]'
                              : 'text-[#0f1115]/45 dark:text-[#f2f4f7]/45'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={`relative z-10 text-[11px] font-semibold tabular-nums ${
                            item.id === 'decisoes'
                              ? 'text-[#b45309] dark:text-[#fbbf24]'
                              : 'text-[#0f1115]/45 dark:text-[#f2f4f7]/45'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* Calendário compacto */}
        <div className="pt-3 border-t border-[#0f1115]/6 dark:border-[#f2f4f7]/6">
          <div className="px-2 pb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65">
              Novembro 2026
            </span>
            {selectedDateFilter ? (
              <button
                type="button"
                onClick={() => setSelectedDateFilter(null)}
                className="text-[11px] font-medium text-[#163744] dark:text-[#9fdce6] hover:underline cursor-pointer"
              >
                Limpar
              </button>
            ) : (
              <div className="flex items-center gap-0.5 text-[#0f1115]/32 dark:text-[#f2f4f7]/32">
                <ChevronLeft className="w-3 h-3" />
                <ChevronRight className="w-3 h-3" />
              </div>
            )}
          </div>

          <div className="px-1 grid grid-cols-7 gap-y-0.5 text-center">
            {WEEK_LABELS.map((w, idx) => (
              <span
                key={idx}
                className="text-[10px] font-medium text-[#0f1115]/35 dark:text-[#f2f4f7]/35 py-0.5"
              >
                {w}
              </span>
            ))}
            {NOVEMBER_DAYS.map((day) => {
              const iso = `2026-11-${String(day).padStart(2, '0')}`;
              const hasDue = taskDatesMap.has(iso);
              const isToday = day === 13;
              const isSelected = selectedDateFilter === iso;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  title={hasDue ? `Ver entregas de ${day}/11` : `${day}/11/2026`}
                  className={`relative h-5.5 w-full rounded-[6px] text-[10.5px] tabular-nums flex items-center justify-center transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#163744] text-[#f2f4f7] dark:bg-[#9fdce6] dark:text-[#0f1115] font-semibold'
                      : isToday
                        ? 'bg-[#0f1115]/8 dark:bg-[#f2f4f7]/12 text-[#0f1115] dark:text-[#f2f4f7] font-semibold'
                        : 'text-[#0f1115]/60 dark:text-[#f2f4f7]/60 hover:bg-[#0f1115]/5 dark:hover:bg-[#f2f4f7]/6'
                  }`}
                >
                  <span>{day}</span>
                  {hasDue && !isSelected && (
                    <span
                      className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[#163744] dark:bg-[#9fdce6]"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Rodapé da folha contextual: Portal do Cliente + Em ação agora + tema */}
      <div className="p-3 border-t border-[#0f1115]/6 dark:border-[#f2f4f7]/6 space-y-2.5 bg-[#f2f4f7]/45 dark:bg-[#11141a]">
        {onOpenPortal && (
          <button
            type="button"
            onClick={() => {
              onCloseMobile();
              onOpenPortal();
            }}
            className="w-full h-9 px-2.5 rounded-[10px] bg-[#163744] hover:bg-[#1d4757] dark:bg-[#9fdce6] dark:hover:bg-[#b6e6ee] text-white dark:text-[#0f1115] text-[12px] font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer"
          >
            <span className="inline-flex items-center gap-2 truncate">
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Portal do Cliente</span>
            </span>
            <span className="text-[10px] opacity-75 shrink-0">Abrir</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => handleNavigate('agentes')}
          className="w-full flex items-center justify-between gap-2 px-1.5 py-1 rounded-lg hover:bg-[#0f1115]/4 dark:hover:bg-[#f2f4f7]/5 transition-colors cursor-pointer"
        >
          <span className="text-[11.5px] font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60">
            Ativos agora
          </span>
          <div className="flex items-center -space-x-1.5">
            {workingAgents.slice(0, 4).map((ag) => (
              <div
                key={ag.id}
                className="ring-2 ring-white dark:ring-[#15181f] rounded-[7px]"
              >
                <MemberAvatar member={ag} size="xs" />
              </div>
            ))}
          </div>
        </button>

        <div
          className="eagle-segmented grid grid-cols-3 gap-0.5 w-full"
          role="group"
          aria-label="Tema da interface"
        >
          {(
            [
              { id: 'light', label: 'Claro', icon: Sun },
              { id: 'system', label: 'Auto', icon: Monitor },
              { id: 'dark', label: 'Escuro', icon: Moon },
            ] as {
              id: ThemePreference;
              label: string;
              icon: React.ComponentType<{ className?: string }>;
            }[]
          ).map((opt) => {
            const Icon = opt.icon;
            const active = themePreference === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setThemePreference(opt.id)}
                className={`relative h-6.5 rounded-[7px] text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                  active
                    ? 'text-[#0f1115] dark:text-[#f2f4f7]'
                    : 'text-[#0f1115]/55 dark:text-[#f2f4f7]/55 hover:text-[#0f1115] dark:hover:text-[#f2f4f7]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId={isMobile ? 'theme-pill-mobile' : 'theme-pill-desktop'}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 rounded-[7px] bg-white dark:bg-[#252c38] border border-[#0f1115]/8 dark:border-[#f2f4f7]/10 shadow-2xs"
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-1">
                  <Icon className="w-3 h-3" />
                  <span>{opt.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: Shell arquitetônico em 2 planos (Trilho Petróleo + Folha Contextual retrátil) */}
      <div className="hidden lg:flex h-full gap-3 shrink-0">
        {/* Trilho vertical âncora em Petróleo */}
        <div className="w-[58px] h-full rounded-[20px] bg-[#163744] dark:bg-[#111c23] border border-[#163744]/20 dark:border-[#9fdce6]/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_24px_-6px_rgba(15,17,21,0.22)] flex flex-col items-center justify-between py-3.5 shrink-0">
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => handleNavigate('painel')}
              title="Eagle OS"
              className="cursor-pointer transition-transform active:scale-95"
            >
              <EagleEmblem className="w-9 h-9 bg-[#0f2933] dark:bg-[#163744] border border-white/15" />
            </button>

            <div className="w-6 h-px bg-white/12" aria-hidden="true" />

            <div className="flex flex-col items-center gap-1.5">
              {railShortcuts.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    title={item.label}
                    aria-label={item.label}
                    className={`relative w-9.5 h-9.5 rounded-[11px] flex items-center justify-center transition-all cursor-pointer ${
                      active
                        ? 'bg-[#f2f4f7] text-[#163744] dark:bg-[#9fdce6] dark:text-[#0f1115] shadow-xs'
                        : 'text-[#f2f4f7]/65 hover:text-[#f2f4f7] hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.badge !== undefined && item.badge > 0 && !active && (
                      <span
                        className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#fbbf24]"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            {onOpenPortal && (
              <button
                type="button"
                onClick={onOpenPortal}
                title="Abrir Portal do Cliente"
                aria-label="Abrir Portal do Cliente"
                className="w-9.5 h-9.5 rounded-[11px] flex items-center justify-center bg-[#9fdce6]/18 text-[#9fdce6] hover:bg-[#9fdce6] hover:text-[#0f1115] border border-[#9fdce6]/25 transition-colors cursor-pointer"
              >
                <Globe className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              title="Buscar no estúdio (⌘K)"
              aria-label="Buscar no estúdio"
              className="w-9.5 h-9.5 rounded-[11px] flex items-center justify-center text-[#f2f4f7]/65 hover:text-[#f2f4f7] hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>

            {sheetCollapsed && (
              <button
                type="button"
                onClick={() => setSheetCollapsed(false)}
                title="Expandir menu completo"
                aria-label="Expandir menu completo"
                className="w-9.5 h-9.5 rounded-[11px] flex items-center justify-center text-[#9fdce6] bg-white/10 hover:bg-white/16 transition-colors cursor-pointer"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={cycleTheme}
              title={`Tema: ${themePreference === 'system' ? 'Auto' : themePreference === 'light' ? 'Claro' : 'Escuro'}`}
              aria-label="Alternar tema"
              className="w-9.5 h-9.5 rounded-[11px] flex items-center justify-center text-[#f2f4f7]/65 hover:text-[#f2f4f7] hover:bg-white/10 transition-colors cursor-pointer"
            >
              {themePreference === 'light' ? (
                <Sun className="w-4 h-4" />
              ) : themePreference === 'dark' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Monitor className="w-4 h-4" />
              )}
            </button>

            <div className="pt-1" title={`${lucas?.nome ?? 'Lucas Rezende'} · Fundador`}>
              <MemberAvatar member={lucas} size="md" />
            </div>
          </div>
        </div>

        {/* Folha Contextual Retrátil */}
        {!sheetCollapsed && renderContextSheet(false)}
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-[#0f1115]/55 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">{renderContextSheet(true)}</div>
        </div>
      )}
    </>
  );
}
