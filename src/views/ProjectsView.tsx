import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, FileText, Folder, X } from 'lucide-react';
import {
  EmptyState,
  MemberAvatar,
  PageHeader,
  SegmentedControl,
  StatusIndicator,
} from '../components/SharedUI';
import { BentoCard, MicroRing } from '../components/VisualWidgets';
import { useEagle } from '../context/EagleContext';
import { ProjectStatus } from '../types/eagle';
import {
  formatShortDate,
  PROJECT_STATUS_META,
  TASK_STATUS_META,
} from '../utils/formatters';

export function ProjectsView({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const {
    state,
    selectedProjectId,
    setSelectedProjectId,
    getClient,
    getMember,
    createProject,
    updateProjectStatus,
    updateProjectSettings,
    setActiveSection,
    setSelectedTaskId,
    setPreviewArtifact,
  } = useEagle();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'todos'>('todos');
  const [folderTab, setFolderTab] = useState<'tarefas' | 'arquivos' | 'config'>('tarefas');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const [newName, setNewName] = useState('');
  const [newClientId, setNewClientId] = useState(state.clients[0]?.id ?? '');
  const [newLeaderId, setNewLeaderId] = useState('ag-clara');
  const [newDue, setNewDue] = useState('2026-12-15');
  const [newDiscipline, setNewDiscipline] = useState('Marca e Experiência');
  const [newDesc, setNewDesc] = useState('');

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.projects.filter((p) => {
      if (statusFilter !== 'todos' && p.estado !== statusFilter) return false;
      if (q) {
        const cli = getClient(p.clienteId)?.nome.toLowerCase() ?? '';
        return p.nome.toLowerCase().includes(q) || cli.includes(q);
      }
      return true;
    });
  }, [state.projects, statusFilter, search, getClient]);

  const activeProject = useMemo(
    () =>
      state.projects.find((p) => p.id === selectedProjectId) ??
      filteredProjects[0] ??
      null,
    [state.projects, selectedProjectId, filteredProjects]
  );

  const projectTasks = useMemo(
    () =>
      activeProject
        ? state.tasks.filter((t) => t.projetoId === activeProject.id)
        : [],
    [state.tasks, activeProject]
  );

  const projectArtifacts = useMemo(() => {
    if (!activeProject) return [];
    return projectTasks.flatMap((t) =>
      t.artefatos.map((a) => ({ artifact: a, taskId: t.id, taskTitle: t.titulo }))
    );
  }, [activeProject, projectTasks]);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const created = createProject({
      nome: newName,
      clienteId: newClientId || state.clients[0].id,
      liderId: newLeaderId,
      prazoEntrega: newDue,
      descricao: newDesc,
      disciplina: newDiscipline,
    });
    setNewName('');
    setNewDesc('');
    setIsNewModalOpen(false);
    setSelectedProjectId(created.id);
    setFolderTab('tarefas');
  };

  const filtersSlot = (
    <select
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'todos')}
      aria-label="Filtrar estado do projeto"
      className="eagle-input h-9 px-2.5 text-[13px] cursor-pointer"
    >
      <option value="todos">Todos os projetos</option>
      <option value="ativo">Ativos</option>
      <option value="em_pausa">Em pausa</option>
      <option value="concluido">Concluídos</option>
    </select>
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader
        title="Projetos"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar projeto ou cliente..."
        filters={filtersSlot}
        primaryAction={{
          label: 'Novo projeto',
          onClick: () => setIsNewModalOpen(true),
        }}
        onOpenMobileMenu={onOpenMobileMenu}
      />

      <div className="flex-1 min-h-0 overflow-hidden">
        {filteredProjects.length === 0 ? (
          <div className="p-6 lg:p-9 max-w-4xl mx-auto">
            <EmptyState
              title="Nenhum projeto encontrado."
              actionLabel="Criar primeiro projeto"
              onAction={() => setIsNewModalOpen(true)}
            />
          </div>
        ) : (
          <div className="h-full grid grid-cols-1 lg:grid-cols-[330px_minmax(0,1fr)] min-h-0">
            {/* Índice de pastas com micro-barra de progresso */}
            <div className="overflow-y-auto border-b lg:border-b-0 lg:border-r border-[#0f1115]/8 dark:border-[#f2f4f7]/8 divide-y divide-[#0f1115]/6 dark:divide-[#f2f4f7]/6 bg-white/55 dark:bg-[#15181f]/55">
              {filteredProjects.map((proj) => {
                const client = getClient(proj.clienteId);
                const leader = getMember(proj.liderId);
                const tasks = state.tasks.filter((t) => t.projetoId === proj.id);
                const done = tasks.filter((t) => t.estado === 'concluida').length;
                const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
                const meta = PROJECT_STATUS_META[proj.estado];
                const isSelected = activeProject?.id === proj.id;

                return (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => setSelectedProjectId(proj.id)}
                    className={`relative w-full text-left px-5 py-4 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-white dark:bg-[#1b2029]'
                        : 'hover:bg-white/75 dark:hover:bg-[#181c24]'
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="active-project-bar"
                        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute left-1 top-3.5 bottom-3.5 w-[3px] rounded-full bg-[#163744] dark:bg-[#9fdce6]"
                        aria-hidden="true"
                      />
                    )}
                    <div className="flex items-center justify-between gap-2 text-[11.5px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50">
                      <span className="truncate font-medium">
                        {client?.isInterno ? 'Interno · Eagle' : client?.nome}
                      </span>
                      <StatusIndicator
                        label={meta.label}
                        dotClass={meta.dotClass}
                        textClass={meta.textClass}
                      />
                    </div>

                    <div className="mt-1.5 text-[14.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] leading-snug">
                      {proj.nome}
                    </div>

                    <div className="mt-2.5 h-1 w-full rounded-full bg-[#e6e9ed] dark:bg-[#232934] overflow-hidden">
                      <div
                        className="h-full bg-[#163744] dark:bg-[#9fdce6] rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11.5px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MemberAvatar member={leader} size="xs" showOperationalRing />
                        <span className="truncate">{leader?.nome}</span>
                      </div>
                      <span className="tabular-nums shrink-0">
                        {done}/{tasks.length} · {formatShortDate(proj.prazoEntrega)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {activeProject && (() => {
              const doneCount = projectTasks.filter((t) => t.estado === 'concluida').length;
              const openCount = projectTasks.filter(
                (t) => t.estado !== 'concluida' && t.estado !== 'cancelada'
              ).length;
              const pct = projectTasks.length
                ? Math.round((doneCount / projectTasks.length) * 100)
                : 0;
              const leader = getMember(activeProject.liderId);

              return (
                <div className="flex flex-col h-full min-h-0 overflow-hidden">
                  {/* Cabeçalho da pasta + faixa visual de saúde */}
                  <div className="px-6 lg:px-8 py-5 bg-white dark:bg-[#15181f] border-b border-[#0f1115]/8 dark:border-[#f2f4f7]/8 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[12px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                          <Folder className="w-3.5 h-3.5" />
                          <span>{getClient(activeProject.clienteId)?.nome}</span>
                          <span>·</span>
                          <span>{activeProject.configuracoes.disciplina}</span>
                        </div>
                        <h2 className="mt-1 text-[19px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                          {activeProject.nome}
                        </h2>
                        {activeProject.descricao && (
                          <p className="mt-1 text-[13px] text-[#0f1115]/60 dark:text-[#f2f4f7]/60 max-w-2xl line-clamp-2">
                            {activeProject.descricao}
                          </p>
                        )}
                      </div>

                      <SegmentedControl
                        layoutId="project-folder-tab"
                        ariaLabel="Conteúdo da pasta"
                        value={folderTab}
                        onChange={setFolderTab}
                        options={[
                          { id: 'tarefas', label: `Tarefas (${projectTasks.length})` },
                          { id: 'arquivos', label: `Arquivos (${projectArtifacts.length})` },
                          { id: 'config', label: 'Configurações' },
                        ]}
                      />
                    </div>

                    {/* 4 micro-indicadores da pasta */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="rounded-[11px] bg-[#f2f4f7]/85 dark:bg-[#10141b] px-3.5 py-2.5 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                            Avanço
                          </div>
                          <div className="text-[14px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                            {doneCount}/{projectTasks.length}
                          </div>
                        </div>
                        <MicroRing value={pct} size={34} strokeWidth={3.5} label={`${pct}%`} />
                      </div>

                      <div className="rounded-[11px] bg-[#f2f4f7]/85 dark:bg-[#10141b] px-3.5 py-2.5">
                        <div className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                          Em aberto
                        </div>
                        <div className="mt-0.5 text-[15px] font-semibold tabular-nums text-[#163744] dark:text-[#9fdce6]">
                          {openCount} tarefas
                        </div>
                      </div>

                      <div className="rounded-[11px] bg-[#f2f4f7]/85 dark:bg-[#10141b] px-3.5 py-2.5">
                        <div className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                          Líder
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[13px] font-medium text-[#0f1115] dark:text-[#f2f4f7] truncate">
                          <MemberAvatar member={leader} size="xs" />
                          <span className="truncate">{leader?.nome}</span>
                        </div>
                      </div>

                      <div className="rounded-[11px] bg-[#f2f4f7]/85 dark:bg-[#10141b] px-3.5 py-2.5">
                        <div className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                          Entrega final
                        </div>
                        <div className="mt-0.5 text-[14px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                          {formatShortDate(activeProject.prazoEntrega)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 lg:p-7">
                    {folderTab === 'tarefas' && (
                      <div>
                        {projectTasks.length === 0 ? (
                          <EmptyState
                            title="Este projeto ainda não tem tarefas abertas."
                            actionLabel="Ir para Tarefas"
                            onAction={() => setActiveSection('tarefas')}
                          />
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {projectTasks.map((t) => {
                              const member = getMember(t.responsavelId);
                              const st = TASK_STATUS_META[t.estado];
                              const doneSub = t.subtarefas.filter((s) => s.concluida).length;
                              return (
                                <BentoCard
                                  key={t.id}
                                  onClick={() => {
                                    setSelectedTaskId(t.id);
                                    setActiveSection('tarefas');
                                  }}
                                  className="p-4 flex flex-col justify-between gap-3 group"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11.5px] font-medium text-[#0f1115]/45 dark:text-[#f2f4f7]/45 tabular-nums">
                                      {t.codigo}
                                    </span>
                                    <StatusIndicator
                                      label={st.label}
                                      dotClass={st.dotClass}
                                      textClass={st.textClass}
                                      live={t.estado === 'em_andamento'}
                                    />
                                  </div>

                                  <div className="text-[14px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] leading-snug group-hover:text-[#163744] dark:group-hover:text-[#9fdce6] transition-colors">
                                    {t.titulo}
                                  </div>

                                  <div className="flex items-center justify-between gap-2 pt-1 text-[12px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <MemberAvatar
                                        member={member}
                                        size="xs"
                                        showOperationalRing
                                      />
                                      <span className="truncate">{member?.nome}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 shrink-0 tabular-nums">
                                      {t.subtarefas.length > 0 && (
                                        <span>
                                          {doneSub}/{t.subtarefas.length}
                                        </span>
                                      )}
                                      <span>{formatShortDate(t.prazo)}</span>
                                      <ArrowRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                                    </div>
                                  </div>
                                </BentoCard>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {folderTab === 'arquivos' && (
                      <div>
                        {projectArtifacts.length === 0 ? (
                          <EmptyState title="Nenhum artefato produzido nas tarefas deste projeto ainda." />
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {projectArtifacts.map(({ artifact, taskId, taskTitle }) => (
                              <BentoCard
                                key={artifact.id}
                                onClick={() => setPreviewArtifact({ artifact, taskId })}
                                className="overflow-hidden group"
                              >
                                {artifact.previewUrl ? (
                                  <img
                                    src={artifact.previewUrl}
                                    alt={artifact.titulo}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-40 object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                                  />
                                ) : (
                                  <div className="h-24 px-4 bg-[#f2f4f7] dark:bg-[#10141b] flex items-center gap-2 text-[#163744] dark:text-[#9fdce6]">
                                    <FileText className="w-4 h-4" />
                                    <span className="text-[13px] font-medium">Documento</span>
                                  </div>
                                )}
                                <div className="p-3.5">
                                  <div className="text-[13.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                                    {artifact.titulo}
                                  </div>
                                  <div className="text-[12px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 tabular-nums mt-0.5 truncate">
                                    {artifact.versao} · {artifact.formato} · {taskTitle}
                                  </div>
                                </div>
                              </BentoCard>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {folderTab === 'config' && (
                      <BentoCard className="max-w-lg p-5 space-y-4">
                        <div>
                          <label className="block text-[12px] font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60 mb-1">
                            Estado do projeto
                          </label>
                          <select
                            value={activeProject.estado}
                            onChange={(e) =>
                              updateProjectStatus(
                                activeProject.id,
                                e.target.value as ProjectStatus
                              )
                            }
                            className="eagle-input w-full h-9.5 px-3 text-[13.5px]"
                          >
                            <option value="ativo">Ativo</option>
                            <option value="em_pausa">Em pausa</option>
                            <option value="concluido">Concluído</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[12px] font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60 mb-1">
                            Disciplina principal
                          </label>
                          <input
                            type="text"
                            value={activeProject.configuracoes.disciplina}
                            onChange={(e) =>
                              updateProjectSettings(activeProject.id, {
                                disciplina: e.target.value,
                              })
                            }
                            className="eagle-input w-full h-9.5 px-3 text-[13.5px]"
                          />
                        </div>

                        <div>
                          <label className="block text-[12px] font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60 mb-1">
                            Ritmo de revisão
                          </label>
                          <input
                            type="text"
                            value={activeProject.configuracoes.ritmoRevisao}
                            onChange={(e) =>
                              updateProjectSettings(activeProject.id, {
                                ritmoRevisao: e.target.value,
                              })
                            }
                            className="eagle-input w-full h-9.5 px-3 text-[13.5px]"
                          />
                        </div>

                        <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#0f1115]/7 dark:border-[#f2f4f7]/7">
                          <div>
                            <div className="text-[13.5px] font-medium text-[#0f1115] dark:text-[#f2f4f7]">
                              Exigir aprovação final do Lucas
                            </div>
                            <div className="text-[12px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                              Agentes enviam artefatos críticos para a fila de Decisões.
                            </div>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={activeProject.configuracoes.aprovacaoDiretaLucas}
                            aria-label="Exigir aprovação final do Lucas"
                            data-checked={activeProject.configuracoes.aprovacaoDiretaLucas}
                            onClick={() =>
                              updateProjectSettings(activeProject.id, {
                                aprovacaoDiretaLucas:
                                  !activeProject.configuracoes.aprovacaoDiretaLucas,
                              })
                            }
                            className="eagle-switch cursor-pointer shrink-0"
                          >
                            <span className="eagle-switch-thumb" />
                          </button>
                        </div>
                      </BentoCard>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {isNewModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1115]/55 backdrop-blur-xs p-4"
          onClick={() => setIsNewModalOpen(false)}
        >
          <form
            onSubmit={handleCreateProject}
            onClick={(e) => e.stopPropagation()}
            className="eagle-modal w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                Novo projeto
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
                  Nome do projeto
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Prêmio Arquitetura SP — Experiência e Marca"
                  className="eagle-input w-full h-9.5 px-3 text-[13.5px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                    Cliente
                  </label>
                  <select
                    value={newClientId}
                    onChange={(e) => setNewClientId(e.target.value)}
                    className="eagle-input w-full h-9.5 px-3 text-[13px]"
                  >
                    {state.clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                    Líder
                  </label>
                  <select
                    value={newLeaderId}
                    onChange={(e) => setNewLeaderId(e.target.value)}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                    Disciplina
                  </label>
                  <input
                    type="text"
                    value={newDiscipline}
                    onChange={(e) => setNewDiscipline(e.target.value)}
                    className="eagle-input w-full h-9.5 px-3 text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                    Entrega
                  </label>
                  <input
                    type="date"
                    value={newDue}
                    onChange={(e) => setNewDue(e.target.value)}
                    className="eagle-input w-full h-9.5 px-3 text-[13px] tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                  Objetivo resumido
                </label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Escopo principal da entrega..."
                  className="eagle-input w-full p-3 text-[13px]"
                />
              </div>
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
                Criar projeto
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
