import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowUpRight,
  Check,
  Maximize2,
  MessageSquarePlus,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  EmptyState,
  MemberAvatar,
  PageHeader,
  SegmentedControl,
  StatusIndicator,
} from '../components/SharedUI';
import { BentoCard } from '../components/VisualWidgets';
import { useEagle } from '../context/EagleContext';
import { DECISION_STATUS_META } from '../utils/formatters';

export function DecisionsView({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const {
    state,
    getMember,
    getProject,
    getTask,
    resolveDecision,
    setActiveSection,
    setSelectedTaskId,
    setPreviewArtifact,
  } = useEagle();

  const [tab, setTab] = useState<'pendentes' | 'resolvidas'>('pendentes');
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [openNoteIds, setOpenNoteIds] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.decisions.filter((d) => {
      const isPending = d.status === 'pendente';
      if (tab === 'pendentes' && !isPending) return false;
      if (tab === 'resolvidas' && isPending) return false;
      if (q) {
        const proj = getProject(d.projetoId)?.nome.toLowerCase() ?? '';
        const req = getMember(d.solicitanteId)?.nome.toLowerCase() ?? '';
        return (
          d.titulo.toLowerCase().includes(q) ||
          d.pergunta.toLowerCase().includes(q) ||
          proj.includes(q) ||
          req.includes(q)
        );
      }
      return true;
    });
  }, [state.decisions, tab, search, getProject, getMember]);

  const pendingCount = state.decisions.filter((d) => d.status === 'pendente').length;

  const filtersSlot = (
    <SegmentedControl
      layoutId="decisions-tab"
      ariaLabel="Filtrar decisões"
      value={tab}
      onChange={setTab}
      options={[
        { id: 'pendentes', label: `Pendentes (${pendingCount})` },
        { id: 'resolvidas', label: 'Resolvidas' },
      ]}
    />
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader
        title="Decisões"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar pedido, projeto ou agente..."
        filters={filtersSlot}
        onOpenMobileMenu={onOpenMobileMenu}
      />

      <div className="flex-1 overflow-y-auto p-5 lg:p-7">
        {filtered.length === 0 ? (
          <div className="max-w-3xl mx-auto pt-4">
            <EmptyState
              title={
                tab === 'pendentes'
                  ? 'Nenhuma decisão aguardando seu sim ou não neste momento.'
                  : 'Nenhuma decisão resolvida corresponde à busca.'
              }
              actionLabel={tab === 'pendentes' ? 'Ver tarefas do estúdio' : 'Ver pendentes'}
              onAction={() =>
                tab === 'pendentes' ? setActiveSection('tarefas') : setTab('pendentes')
              }
            />
          </div>
        ) : (
          <div className="max-w-[1380px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-5">
            <AnimatePresence initial={false}>
              {filtered.map((dec) => {
                const requester = getMember(dec.solicitanteId);
                const project = getProject(dec.projetoId);
                const task = getTask(dec.tarefaId);
                const artifact = dec.artefatoId
                  ? task?.artefatos.find((a) => a.id === dec.artefatoId)
                  : undefined;
                const statusMeta = DECISION_STATUS_META[dec.status];
                const noteVal = notes[dec.id] ?? '';
                const noteOpen = Boolean(openNoteIds[dec.id]);

                return (
                  <motion.article
                    key={dec.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    className="flex"
                  >
                    <BentoCard className="w-full flex flex-col overflow-hidden">
                      {/* Cabeçalho do card: quem pede + projeto + estado */}
                      <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <MemberAvatar member={requester} size="sm" showOperationalRing />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#0f1115] dark:text-[#f2f4f7] truncate">
                              <span>{requester?.nome}</span>
                              <span className="text-[#0f1115]/35 dark:text-[#f2f4f7]/35">·</span>
                              <span className="text-[#163744] dark:text-[#9fdce6] truncate">
                                {project?.nome}
                              </span>
                            </div>
                            <div className="text-[11.5px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 truncate tabular-nums">
                              {requester?.cargo} · {dec.criadoEm}
                            </div>
                          </div>
                        </div>

                        <StatusIndicator
                          label={statusMeta.label}
                          dotClass={statusMeta.dotClass}
                          textClass={statusMeta.textClass}
                        />
                      </div>

                      {/* Área visual em destaque (prévia grande ou quadro focal) */}
                      <div className="px-5">
                        {artifact?.previewUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewArtifact({ artifact, taskId: task?.id })
                            }
                            className="relative w-full h-48 rounded-[12px] overflow-hidden bg-[#ebeff3] dark:bg-[#10141b] group cursor-pointer block text-left"
                          >
                            <img
                              src={artifact.previewUrl}
                              alt={artifact.titulo}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                            />
                            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 via-black/35 to-transparent flex items-end justify-between p-3.5">
                              <div className="min-w-0">
                                <div className="text-[12.5px] font-medium text-white truncate">
                                  {artifact.titulo}
                                </div>
                                <div className="text-[11px] text-white/75 tabular-nums">
                                  {artifact.versao} · {artifact.formato} · {artifact.tamanho}
                                </div>
                              </div>
                              <span className="w-7.5 h-7.5 rounded-[8px] bg-white/18 backdrop-blur-xs text-white inline-flex items-center justify-center shrink-0">
                                <Maximize2 className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          </button>
                        ) : (
                          <div className="rounded-[12px] bg-[#f2f4f7]/85 dark:bg-[#10141b] p-4 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 tabular-nums">
                              <span>Pedido direto</span>
                              {task && <span>{task.codigo}</span>}
                            </div>
                            <p className="text-[14px] font-medium text-[#0f1115] dark:text-[#f2f4f7] leading-snug">
                              {dec.pergunta}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Título e resumo objetivo */}
                      <div className="px-5 pt-3.5 pb-4 flex-1 space-y-1">
                        <h2 className="text-[15.5px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7] leading-snug">
                          {dec.titulo}
                        </h2>
                        {artifact?.previewUrl && (
                          <p className="text-[13px] text-[#0f1115]/82 dark:text-[#f2f4f7]/82 leading-snug">
                            {dec.pergunta}
                          </p>
                        )}
                        <p className="text-[12.5px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 line-clamp-2 leading-relaxed">
                          {dec.contexto}
                        </p>

                        {dec.respostaLucas && (
                          <div className="pt-1.5 text-[12.5px] font-medium text-[#163744] dark:text-[#9fdce6]">
                            Sua resposta: {dec.respostaLucas}
                          </div>
                        )}
                      </div>

                      {/* Barra inferior clara de Sim / Ajuste / Não */}
                      <div className="px-5 py-3.5 border-t border-[#0f1115]/7 dark:border-[#f2f4f7]/7 bg-[#f2f4f7]/45 dark:bg-[#11141a] space-y-2.5">
                        {dec.status === 'pendente' && noteOpen && (
                          <input
                            type="text"
                            autoFocus
                            value={noteVal}
                            onChange={(e) =>
                              setNotes((prev) => ({ ...prev, [dec.id]: e.target.value }))
                            }
                            placeholder="Observação rápida para o responsável..."
                            className="eagle-input w-full h-8.5 px-3 text-[12.5px]"
                          />
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          {dec.status === 'pendente' ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => resolveDecision(dec.id, 'aprovada', noteVal)}
                                className="eagle-btn-primary h-8.5 px-3.5 text-[12.5px] font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{dec.acaoPrimaria}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => resolveDecision(dec.id, 'ajuste', noteVal)}
                                className="eagle-btn-secondary h-8.5 px-3 text-[12.5px] font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>{dec.acaoSecundaria}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => resolveDecision(dec.id, 'recusada', noteVal)}
                                title="Recusar pedido"
                                className="h-8.5 px-2.5 rounded-[10px] text-[12.5px] font-medium text-[#991b1b] dark:text-[#f87171] hover:bg-[#b91c1c]/8 dark:hover:bg-[#f87171]/12 inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Recusar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setOpenNoteIds((prev) => ({
                                    ...prev,
                                    [dec.id]: !prev[dec.id],
                                  }))
                                }
                                title="Adicionar observação"
                                aria-label="Adicionar observação"
                                className={`w-8.5 h-8.5 rounded-[10px] inline-flex items-center justify-center transition-colors cursor-pointer ${
                                  noteOpen
                                    ? 'bg-[#163744]/10 text-[#163744] dark:bg-[#9fdce6]/16 dark:text-[#9fdce6]'
                                    : 'text-[#0f1115]/48 dark:text-[#f2f4f7]/48 hover:bg-[#0f1115]/6 dark:hover:bg-[#f2f4f7]/8'
                                }`}
                              >
                                <MessageSquarePlus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[12px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50">
                              Decisão registrada
                            </span>
                          )}

                          {task && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTaskId(task.id);
                                setActiveSection('tarefas');
                              }}
                              className="inline-flex items-center gap-1 h-8 px-2 text-[12px] font-medium text-[#0f1115]/62 dark:text-[#f2f4f7]/62 hover:text-[#163744] dark:hover:text-[#9fdce6] transition-colors cursor-pointer whitespace-nowrap ml-auto"
                            >
                              <span>Abrir {task.codigo}</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </BentoCard>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
