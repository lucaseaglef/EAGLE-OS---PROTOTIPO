import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Columns3,
  FileText,
  Folder,
  GitBranch,
  Layers,
  List,
  Maximize2,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import {
  EmptyState,
  MemberAvatar,
  PageHeader,
  SegmentedControl,
  StatusIndicator,
} from '../components/SharedUI';
import {
  BentoCard,
  MicroRing,
  ProportionBar,
  StudioSculptureGraphic,
} from '../components/VisualWidgets';
import { useEagle } from '../context/EagleContext';
import { ProjectStatus, Task, TaskStatus } from '../types/eagle';
import {
  DECISION_STATUS_META,
  formatBRL,
  formatShortDate,
  PROJECT_STATUS_META,
  TASK_STATUS_META,
} from '../utils/formatters';

type FolderTab = 'tarefas' | 'arquivos' | 'fluxo' | 'config';

export function ProjectsView({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const {
    state,
    selectedProjectId,
    setSelectedProjectId,
    getClient,
    getMember,
    createProject,
    createTask,
    updateProjectStatus,
    updateProjectSettings,
    approveArtifact,
    resolveDecision,
    toggleFinanceStatus,
    setActiveSection,
    setSelectedTaskId,
    setPreviewArtifact,
  } = useEagle();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'todos'>('todos');
  const [folderTab, setFolderTab] = useState<FolderTab>('tarefas');
  const [taskLayout, setTaskLayout] = useState<'quadro' | 'lista'>('quadro');

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newClientId, setNewClientId] = useState(state.clients[0]?.id ?? '');
  const [newLeaderId, setNewLeaderId] = useState('ag-clara');
  const [newDue, setNewDue] = useState('2026-12-15');
  const [newDiscipline, setNewDiscipline] = useState('Marca e Experiência');
  const [newDesc, setNewDesc] = useState('');

  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('ag-clara');
  const [taskDue, setTaskDue] = useState('2026-11-28');
  const [taskBriefing, setTaskBriefing] = useState('');

  const activeProject = useMemo(
    () =>
      selectedProjectId
        ? state.projects.find((p) => p.id === selectedProjectId) ?? null
        : null,
    [state.projects, selectedProjectId]
  );

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.projects.filter((p) => {
      if (statusFilter !== 'todos' && p.estado !== statusFilter) return false;
      if (q) {
        const cli = getClient(p.clienteId)?.nome.toLowerCase() ?? '';
        return (
          p.nome.toLowerCase().includes(q) ||
          cli.includes(q) ||
          p.configuracoes.disciplina.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [state.projects, statusFilter, search, getClient]);

  const portfolioStats = useMemo(() => {
    const total = state.projects.length;
    const activeCount = state.projects.filter((p) => p.estado === 'ativo').length;
    let clientProjects = 0;
    let internalProjects = 0;
    for (const p of state.projects) {
      const cli = getClient(p.clienteId);
      if (cli?.isInterno) internalProjects += 1;
      else clientProjects += 1;
    }

    const clientPct = Math.round((clientProjects / Math.max(1, total)) * 100);
    const internalPct = Math.max(0, 100 - clientPct);

    const doneTasks = state.tasks.filter((t) => t.estado === 'concluida').length;
    const activeTasks = state.tasks.filter(
      (t) => t.estado === 'em_andamento' || t.estado === 'em_revisao' || t.estado === 'a_fazer'
    ).length;
    const blockedTasks = state.tasks.filter((t) => t.estado === 'bloqueada').length;
    const inReviewCount = state.tasks.filter((t) => t.estado === 'em_revisao').length;
    const totalArtifacts = state.tasks.reduce((sum, t) => sum + t.artefatos.length, 0);
    const pendingDecisionsCount = state.decisions.filter(
      (d) => d.status === 'pendente'
    ).length;

    const upcomingDeadlines = [...state.projects]
      .filter((p) => p.estado !== 'concluido')
      .sort((a, b) => a.prazoEntrega.localeCompare(b.prazoEntrega))
      .slice(0, 3);

    return {
      total,
      activeCount,
      clientProjects,
      internalProjects,
      clientPct,
      internalPct,
      totalTasks: state.tasks.length,
      doneTasks,
      activeTasks,
      blockedTasks,
      inReviewCount,
      totalArtifacts,
      pendingDecisionsCount,
      upcomingDeadlines,
    };
  }, [state.projects, state.tasks, state.decisions, getClient]);

  const projectTasks = useMemo(() => {
    if (!activeProject) return [];
    const q = search.trim().toLowerCase();
    return state.tasks.filter(
      (t) =>
        t.projetoId === activeProject.id &&
        (!q || t.titulo.toLowerCase().includes(q) || t.codigo.toLowerCase().includes(q))
    );
  }, [state.tasks, activeProject, search]);

  const allProjectTasks = useMemo(
    () =>
      activeProject
        ? state.tasks.filter((t) => t.projetoId === activeProject.id)
        : [],
    [state.tasks, activeProject]
  );

  const projectArtifacts = useMemo(() => {
    if (!activeProject) return [];
    const q = search.trim().toLowerCase();
    return allProjectTasks.flatMap((t) =>
      t.artefatos
        .filter(
          (a) =>
            !q ||
            a.titulo.toLowerCase().includes(q) ||
            t.titulo.toLowerCase().includes(q)
        )
        .map((a) => ({ artifact: a, taskId: t.id, taskCode: t.codigo, taskTitle: t.titulo }))
    );
  }, [activeProject, allProjectTasks, search]);

  const projectDecisions = useMemo(
    () =>
      activeProject
        ? state.decisions.filter((d) => d.projetoId === activeProject.id)
        : [],
    [state.decisions, activeProject]
  );

  const clientFinances = useMemo(
    () =>
      activeProject
        ? state.finances.filter((f) => f.clienteId === activeProject.clienteId)
        : [],
    [state.finances, activeProject]
  );

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
    setSearch('');
    setSelectedProjectId(created.id);
    setFolderTab('tarefas');
  };

  const handleCreateProjectTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !taskTitle.trim()) return;
    createTask({
      titulo: taskTitle,
      briefing: taskBriefing,
      projetoId: activeProject.id,
      responsavelId: taskAssigneeId,
      prazo: taskDue,
    });
    setTaskTitle('');
    setTaskBriefing('');
    setIsNewTaskOpen(false);
    setFolderTab('tarefas');
  };

  const filtersSlot = !activeProject ? (
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
  ) : undefined;

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader
        title="Projetos"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={
          activeProject ? 'Filtrar tarefas e entregas...' : 'Buscar projeto, cliente...'
        }
        filters={filtersSlot}
        primaryAction={
          activeProject
            ? {
                label: 'Nova tarefa',
                onClick: () => {
                  setTaskAssigneeId(activeProject.liderId);
                  setTaskDue(activeProject.prazoEntrega);
                  setIsNewTaskOpen(true);
                },
              }
            : {
                label: 'Novo projeto',
                onClick: () => setIsNewModalOpen(true),
              }
        }
        onOpenMobileMenu={onOpenMobileMenu}
      />

      <div className="flex-1 overflow-y-auto p-5 lg:p-7">
        <AnimatePresence mode="wait">
          {!activeProject ? (
            /* ================================================================ */
            /* MODO 1: PORTFÓLIO EM BENTO ARQUITETURAL                          */
            /* ================================================================ */
            <motion.div
              key="portfolio-overview"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-[1380px] mx-auto space-y-6"
            >
              {/* FAIXA 1: PULSO DO PORTFÓLIO (3 BENTO CARDS) */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
                {/* Bloco 1: Hero com escultura + glassmorfismo + colunas verticais */}
                <BentoCard className="xl:col-span-4 p-5 flex flex-col justify-between gap-4 relative overflow-hidden">
                  <div className="flex items-center justify-between gap-3 relative z-10">
                    <div>
                      <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                        Portfólio ativo
                      </h2>
                      <p className="text-[12px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                        Frentes de clientes e casa Eagle
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSection('clientes')}
                      title="Ver clientes"
                      className="w-8 h-8 rounded-full border border-[#0f1115]/8 dark:border-[#f2f4f7]/10 bg-[#f2f4f7]/80 dark:bg-[#1b2029] hover:bg-[#e6e9ed] dark:hover:bg-[#252c39] text-[#0f1115]/70 dark:text-[#f2f4f7]/75 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Escultura + Cartão Glassmórfico */}
                  <div className="relative pt-1">
                    <div className="h-[132px] flex justify-end items-start -mr-2">
                      <div className="w-full max-w-[250px] h-[168px] -mt-4">
                        <StudioSculptureGraphic />
                      </div>
                    </div>

                    <div className="relative z-10 -mt-[78px] rounded-[18px] overflow-hidden backdrop-blur-xl backdrop-saturate-150 bg-white/46 dark:bg-[#141922]/52 border border-white/80 dark:border-white/15 p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_14px_34px_rgba(22,55,68,0.10)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_16px_36px_rgba(0,0,0,0.44)]">
                      <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/55 via-white/12 to-transparent dark:from-white/10 dark:via-white/3 dark:to-transparent"
                        aria-hidden="true"
                      />
                      <div className="relative z-10 grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[11px] font-medium text-[#0f1115]/58 dark:text-[#f2f4f7]/58">
                            Em operação
                          </div>
                          <div className="mt-1 text-[26px] font-semibold tracking-[-0.03em] tabular-nums text-[#0f1115] dark:text-[#f2f4f7] leading-none">
                            {portfolioStats.activeCount}
                            <span className="ml-1 text-[12px] font-normal text-[#0f1115]/58 dark:text-[#f2f4f7]/58">
                              ativos
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-medium text-[#0f1115]/58 dark:text-[#f2f4f7]/58">
                            Acervo gerado
                          </div>
                          <div className="mt-1 text-[26px] font-semibold tracking-[-0.03em] tabular-nums text-[#163744] dark:text-[#9fdce6] leading-none">
                            {portfolioStats.totalArtifacts}
                            <span className="ml-1 text-[12px] font-normal text-[#0f1115]/58 dark:text-[#f2f4f7]/58">
                              peças
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Duas barras comparativas */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveSection('clientes')}
                      className="rounded-[16px] bg-[#f2f4f7]/80 dark:bg-[#10141b] p-1.5 h-[110px] flex flex-col justify-between text-left cursor-pointer hover:ring-1 hover:ring-[#163744]/20 dark:hover:ring-[#9fdce6]/25 transition-all"
                    >
                      <div className="px-2 pt-1 flex items-baseline justify-between">
                        <span className="text-[12px] font-semibold tabular-nums text-[#163744] dark:text-[#9fdce6]">
                          {portfolioStats.clientPct}%
                        </span>
                        <span className="text-[10.5px] text-[#0f1115]/45 dark:text-[#f2f4f7]/45">
                          externos
                        </span>
                      </div>
                      <div
                        className="w-full rounded-[12px] bg-[#9fdce6] text-[#0f1115] px-3 py-2 flex items-baseline justify-between"
                        style={{ height: '64%' }}
                      >
                        <span className="text-[17px] font-semibold tabular-nums leading-none">
                          {portfolioStats.clientProjects}
                        </span>
                        <span className="text-[11px] font-medium text-[#0f1115]/75">
                          Clientes
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatusFilter('todos')}
                      className="rounded-[16px] bg-[#f2f4f7]/80 dark:bg-[#10141b] p-1.5 h-[110px] flex flex-col justify-between text-left cursor-pointer hover:ring-1 hover:ring-[#163744]/20 dark:hover:ring-[#9fdce6]/25 transition-all"
                    >
                      <div className="px-2 pt-1 flex items-baseline justify-between">
                        <span className="text-[12px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                          {portfolioStats.internalPct}%
                        </span>
                        <span className="text-[10.5px] text-[#0f1115]/45 dark:text-[#f2f4f7]/45">
                          casa
                        </span>
                      </div>
                      <div
                        className="w-full rounded-[12px] bg-[#163744] text-white dark:bg-[#234f60] px-3 py-2 flex items-baseline justify-between"
                        style={{ height: '58%' }}
                      >
                        <span className="text-[17px] font-semibold tabular-nums leading-none">
                          {portfolioStats.internalProjects}
                        </span>
                        <span className="text-[11px] font-medium text-white/80">
                          Internos
                        </span>
                      </div>
                    </button>
                  </div>
                </BentoCard>

                {/* Bloco 2: Pulso das entregas */}
                <BentoCard className="xl:col-span-4 p-5 flex flex-col justify-between gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                        Pulso de execução
                      </h2>
                      <p className="mt-1 text-[12px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                        Distribuição das tarefas no estúdio
                      </p>
                      <div className="mt-1 text-[30px] font-semibold tracking-[-0.03em] tabular-nums text-[#0f1115] dark:text-[#f2f4f7] leading-none">
                        {portfolioStats.totalTasks}
                        <span className="ml-1.5 text-[13px] font-normal text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                          tarefas
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveSection('tarefas')}
                      title="Abrir tarefas"
                      className="w-8 h-8 rounded-full border border-[#0f1115]/8 dark:border-[#f2f4f7]/10 bg-[#f2f4f7]/80 dark:bg-[#1b2029] hover:bg-[#e6e9ed] dark:hover:bg-[#252c39] text-[#0f1115]/70 dark:text-[#f2f4f7]/75 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>

                  <ProportionBar
                    heightClass="h-2.5"
                    showLegend
                    segments={[
                      {
                        key: 'done',
                        value: portfolioStats.doneTasks,
                        colorClass: 'bg-[#15803d] dark:bg-[#4ade80]',
                        label: `${portfolioStats.doneTasks} feitas`,
                      },
                      {
                        key: 'active',
                        value: portfolioStats.activeTasks,
                        colorClass: 'bg-[#163744] dark:bg-[#9fdce6]',
                        label: `${portfolioStats.activeTasks} em fluxo`,
                      },
                      {
                        key: 'blocked',
                        value: portfolioStats.blockedTasks,
                        colorClass: 'bg-[#b91c1c] dark:bg-[#f87171]',
                        label: `${portfolioStats.blockedTasks} travadas`,
                      },
                    ]}
                  />

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveSection('tarefas')}
                      className="rounded-[12px] bg-[#f2f4f7]/85 dark:bg-[#10141b] hover:bg-[#e6e9ed] dark:hover:bg-[#1a202b] p-3 text-left transition-colors cursor-pointer"
                    >
                      <div className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                        Aguardando revisão
                      </div>
                      <div className="mt-1 text-[18px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                        {portfolioStats.inReviewCount}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveSection('decisoes')}
                      className="rounded-[12px] bg-[#f2f4f7]/85 dark:bg-[#10141b] hover:bg-[#e6e9ed] dark:hover:bg-[#1a202b] p-3 text-left transition-colors cursor-pointer"
                    >
                      <div className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                        Decisões abertas
                      </div>
                      <div className="mt-1 text-[18px] font-semibold tabular-nums text-[#163744] dark:text-[#9fdce6]">
                        {portfolioStats.pendingDecisionsCount}
                      </div>
                    </button>
                  </div>
                </BentoCard>

                {/* Bloco 3: Próximos marcos do portfólio */}
                <BentoCard className="xl:col-span-4 p-5 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                        Radar de entregas
                      </h2>
                      <p className="text-[12px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                        Próximas datas de fechamento
                      </p>
                    </div>
                    <span className="text-[11.5px] font-medium text-[#163744] dark:text-[#9fdce6] tabular-nums">
                      {portfolioStats.upcomingDeadlines.length} marcos
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1 flex flex-col justify-center">
                    {portfolioStats.upcomingDeadlines.map((proj) => {
                      const cli = getClient(proj.clienteId);
                      const tasks = state.tasks.filter((t) => t.projetoId === proj.id);
                      const done = tasks.filter((t) => t.estado === 'concluida').length;
                      const pct = tasks.length
                        ? Math.round((done / tasks.length) * 100)
                        : 0;

                      return (
                        <button
                          key={proj.id}
                          type="button"
                          onClick={() => {
                            setSelectedProjectId(proj.id);
                            setFolderTab('tarefas');
                          }}
                          className="w-full rounded-[14px] bg-[#f2f4f7]/80 dark:bg-[#10141b] hover:bg-[#e6e9ed] dark:hover:bg-[#1a202b] px-3.5 py-2.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <MicroRing
                              value={pct}
                              size={38}
                              strokeWidth={3.5}
                              label={`${pct}%`}
                            />
                            <div className="min-w-0">
                              <div className="text-[13px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate group-hover:text-[#163744] dark:group-hover:text-[#9fdce6] transition-colors">
                                {proj.nome}
                              </div>
                              <div className="text-[11.5px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 truncate">
                                {cli?.nome}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-[12px] font-semibold tabular-nums text-[#163744] dark:text-[#9fdce6]">
                              {formatShortDate(proj.prazoEntrega)}
                            </div>
                            <div className="text-[11px] tabular-nums text-[#0f1115]/45 dark:text-[#f2f4f7]/45">
                              {done}/{tasks.length}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </BentoCard>
              </div>

              {/* FAIXA 2: GALERIA ARQUITETURAL DOS PROJETOS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-[#0f1115] dark:text-[#f2f4f7]">
                    Frentes de trabalho ({filteredProjects.length})
                  </h2>
                  {statusFilter !== 'todos' && (
                    <button
                      type="button"
                      onClick={() => setStatusFilter('todos')}
                      className="text-[12px] font-medium text-[#163744] dark:text-[#9fdce6] hover:underline cursor-pointer"
                    >
                      Mostrar todos
                    </button>
                  )}
                </div>

                {filteredProjects.length === 0 ? (
                  <EmptyState
                    title="Nenhum projeto encontrado para esse filtro."
                    actionLabel="Criar primeiro projeto"
                    onAction={() => setIsNewModalOpen(true)}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredProjects.map((proj) => {
                      const client = getClient(proj.clienteId);
                      const leader = getMember(proj.liderId);
                      const tasks = state.tasks.filter((t) => t.projetoId === proj.id);
                      const done = tasks.filter((t) => t.estado === 'concluida').length;
                      const blocked = tasks.filter((t) => t.estado === 'bloqueada').length;
                      const active = Math.max(0, tasks.length - done - blocked);
                      const pct = tasks.length
                        ? Math.round((done / tasks.length) * 100)
                        : 0;
                      const meta = PROJECT_STATUS_META[proj.estado];

                      const artifacts = tasks.flatMap((t) => t.artefatos);
                      const coverArtifact = artifacts.find((a) => Boolean(a.previewUrl));
                      const hasLiveAgent = tasks.some((t) => t.execucaoAtiva);

                      const squadIds = Array.from(
                        new Set([proj.liderId, ...tasks.map((t) => t.responsavelId)])
                      ).slice(0, 4);

                      return (
                        <BentoCard
                          key={proj.id}
                          onClick={() => {
                            setSelectedProjectId(proj.id);
                            setFolderTab('tarefas');
                          }}
                          className="overflow-hidden flex flex-col justify-between group"
                        >
                          {/* CAPA VISUAL + BADGE EM GLASSMORFISMO */}
                          <div className="relative h-[138px] overflow-hidden bg-[#ebeff3] dark:bg-[#10141b]">
                            {coverArtifact?.previewUrl ? (
                              <>
                                <img
                                  src={coverArtifact.previewUrl}
                                  alt={proj.nome}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                                />
                                <div
                                  className="absolute inset-0 bg-gradient-to-t from-[#0f1115]/45 via-transparent to-[#0f1115]/15"
                                  aria-hidden="true"
                                />
                              </>
                            ) : (
                              <div className="w-full h-full relative flex items-center justify-between px-5 bg-gradient-to-br from-[#e7eff2] via-[#f2f4f7] to-[#dce8ec] dark:from-[#12222b] dark:via-[#141922] dark:to-[#182934]">
                                <div
                                  className="absolute inset-0 opacity-35 dark:opacity-25"
                                  style={{
                                    backgroundImage:
                                      'radial-gradient(circle at 1px 1px, rgba(22,55,68,0.22) 1px, transparent 0)',
                                    backgroundSize: '18px 18px',
                                  }}
                                  aria-hidden="true"
                                />
                                <div className="relative z-10 mt-6">
                                  <span className="text-[28px] font-semibold tracking-[-0.04em] text-[#163744]/22 dark:text-[#9fdce6]/20 select-none">
                                    {client?.nome
                                      .split(' ')
                                      .slice(0, 2)
                                      .map((w) => w[0])
                                      .join('')
                                      .toUpperCase()}
                                  </span>
                                </div>
                                <div className="w-36 h-36 opacity-80 -mr-4 mt-4">
                                  <StudioSculptureGraphic />
                                </div>
                              </div>
                            )}

                            {/* Rótulo vidro fosco cliente + botão circular */}
                            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] backdrop-blur-md backdrop-saturate-150 bg-white/65 dark:bg-[#141922]/68 border border-white/75 dark:border-white/15 text-[11px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] shadow-[0_2px_10px_rgba(15,17,21,0.08)] truncate">
                                <Folder className="w-3 h-3 text-[#163744] dark:text-[#9fdce6] shrink-0" />
                                <span className="truncate">
                                  {client?.isInterno ? 'Interno · Eagle' : client?.nome}
                                </span>
                              </span>

                              <span className="w-8 h-8 rounded-full backdrop-blur-md backdrop-saturate-150 bg-white/72 dark:bg-[#141922]/70 border border-white/75 dark:border-white/15 text-[#0f1115]/80 dark:text-[#f2f4f7]/85 flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105">
                                <ArrowUpRight className="w-4 h-4" />
                              </span>
                            </div>

                            {/* Indicador sutil de entregas sobre a capa */}
                            {artifacts.length > 0 && (
                              <div className="absolute bottom-2.5 left-3">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[8px] backdrop-blur-md bg-[#0f1115]/48 border border-white/15 text-[10.5px] font-medium text-white tabular-nums">
                                  <Layers className="w-3 h-3 text-[#9fdce6]" />
                                  <span>
                                    {artifacts.length}{' '}
                                    {artifacts.length === 1 ? 'entrega' : 'entregas'}
                                  </span>
                                </span>
                              </div>
                            )}
                          </div>

                          {/* CORPO DO CARD */}
                          <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                            <div className="space-y-2.5">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <StatusIndicator
                                      label={hasLiveAgent ? 'Em produção' : meta.label}
                                      dotClass={meta.dotClass}
                                      textClass={meta.textClass}
                                      live={hasLiveAgent}
                                    />
                                    <span className="text-[11px] text-[#0f1115]/42 dark:text-[#f2f4f7]/42 truncate">
                                      · {proj.configuracoes.disciplina}
                                    </span>
                                  </div>
                                  <h3 className="text-[15.5px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7] leading-snug group-hover:text-[#163744] dark:group-hover:text-[#9fdce6] transition-colors">
                                    {proj.nome}
                                  </h3>
                                </div>

                                <MicroRing
                                  value={pct}
                                  size={40}
                                  strokeWidth={3.5}
                                  label={`${pct}%`}
                                />
                              </div>

                              {proj.descricao && (
                                <p className="text-[12.5px] text-[#0f1115]/58 dark:text-[#f2f4f7]/58 leading-relaxed line-clamp-2">
                                  {proj.descricao}
                                </p>
                              )}
                            </div>

                            <div className="space-y-3">
                              <ProportionBar
                                heightClass="h-1.5"
                                segments={[
                                  {
                                    key: 'done',
                                    value: done,
                                    colorClass: 'bg-[#15803d] dark:bg-[#4ade80]',
                                    label: 'Concluídas',
                                  },
                                  {
                                    key: 'active',
                                    value: active,
                                    colorClass: 'bg-[#163744] dark:bg-[#9fdce6]',
                                    label: 'Em fluxo',
                                  },
                                  {
                                    key: 'blocked',
                                    value: blocked,
                                    colorClass: 'bg-[#b91c1c] dark:bg-[#f87171]',
                                    label: 'Travadas',
                                  },
                                ]}
                              />

                              <div className="pt-3 border-t border-[#0f1115]/6 dark:border-[#f2f4f7]/6 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="flex items-center -space-x-1.5 shrink-0">
                                    {squadIds.map((id) => {
                                      const mem = getMember(id);
                                      return (
                                        <div
                                          key={id}
                                          className="ring-2 ring-white dark:ring-[#15181f] rounded-[8px]"
                                        >
                                          <MemberAvatar
                                            member={mem}
                                            size="xs"
                                            showOperationalRing
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <span className="text-[11.5px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55 truncate">
                                    {leader?.nome.split(' ')[0]}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 text-[11.5px] tabular-nums text-[#0f1115]/55 dark:text-[#f2f4f7]/55 shrink-0">
                                  <span>
                                    {done}/{tasks.length}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-medium text-[#163744] dark:text-[#9fdce6]">
                                    {formatShortDate(proj.prazoEntrega)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </BentoCard>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* ================================================================ */
            /* MODO 2: ESTÚDIO PROFUNDO DO PROJETO SELECIONADO                   */
            /* ================================================================ */
            (() => {
              const client = getClient(activeProject.clienteId);
              const leader = getMember(activeProject.liderId);
              const doneCount = allProjectTasks.filter(
                (t) => t.estado === 'concluida'
              ).length;
              const activeCount = allProjectTasks.filter(
                (t) => t.estado === 'em_andamento'
              ).length;
              const reviewCount = allProjectTasks.filter(
                (t) => t.estado === 'em_revisao'
              ).length;
              const blockedCount = allProjectTasks.filter(
                (t) => t.estado === 'bloqueada'
              ).length;
              const todoCount = allProjectTasks.filter(
                (t) => t.estado === 'a_fazer'
              ).length;

              const pct = allProjectTasks.length
                ? Math.round((doneCount / allProjectTasks.length) * 100)
                : 0;

              const coverArtifact = projectArtifacts.find(
                (a) => Boolean(a.artifact.previewUrl)
              )?.artifact;
              const approvedArtifactsCount = projectArtifacts.filter(
                (a) => a.artifact.aprovado
              ).length;
              const pendingDecisions = projectDecisions.filter(
                (d) => d.status === 'pendente'
              );

              const clientReceivable = clientFinances
                .filter((f) => f.tipo === 'receber')
                .reduce((sum, f) => sum + f.valorCentavos, 0);

              const squadIds = Array.from(
                new Set([
                  activeProject.liderId,
                  ...allProjectTasks.map((t) => t.responsavelId),
                ])
              );

              const todoAndActive = projectTasks.filter(
                (t) => t.estado === 'a_fazer'
              );
              const inProgress = projectTasks.filter(
                (t) => t.estado === 'em_andamento'
              );
              const attention = projectTasks.filter(
                (t) => t.estado === 'em_revisao' || t.estado === 'bloqueada'
              );
              const finished = projectTasks.filter(
                (t) => t.estado === 'concluida' || t.estado === 'cancelada'
              );

              const boardColumns: Array<{
                key: string;
                title: string;
                toneDot: string;
                items: Task[];
              }> = [
                {
                  key: 'todo',
                  title: 'A fazer',
                  toneDot: 'bg-[#6b7280] dark:bg-[#9ca3af]',
                  items: todoAndActive,
                },
                {
                  key: 'doing',
                  title: 'Em andamento',
                  toneDot: 'bg-[#163744] dark:bg-[#9fdce6]',
                  items: inProgress,
                },
                {
                  key: 'review',
                  title: 'Revisão & Travas',
                  toneDot: 'bg-[#b45309] dark:bg-[#fbbf24]',
                  items: attention,
                },
                {
                  key: 'done',
                  title: 'Concluídas',
                  toneDot: 'bg-[#15803d] dark:bg-[#4ade80]',
                  items: finished,
                },
              ];

              return (
                <motion.div
                  key={`project-studio-${activeProject.id}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="max-w-[1380px] mx-auto space-y-5"
                >
                  {/* BARRA DE NAVEGAÇÃO DO ESTÚDIO DO PROJETO */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProjectId(null);
                          setSearch('');
                        }}
                        className="eagle-btn-secondary h-9 px-3 text-[13px] font-medium inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Portfólio</span>
                      </button>

                      <select
                        value={activeProject.id}
                        onChange={(e) => {
                          setSelectedProjectId(e.target.value);
                          setSearch('');
                        }}
                        aria-label="Trocar de projeto"
                        className="eagle-input h-9 px-3 text-[13px] font-medium cursor-pointer max-w-[280px] sm:max-w-[360px]"
                      >
                        {state.projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <SegmentedControl
                      layoutId="project-live-status"
                      ariaLabel="Estado do projeto"
                      value={activeProject.estado}
                      onChange={(nextStatus) =>
                        updateProjectStatus(activeProject.id, nextStatus)
                      }
                      options={[
                        { id: 'ativo', label: 'Ativo' },
                        { id: 'em_pausa', label: 'Em pausa' },
                        { id: 'concluido', label: 'Concluído' },
                      ]}
                    />
                  </div>

                  {/* FAIXA HERO BENTO DO PROJETO */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
                    {/* Esquerda: Capa Visual + Identidade em Glassmorfismo */}
                    <BentoCard className="xl:col-span-7 relative overflow-hidden p-4 sm:p-5 flex flex-col justify-end min-h-[240px]">
                      {coverArtifact?.previewUrl ? (
                        <>
                          <img
                            src={coverArtifact.previewUrl}
                            alt={activeProject.nome}
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div
                            className="absolute inset-0 bg-gradient-to-t from-[#0f1115]/55 via-[#0f1115]/15 to-[#0f1115]/25"
                            aria-hidden="true"
                          />
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#e7eff2] via-[#f2f4f7] to-[#d9e7ec] dark:from-[#12222b] dark:via-[#141922] dark:to-[#182934]">
                          <div className="absolute right-2 top-1 w-[260px] h-[190px] opacity-85">
                            <StudioSculptureGraphic />
                          </div>
                        </div>
                      )}

                      {/* Cartão Glassmórfico principal */}
                      <div className="relative z-10 rounded-[18px] overflow-hidden backdrop-blur-xl backdrop-saturate-150 bg-white/74 dark:bg-[#141922]/78 border border-white/80 dark:border-white/15 p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.88),0_14px_34px_rgba(15,17,21,0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_16px_38px_rgba(0,0,0,0.45)]">
                        <div
                          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/45 via-white/10 to-transparent dark:from-white/10 dark:via-transparent dark:to-transparent"
                          aria-hidden="true"
                        />

                        <div className="relative z-10 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#0f1115]/65 dark:text-[#f2f4f7]/65">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 font-semibold text-[#163744] dark:text-[#9fdce6]">
                                <Folder className="w-3.5 h-3.5" />
                                <span>{client?.nome}</span>
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{activeProject.configuracoes.disciplina}</span>
                              {activeProject.configuracoes.repositorio && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                                    <GitBranch className="w-3 h-3" />
                                    {activeProject.configuracoes.repositorio}
                                  </span>
                                </>
                              )}
                            </div>

                            <span className="text-[11.5px] font-medium text-[#0f1115]/58 dark:text-[#f2f4f7]/58">
                              Revisão: {activeProject.configuracoes.ritmoRevisao}
                            </span>
                          </div>

                          <div>
                            <h2 className="text-[21px] font-semibold tracking-[-0.02em] text-[#0f1115] dark:text-[#f2f4f7] leading-snug">
                              {activeProject.nome}
                            </h2>
                            {activeProject.descricao && (
                              <p className="mt-1.5 text-[13px] text-[#0f1115]/70 dark:text-[#f2f4f7]/70 leading-relaxed max-w-2xl">
                                {activeProject.descricao}
                              </p>
                            )}
                          </div>

                          <div className="pt-2.5 border-t border-[#0f1115]/8 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <MemberAvatar
                                member={leader}
                                size="sm"
                                showOperationalRing
                              />
                              <div>
                                <div className="text-[12.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                                  {leader?.nome}
                                </div>
                                <div className="text-[11px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                                  Líder · {leader?.cargo}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5">
                              <div className="flex items-center -space-x-1.5">
                                {squadIds.slice(0, 5).map((id) => {
                                  const m = getMember(id);
                                  return (
                                    <div
                                      key={id}
                                      className="ring-2 ring-white/80 dark:ring-[#141922] rounded-[8px]"
                                    >
                                      <MemberAvatar
                                        member={m}
                                        size="xs"
                                        showOperationalRing
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                              <span className="text-[11.5px] text-[#0f1115]/58 dark:text-[#f2f4f7]/58 tabular-nums">
                                {squadIds.length}{' '}
                                {squadIds.length === 1 ? 'integrante' : 'integrantes'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </BentoCard>

                    {/* Direita: Telemetria & Saúde do Projeto */}
                    <BentoCard className="xl:col-span-5 p-5 flex flex-col justify-between gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                            Saúde da entrega
                          </h3>
                          <p className="mt-0.5 text-[12px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 tabular-nums">
                            {doneCount} de {allProjectTasks.length} tarefas finalizadas
                          </p>
                        </div>

                        <MicroRing
                          value={pct}
                          size={50}
                          strokeWidth={4.5}
                          label={`${pct}%`}
                          tone={blockedCount > 0 ? 'warning' : 'accent'}
                        />
                      </div>

                      <ProportionBar
                        heightClass="h-2"
                        showLegend
                        segments={[
                          {
                            key: 'done',
                            value: doneCount,
                            colorClass: 'bg-[#15803d] dark:bg-[#4ade80]',
                            label: `${doneCount} feitas`,
                          },
                          {
                            key: 'doing',
                            value: activeCount + todoCount,
                            colorClass: 'bg-[#163744] dark:bg-[#9fdce6]',
                            label: `${activeCount + todoCount} em fluxo`,
                          },
                          {
                            key: 'review',
                            value: reviewCount,
                            colorClass: 'bg-[#b45309] dark:bg-[#fbbf24]',
                            label: `${reviewCount} revisão`,
                          },
                          {
                            key: 'blocked',
                            value: blockedCount,
                            colorClass: 'bg-[#b91c1c] dark:bg-[#f87171]',
                            label: `${blockedCount} travadas`,
                          },
                        ]}
                      />

                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setFolderTab('arquivos')}
                          className="rounded-[12px] bg-[#f2f4f7]/85 dark:bg-[#10141b] hover:bg-[#e6e9ed] dark:hover:bg-[#1a202b] p-3 text-left transition-colors cursor-pointer"
                        >
                          <div className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                            Entregas
                          </div>
                          <div className="mt-1 flex items-baseline justify-between gap-2">
                            <span className="text-[16px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                              {projectArtifacts.length}
                            </span>
                            <span className="text-[11px] text-[#15803d] dark:text-[#4ade80] tabular-nums">
                              {approvedArtifactsCount} ok
                            </span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFolderTab('fluxo')}
                          className="rounded-[12px] bg-[#f2f4f7]/85 dark:bg-[#10141b] hover:bg-[#e6e9ed] dark:hover:bg-[#1a202b] p-3 text-left transition-colors cursor-pointer"
                        >
                          <div className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                            Decisões
                          </div>
                          <div className="mt-1 flex items-baseline justify-between gap-2">
                            <span className="text-[16px] font-semibold tabular-nums text-[#163744] dark:text-[#9fdce6]">
                              {pendingDecisions.length}
                            </span>
                            <span className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                              pendentes
                            </span>
                          </div>
                        </button>

                        <div className="rounded-[12px] bg-[#f2f4f7]/85 dark:bg-[#10141b] p-3">
                          <div className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                            Prazo final
                          </div>
                          <div className="mt-1 text-[15px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                            {formatShortDate(activeProject.prazoEntrega)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setFolderTab('fluxo')}
                          className="rounded-[12px] bg-[#f2f4f7]/85 dark:bg-[#10141b] hover:bg-[#e6e9ed] dark:hover:bg-[#1a202b] p-3 text-left transition-colors cursor-pointer"
                        >
                          <div className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                            Carteira cliente
                          </div>
                          <div className="mt-1 text-[14.5px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7] truncate">
                            {clientReceivable > 0 ? formatBRL(clientReceivable) : 'Interno'}
                          </div>
                        </button>
                      </div>
                    </BentoCard>
                  </div>

                  {/* ABAS INTERATIVAS DO ESTÚDIO DO PROJETO */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <SegmentedControl
                      layoutId="project-studio-tab"
                      ariaLabel="Seções do projeto"
                      value={folderTab}
                      onChange={setFolderTab}
                      options={[
                        {
                          id: 'tarefas',
                          label: `Tarefas (${allProjectTasks.length})`,
                        },
                        {
                          id: 'arquivos',
                          label: `Galeria de Entregas (${projectArtifacts.length})`,
                        },
                        {
                          id: 'fluxo',
                          label: `Decisões & Caixa (${
                            projectDecisions.length + clientFinances.length
                          })`,
                        },
                        { id: 'config', label: 'Configurações' },
                      ]}
                    />

                    {folderTab === 'tarefas' && (
                      <div className="flex items-center gap-2">
                        <SegmentedControl
                          layoutId="project-tasks-view-mode"
                          ariaLabel="Formato das tarefas"
                          value={taskLayout}
                          onChange={setTaskLayout}
                          options={[
                            { id: 'quadro', label: 'Quadro', icon: Columns3 },
                            { id: 'lista', label: 'Lista', icon: List },
                          ]}
                        />
                      </div>
                    )}
                  </div>

                  {/* CONTEÚDO DA ABA ATIVA */}
                  {folderTab === 'tarefas' && (
                    <div>
                      {projectTasks.length === 0 ? (
                        <EmptyState
                          title="Nenhuma tarefa encontrada neste projeto."
                          actionLabel="Criar tarefa no projeto"
                          onAction={() => setIsNewTaskOpen(true)}
                        />
                      ) : taskLayout === 'quadro' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 items-start">
                          {boardColumns.map((col) => (
                            <div
                              key={col.key}
                              className="rounded-[18px] bg-[#f2f4f7]/80 dark:bg-[#10141b] border border-[#0f1115]/6 dark:border-[#f2f4f7]/6 p-3 space-y-2.5"
                            >
                              <div className="px-1.5 py-1 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`w-2 h-2 rounded-full ${col.toneDot}`}
                                    aria-hidden="true"
                                  />
                                  <span className="text-[12.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                                    {col.title}
                                  </span>
                                </div>
                                <span className="text-[11.5px] font-medium tabular-nums text-[#0f1115]/45 dark:text-[#f2f4f7]/45">
                                  {col.items.length}
                                </span>
                              </div>

                              {col.items.length === 0 ? (
                                <div className="rounded-[12px] border border-dashed border-[#0f1115]/10 dark:border-[#f2f4f7]/10 py-6 text-center text-[12px] text-[#0f1115]/40 dark:text-[#f2f4f7]/40">
                                  Vazio
                                </div>
                              ) : (
                                <div className="space-y-2.5">
                                  {col.items.map((t) => {
                                    const member = getMember(t.responsavelId);
                                    const st = TASK_STATUS_META[t.estado];
                                    const doneSub = t.subtarefas.filter(
                                      (s) => s.concluida
                                    ).length;

                                    return (
                                      <BentoCard
                                        key={t.id}
                                        onClick={() => {
                                          setSelectedTaskId(t.id);
                                          setActiveSection('tarefas');
                                        }}
                                        className="p-3.5 space-y-3 group"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-[11px] font-semibold text-[#0f1115]/45 dark:text-[#f2f4f7]/45 tabular-nums">
                                            {t.codigo}
                                          </span>
                                          <StatusIndicator
                                            label={t.execucaoAtiva ? 'Ao vivo' : st.label}
                                            dotClass={st.dotClass}
                                            textClass={st.textClass}
                                            live={t.execucaoAtiva || t.estado === 'em_andamento'}
                                          />
                                        </div>

                                        <div className="text-[13.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] leading-snug group-hover:text-[#163744] dark:group-hover:text-[#9fdce6] transition-colors">
                                          {t.titulo}
                                        </div>

                                        {t.subtarefas.length > 0 && (
                                          <div className="space-y-1">
                                            <div className="h-1 w-full rounded-full bg-[#e6e9ed] dark:bg-[#232934] overflow-hidden">
                                              <div
                                                className="h-full bg-[#163744] dark:bg-[#9fdce6] rounded-full transition-all duration-300"
                                                style={{
                                                  width: `${Math.round(
                                                    (doneSub / t.subtarefas.length) * 100
                                                  )}%`,
                                                }}
                                              />
                                            </div>
                                          </div>
                                        )}

                                        <div className="flex items-center justify-between gap-2 pt-0.5 text-[11.5px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <MemberAvatar
                                              member={member}
                                              size="xs"
                                              showOperationalRing
                                            />
                                            <span className="truncate">
                                              {member?.nome.split(' ')[0]}
                                            </span>
                                          </div>
                                          <span className="tabular-nums shrink-0">
                                            {formatShortDate(t.prazo)}
                                          </span>
                                        </div>
                                      </BentoCard>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <BentoCard className="overflow-hidden divide-y divide-[#0f1115]/6 dark:divide-[#f2f4f7]/6">
                          {projectTasks.map((t) => {
                            const member = getMember(t.responsavelId);
                            const st = TASK_STATUS_META[t.estado];
                            const doneSub = t.subtarefas.filter((s) => s.concluida).length;
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                  setSelectedTaskId(t.id);
                                  setActiveSection('tarefas');
                                }}
                                className="w-full px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 hover:bg-[#f2f4f7]/75 dark:hover:bg-[#1a202b]/70 transition-colors text-left cursor-pointer group"
                              >
                                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                  <span className="text-[11.5px] font-semibold tabular-nums text-[#0f1115]/45 dark:text-[#f2f4f7]/45 w-16 shrink-0">
                                    {t.codigo}
                                  </span>
                                  <StatusIndicator
                                    label={st.label}
                                    dotClass={st.dotClass}
                                    textClass={st.textClass}
                                    live={t.execucaoAtiva}
                                  />
                                  <span className="text-[13.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate group-hover:text-[#163744] dark:group-hover:text-[#9fdce6]">
                                    {t.titulo}
                                  </span>
                                </div>

                                <div className="flex items-center gap-4 text-[12px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55 shrink-0 tabular-nums">
                                  {t.subtarefas.length > 0 && (
                                    <span>
                                      {doneSub}/{t.subtarefas.length} etapas
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1.5">
                                    <MemberAvatar member={member} size="xs" />
                                    <span>{member?.nome.split(' ')[0]}</span>
                                  </div>
                                  <span>{formatShortDate(t.prazo)}</span>
                                  <ArrowRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                                </div>
                              </button>
                            );
                          })}
                        </BentoCard>
                      )}
                    </div>
                  )}

                  {folderTab === 'arquivos' && (
                    <div>
                      {projectArtifacts.length === 0 ? (
                        <EmptyState title="Nenhum artefato produzido nas tarefas deste projeto ainda." />
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                          {projectArtifacts.map(
                            ({ artifact, taskId, taskCode, taskTitle }) => {
                              const author = getMember(artifact.autorId);
                              return (
                                <BentoCard
                                  key={artifact.id}
                                  className="overflow-hidden flex flex-col justify-between group"
                                >
                                  <div className="relative h-48 bg-[#ebeff3] dark:bg-[#10141b] overflow-hidden">
                                    {artifact.previewUrl ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPreviewArtifact({ artifact, taskId })
                                        }
                                        className="w-full h-full block cursor-pointer"
                                      >
                                        <img
                                          src={artifact.previewUrl}
                                          alt={artifact.titulo}
                                          referrerPolicy="no-referrer"
                                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                        />
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPreviewArtifact({ artifact, taskId })
                                        }
                                        className="w-full h-full p-5 flex flex-col justify-between text-left cursor-pointer hover:bg-[#e6e9ed]/70 dark:hover:bg-[#161c26] transition-colors"
                                      >
                                        <div className="flex items-center gap-2 text-[#163744] dark:text-[#9fdce6]">
                                          <FileText className="w-4 h-4" />
                                          <span className="text-[12px] font-semibold">
                                            {artifact.formato}
                                          </span>
                                        </div>
                                        <p className="text-[12.5px] text-[#0f1115]/68 dark:text-[#f2f4f7]/68 line-clamp-4 leading-relaxed">
                                          {artifact.resumoConteudo ??
                                            'Documento técnico preparado pela equipe.'}
                                        </p>
                                      </button>
                                    )}

                                    {/* Barra Glassmórfica flutuante */}
                                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                                      <span className="px-2.5 py-1 rounded-[9px] backdrop-blur-md bg-white/75 dark:bg-[#141922]/75 border border-white/75 dark:border-white/15 text-[11px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                                        {artifact.versao}
                                      </span>

                                      <div className="flex items-center gap-1.5 pointer-events-auto">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            approveArtifact(
                                              taskId,
                                              artifact.id,
                                              !artifact.aprovado
                                            )
                                          }
                                          className={`h-7.5 px-2.5 rounded-[9px] backdrop-blur-md border text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                                            artifact.aprovado
                                              ? 'bg-[#15803d]/85 text-white border-[#15803d]'
                                              : 'bg-white/78 dark:bg-[#141922]/78 border-white/80 dark:border-white/15 text-[#0f1115] dark:text-[#f2f4f7] hover:bg-white dark:hover:bg-[#1e242f]'
                                          }`}
                                        >
                                          <Check className="w-3 h-3" />
                                          <span>
                                            {artifact.aprovado ? 'Aprovado' : 'Aprovar'}
                                          </span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            setPreviewArtifact({ artifact, taskId })
                                          }
                                          title="Ampliar entrega"
                                          className="w-7.5 h-7.5 rounded-full backdrop-blur-md bg-white/78 dark:bg-[#141922]/78 border border-white/80 dark:border-white/15 text-[#0f1115] dark:text-[#f2f4f7] flex items-center justify-center hover:bg-white dark:hover:bg-[#1e242f] transition-colors cursor-pointer"
                                        >
                                          <Maximize2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="p-4 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="text-[13.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                                        {artifact.titulo}
                                      </div>
                                      <div className="mt-0.5 text-[11.5px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 flex items-center gap-1.5 truncate">
                                        <span>{author?.nome.split(' ')[0]}</span>
                                        <span aria-hidden="true">·</span>
                                        <span className="truncate">{taskTitle}</span>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedTaskId(taskId);
                                        setActiveSection('tarefas');
                                      }}
                                      className="eagle-btn-secondary h-7.5 px-2.5 text-[11.5px] font-medium tabular-nums shrink-0 cursor-pointer"
                                    >
                                      {taskCode}
                                    </button>
                                  </div>
                                </BentoCard>
                              );
                            }
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {folderTab === 'fluxo' && (
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                      {/* Decisões do projeto */}
                      <BentoCard className="xl:col-span-6 p-5 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-[15px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                            Decisões vinculadas
                          </h3>
                          <button
                            type="button"
                            onClick={() => setActiveSection('decisoes')}
                            className="w-8 h-8 rounded-full border border-[#0f1115]/8 dark:border-[#f2f4f7]/10 bg-[#f2f4f7]/80 dark:bg-[#1b2029] hover:bg-[#e6e9ed] dark:hover:bg-[#252c39] text-[#0f1115]/70 dark:text-[#f2f4f7]/75 flex items-center justify-center cursor-pointer"
                            title="Abrir Decisões"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        </div>

                        {projectDecisions.length === 0 ? (
                          <p className="text-[13px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55 py-6">
                            Nenhuma decisão registrada para este projeto.
                          </p>
                        ) : (
                          <div className="space-y-2.5">
                            {projectDecisions.map((dec) => {
                              const requester = getMember(dec.solicitanteId);
                              const dMeta = DECISION_STATUS_META[dec.status];
                              return (
                                <div
                                  key={dec.id}
                                  className="rounded-[14px] bg-[#f2f4f7]/80 dark:bg-[#10141b] p-3.5 space-y-2.5"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <MemberAvatar member={requester} size="xs" />
                                      <span className="text-[12px] text-[#0f1115]/60 dark:text-[#f2f4f7]/60 truncate">
                                        {requester?.nome} · {dec.criadoEm}
                                      </span>
                                    </div>
                                    <StatusIndicator
                                      label={dMeta.label}
                                      dotClass={dMeta.dotClass}
                                      textClass={dMeta.textClass}
                                    />
                                  </div>

                                  <div className="text-[13.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                                    {dec.titulo}
                                  </div>
                                  <p className="text-[12.5px] text-[#0f1115]/65 dark:text-[#f2f4f7]/65">
                                    {dec.pergunta}
                                  </p>

                                  {dec.status === 'pendente' && (
                                    <div className="flex items-center gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => resolveDecision(dec.id, 'aprovada')}
                                        className="eagle-btn-primary h-8 px-3 text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>{dec.acaoPrimaria}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedTaskId(dec.tarefaId);
                                          setActiveSection('tarefas');
                                        }}
                                        className="eagle-btn-secondary h-8 px-3 text-[12px] font-medium cursor-pointer"
                                      >
                                        Ver conversa
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </BentoCard>

                      {/* Lançamentos financeiros do cliente */}
                      <BentoCard className="xl:col-span-6 p-5 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-[15px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                              Movimentações do cliente
                            </h3>
                            <p className="text-[12px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50">
                              {client?.nome}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveSection('financeiro')}
                            className="w-8 h-8 rounded-full border border-[#0f1115]/8 dark:border-[#f2f4f7]/10 bg-[#f2f4f7]/80 dark:bg-[#1b2029] hover:bg-[#e6e9ed] dark:hover:bg-[#252c39] text-[#0f1115]/70 dark:text-[#f2f4f7]/75 flex items-center justify-center cursor-pointer"
                            title="Abrir Financeiro"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        </div>

                        {clientFinances.length === 0 ? (
                          <p className="text-[13px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55 py-6">
                            Sem lançamentos financeiros vinculados diretamente a este cliente.
                          </p>
                        ) : (
                          <div className="space-y-2.5">
                            {clientFinances.map((fin) => {
                              const isPaid = fin.status === 'liquidado';
                              return (
                                <div
                                  key={fin.id}
                                  className="rounded-[14px] bg-[#f2f4f7]/80 dark:bg-[#10141b] p-3.5 flex items-center justify-between gap-3"
                                >
                                  <div className="min-w-0">
                                    <div className="text-[13px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                                      {fin.descricao}
                                    </div>
                                    <div className="mt-0.5 text-[11.5px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 tabular-nums">
                                      {fin.categoria} · Vence {formatShortDate(fin.vencimento)}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2.5 shrink-0">
                                    <span
                                      className={`text-[13.5px] font-semibold tabular-nums ${
                                        fin.tipo === 'receber'
                                          ? 'text-[#15803d] dark:text-[#4ade80]'
                                          : 'text-[#0f1115] dark:text-[#f2f4f7]'
                                      }`}
                                    >
                                      {fin.tipo === 'receber' ? '+' : '−'}{' '}
                                      {formatBRL(fin.valorCentavos)}
                                    </span>

                                    <button
                                      type="button"
                                      onClick={() => toggleFinanceStatus(fin.id)}
                                      className={`h-7.5 px-2.5 rounded-[9px] text-[11.5px] font-medium transition-colors cursor-pointer ${
                                        isPaid
                                          ? 'bg-[#15803d]/12 text-[#166534] dark:bg-[#4ade80]/15 dark:text-[#4ade80]'
                                          : 'eagle-btn-secondary'
                                      }`}
                                    >
                                      {isPaid ? 'Liquidado' : 'Marcar pago'}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </BentoCard>
                    </div>
                  )}

                  {folderTab === 'config' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      <BentoCard className="lg:col-span-7 p-5 space-y-4">
                        <h3 className="text-[15px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                          Escopo e rotina da frente
                        </h3>

                        <div>
                          <label className="block text-[12px] font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60 mb-1">
                            Objetivo do projeto
                          </label>
                          <textarea
                            rows={3}
                            value={activeProject.descricao}
                            onChange={(e) =>
                              updateProjectSettings(activeProject.id, {
                                descricao: e.target.value,
                              })
                            }
                            className="eagle-input w-full p-3 text-[13.5px]"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        </div>

                        <div>
                          <label className="block text-[12px] font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60 mb-1">
                            Repositório ou pasta base (opcional)
                          </label>
                          <input
                            type="text"
                            value={activeProject.configuracoes.repositorio ?? ''}
                            placeholder="Ex: eagle/repositorio-web"
                            onChange={(e) =>
                              updateProjectSettings(activeProject.id, {
                                repositorio: e.target.value,
                              })
                            }
                            className="eagle-input w-full h-9.5 px-3 text-[13px] font-mono"
                          />
                        </div>
                      </BentoCard>

                      <BentoCard className="lg:col-span-5 p-5 space-y-5">
                        <h3 className="text-[15px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                          Governança e aprovações
                        </h3>

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

                        <div className="rounded-[14px] bg-[#f2f4f7]/80 dark:bg-[#10141b] p-4 flex items-center justify-between gap-4">
                          <div>
                            <div className="text-[13.5px] font-medium text-[#0f1115] dark:text-[#f2f4f7]">
                              Exigir aprovação final do Lucas
                            </div>
                            <div className="mt-0.5 text-[12px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                              Agentes enviam artefatos críticos para a fila de Decisões antes de liberar ao cliente.
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

                        <div className="rounded-[14px] border border-[#0f1115]/8 dark:border-[#f2f4f7]/8 p-4 flex items-start gap-3">
                          <Sparkles className="w-4 h-4 text-[#163744] dark:text-[#9fdce6] shrink-0 mt-0.5" />
                          <div className="text-[12px] text-[#0f1115]/62 dark:text-[#f2f4f7]/62 leading-relaxed">
                            Tarefas criadas neste projeto herdam o ritmo de revisão{' '}
                            <strong className="font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                              {activeProject.configuracoes.ritmoRevisao}
                            </strong>{' '}
                            sob supervisão de {leader?.nome}.
                          </div>
                        </div>
                      </BentoCard>
                    </div>
                  )}
                </motion.div>
              );
            })()
          )}
        </AnimatePresence>
      </div>

      {/* MODAL: NOVO PROJETO */}
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

      {/* MODAL: NOVA TAREFA NO PROJETO */}
      {isNewTaskOpen && activeProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1115]/55 backdrop-blur-xs p-4"
          onClick={() => setIsNewTaskOpen(false)}
        >
          <form
            onSubmit={handleCreateProjectTask}
            onClick={(e) => e.stopPropagation()}
            className="eagle-modal w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                  Nova tarefa no projeto
                </h2>
                <p className="text-[12px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55 truncate">
                  {activeProject.nome}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewTaskOpen(false)}
                className="eagle-btn-secondary w-7.5 h-7.5 inline-flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                  Título da entrega
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Ex: Criar 3 conceitos de abertura do auditório"
                  className="eagle-input w-full h-9.5 px-3 text-[13.5px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                    Responsável
                  </label>
                  <select
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                    className="eagle-input w-full h-9.5 px-3 text-[13px]"
                  >
                    {state.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome} {m.tipo === 'agente' ? '· IA' : ''}
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
                    value={taskDue}
                    onChange={(e) => setTaskDue(e.target.value)}
                    className="eagle-input w-full h-9.5 px-3 text-[13px] tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                  Briefing inicial
                </label>
                <textarea
                  rows={3}
                  value={taskBriefing}
                  onChange={(e) => setTaskBriefing(e.target.value)}
                  placeholder="Descreva o pedido, restrições e critérios de aprovação..."
                  className="eagle-input w-full p-3 text-[13px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewTaskOpen(false)}
                className="eagle-btn-secondary h-9 px-3.5 text-[13px] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="eagle-btn-primary h-9 px-4 text-[13px] font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Criar e despachar</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
