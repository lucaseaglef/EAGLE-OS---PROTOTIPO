import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Check, Maximize2 } from 'lucide-react';
import {
  MemberAvatar,
  PageHeader,
  StatusIndicator,
} from '../components/SharedUI';
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
    const totalTarefas = Math.max(1, state.tasks.length);
    const decisoes = state.decisions.filter((d) => d.status === 'pendente').length;
    const aReceber = state.finances
      .filter((f) => f.tipo === 'receber' && f.status === 'pendente')
      .reduce((acc, f) => acc + f.valorCentavos, 0);

    return {
      emAndamento,
      bloqueadas,
      concluidas,
      totalTarefas,
      decisoes,
      aReceber,
      pctAndamento: (emAndamento / totalTarefas) * 100,
      pctConcluidas: (concluidas / totalTarefas) * 100,
      pctBloqueadas: (bloqueadas / totalTarefas) * 100,
    };
  }, [state]);

  const activeAgents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.members.filter(
      (m) =>
        m.tipo === 'agente' &&
        (!q ||
          m.nome.toLowerCase().includes(q) ||
          m.cargo.toLowerCase().includes(q) ||
          (m.observacaoEstado ?? '').toLowerCase().includes(q))
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
      .slice(0, 4);
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

  const recentActivity = useMemo(() => {
    return state.tasks
      .flatMap((t) =>
        t.mensagens.map((m) => ({
          id: m.id,
          taskId: t.id,
          taskCode: t.codigo,
          sender: getMember(m.remetenteId),
          texto: m.texto,
          horario: m.horario,
        }))
      )
      .slice(-4)
      .reverse();
  }, [state.tasks, getMember]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-[#15181f]">
      <PageHeader
        title="Painel"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filtrar momento do estúdio..."
        primaryAction={{
          label: 'Abrir tarefas',
          onClick: () => setActiveSection('tarefas'),
        }}
        onOpenMobileMenu={onOpenMobileMenu}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_356px]">
          {/* Mesa principal: Decisões na frente + Equipe de IA em atividade */}
          <div className="divide-y divide-[#0f1115]/8 dark:divide-[#f2f4f7]/8">
            {/* Aprovações diretas na mesa */}
            <section className="px-6 lg:px-9 py-7">
              <div className="flex items-baseline justify-between mb-5">
                <div>
                  <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                    Na sua mesa agora
                  </h2>
                  <p className="text-[12.5px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 mt-0.5">
                    Sexta-feira, 13 de novembro · Respostas diretas para destravar entregas
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('decisoes')}
                  className="text-[12.5px] font-medium text-[#163744] dark:text-[#9fdce6] hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span>Ver fila</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {pendingDecisions.length === 0 ? (
                <div className="py-8 text-[13.5px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                  Mesa limpa. Nenhuma decisão imediata aguardando sua resposta.
                </div>
              ) : (
                <div className="divide-y divide-[#0f1115]/6 dark:divide-[#f2f4f7]/6">
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
                          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                          className="py-5 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-4 min-w-0 flex-1">
                            {artifact?.previewUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewArtifact({ artifact, taskId: task?.id })
                                }
                                title="Ampliar artefato"
                                className="relative w-20 h-14 rounded-[10px] overflow-hidden border border-[#0f1115]/10 dark:border-[#f2f4f7]/12 group cursor-pointer shrink-0 bg-[#ebeff3] dark:bg-[#1e2530]"
                              >
                                <img
                                  src={artifact.previewUrl}
                                  alt={artifact.titulo}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                                />
                                <span className="absolute inset-0 bg-[#0f1115]/38 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </span>
                              </button>
                            ) : (
                              <MemberAvatar member={requester} size="lg" showOperationalRing />
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="text-[12px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium text-[#0f1115]/78 dark:text-[#f2f4f7]/78">
                                  {requester?.nome}
                                </span>
                                <span>·</span>
                                <span className="truncate text-[#163744] dark:text-[#9fdce6] font-medium">
                                  {project?.nome}
                                </span>
                                <span>·</span>
                                <span className="tabular-nums">{dec.criadoEm}</span>
                              </div>
                              <div className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-[#0f1115] dark:text-[#f2f4f7]">
                                {dec.titulo}
                              </div>
                              <p className="mt-0.5 text-[13px] text-[#0f1115]/68 dark:text-[#f2f4f7]/68 line-clamp-2 leading-snug">
                                {dec.pergunta}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => resolveDecision(dec.id, 'aprovada')}
                              className="eagle-btn-primary h-8.5 px-3.5 text-[12.5px] font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
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
                                className="eagle-btn-secondary h-8.5 px-3 text-[12.5px] font-medium cursor-pointer whitespace-nowrap"
                              >
                                Abrir
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </section>

            {/* Time de IA em atividade (grade limpa sem caixas pesadas) */}
            <section className="px-6 lg:px-9 py-7">
              <div className="flex items-baseline justify-between mb-5">
                <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                  Quem está trabalhando agora
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveSection('agentes')}
                  className="text-[12.5px] font-medium text-[#163744] dark:text-[#9fdce6] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Ver agentes</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                {activeAgents.map((ag) => {
                  const st = AGENT_STATUS_META[ag.estadoOperacional ?? 'parado'];
                  const currentTask = ag.tarefaAtualId ? getTask(ag.tarefaAtualId) : undefined;
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
                      className="group py-3.5 px-3 -mx-3 rounded-[12px] flex items-start justify-between gap-3 text-left hover:bg-[#f2f4f7]/80 dark:hover:bg-[#1b2029]/75 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <MemberAvatar member={ag} size="md" showOperationalRing />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-[13.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                              {ag.nome}
                            </span>
                            <span className="text-[12px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 truncate">
                              {ag.cargo}
                            </span>
                          </div>
                          <p className="text-[12.5px] text-[#0f1115]/70 dark:text-[#f2f4f7]/70 truncate mt-0.5">
                            {ag.observacaoEstado}
                          </p>
                          {currentTask && (
                            <div className="mt-1.5 flex items-center gap-2.5">
                              <span className="text-[11px] font-medium text-[#163744] dark:text-[#9fdce6] tabular-nums shrink-0">
                                {currentTask.codigo}
                              </span>
                              {totalSub > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <div className="w-16 h-1 rounded-full bg-[#ebeff3] dark:bg-[#232934] overflow-hidden">
                                    <div
                                      className="h-full bg-[#163744] dark:bg-[#9fdce6]"
                                      style={{
                                        width: `${Math.round((doneSub / totalSub) * 100)}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-[11px] text-[#0f1115]/45 dark:text-[#f2f4f7]/45 tabular-nums">
                                    {doneSub}/{totalSub}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <StatusIndicator
                        label={st.label}
                        dotClass={st.dotClass}
                        textClass={st.textClass}
                        live={ag.estadoOperacional === 'trabalhando'}
                      />
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Coluna direita: Pulso discreto, entregas e movimento */}
          <aside className="border-t xl:border-t-0 xl:border-l border-[#0f1115]/8 dark:border-[#f2f4f7]/8 bg-[#f2f4f7]/45 dark:bg-[#11141a]/80 divide-y divide-[#0f1115]/8 dark:divide-[#f2f4f7]/8">
            {/* Resumo discreto do momento integrado à coluna */}
            <section className="px-6 py-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13.5px] font-semibold tracking-[-0.01em] text-[#0f1115] dark:text-[#f2f4f7]">
                  Momento do estúdio
                </h2>
                <span className="text-[11.5px] text-[#0f1115]/45 dark:text-[#f2f4f7]/45 tabular-nums">
                  {metrics.totalTarefas} tarefas
                </span>
              </div>

              {/* Barra fina de distribuição da semana */}
              <div className="h-1.5 w-full rounded-full bg-[#e6e9ed] dark:bg-[#1e242e] overflow-hidden flex gap-0.5 mb-4">
                <div
                  className="h-full bg-[#15803d] dark:bg-[#4ade80]"
                  style={{ width: `${metrics.pctConcluidas}%` }}
                  title={`${metrics.concluidas} concluídas`}
                />
                <div
                  className="h-full bg-[#163744] dark:bg-[#9fdce6]"
                  style={{ width: `${metrics.pctAndamento}%` }}
                  title={`${metrics.emAndamento} em produção ou revisão`}
                />
                <div
                  className="h-full bg-[#b91c1c] dark:bg-[#f87171]"
                  style={{ width: `${metrics.pctBloqueadas}%` }}
                  title={`${metrics.bloqueadas} bloqueadas`}
                />
              </div>

              <div className="divide-y divide-[#0f1115]/6 dark:divide-[#f2f4f7]/6 text-[13px]">
                <button
                  type="button"
                  onClick={() => setActiveSection('tarefas')}
                  className="w-full py-2 flex items-center justify-between text-left hover:text-[#163744] dark:hover:text-[#9fdce6] transition-colors cursor-pointer"
                >
                  <span className="text-[#0f1115]/65 dark:text-[#f2f4f7]/65">
                    Em produção e revisão
                  </span>
                  <span className="font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                    {String(metrics.emAndamento).padStart(2, '0')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('decisoes')}
                  className="w-full py-2 flex items-center justify-between text-left hover:text-[#163744] dark:hover:text-[#9fdce6] transition-colors cursor-pointer"
                >
                  <span className="text-[#0f1115]/65 dark:text-[#f2f4f7]/65">
                    Esperando sua decisão
                  </span>
                  <span className="font-semibold tabular-nums text-[#163744] dark:text-[#9fdce6]">
                    {String(metrics.decisoes).padStart(2, '0')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('tarefas')}
                  className="w-full py-2 flex items-center justify-between text-left hover:text-[#163744] dark:hover:text-[#9fdce6] transition-colors cursor-pointer"
                >
                  <span className="text-[#0f1115]/65 dark:text-[#f2f4f7]/65">
                    Travadas por retorno
                  </span>
                  <span className="font-semibold tabular-nums text-[#991b1b] dark:text-[#f87171]">
                    {String(metrics.bloqueadas).padStart(2, '0')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('financeiro')}
                  className="w-full py-2 flex items-center justify-between text-left hover:text-[#163744] dark:hover:text-[#9fdce6] transition-colors cursor-pointer"
                >
                  <span className="text-[#0f1115]/65 dark:text-[#f2f4f7]/65">
                    A receber em novembro
                  </span>
                  <span className="font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                    {formatBRL(metrics.aReceber)}
                  </span>
                </button>
              </div>
            </section>

            {/* Próximas entregas */}
            <section className="px-6 py-6">
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="text-[13.5px] font-semibold tracking-[-0.01em] text-[#0f1115] dark:text-[#f2f4f7]">
                  Próximas entregas
                </h2>
                <span className="text-[11.5px] text-[#0f1115]/45 dark:text-[#f2f4f7]/45">
                  Ordem de prazo
                </span>
              </div>

              <div className="space-y-1">
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
                      className="w-full py-2 px-2.5 -mx-2.5 rounded-[10px] flex items-start gap-3 text-left hover:bg-white dark:hover:bg-[#181c24] transition-colors cursor-pointer group"
                    >
                      <span className="w-11 shrink-0 text-[12px] font-semibold text-[#163744] dark:text-[#9fdce6] tabular-nums pt-0.5">
                        {formatShortDate(t.prazo)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-[#0f1115] dark:text-[#f2f4f7] leading-snug line-clamp-1 group-hover:text-[#163744] dark:group-hover:text-[#9fdce6] transition-colors">
                          {t.titulo}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11.5px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50">
                          <StatusIndicator
                            label={meta.label}
                            dotClass={meta.dotClass}
                            textClass={meta.textClass}
                            live={t.estado === 'em_andamento'}
                          />
                          <span>·</span>
                          <span className="truncate">{member?.nome}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Conversas recentes */}
            <section className="px-6 py-6">
              <h2 className="text-[13.5px] font-semibold tracking-[-0.01em] text-[#0f1115] dark:text-[#f2f4f7] mb-3.5">
                Movimento nas tarefas
              </h2>

              <div className="space-y-3.5">
                {recentActivity.map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => {
                      setSelectedTaskId(act.taskId);
                      setActiveSection('tarefas');
                    }}
                    className="w-full flex items-start gap-2.5 text-left group cursor-pointer"
                  >
                    <MemberAvatar member={act.sender} size="xs" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 text-[12px]">
                        <span className="font-medium text-[#0f1115] dark:text-[#f2f4f7] group-hover:text-[#163744] dark:group-hover:text-[#9fdce6] truncate transition-colors">
                          {act.sender?.nome} · {act.taskCode}
                        </span>
                        <span className="text-[#0f1115]/42 dark:text-[#f2f4f7]/42 tabular-nums shrink-0">
                          {act.horario}
                        </span>
                      </div>
                      <p className="text-[12.5px] text-[#0f1115]/60 dark:text-[#f2f4f7]/60 line-clamp-2 mt-0.5 leading-snug">
                        {act.texto}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
