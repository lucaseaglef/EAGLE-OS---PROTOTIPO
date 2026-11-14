import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Columns3, List, MessageSquare, Paperclip, X } from 'lucide-react';
import { TaskDetailPanel } from '../components/TaskDetailPanel';
import {
  EmptyState,
  MemberAvatar,
  PageHeader,
  SegmentedControl,
  StatusIndicator,
} from '../components/SharedUI';
import { useEagle } from '../context/EagleContext';
import { TaskStatus } from '../types/eagle';
import { formatShortDate, TASK_STATUS_META } from '../utils/formatters';

const STATUS_ORDER: TaskStatus[] = [
  'em_revisao',
  'bloqueada',
  'em_andamento',
  'a_fazer',
  'concluida',
  'cancelada',
];

type GroupByMode = 'estado' | 'responsavel' | 'projeto' | 'nenhum';

export function TasksView({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const {
    state,
    selectedTaskId,
    setSelectedTaskId,
    selectedDateFilter,
    setSelectedDateFilter,
    getMember,
    getProject,
    createTask,
    updateTaskStatus,
  } = useEagle();

  const [viewMode, setViewMode] = useState<'lista' | 'kanban'>('lista');
  const [groupBy, setGroupBy] = useState<GroupByMode>('estado');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'todas'>('todas');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newBriefing, setNewBriefing] = useState('');
  const [newProjectId, setNewProjectId] = useState(state.projects[0]?.id ?? '');
  const [newAssigneeId, setNewAssigneeId] = useState('ag-clara');
  const [newReviewerId, setNewReviewerId] = useState('mem-lucas');
  const [newDue, setNewDue] = useState('2026-11-20');

  const pendingDecisionTaskIds = useMemo(() => {
    const set = new Set<string>();
    state.decisions.forEach((d) => {
      if (d.status === 'pendente') set.add(d.tarefaId);
    });
    return set;
  }, [state.decisions]);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.tasks.filter((t) => {
      if (statusFilter !== 'todas' && t.estado !== statusFilter) return false;
      if (selectedDateFilter && t.prazo !== selectedDateFilter) return false;
      if (q) {
        const proj = getProject(t.projetoId)?.nome.toLowerCase() ?? '';
        const mem = getMember(t.responsavelId)?.nome.toLowerCase() ?? '';
        const match =
          t.titulo.toLowerCase().includes(q) ||
          t.codigo.toLowerCase().includes(q) ||
          t.briefing.toLowerCase().includes(q) ||
          proj.includes(q) ||
          mem.includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [state.tasks, statusFilter, selectedDateFilter, search, getProject, getMember]);

  const groupedTasks = useMemo(() => {
    if (groupBy === 'nenhum') {
      return [{ key: 'todas', label: '', tasks: filteredTasks }];
    }

    if (groupBy === 'estado') {
      return STATUS_ORDER.map((st) => ({
        key: st,
        label: TASK_STATUS_META[st].label,
        dotClass: TASK_STATUS_META[st].dotClass,
        live: st === 'em_andamento',
        tasks: filteredTasks.filter((t) => t.estado === st),
      })).filter((g) => g.tasks.length > 0);
    }

    if (groupBy === 'responsavel') {
      const byMember = new Map<string, typeof filteredTasks>();
      filteredTasks.forEach((t) => {
        const list = byMember.get(t.responsavelId) ?? [];
        list.push(t);
        byMember.set(t.responsavelId, list);
      });
      return Array.from(byMember.entries()).map(([memId, tasks]) => {
        const m = getMember(memId);
        return {
          key: memId,
          label: m ? `${m.nome} · ${m.cargo}` : 'Sem responsável',
          tasks,
        };
      });
    }

    const byProject = new Map<string, typeof filteredTasks>();
    filteredTasks.forEach((t) => {
      const list = byProject.get(t.projetoId) ?? [];
      list.push(t);
      byProject.set(t.projetoId, list);
    });
    return Array.from(byProject.entries()).map(([prjId, tasks]) => {
      const p = getProject(prjId);
      return {
        key: prjId,
        label: p?.nome ?? 'Projeto',
        tasks,
      };
    });
  }, [filteredTasks, groupBy, getMember, getProject]);

  const activeTask = useMemo(
    () => state.tasks.find((t) => t.id === selectedTaskId) ?? null,
    [state.tasks, selectedTaskId]
  );

  const selectedNewAssignee = getMember(newAssigneeId);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const created = createTask({
      titulo: newTitle,
      briefing: newBriefing,
      projetoId: newProjectId || state.projects[0].id,
      responsavelId: newAssigneeId,
      revisorId: newReviewerId,
      prazo: newDue,
    });
    setNewTitle('');
    setNewBriefing('');
    setIsNewModalOpen(false);
    setSelectedTaskId(created.id);
  };

  const filtersSlot = (
    <div className="flex flex-wrap items-center gap-2">
      {viewMode === 'lista' && (
        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as GroupByMode)}
          aria-label="Agrupar tarefas"
          className="eagle-input h-9 px-2.5 text-[13px] cursor-pointer"
        >
          <option value="estado">Agrupar: Estado</option>
          <option value="responsavel">Agrupar: Responsável</option>
          <option value="projeto">Agrupar: Projeto</option>
          <option value="nenhum">Sem agrupamento</option>
        </select>
      )}

      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'todas')}
        aria-label="Filtrar por estado"
        className="eagle-input h-9 px-2.5 text-[13px] cursor-pointer"
      >
        <option value="todas">Todos os estados</option>
        {STATUS_ORDER.map((st) => (
          <option key={st} value={st}>
            {TASK_STATUS_META[st].label}
          </option>
        ))}
      </select>

      <SegmentedControl
        layoutId="tasks-view-mode"
        ariaLabel="Modo de visualização"
        value={viewMode}
        onChange={setViewMode}
        options={[
          { id: 'lista', label: 'Lista', icon: List },
          { id: 'kanban', label: 'Quadro', icon: Columns3 },
        ]}
      />
    </div>
  );

  const renderTaskRow = (task: (typeof filteredTasks)[number]) => {
    const member = getMember(task.responsavelId);
    const project = getProject(task.projetoId);
    const meta = TASK_STATUS_META[task.estado];
    const selected = task.id === selectedTaskId;
    const doneSub = task.subtarefas.filter((s) => s.concluida).length;
    const isLive = task.estado === 'em_andamento' || task.execucaoAtiva;
    const isSerene = task.estado === 'concluida' || task.estado === 'cancelada';
    const waitsLucas = pendingDecisionTaskIds.has(task.id) || task.estado === 'em_revisao';

    return (
      <button
        key={task.id}
        type="button"
        onClick={() => setSelectedTaskId(task.id)}
        className={`relative w-full text-left px-5 py-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
          selected
            ? 'bg-[#ebeff3]/85 dark:bg-[#1e2530]'
            : 'hover:bg-[#f6f8fa] dark:hover:bg-[#191d26]'
        } ${isSerene && !selected ? 'opacity-60 hover:opacity-90' : ''}`}
      >
        {selected && (
          <motion.span
            layoutId="active-task-indicator"
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-1 top-3 bottom-3 w-[3px] rounded-full bg-[#163744] dark:bg-[#9fdce6]"
            aria-hidden="true"
          />
        )}

        <MemberAvatar member={member} size="md" showOperationalRing />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span
              className={`text-[13.5px] font-medium leading-snug line-clamp-2 ${
                task.estado === 'cancelada'
                  ? 'line-through text-[#0f1115]/55 dark:text-[#f2f4f7]/55'
                  : 'text-[#0f1115] dark:text-[#f2f4f7]'
              }`}
            >
              {task.titulo}
            </span>
          </div>

          {/* Linha discreta abaixo: Projeto · Responsável + sinais essenciais */}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
            <span className="truncate max-w-[165px]">{project?.nome}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{member?.nome}</span>
            <span aria-hidden="true">·</span>
            <StatusIndicator
              label={meta.label}
              dotClass={meta.dotClass}
              textClass={meta.textClass}
              live={isLive}
            />
            {waitsLucas && !isSerene && (
              <span className="text-[11px] font-medium text-[#163744] dark:text-[#9fdce6]">
                · Aguarda você
              </span>
            )}
            <span className="ml-auto inline-flex items-center gap-2 tabular-nums shrink-0 text-[#0f1115]/44 dark:text-[#f2f4f7]/44">
              {task.subtarefas.length > 0 && (
                <span>
                  {doneSub}/{task.subtarefas.length}
                </span>
              )}
              {task.artefatos.length > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <Paperclip className="w-3 h-3" />
                  {task.artefatos.length}
                </span>
              )}
              <span>{formatShortDate(task.prazo)}</span>
            </span>
          </div>
        </div>
      </button>
    );
  };

  // Quando uma tarefa está aberta no modo lista, a conversa e o painel de propriedades são folhas independentes sobre a mesa
  if (viewMode === 'lista' && activeTask) {
    return (
      <TaskDetailPanel
        task={activeTask}
        onClose={() => setSelectedTaskId(null)}
        onSelectTask={(id) => setSelectedTaskId(id)}
        onOpenMobileMenu={onOpenMobileMenu}
      />
    );
  }

  return (
    <div className="eagle-sheet-canvas flex flex-col h-full min-h-0 overflow-hidden">
      <PageHeader
        title="Tarefas"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar tarefa, briefing ou projeto..."
        filters={filtersSlot}
        primaryAction={{
          label: 'Nova tarefa',
          onClick: () => setIsNewModalOpen(true),
        }}
        onOpenMobileMenu={onOpenMobileMenu}
      />

      {selectedDateFilter && (
        <div className="px-5 lg:px-7 py-2.5 border-b border-[#0f1115]/8 dark:border-[#f2f4f7]/8 flex items-center justify-between text-[12.5px]">
          <div className="inline-flex items-center gap-2 text-[#163744] dark:text-[#9fdce6] font-medium">
            <span>Entregas previstas para {formatShortDate(selectedDateFilter)}</span>
            <button
              type="button"
              onClick={() => setSelectedDateFilter(null)}
              className="inline-flex items-center gap-1 text-[#0f1115]/60 dark:text-[#f2f4f7]/60 hover:text-[#0f1115] dark:hover:text-[#f2f4f7] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpar filtro de data</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        {viewMode === 'lista' ? (
          <div className="h-full overflow-y-auto">
            {filteredTasks.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="Nenhuma tarefa encontrada com os filtros atuais."
                  actionLabel="Criar nova tarefa"
                  onAction={() => setIsNewModalOpen(true)}
                />
              </div>
            ) : (
              <div>
                {groupedTasks.map((group) => (
                  <div key={group.key}>
                    {group.label && (
                      <div className="sticky top-0 z-10 px-5 lg:px-7 py-2 bg-[#f2f4f7]/92 dark:bg-[#0f1115]/92 backdrop-blur-xs border-b border-[#0f1115]/6 dark:border-[#f2f4f7]/6 flex items-center justify-between text-[11.5px] font-medium text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                        <span className="truncate">{group.label}</span>
                        <span className="tabular-nums text-[#0f1115]/40 dark:text-[#f2f4f7]/40">
                          {group.tasks.length}
                        </span>
                      </div>
                    )}
                    <div className="divide-y divide-[#0f1115]/6 dark:divide-[#f2f4f7]/6">
                      {group.tasks.map((task) => renderTaskRow(task))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Quadro de colunas por estado */
          <div className="h-full flex gap-3.5 overflow-x-auto p-4 lg:p-5 bg-[#f2f4f7]/50 dark:bg-[#0f1115]/45">
            {STATUS_ORDER.map((status) => {
              const meta = TASK_STATUS_META[status];
              const columnTasks = filteredTasks.filter((t) => t.estado === status);
              const isSereneCol = status === 'concluida' || status === 'cancelada';

              return (
                <div
                  key={status}
                  className={`w-[288px] shrink-0 flex flex-col h-full rounded-[16px] bg-[#ebeff3]/75 dark:bg-[#12151b] border border-[#0f1115]/7 dark:border-[#f2f4f7]/7 ${
                    isSereneCol ? 'opacity-80' : ''
                  }`}
                >
                  <div className="px-3.5 py-3 flex items-center justify-between">
                    <StatusIndicator
                      label={meta.label}
                      dotClass={meta.dotClass}
                      textClass={meta.textClass}
                      live={status === 'em_andamento'}
                    />
                    <span className="text-[12px] font-semibold text-[#0f1115]/45 dark:text-[#f2f4f7]/45 tabular-nums">
                      {columnTasks.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto px-2.5 pb-2.5 space-y-2.5">
                    {columnTasks.map((task) => {
                      const member = getMember(task.responsavelId);
                      const project = getProject(task.projetoId);
                      const doneSub = task.subtarefas.filter((s) => s.concluida).length;

                      return (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTaskId(task.id)}
                          className="eagle-card eagle-card-interactive p-3.5 cursor-pointer space-y-2.5"
                        >
                          <div
                            className={`text-[13.5px] font-medium leading-snug ${
                              status === 'cancelada'
                                ? 'line-through text-[#0f1115]/55 dark:text-[#f2f4f7]/55'
                                : 'text-[#0f1115] dark:text-[#f2f4f7]'
                            }`}
                          >
                            {task.titulo}
                          </div>

                          <div className="text-[11.5px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 truncate">
                            {project?.nome}
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <MemberAvatar member={member} size="xs" showOperationalRing />
                              <span className="text-[12px] text-[#0f1115]/75 dark:text-[#f2f4f7]/75 truncate">
                                {member?.nome}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-[#0f1115]/45 dark:text-[#f2f4f7]/45 tabular-nums shrink-0">
                              {task.mensagens.length > 0 && (
                                <span className="inline-flex items-center gap-0.5">
                                  <MessageSquare className="w-3 h-3" />
                                  {task.mensagens.length}
                                </span>
                              )}
                              {task.subtarefas.length > 0 && (
                                <span>
                                  {doneSub}/{task.subtarefas.length}
                                </span>
                              )}
                              <span>{formatShortDate(task.prazo)}</span>
                            </div>
                          </div>

                          <div
                            className="pt-2 border-t border-[#0f1115]/6 dark:border-[#f2f4f7]/6 flex items-center justify-between"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[11px] text-[#0f1115]/40 dark:text-[#f2f4f7]/40 tabular-nums">
                              {task.codigo}
                            </span>
                            <select
                              value={task.estado}
                              onChange={(e) =>
                                updateTaskStatus(task.id, e.target.value as TaskStatus)
                              }
                              aria-label={`Mover ${task.codigo}`}
                              className="text-[11px] font-medium bg-transparent text-[#0f1115]/65 dark:text-[#f2f4f7]/65 hover:text-[#163744] dark:hover:text-[#9fdce6] focus:outline-none cursor-pointer"
                            >
                              {STATUS_ORDER.map((s) => (
                                <option key={s} value={s} className="bg-white dark:bg-[#15181f]">
                                  {TASK_STATUS_META[s].label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {activeTask && (
              <div
                className="fixed inset-0 z-40 flex justify-end bg-[#0f1115]/48 backdrop-blur-xs"
                onClick={() => setSelectedTaskId(null)}
              >
                <div
                  className="w-full max-w-6xl h-full p-3 sm:p-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <TaskDetailPanel
                    task={activeTask}
                    onClose={() => setSelectedTaskId(null)}
                    onSelectTask={(id) => setSelectedTaskId(id)}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Nova Tarefa */}
      {isNewModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1115]/55 backdrop-blur-xs p-4"
          onClick={() => setIsNewModalOpen(false)}
        >
          <form
            onSubmit={handleCreateTask}
            onClick={(e) => e.stopPropagation()}
            className="eagle-modal w-full max-w-lg p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                Novo pedido de trabalho
              </h2>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="eagle-btn-secondary w-7.5 h-7.5 inline-flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                  O que precisa ser feito
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Criar 4 conceitos de logo para o cliente"
                  className="eagle-input w-full h-9.5 px-3 text-[13.5px]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                  Briefing para o responsável
                </label>
                <textarea
                  rows={3}
                  value={newBriefing}
                  onChange={(e) => setNewBriefing(e.target.value)}
                  placeholder="Contexto, referências, restrições e o que você espera receber..."
                  className="eagle-input w-full p-3 text-[13px] leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                    Projeto
                  </label>
                  <select
                    value={newProjectId}
                    onChange={(e) => setNewProjectId(e.target.value)}
                    className="eagle-input w-full h-9.5 px-3 text-[13px]"
                  >
                    {state.projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                    Prazo
                  </label>
                  <input
                    type="date"
                    value={newDue}
                    onChange={(e) => setNewDue(e.target.value)}
                    className="eagle-input w-full h-9.5 px-3 text-[13px] tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                    Quem faz
                  </label>
                  <select
                    value={newAssigneeId}
                    onChange={(e) => setNewAssigneeId(e.target.value)}
                    className="eagle-input w-full h-9.5 px-3 text-[13px]"
                  >
                    {state.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome} ({m.tipo === 'agente' ? m.cargo : 'Equipe'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                    Quem revisa
                  </label>
                  <select
                    value={newReviewerId}
                    onChange={(e) => setNewReviewerId(e.target.value)}
                    className="eagle-input w-full h-9.5 px-3 text-[13px]"
                  >
                    {state.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedNewAssignee?.tipo === 'agente' && (
                <div className="text-[12px] text-[#163744] dark:text-[#9fdce6] pt-0.5">
                  {selectedNewAssignee.nome} inicia a execução assim que a tarefa for criada.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="eagle-btn-secondary h-9 px-3.5 text-[13px] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="eagle-btn-primary h-9 px-4 text-[13px] font-medium cursor-pointer"
              >
                Criar e iniciar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
