import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Check, Maximize2, RotateCcw, X } from 'lucide-react';
import {
  EmptyState,
  MemberAvatar,
  PageHeader,
  SegmentedControl,
  StatusIndicator,
} from '../components/SharedUI';
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
        searchPlaceholder="Buscar pedido, projeto ou solicitante..."
        filters={filtersSlot}
        onOpenMobileMenu={onOpenMobileMenu}
      />

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 lg:p-9 max-w-4xl mx-auto">
            <EmptyState
              title={
                tab === 'pendentes'
                  ? 'Nenhuma decisão aguardando sua resposta neste momento.'
                  : 'Nenhuma decisão resolvida corresponde à busca.'
              }
              actionLabel={tab === 'pendentes' ? 'Ver tarefas do estúdio' : 'Ver pendentes'}
              onAction={() =>
                tab === 'pendentes' ? setActiveSection('tarefas') : setTab('pendentes')
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-[#0f1115]/8 dark:divide-[#f2f4f7]/8">
            <AnimatePresence initial={false}>
              {filtered.map((dec, idx) => {
                const requester = getMember(dec.solicitanteId);
                const project = getProject(dec.projetoId);
                const task = getTask(dec.tarefaId);
                const artifact = dec.artefatoId
                  ? task?.artefatos.find((a) => a.id === dec.artefatoId)
                  : undefined;
                const statusMeta = DECISION_STATUS_META[dec.status];
                const noteVal = notes[dec.id] ?? '';

                return (
                  <motion.article
                    key={dec.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="px-6 lg:px-9 py-6 hover:bg-[#f6f8fa]/70 dark:hover:bg-[#191d26]/55 transition-colors"
                  >
                    <div className="max-w-5xl flex flex-col lg:flex-row gap-6 justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                          <span className="tabular-nums font-semibold text-[#0f1115]/35 dark:text-[#f2f4f7]/35 mr-1">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <MemberAvatar member={requester} size="xs" showOperationalRing />
                          <span className="font-medium text-[#0f1115]/82 dark:text-[#f2f4f7]/82">
                            {requester?.nome}
                          </span>
                          <span>·</span>
                          <span>{requester?.cargo}</span>
                          <span>·</span>
                          <span className="font-medium text-[#163744] dark:text-[#9fdce6]">
                            {project?.nome}
                          </span>
                          <span>·</span>
                          <span className="tabular-nums">{dec.criadoEm}</span>
                          <span className="ml-auto">
                            <StatusIndicator
                              label={statusMeta.label}
                              dotClass={statusMeta.dotClass}
                              textClass={statusMeta.textClass}
                            />
                          </span>
                        </div>

                        <h2 className="mt-2.5 text-[17.5px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7] leading-snug">
                          {dec.titulo}
                        </h2>
                        <p className="mt-1.5 text-[14.5px] text-[#0f1115]/86 dark:text-[#f2f4f7]/86 leading-relaxed max-w-2xl">
                          {dec.pergunta}
                        </p>
                        <p className="mt-1 text-[13px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55 leading-relaxed max-w-2xl">
                          {dec.contexto}
                        </p>

                        {dec.respostaLucas && (
                          <div className="mt-3 text-[13px] text-[#163744] dark:text-[#9fdce6] font-medium">
                            Sua resposta: {dec.respostaLucas}
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          {dec.status === 'pendente' ? (
                            <>
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
                                className="h-8.5 px-2.5 rounded-[10px] text-[12.5px] font-medium text-[#991b1b] dark:text-[#f87171] hover:bg-[#b91c1c]/8 dark:hover:bg-[#f87171]/10 inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Recusar</span>
                              </button>

                              <input
                                type="text"
                                value={noteVal}
                                onChange={(e) =>
                                  setNotes((prev) => ({ ...prev, [dec.id]: e.target.value }))
                                }
                                placeholder="Nota opcional..."
                                className="eagle-input flex-1 min-w-[160px] max-w-xs h-8.5 px-3 text-[12.5px]"
                              />
                            </>
                          ) : null}

                          {task && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTaskId(task.id);
                                setActiveSection('tarefas');
                              }}
                              className="inline-flex items-center gap-1 h-8.5 px-2 text-[12.5px] font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60 hover:text-[#163744] dark:hover:text-[#9fdce6] transition-colors cursor-pointer whitespace-nowrap"
                            >
                              <span>Abrir {task.codigo}</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {artifact?.previewUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewArtifact({ artifact, taskId: task?.id })
                          }
                          className="relative w-full lg:w-64 h-40 rounded-[14px] overflow-hidden border border-[#0f1115]/10 dark:border-[#f2f4f7]/12 shrink-0 group cursor-pointer self-start"
                        >
                          <img
                            src={artifact.previewUrl}
                            alt={artifact.titulo}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                          />
                          <span className="absolute bottom-2.5 right-2.5 w-7 h-7 rounded-[8px] bg-[#0f1115]/70 text-[#f2f4f7] inline-flex items-center justify-center">
                            <Maximize2 className="w-3.5 h-3.5" />
                          </span>
                        </button>
                      )}
                    </div>
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
