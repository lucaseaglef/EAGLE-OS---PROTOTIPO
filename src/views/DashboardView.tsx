import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Check, Maximize2 } from 'lucide-react';
import {
  MemberAvatar,
  PageHeader,
  StatusIndicator,
} from '../components/SharedUI';
import {
  BentoCard,
  MicroRing,
  ProportionBar,
  SparkBars,
} from '../components/VisualWidgets';
import { useEagle } from '../context/EagleContext';
import {
  AGENT_STATUS_META,
  formatBRL,
  formatShortDate,
  TASK_STATUS_META,
} from '../utils/formatters';

export function DashboardView({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const {
    state,
    setActiveSection,
    setSelectedTaskId,
    setPreviewArtifact,
    resolveDecision,
    getMember,
    getProject,
    getTask,
  } = useEagle();

  const [search, setSearch] = useState('');

  const metrics = useMemo(() => {
    const emAndamento = state.tasks.filter(
      (t) => t.estado === 'em_andamento' || t.estado === 'em_revisao'
    ).length;
    const bloqueadas = state.tasks.filter((t) => t.estado === 'bloqueada').length;
    const concluidas = state.tasks.filter((t) => t.estado === 'concluida').length;
    const aFazer = state.tasks.filter((t) => t.estado === 'a_fazer').length;
    const totalTarefas = state.tasks.length;
    const decisoes = state.decisions.filter((d) => d.status === 'pendente');

    const agents = state.members.filter((m) => m.tipo === 'agente');
    const agentsWorking = agents.filter(
      (a) => a.estadoOperacional === 'trabalhando'
    ).length;
    const agentsIssue = agents.filter((a) => a.estadoOperacional === 'problema').length;

    let recebido = 0;
    let aReceber = 0;
    let pago = 0;
    let aPagar = 0;
    for (const f of state.finances) {
      if (f.tipo === 'receber' && f.status === 'liquidado') recebido += f.valorCentavos;
      if (f.tipo === 'receber' && f.status === 'pendente') aReceber += f.valorCentavos;
      if (f.tipo === 'pagar' && f.status === 'liquidado') pago += f.valorCentavos;
      if (f.tipo === 'pagar' && f.status === 'pendente') aPagar += f.valorCentavos;
    }

    return {
      emAndamento,
      bloqueadas,
      concluidas,
      aFazer,
      totalTarefas,
      decisoesCount: decisoes.length,
      decisionRequesters: Array.from(
        new Set(decisoes.map((d) => d.solicitanteId))
      ).slice(0, 4),
      agentsTotal: agents.length,
      agentsWorking,
      agentsIssue,
      recebido,
      aReceber,
      saidas: pago + aPagar,
      saldoProjetado: recebido + aReceber - (pago + aPagar),
    };
  }, [state]);

  const activeAgents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.members.filter(
      (m) =>
        m.tipo === 'agente' &&
        (!q ||
          m.nome.toLowerCase().includes(q) ||
          m.cargo.toLowerCase().includes(q))
    );
  }, [state.members, search]);

  const pendingDecisions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.decisions
      .filter(
        (d) =>
          d.status === 'pendente' &&
          (!q ||
            d.titulo.toLowerCase().includes(q) ||
            d.pergunta.toLowerCase().includes(q))
      )
      .slice(0, 3);
  }, [state.decisions, search]);

  const upcomingTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...state.tasks]
      .filter(
        (t) =>
          t.estado !== 'concluida' &&
          t.estado !== 'cancelada' &&
          (!q || t.titulo.toLowerCase().includes(q) || t.codigo.toLowerCase().includes(q))
      )
      .sort((a, b) => a.prazo.localeCompare(b.prazo))
      .slice(0, 5);
  }, [state.tasks, search]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader
        title="Painel"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filtrar estúdio..."
        primaryAction={{
          label: 'Abrir tarefas',
          onClick: () => setActiveSection('tarefas'),
        }}
        onOpenMobileMenu={onOpenMobileMenu}
      />

      <div className="flex-1 overflow-y-auto p-5 lg:p-7">
        <div className="max-w-[1380px] mx-auto space-y-5">
          {/* FAIXA 1: BENTO DE PULSO EXECUTIVO (4 BLOCOS VISUAIS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Bloco 1: Produção */}
            <BentoCard
              onClick={() => setActiveSection('tarefas')}
              className="p-5 flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[12px] font-medium text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                    Produção ativa
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-[28px] font-semibold tracking-[-0.03em] tabular-nums text-[#0f1115] dark:text-[#f2f4f7] leading-none">
                      {String(metrics.emAndamento).padStart(2, '0')}
                    </span>
                    <span className="text-[12px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 tabular-nums">
                      de {metrics.totalTarefas} tarefas
                    </span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#0f1115]/32 dark:text-[#f2f4f7]/32 shrink-0" />
              </div>

              <ProportionBar
                heightClass="h-1.5"
                showLegend
                segments={[
                  {
                    key: 'done',
                    value: metrics.concluidas,
                    colorClass: 'bg-[#15803d] dark:bg-[#4ade80]',
                    label: `${metrics.concluidas} feitas`,
                  },
                  {
                    key: 'active',
                    value: metrics.emAndamento + metrics.aFazer,
                    colorClass: 'bg-[#163744] dark:bg-[#9fdce6]',
                    label: `${metrics.emAndamento} ativas`,
                  },
                  {
                    key: 'blocked',
                    value: metrics.bloqueadas,
                    colorClass: 'bg-[#b91c1c] dark:bg-[#f87171]',
                    label: `${metrics.bloqueadas} travadas`,
                  },
                ]}
              />
            </BentoCard>

            {/* Bloco 2: Decisões na mesa */}
            <BentoCard
              onClick={() => setActiveSection('decisoes')}
              className="p-5 flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[12px] font-medium text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                    Decisões na mesa
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-[28px] font-semibold tracking-[-0.03em] tabular-nums text-[#163744] dark:text-[#9fdce6] leading-none">
                      {String(metrics.decisoesCount).padStart(2, '0')}
                    </span>
                    <span className="text-[12px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                      aguardando você
                    </span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#0f1115]/32 dark:text-[#f2f4f7]/32 shrink-0" />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center -space-x-1.5">
                  {metrics.decisionRequesters.length > 0 ? (
                    metrics.decisionRequesters.map((id) => {
                      const mem = getMember(id);
                      return (
                        <div
                          key={id}
                          className="ring-2 ring-white dark:ring-[#15181f] rounded-[8px]"
                        >
                          <MemberAvatar member={mem} size="xs" />
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-[12px] text-[#15803d] dark:text-[#4ade80] font-medium">
                      Tudo respondido
                    </span>
                  )}
                </div>
                <span className="text-[12px] font-medium text-[#163744] dark:text-[#9fdce6]">
                  Responder fila
                </span>
              </div>
            </BentoCard>

            {/* Bloco 3: Capacidade dos agentes */}
            <BentoCard
              onClick={() => setActiveSection('agentes')}
              className="p-5 flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[12px] font-medium text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                    Time de IA
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-[28px] font-semibold tracking-[-0.03em] tabular-nums text-[#0f1115] dark:text-[#f2f4f7] leading-none">
                      {metrics.agentsWorking}/{metrics.agentsTotal}
                    </span>
                    <span className="text-[12px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                      ao vivo
                    </span>
                  </div>
                </div>
                <MicroRing
                  value={metrics.agentsWorking}
                  max={metrics.agentsTotal}
                  size={44}
                  strokeWidth={4}
                  label={`${Math.round((metrics.agentsWorking / Math.max(1, metrics.agentsTotal)) * 100)}%`}
                />
              </div>

              <div className="flex items-center justify-between text-[12px]">
                <StatusIndicator
                  label={
                    metrics.agentsIssue > 0
                      ? `${metrics.agentsIssue} com trava`
                      : 'Operação estável'
                  }
                  dotClass={
                    metrics.agentsIssue > 0
                      ? 'bg-[#b91c1c] dark:bg-[#f87171]'
                      : 'bg-[#15803d] dark:bg-[#4ade80]'
                  }
                  textClass={
                    metrics.agentsIssue > 0
                      ? 'text-[#b91c1c] dark:text-[#f87171]'
                      : 'text-[#15803d] dark:text-[#4ade80]'
                  }
                  live={metrics.agentsWorking > 0 && metrics.agentsIssue === 0}
                />
                <span className="text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                  Ver equipe IA
                </span>
              </div>
            </BentoCard>

            {/* Bloco 4: Caixa projetado */}
            <BentoCard
              onClick={() => setActiveSection('financeiro')}
              className="p-5 flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                    Saldo projetado
                  </div>
                  <div className="mt-1 text-[23px] font-semibold tracking-[-0.03em] tabular-nums text-[#0f1115] dark:text-[#f2f4f7] leading-tight truncate">
                    {formatBRL(metrics.saldoProjetado)}
                  </div>
                </div>
                <div className="w-16 shrink-0">
                  <SparkBars
                    height={36}
                    items={[
                      { key: 'rec', label: 'Recebido', value: metrics.recebido, tone: 'success' },
                      { key: 'arec', label: 'A receber', value: metrics.aReceber, tone: 'accent' },
                      { key: 'sai', label: 'Saídas', value: metrics.saidas, tone: 'warning' },
                    ]}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[12px] tabular-nums">
                <span className="text-[#0f1115]/52 dark:text-[#f2f4f7]/52">A receber</span>
                <span className="font-semibold text-[#163744] dark:text-[#9fdce6]">
                  {formatBRL(metrics.aReceber)}
                </span>
              </div>
            </BentoCard>
          </div>

          {/* FAIXA 2: APROVAÇÕES RÁPIDAS + AGENTES AO VIVO */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Esquerda: Aprovações visuais diretas */}
            <BentoCard className="xl:col-span-7 p-5 flex flex-col">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                    Aprovações na sua mesa
                  </h2>
                  <span className="text-[12px] font-medium text-[#0f1115]/45 dark:text-[#f2f4f7]/45 tabular-nums">
                    {metrics.decisoesCount}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('decisoes')}
                  className="text-[12.5px] font-medium text-[#163744] dark:text-[#9fdce6] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Abrir caixa</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {pendingDecisions.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-[13.5px] font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60">
                    Nenhuma decisão pendente no momento.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {pendingDecisions.map((dec) => {
                      const requester = getMember(dec.solicitanteId);
                      const project = getProject(dec.projetoId);
                      const task = getTask(dec.tarefaId);
                      const artifact = dec.artefatoId
                        ? task?.artefatos.find((a) => a.id === dec.artefatoId)
                        : undefined;

                      return (
                        <motion.div
                          key={dec.id}
                          layout
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                          className="rounded-[12px] bg-[#f2f4f7]/75 dark:bg-[#10141b] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            {artifact?.previewUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewArtifact({ artifact, taskId: task?.id })
                                }
                                title="Ampliar entrega"
                                className="relative w-16 h-12 rounded-[9px] overflow-hidden shrink-0 group cursor-pointer bg-[#e6e9ed] dark:bg-[#1e2530]"
                              >
                                <img
                                  src={artifact.previewUrl}
                                  alt={artifact.titulo}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                                />
                                <span className="absolute inset-0 bg-[#0f1115]/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </span>
                              </button>
                            ) : (
                              <MemberAvatar member={requester} size="md" showOperationalRing />
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="text-[13.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                                {dec.titulo}
                              </div>
                              <div className="mt-0.5 text-[12px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 flex items-center gap-1.5 truncate">
                                <span>{requester?.nome}</span>
                                <span aria-hidden="true">·</span>
                                <span className="text-[#163744] dark:text-[#9fdce6] font-medium truncate">
                                  {project?.nome}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="tabular-nums shrink-0">{dec.criadoEm}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => resolveDecision(dec.id, 'aprovada')}
                              className="eagle-btn-primary h-8 px-3 text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{dec.acaoPrimaria}</span>
                            </button>
                            {task && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTaskId(task.id);
                                  setActiveSection('tarefas');
                                }}
                                className="eagle-btn-secondary h-8 px-2.5 text-[12px] font-medium cursor-pointer whitespace-nowrap"
                              >
                                {task.codigo}
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </BentoCard>

            {/* Direita: Grid compacto de agentes vivos */}
            <BentoCard className="xl:col-span-5 p-5 flex flex-col">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                  Time de IA agora
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveSection('agentes')}
                  className="text-[12.5px] font-medium text-[#163744] dark:text-[#9fdce6] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Gerenciar</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeAgents.map((ag) => {
                  const st = AGENT_STATUS_META[ag.estadoOperacional ?? 'parado'];
                  const currentTask = ag.tarefaAtualId
                    ? getTask(ag.tarefaAtualId)
                    : undefined;
                  const totalSub = currentTask?.subtarefas.length ?? 0;
                  const doneSub =
                    currentTask?.subtarefas.filter((s) => s.concluida).length ?? 0;

                  return (
                    <button
                      key={ag.id}
                      type="button"
                      onClick={() => {
                        if (currentTask) {
                          setSelectedTaskId(currentTask.id);
                          setActiveSection('tarefas');
                        } else {
                          setActiveSection('agentes');
                        }
                      }}
                      className="rounded-[12px] bg-[#f2f4f7]/75 dark:bg-[#10141b] hover:bg-[#ebeff3] dark:hover:bg-[#1b2029] p-3 text-left transition-colors cursor-pointer flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MemberAvatar member={ag} size="sm" showOperationalRing />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                            {ag.nome}
                          </div>
                          <div className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 truncate">
                            {ag.cargo}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <StatusIndicator
                          label={st.label}
                          dotClass={st.dotClass}
                          textClass={st.textClass}
                          live={ag.estadoOperacional === 'trabalhando'}
                        />
                        {currentTask && (
                          <span className="text-[11px] font-medium text-[#163744] dark:text-[#9fdce6] tabular-nums">
                            {currentTask.codigo}
                          </span>
                        )}
                      </div>

                      {totalSub > 0 && (
                        <div className="h-1 w-full rounded-full bg-[#e6e9ed] dark:bg-[#232934] overflow-hidden">
                          <div
                            className="h-full bg-[#163744] dark:bg-[#9fdce6] rounded-full transition-all duration-300"
                            style={{ width: `${Math.round((doneSub / totalSub) * 100)}%` }}
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </BentoCard>
          </div>

          {/* FAIXA 3: RADAR DE ENTREGAS POR PRAZO */}
          <BentoCard className="p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                Próximas entregas
              </h2>
              <button
                type="button"
                onClick={() => setActiveSection('tarefas')}
                className="text-[12.5px] font-medium text-[#163744] dark:text-[#9fdce6] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Ver todas</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {upcomingTasks.map((t) => {
                const member = getMember(t.responsavelId);
                const meta = TASK_STATUS_META[t.estado];

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTaskId(t.id);
                      setActiveSection('tarefas');
                    }}
                    className="rounded-[12px] bg-[#f2f4f7]/75 dark:bg-[#10141b] hover:bg-[#ebeff3] dark:hover:bg-[#1b2029] p-3.5 text-left transition-colors cursor-pointer flex flex-col justify-between gap-3 group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold text-[#163744] dark:text-[#9fdce6] tabular-nums">
                        {formatShortDate(t.prazo)}
                      </span>
                      <StatusIndicator
                        label={meta.label}
                        dotClass={meta.dotClass}
                        textClass={meta.textClass}
                        live={t.estado === 'em_andamento'}
                      />
                    </div>

                    <div className="text-[13px] font-medium text-[#0f1115] dark:text-[#f2f4f7] leading-snug line-clamp-2 group-hover:text-[#163744] dark:group-hover:text-[#9fdce6] transition-colors">
                      {t.titulo}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MemberAvatar member={member} size="xs" />
                        <span className="text-[11.5px] text-[#0f1115]/58 dark:text-[#f2f4f7]/58 truncate">
                          {member?.nome.split(' ')[0]}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#0f1115]/40 dark:text-[#f2f4f7]/40 tabular-nums shrink-0">
                        {t.codigo}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </BentoCard>
        </div>
      </div>
    </div>
  );
}
