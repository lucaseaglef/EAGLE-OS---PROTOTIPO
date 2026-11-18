import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Pause,
  Play,
  Send,
  Sparkles,
} from 'lucide-react';
import { Member, Task } from '../types/eagle';
import { AGENT_STATUS_META, formatShortDate } from '../utils/formatters';
import { Badge, Button, GlobalMemberAvatar } from './DesignSystem';

interface OrbSpectrum {
  primary: string;
  secondary: string;
  tertiary: string;
}

const ORB_SPECTRA: Record<string, OrbSpectrum> = {
  'ag-clara': {
    primary: 'rgba(159, 220, 230, 0.65)',
    secondary: 'rgba(251, 113, 133, 0.55)',
    tertiary: 'rgba(56, 189, 248, 0.45)',
  },
  'ag-caio': {
    primary: 'rgba(52, 211, 153, 0.62)',
    secondary: 'rgba(159, 220, 230, 0.58)',
    tertiary: 'rgba(45, 212, 191, 0.45)',
  },
  'ag-helena': {
    primary: 'rgba(251, 191, 36, 0.6)',
    secondary: 'rgba(159, 220, 230, 0.52)',
    tertiary: 'rgba(251, 146, 60, 0.45)',
  },
  'ag-bruno': {
    primary: 'rgba(56, 189, 248, 0.66)',
    secondary: 'rgba(129, 140, 248, 0.52)',
    tertiary: 'rgba(159, 220, 230, 0.5)',
  },
  'ag-sofia': {
    primary: 'rgba(253, 164, 175, 0.64)',
    secondary: 'rgba(245, 158, 11, 0.52)',
    tertiary: 'rgba(159, 220, 230, 0.46)',
  },
  'ag-mateus': {
    primary: 'rgba(186, 230, 253, 0.64)',
    secondary: 'rgba(159, 220, 230, 0.56)',
    tertiary: 'rgba(148, 163, 184, 0.44)',
  },
};

/**
 * Card especial Eagle Orb com luzes fluidas em movimento, câmara vítrea e
 * gaveta expansível revelando frente atual, checklist interativo, última execução e comando rápido.
 */
export function AgentOrbCard({
  agent,
  currentTask,
  openTasksCount = 0,
  skillsNames = [],
  onOpenTask,
  onToggleStatus,
  onToggleSubtask,
  onSendQuickMessage,
}: {
  agent: Member;
  currentTask?: Task;
  openTasksCount?: number;
  skillsNames?: string[];
  onOpenTask?: () => void;
  onToggleStatus?: () => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onSendQuickMessage?: (taskId: string, message: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [quickMsg, setQuickMsg] = useState('');
  const [justSent, setJustSent] = useState(false);

  const op = agent.estadoOperacional ?? 'parado';
  const isWorking = op === 'trabalhando';
  const isProblem = op === 'problema';
  const statusMeta = AGENT_STATUS_META[op];
  const spectrum = ORB_SPECTRA[agent.id] ?? ORB_SPECTRA['ag-clara'];

  const badgeVariant = isWorking ? 'cyan' : isProblem ? 'danger' : 'neutral';

  const totalSub = currentTask?.subtarefas.length ?? 0;
  const doneSub = currentTask?.subtarefas.filter((s) => s.concluida).length ?? 0;
  const pct = totalSub > 0 ? Math.round((doneSub / totalSub) * 100) : 0;
  const lastExec = currentTask?.execucoes[0];

  const handleQuickSend = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = quickMsg.trim();
    if (!clean || !currentTask || !onSendQuickMessage) return;
    onSendQuickMessage(currentTask.id, clean);
    setQuickMsg('');
    setJustSent(true);
    window.setTimeout(() => setJustSent(false), 2200);
  };

  return (
    <motion.div
      layout="position"
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-[24px] overflow-hidden border transition-shadow duration-300 bg-white dark:bg-[#15181f] ${
        isExpanded
          ? 'border-[#163744]/28 dark:border-[#9fdce6]/35 shadow-[0_20px_48px_-14px_rgba(22,55,68,0.26)] dark:shadow-[0_24px_54px_-14px_rgba(0,0,0,0.6)]'
          : 'border-[#0f1115]/8 dark:border-[#f2f4f7]/10 shadow-[0_4px_18px_-6px_rgba(15,17,21,0.08)] hover:shadow-[0_14px_34px_-10px_rgba(22,55,68,0.18)]'
      }`}
    >
      {/* CÂMARA LUMINOSA DO ORB (HEADER INTERATIVO QUE EXPANDE O CARD) */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="w-full text-left relative overflow-hidden bg-[#0c181f] text-[#f2f4f7] p-5 cursor-pointer group focus-visible:outline-none"
      >
        {/* Luzes Orbs em movimento contínuo atrás do vidro */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <motion.div
            animate={
              isWorking || isExpanded
                ? {
                    x: ['-12%', '24%', '-6%', '-12%'],
                    y: ['-18%', '14%', '22%', '-18%'],
                    scale: [1, 1.18, 0.94, 1],
                  }
                : {
                    x: ['-8%', '8%', '-8%'],
                    y: ['-10%', '6%', '-10%'],
                    scale: [1, 1.06, 1],
                  }
            }
            transition={{
              duration: isWorking ? 9 : 14,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ background: `radial-gradient(circle, ${spectrum.primary} 0%, transparent 68%)` }}
            className="absolute -top-12 -left-10 w-52 h-52 rounded-full blur-2xl opacity-75 group-hover:opacity-95 transition-opacity"
          />

          <motion.div
            animate={
              isWorking || isExpanded
                ? {
                    x: ['18%', '-22%', '10%', '18%'],
                    y: ['16%', '-14%', '8%', '16%'],
                    scale: [1.05, 0.9, 1.16, 1.05],
                  }
                : {
                    x: ['10%', '-6%', '10%'],
                    y: ['8%', '-6%', '8%'],
                    scale: [1, 1.05, 1],
                  }
            }
            transition={{
              duration: isWorking ? 11 : 16,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              background: `radial-gradient(circle, ${
                isProblem ? 'rgba(248, 113, 113, 0.65)' : spectrum.secondary
              } 0%, transparent 68%)`,
            }}
            className="absolute -bottom-14 -right-8 w-56 h-56 rounded-full blur-2xl opacity-70 group-hover:opacity-95 transition-opacity"
          />

          <motion.div
            animate={{
              x: ['-5%', '16%', '-14%', '-5%'],
              y: ['12%', '-12%', '4%', '12%'],
            }}
            transition={{
              duration: 13,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ background: `radial-gradient(circle, ${spectrum.tertiary} 0%, transparent 70%)` }}
            className="absolute top-1/4 left-1/3 w-40 h-40 rounded-full blur-2xl opacity-55"
          />

          {/* Véu vítreo sutil por cima das luzes */}
          <div className="absolute inset-0 bg-[#0b151c]/42 backdrop-blur-[2px]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        </div>

        {/* Conteúdo nítido do topo */}
        <div className="relative z-10 flex items-center justify-between gap-3.5">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Avatar Orb com anel luminoso giratório */}
            <div className="relative shrink-0 p-[3px] rounded-full">
              <div
                className={`absolute inset-0 rounded-full ${
                  isWorking || isExpanded ? 'eagle-orb-ring opacity-100' : 'opacity-55'
                } transition-opacity`}
                style={{
                  background: `conic-gradient(from 0deg, ${spectrum.primary}, ${spectrum.secondary}, ${spectrum.tertiary}, ${spectrum.primary})`,
                }}
                aria-hidden="true"
              />
              {isWorking && (
                <span
                  className="eagle-live-halo absolute -inset-1 rounded-full bg-[#9fdce6]/35"
                  aria-hidden="true"
                />
              )}
              <div className="relative rounded-full bg-[#0c181f] p-[2px]">
                <GlobalMemberAvatar member={agent} size="xl" showOperationalRing />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[16.5px] font-semibold tracking-[-0.015em] text-white truncate">
                  {agent.nome}
                </h2>
                <Badge variant={badgeVariant} size="xs">
                  {statusMeta.label}
                </Badge>
              </div>
              <p className="mt-0.5 text-[12.5px] text-[#9fdce6]/88 font-medium truncate">
                {agent.cargo}
              </p>
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white/65 tabular-nums">
                {currentTask ? (
                  <span className="truncate">
                    {currentTask.codigo} · {totalSub > 0 ? `${pct}% concluído` : 'Em foco'}
                  </span>
                ) : (
                  <span>Livre para atribuição</span>
                )}
                {openTasksCount > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      {openTasksCount} {openTasksCount === 1 ? 'frente' : 'frentes'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <span
            className={`w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0 border transition-all ${
              isExpanded
                ? 'bg-[#9fdce6] text-[#0f1115] border-[#9fdce6]'
                : 'bg-white/10 text-white/85 border-white/15 group-hover:bg-white/20'
            }`}
            aria-hidden="true"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-300 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </span>
        </div>

        {/* Resumo imediato + micro barra de progresso */}
        <div className="relative z-10 mt-4 pt-3 border-t border-white/12 space-y-2.5">
          <p className="text-[12.5px] text-white/86 leading-snug line-clamp-2">
            {agent.observacaoEstado ?? 'Pronto para receber uma nova frente no estúdio.'}
          </p>

          {totalSub > 0 && (
            <div className="h-1.5 w-full rounded-full bg-white/12 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, #9fdce6 0%, #ffffff 100%)',
                }}
              />
            </div>
          )}
        </div>
      </button>

      {/* GAVETA EXPANSÍVEL QUE ABRE SUAVEMENTE DEBAIXO DO CARD */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="orb-drawer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="p-5 pt-4 space-y-4 bg-[#f6f8fa] dark:bg-[#10141b] border-t border-[#0f1115]/8 dark:border-[#f2f4f7]/8">
              {/* Frente atual e checklist interativo */}
              {currentTask ? (
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-[#163744] dark:text-[#9fdce6] tabular-nums">
                        {currentTask.codigo} · Prazo {formatShortDate(currentTask.prazo)}
                      </div>
                      <h3 className="text-[13.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] leading-snug">
                        {currentTask.titulo}
                      </h3>
                    </div>
                  </div>

                  {currentTask.subtarefas.length > 0 && (
                    <div className="space-y-1.5 pt-0.5">
                      {currentTask.subtarefas.slice(0, 3).map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => onToggleSubtask?.(currentTask.id, sub.id)}
                          className="w-full flex items-center gap-2.5 text-left rounded-[10px] px-2.5 py-1.5 bg-white dark:bg-[#15181f] border border-[#0f1115]/6 dark:border-[#f2f4f7]/8 hover:border-[#163744]/25 dark:hover:border-[#9fdce6]/30 transition-colors cursor-pointer"
                        >
                          <span
                            className={`w-4 h-4 rounded-[5px] flex items-center justify-center shrink-0 border transition-colors ${
                              sub.concluida
                                ? 'bg-[#163744] border-[#163744] text-white dark:bg-[#9fdce6] dark:border-[#9fdce6] dark:text-[#0f1115]'
                                : 'border-[#0f1115]/25 dark:border-[#f2f4f7]/25'
                            }`}
                          >
                            {sub.concluida && <Check className="w-2.5 h-2.5" />}
                          </span>
                          <span
                            className={`text-[12px] truncate ${
                              sub.concluida
                                ? 'line-through text-[#0f1115]/45 dark:text-[#f2f4f7]/45'
                                : 'text-[#0f1115]/85 dark:text-[#f2f4f7]/85'
                            }`}
                          >
                            {sub.titulo}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-[12px] bg-white dark:bg-[#15181f] border border-[#0f1115]/6 dark:border-[#f2f4f7]/8 p-3 text-[12px] text-[#0f1115]/65 dark:text-[#f2f4f7]/65">
                  Agente disponível para assumir uma nova tarefa da fila do estúdio.
                </div>
              )}

              {/* Última rodada executada */}
              {lastExec && (
                <div className="rounded-[12px] bg-white dark:bg-[#15181f] border border-[#0f1115]/6 dark:border-[#f2f4f7]/8 p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2 text-[11px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                    <span className="inline-flex items-center gap-1 font-semibold text-[#163744] dark:text-[#9fdce6]">
                      <Sparkles className="w-3 h-3" />
                      <span>Execução #{lastExec.numero}</span>
                    </span>
                    <span className="truncate">{lastExec.modeloIA}</span>
                  </div>
                  <p className="text-[12px] text-[#0f1115]/78 dark:text-[#f2f4f7]/78 leading-relaxed">
                    {lastExec.resumo}
                  </p>
                </div>
              )}

              {/* Especialidades */}
              {skillsNames.length > 0 && (
                <div className="text-[11.5px] text-[#0f1115]/58 dark:text-[#f2f4f7]/58 flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-[#0f1115]/75 dark:text-[#f2f4f7]/75">
                    Domínio:
                  </span>
                  <span>{skillsNames.join(' · ')}</span>
                </div>
              )}

              {/* Comando rápido direto para o agente */}
              {currentTask && onSendQuickMessage && (
                <div className="space-y-1.5">
                  <form
                    onSubmit={handleQuickSend}
                    className="flex items-center gap-1.5 rounded-[12px] bg-white dark:bg-[#15181f] border border-[#0f1115]/8 dark:border-[#f2f4f7]/10 p-1 pl-3"
                  >
                    <input
                      type="text"
                      value={quickMsg}
                      onChange={(e) => setQuickMsg(e.target.value)}
                      placeholder={`Orientar ${agent.nome} em ${currentTask.codigo}...`}
                      className="flex-1 bg-transparent text-[12px] text-[#0f1115] dark:text-[#f2f4f7] placeholder:text-[#0f1115]/42 dark:placeholder:text-[#f2f4f7]/42 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!quickMsg.trim()}
                      aria-label={`Enviar instrução para ${agent.nome}`}
                      className="w-7 h-7 rounded-[8px] bg-[#9fdce6] text-[#0f1115] inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 transition-opacity"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                  {justSent && (
                    <p className="text-[11px] font-medium text-[#15803d] dark:text-[#4ade80] px-1">
                      Orientação enviada para {agent.nome}.
                    </p>
                  )}
                </div>
              )}

              {/* Rodapé de ações */}
              <div className="pt-1 flex items-center justify-between gap-2">
                {onOpenTask && (
                  <Button
                    size="sm"
                    variant="secondary"
                    shape="pill"
                    onClick={onOpenTask}
                  >
                    <span>
                      {currentTask ? `Abrir ${currentTask.codigo}` : 'Atribuir tarefa'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}

                {onToggleStatus && (
                  <Button
                    size="sm"
                    shape="pill"
                    variant={isWorking ? 'dark' : 'cyan'}
                    onClick={onToggleStatus}
                  >
                    {isWorking ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pausar</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Ativar</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
