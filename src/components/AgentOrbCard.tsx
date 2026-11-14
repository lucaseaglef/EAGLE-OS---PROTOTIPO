import React from 'react';
import { ArrowRight, ArrowUpRight, Pause, Play } from 'lucide-react';
import { Member, Task } from '../types/eagle';
import { AGENT_STATUS_META } from '../utils/formatters';
import {
  ActionIconButton,
  Badge,
  Button,
  GlobalMemberAvatar,
} from './DesignSystem';

/**
 * Card especial Eagle Orb para representar cada agente de IA com seu retrato vivo
 * imerso na profissão, halo de atividade, progresso e ações operacionais.
 */
export function AgentOrbCard({
  agent,
  currentTask,
  skillsNames = [],
  onOpenTask,
  onToggleStatus,
}: {
  agent: Member;
  currentTask?: Task;
  skillsNames?: string[];
  onOpenTask?: () => void;
  onToggleStatus?: () => void;
}) {
  const op = agent.estadoOperacional ?? 'parado';
  const statusMeta = AGENT_STATUS_META[op];

  const badgeVariant =
    op === 'trabalhando' ? 'success' : op === 'problema' ? 'danger' : 'neutral';

  const totalSub = currentTask?.subtarefas.length ?? 0;
  const doneSub = currentTask?.subtarefas.filter((s) => s.concluida).length ?? 0;

  return (
    <div className="eagle-card rounded-[22px] flex flex-col justify-between overflow-hidden relative group">
      {/* Halo ambiente no topo conforme o estado do agente */}
      <div
        className={`pointer-events-none absolute -top-14 -right-12 w-40 h-40 rounded-full blur-2xl opacity-30 transition-opacity ${
          op === 'trabalhando'
            ? 'bg-[#9fdce6]'
            : op === 'problema'
              ? 'bg-[#f87171]'
              : 'bg-[#cbd5e1] dark:bg-[#334155]'
        }`}
        aria-hidden="true"
      />

      <div className="p-5 space-y-4 relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              {op === 'trabalhando' && (
                <span
                  className="eagle-live-halo absolute -inset-1 rounded-full bg-[#9fdce6]/55"
                  aria-hidden="true"
                />
              )}
              <GlobalMemberAvatar member={agent} size="xl" showOperationalRing />
            </div>

            <div className="min-w-0">
              <h2 className="text-[16px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7] truncate">
                {agent.nome}
              </h2>
              <p className="text-[12px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55 truncate">
                {agent.cargo}
              </p>
              <div className="mt-1.5">
                <Badge variant={badgeVariant} size="xs">
                  {statusMeta.label}
                </Badge>
              </div>
            </div>
          </div>

          {onOpenTask && (
            <ActionIconButton
              variant="neutral"
              size="md"
              onClick={onOpenTask}
              title={currentTask ? `Abrir ${currentTask.codigo}` : 'Atribuir tarefa'}
            >
              <ArrowUpRight className="w-4 h-4" />
            </ActionIconButton>
          )}
        </div>

        <div className="rounded-[14px] bg-[#f2f4f7]/88 dark:bg-[#10141b] p-3.5 space-y-2.5">
          <p className="text-[12.5px] text-[#0f1115]/78 dark:text-[#f2f4f7]/78 leading-snug line-clamp-2">
            {agent.observacaoEstado ?? 'Pronto para receber uma nova frente no estúdio.'}
          </p>

          {currentTask && (
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between gap-2 text-[11.5px]">
                <span className="font-semibold text-[#163744] dark:text-[#9fdce6] tabular-nums">
                  {currentTask.codigo} · {currentTask.titulo}
                </span>
                {totalSub > 0 && (
                  <span className="text-[#0f1115]/48 dark:text-[#f2f4f7]/48 tabular-nums shrink-0">
                    {doneSub}/{totalSub}
                  </span>
                )}
              </div>
              {totalSub > 0 && (
                <div className="h-1.5 w-full rounded-full bg-[#e6e9ed] dark:bg-[#232934] overflow-hidden">
                  <div
                    className="h-full bg-[#163744] dark:bg-[#9fdce6] rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round((doneSub / totalSub) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {skillsNames.length > 0 && (
          <div className="text-[11.5px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 truncate">
            {skillsNames.join(' · ')}
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-[#0f1115]/7 dark:border-[#f2f4f7]/7 bg-[#f2f4f7]/45 dark:bg-[#11141a] flex items-center justify-between gap-2 relative z-10">
        {onOpenTask ? (
          <button
            type="button"
            onClick={onOpenTask}
            className="text-[12px] font-semibold text-[#163744] dark:text-[#9fdce6] hover:underline inline-flex items-center gap-1 truncate cursor-pointer"
          >
            <span className="truncate">
              {currentTask ? `Abrir ${currentTask.codigo}` : 'Atribuir tarefa'}
            </span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        ) : (
          <span className="text-[12px] text-[#0f1115]/45 dark:text-[#f2f4f7]/45">
            Disponível
          </span>
        )}

        {onToggleStatus && (
          <Button
            size="xs"
            shape="pill"
            variant={op === 'trabalhando' ? 'secondary' : 'cyan'}
            onClick={onToggleStatus}
          >
            {op === 'trabalhando' ? (
              <>
                <Pause className="w-3 h-3" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                <span>Ativar</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
