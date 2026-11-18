import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Check,
  CheckCircle2,
  FileText,
  Folder,
  Layers,
  Maximize2,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import {
  ActionIconButton,
  Badge,
  Button,
  FolderTabs,
} from '../components/DesignSystem';
import {
  EmptyState,
  MemberAvatar,
  PageHeader,
  SegmentedControl,
  StatusIndicator,
} from '../components/SharedUI';
import { BentoCard, MicroRing, ProportionBar } from '../components/VisualWidgets';
import { useEagle } from '../context/EagleContext';
import {
  calculateClientFinancialSummary,
  calculateFixedCostsMonthly,
  DECISION_STATUS_META,
  formatBRL,
  formatShortDate,
  getDaysSincePayment,
  getOverdueDays,
  isInvoiceNotePending,
  isInvoiceOverdue,
  PROJECT_STATUS_META,
  TASK_STATUS_META,
  TODAY_ISO,
} from '../utils/formatters';

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

type WorklistQuickFilter = 'todos' | 'ativos' | 'atencao' | 'producao' | 'internos';
type ProfileTab = 'timeline' | 'projetos' | 'entregas' | 'financeiro';

export function ClientsView({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const {
    state,
    createClient,
    createTask,
    sendTaskMessage,
    resolveDecision,
    toggleSubtask,
    approveArtifact,
    toggleFinanceStatus,
    setActiveSection,
    setSelectedProjectId,
    setSelectedTaskId,
    setPreviewArtifact,
    getMember,
  } = useEagle();

  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<WorklistQuickFilter>('todos');
  const [selectedClientId, setSelectedClientId] = useState<string>(
    state.clients[0]?.id ?? ''
  );
  const [profileTab, setProfileTab] = useState<ProfileTab>('timeline');
  const [timelineFilter, setTimelineFilter] = useState<'todas' | 'entregas' | 'decisoes'>(
    'todas'
  );
  const [noteInput, setNoteInput] = useState('');
  const [localNotes, setLocalNotes] = useState<
    Record<string, Array<{ id: string; text: string; time: string; fromLucas: boolean }>>
  >({});

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [segmento, setSegmento] = useState('');
  const [contato, setContato] = useState('');
  const [isInterno, setIsInterno] = useState(false);

  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskProjectId, setTaskProjectId] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('ag-clara');
  const [taskDue, setTaskDue] = useState('2026-11-30');

  const composerInputRef = useRef<HTMLInputElement | null>(null);

  const fixedCostsMonthly = useMemo(
    () => calculateFixedCostsMonthly(state.finances).totalMensalCentavos,
    [state.finances]
  );

  const nonInternalCount = useMemo(
    () => state.clients.filter((c) => !c.isInterno).length,
    [state.clients]
  );

  const clientSummaries = useMemo(() => {
    return state.clients.map((client) => {
      const projects = state.projects.filter((p) => p.clienteId === client.id);
      const projIds = new Set(projects.map((p) => p.id));
      const tasks = state.tasks.filter((t) => projIds.has(t.projetoId));
      const decisions = state.decisions.filter((d) => projIds.has(d.projetoId));
      const pendingDecisions = decisions.filter((d) => d.status === 'pendente');
      const blockedTasks = tasks.filter((t) => t.estado === 'bloqueada');
      const liveTasks = tasks.filter((t) => t.execucaoAtiva);
      const doneTasks = tasks.filter((t) => t.estado === 'concluida');
      const artifacts = tasks.flatMap((t) =>
        t.artefatos.map((a) => ({
          artifact: a,
          taskId: t.id,
          taskCode: t.codigo,
          taskTitle: t.titulo,
        }))
      );
      const finances = state.finances.filter((f) => f.clienteId === client.id);
      const receivable = finances
        .filter((f) => f.tipo === 'receber')
        .reduce((acc, f) => acc + f.valorCentavos, 0);
      const paid = finances
        .filter((f) => f.tipo === 'receber' && f.status === 'liquidado')
        .reduce((acc, f) => acc + f.valorCentavos, 0);
      const financialSummary = calculateClientFinancialSummary(
        client.id,
        state.finances,
        state.contracts,
        nonInternalCount,
        client.isInterno ? 0 : fixedCostsMonthly,
        TODAY_ISO
      );

      const primaryProject = projects[0];
      const leadId = primaryProject?.liderId ?? 'mem-lucas';
      const coverUrl = artifacts.find((x) => Boolean(x.artifact.previewUrl))?.artifact
        .previewUrl;

      const hasAttention = pendingDecisions.length > 0 || blockedTasks.length > 0;
      const isLive = liveTasks.length > 0;

      return {
        client,
        projects,
        tasks,
        decisions,
        pendingDecisions,
        blockedTasks,
        liveTasks,
        doneTasks,
        artifacts,
        finances,
        receivable,
        paid,
        financialSummary,
        leadId,
        coverUrl,
        hasAttention,
        isLive,
      };
    });
  }, [
    state.clients,
    state.projects,
    state.tasks,
    state.decisions,
    state.finances,
    state.contracts,
    nonInternalCount,
    fixedCostsMonthly,
  ]);

  const matrixCounts = useMemo(() => {
    const ativos = clientSummaries.filter((c) => c.client.status === 'ativo').length;
    const atencao = clientSummaries.filter((c) => c.hasAttention).length;
    const producao = clientSummaries.filter((c) => c.isLive).length;
    const internos = clientSummaries.filter((c) => c.client.isInterno).length;
    return { ativos, atencao, producao, internos };
  }, [clientSummaries]);

  const filteredSummaries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clientSummaries.filter((item) => {
      if (quickFilter === 'ativos' && item.client.status !== 'ativo') return false;
      if (quickFilter === 'atencao' && !item.hasAttention) return false;
      if (quickFilter === 'producao' && !item.isLive) return false;
      if (quickFilter === 'internos' && !item.client.isInterno) return false;
      if (q) {
        return (
          item.client.nome.toLowerCase().includes(q) ||
          item.client.segmento.toLowerCase().includes(q) ||
          item.client.contatoPrincipal.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [clientSummaries, quickFilter, search]);

  const activeSummary = useMemo(
    () =>
      filteredSummaries.find((s) => s.client.id === selectedClientId) ??
      clientSummaries.find((s) => s.client.id === selectedClientId) ??
      filteredSummaries[0] ??
      clientSummaries[0] ??
      null,
    [filteredSummaries, clientSummaries, selectedClientId]
  );

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    const created = createClient({
      nome,
      segmento: segmento || 'Marca e Estratégia',
      contatoPrincipal: contato || 'A definir',
      isInterno,
    });
    setNome('');
    setSegmento('');
    setContato('');
    setIsInterno(false);
    setIsNewModalOpen(false);
    setQuickFilter('todos');
    setSelectedClientId(created.id);
    setProfileTab('timeline');
  };

  const handleCreateClientTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskProjectId) return;
    const created = createTask({
      titulo: taskTitle,
      projetoId: taskProjectId,
      responsavelId: taskAssigneeId,
      prazo: taskDue,
    });
    setTaskTitle('');
    setIsNewTaskModalOpen(false);
    setSelectedTaskId(created.id);
  };

  const handleSendNote = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = noteInput.trim();
    if (!clean || !activeSummary) return;

    const primaryTask =
      activeSummary.tasks.find(
        (t) => t.estado !== 'concluida' && t.estado !== 'cancelada'
      ) ?? activeSummary.tasks[0];

    if (primaryTask) {
      sendTaskMessage(primaryTask.id, clean, { forceImmediate: true });
    } else {
      const hora = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      setLocalNotes((prev) => ({
        ...prev,
        [activeSummary.client.id]: [
          ...(prev[activeSummary.client.id] ?? []),
          { id: `ln-${Date.now()}`, text: clean, time: hora, fromLucas: true },
        ],
      }));
    }
    setNoteInput('');
  };

  const filtersSlot = (
    <SegmentedControl
      layoutId="clients-worklist-filter"
      ariaLabel="Filtrar contas"
      value={
        quickFilter === 'internos'
          ? 'internos'
          : quickFilter === 'atencao'
            ? 'atencao'
            : 'todos'
      }
      onChange={(val) => setQuickFilter(val as WorklistQuickFilter)}
      options={[
        { id: 'todos', label: 'Todas' },
        { id: 'atencao', label: `Atenção (${matrixCounts.atencao})` },
        { id: 'internos', label: 'Interno' },
      ]}
    />
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader
        title="Clientes"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar cliente, segmento ou contato..."
        filters={filtersSlot}
        primaryAction={{
          label: 'Novo cliente',
          onClick: () => setIsNewModalOpen(true),
        }}
        onOpenMobileMenu={onOpenMobileMenu}
      />

      <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden p-4 lg:p-5">
        {clientSummaries.length === 0 ? (
          <div className="max-w-3xl mx-auto pt-4">
            <EmptyState
              title="Nenhum cliente cadastrado."
              actionLabel="Cadastrar cliente"
              onAction={() => setIsNewModalOpen(true)}
            />
          </div>
        ) : (
          <div className="max-w-[1440px] mx-auto h-full flex flex-col lg:flex-row gap-4 lg:gap-5 min-h-0">
            {/* COLUNA ESQUERDA ESCURA: MATRIZ 2×2 + WORKLIST */}
            <aside className="w-full lg:w-[276px] xl:w-[292px] shrink-0 lg:h-full lg:overflow-y-auto rounded-[22px] bg-[#0f1115] dark:bg-[#0b0d11] text-[#f2f4f7] p-3.5 space-y-4 border border-[#0f1115]/10 dark:border-[#f2f4f7]/10 shadow-[0_18px_40px_rgba(15,17,21,0.12)]">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setQuickFilter((prev) => (prev === 'ativos' ? 'todos' : 'ativos'))
                  }
                  className={`rounded-[14px] p-2.5 text-left transition-all cursor-pointer border ${
                    quickFilter === 'ativos'
                      ? 'bg-[#192830] border-[#9fdce6]/55'
                      : 'bg-[#171b22] hover:bg-[#1d222b] border-white/6'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] text-[#f2f4f7]/62">
                    <span className="w-2 h-2 rounded-[3px] border border-[#9fdce6]" />
                    <span>Ativos</span>
                  </div>
                  <div className="mt-1.5 text-[21px] font-semibold tabular-nums leading-none text-right">
                    {matrixCounts.ativos}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setQuickFilter((prev) => (prev === 'atencao' ? 'todos' : 'atencao'))
                  }
                  className={`rounded-[14px] p-2.5 text-left transition-all cursor-pointer border ${
                    quickFilter === 'atencao'
                      ? 'bg-[#2a1f18] border-[#fbbf24]/55'
                      : 'bg-[#171b22] hover:bg-[#1d222b] border-white/6'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] text-[#f2f4f7]/62">
                    <span className="w-2 h-2 rounded-[3px] border border-[#fbbf24]" />
                    <span>Atenção</span>
                  </div>
                  <div className="mt-1.5 text-[21px] font-semibold tabular-nums leading-none text-right">
                    {matrixCounts.atencao}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setQuickFilter((prev) => (prev === 'producao' ? 'todos' : 'producao'))
                  }
                  className={`rounded-[14px] p-2.5 text-left transition-all cursor-pointer border ${
                    quickFilter === 'producao'
                      ? 'bg-[#163744]/85 border-[#9fdce6]/55'
                      : 'bg-[#171b22] hover:bg-[#1d222b] border-white/6'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] text-[#f2f4f7]/62">
                    <span className="w-2 h-2 rounded-[3px] border border-[#4ade80]" />
                    <span>Ao vivo</span>
                  </div>
                  <div className="mt-1.5 text-[21px] font-semibold tabular-nums leading-none text-right">
                    {matrixCounts.producao}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setQuickFilter((prev) => (prev === 'internos' ? 'todos' : 'internos'))
                  }
                  className={`rounded-[14px] p-2.5 text-left transition-all cursor-pointer border ${
                    quickFilter === 'internos'
                      ? 'bg-[#1d2430] border-white/35'
                      : 'bg-[#171b22] hover:bg-[#1d222b] border-white/6'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] text-[#f2f4f7]/62">
                    <span className="w-2 h-2 rounded-[3px] border border-white/55" />
                    <span>Casa Eagle</span>
                  </div>
                  <div className="mt-1.5 text-[21px] font-semibold tabular-nums leading-none text-right">
                    {matrixCounts.internos}
                  </div>
                </button>
              </div>

              <div className="px-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#9fdce6]" aria-hidden="true" />
                  <span className="text-[12.5px] font-semibold text-[#f2f4f7]/90">
                    Carteira ({filteredSummaries.length})
                  </span>
                </div>
                {quickFilter !== 'todos' && (
                  <button
                    type="button"
                    onClick={() => setQuickFilter('todos')}
                    className="text-[11px] text-[#9fdce6] hover:underline cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {filteredSummaries.length === 0 ? (
                  <div className="rounded-[14px] bg-[#171b22] p-5 text-center text-[12.5px] text-[#f2f4f7]/55">
                    Nenhuma conta nesse filtro.
                  </div>
                ) : (
                  filteredSummaries.map((item) => {
                    const isSelected = activeSummary?.client.id === item.client.id;
                    const badgeText =
                      item.pendingDecisions.length > 0
                        ? `${item.pendingDecisions.length} decisão`
                        : item.isLive
                          ? 'IA ativa'
                          : item.client.isInterno
                            ? 'Interno'
                            : 'Em dia';

                    return (
                      <button
                        key={item.client.id}
                        type="button"
                        onClick={() => {
                          setSelectedClientId(item.client.id);
                          setProfileTab('timeline');
                        }}
                        className={`w-full rounded-[16px] p-3 text-left transition-all cursor-pointer group ${
                          isSelected
                            ? 'bg-[#9fdce6] text-[#0f1115] shadow-[0_8px_20px_rgba(159,220,230,0.22)]'
                            : 'bg-[#171b22] hover:bg-[#1e242e] text-[#f2f4f7] border border-white/5'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-[10px] inline-flex items-center justify-center text-[12px] font-semibold shrink-0 ${
                                isSelected
                                  ? 'bg-[#163744] text-white'
                                  : 'bg-[#222834] text-[#9fdce6]'
                              }`}
                            >
                              {getInitials(item.client.nome)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[13.5px] font-semibold leading-tight truncate">
                                {item.client.nome}
                              </div>
                              <div
                                className={`text-[11px] truncate mt-0.5 ${
                                  isSelected ? 'text-[#0f1115]/68' : 'text-[#f2f4f7]/52'
                                }`}
                              >
                                {item.client.segmento}
                              </div>
                            </div>
                          </div>

                          <ArrowUpRight
                            className={`w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                              isSelected ? 'text-[#0f1115]/75' : 'text-[#f2f4f7]/35'
                            }`}
                          />
                        </div>

                        <div
                          className={`mt-2.5 pt-2 border-t flex items-center justify-between gap-2 text-[11px] ${
                            isSelected
                              ? 'border-[#0f1115]/12 text-[#0f1115]/80'
                              : 'border-white/6 text-[#f2f4f7]/60'
                          }`}
                        >
                          <span className="truncate tabular-nums">
                            {item.projects.length}{' '}
                            {item.projects.length === 1 ? 'projeto' : 'projetos'} ·{' '}
                            {item.artifacts.length} entregas
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-[7px] font-semibold shrink-0 ${
                              isSelected
                                ? 'bg-[#0f1115]/12 text-[#0f1115]'
                                : item.pendingDecisions.length > 0
                                  ? 'bg-[#fbbf24]/18 text-[#fbbf24]'
                                  : item.isLive
                                    ? 'bg-[#4ade80]/16 text-[#4ade80]'
                                    : 'bg-white/8 text-[#f2f4f7]/75'
                            }`}
                          >
                            {badgeText}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            {/* COLUNA PRINCIPAL DIREITA: PERFIL ESTILO REFERÊNCIA */}
            {activeSummary && (() => {
              const {
                client,
                projects,
                tasks,
                decisions,
                pendingDecisions,
                blockedTasks,
                doneTasks,
                artifacts,
                finances,
                receivable,
                paid,
                financialSummary,
                leadId,
                coverUrl,
              } = activeSummary;

              const leadMember = getMember(leadId);
              const openTasks = tasks.filter(
                (t) => t.estado !== 'concluida' && t.estado !== 'cancelada'
              );
              const primaryOpenTask = openTasks[0] ?? tasks[0];
              const topPendingDecision = pendingDecisions[0];

              const timelineItems = [
                ...decisions.map((dec) => ({
                  id: `tl-dec-${dec.id}`,
                  kind: 'decisao' as const,
                  dateLabel: dec.criadoEm,
                  title: dec.titulo,
                  subtitle: dec.pergunta,
                  actor: getMember(dec.solicitanteId),
                  statusLabel: DECISION_STATUS_META[dec.status].label,
                  badgeVariant:
                    dec.status === 'pendente'
                      ? ('warning' as const)
                      : ('success' as const),
                  taskId: dec.tarefaId,
                })),
                ...artifacts.map(({ artifact, taskId, taskCode, taskTitle }) => ({
                  id: `tl-art-${artifact.id}`,
                  kind: 'entrega' as const,
                  dateLabel: artifact.criadoEm,
                  title: `${artifact.titulo} (${artifact.versao})`,
                  subtitle: `${taskCode} · ${taskTitle}`,
                  actor: getMember(artifact.autorId),
                  statusLabel: artifact.aprovado ? 'Aprovado' : 'Em revisão',
                  badgeVariant: artifact.aprovado
                    ? ('success' as const)
                    : ('petroleo' as const),
                  taskId,
                })),
                ...tasks
                  .filter((t) => t.estado === 'bloqueada' || t.execucaoAtiva)
                  .map((t) => ({
                    id: `tl-tsk-${t.id}`,
                    kind: 'tarefa' as const,
                    dateLabel: t.atualizadaEm,
                    title: `${t.codigo} · ${t.titulo}`,
                    subtitle:
                      t.estado === 'bloqueada'
                        ? 'Frente aguardando destravamento para seguir.'
                        : 'Agente executando rodada ao vivo.',
                    actor: getMember(t.responsavelId),
                    statusLabel: TASK_STATUS_META[t.estado].label,
                    badgeVariant:
                      t.estado === 'bloqueada'
                        ? ('danger' as const)
                        : ('petroleo' as const),
                    taskId: t.id,
                  })),
              ].filter((entry) => {
                if (timelineFilter === 'entregas') return entry.kind === 'entrega';
                if (timelineFilter === 'decisoes') return entry.kind === 'decisao';
                return true;
              });

              const threadMessages = [
                ...(primaryOpenTask?.mensagens.slice(-4).map((m) => ({
                  id: m.id,
                  text: m.texto,
                  time: m.horario,
                  fromLucas: m.remetenteId === 'mem-lucas',
                  senderName: getMember(m.remetenteId)?.nome ?? 'Equipe',
                })) ?? []),
                ...(localNotes[client.id] ?? []).map((ln) => ({
                  id: ln.id,
                  text: ln.text,
                  time: ln.time,
                  fromLucas: ln.fromLucas,
                  senderName: 'Lucas Rezende',
                })),
              ];

              const stageIndex =
                doneTasks.length === tasks.length && tasks.length > 0
                  ? 2
                  : openTasks.some(
                        (t) => t.estado === 'em_andamento' || t.estado === 'em_revisao'
                      )
                    ? 1
                    : 0;

              return (
                <div className="flex-1 min-w-0 lg:h-full lg:overflow-y-auto pr-0 lg:pr-1">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={client.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="pb-4"
                    >
                      {/* CABEÇALHO ABERTO SOBRE O CANVAS (FIEL À REFERÊNCIA) */}
                      <div className="flex flex-wrap items-start justify-between gap-4 px-1 pt-1">
                        <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                          <div className="w-20 h-20 sm:w-[94px] sm:h-[94px] rounded-[20px] overflow-hidden bg-[#163744] text-white flex items-center justify-center shrink-0 shadow-[0_10px_24px_rgba(22,55,68,0.16)] relative">
                            {coverUrl ? (
                              <>
                                <img
                                  src={coverUrl}
                                  alt={client.nome}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                                <div
                                  className="absolute inset-0 bg-[#163744]/45"
                                  aria-hidden="true"
                                />
                              </>
                            ) : null}
                            <span className="relative z-10 text-[22px] font-semibold tracking-tight">
                              {getInitials(client.nome)}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <h2 className="text-[23px] sm:text-[27px] font-semibold tracking-[-0.025em] text-[#0f1115] dark:text-[#f2f4f7] leading-tight truncate">
                              {client.nome}
                            </h2>
                            <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5 text-[12px] text-[#0f1115]/58 dark:text-[#f2f4f7]/58">
                              <span className="truncate">
                                {client.isInterno
                                  ? `Estúdio Interno · ${client.segmento}`
                                  : client.segmento}
                              </span>
                              <span className="truncate tabular-nums">
                                {projects.length} projetos · {openTasks.length} em aberto
                              </span>
                              <span className="truncate">{client.contatoPrincipal}</span>
                              <span className="truncate tabular-nums">
                                {receivable > 0
                                  ? `Carteira: ${formatBRL(receivable)}`
                                  : 'Operação interna'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Direita do Header: Cápsula Responsável + Badges padronizadas */}
                        <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2 shrink-0">
                          <div className="rounded-full bg-white dark:bg-[#15181f] border border-[#0f1115]/8 dark:border-[#f2f4f7]/10 pl-1.5 pr-3 py-1 flex items-center gap-2 shadow-xs">
                            <MemberAvatar
                              member={leadMember}
                              size="sm"
                              showOperationalRing
                            />
                            <div className="leading-tight">
                              <div className="text-[10px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                                Responsável
                              </div>
                              <div className="text-[12px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                                {leadMember?.nome ?? 'Lucas Rezende'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant={
                                pendingDecisions.length > 0 || blockedTasks.length > 0
                                  ? 'danger'
                                  : 'success'
                              }
                              size="sm"
                            >
                              {pendingDecisions.length > 0
                                ? `${pendingDecisions.length} aguardando`
                                : blockedTasks.length > 0
                                  ? `${blockedTasks.length} travada`
                                  : 'Saudável'}
                            </Badge>
                            <Badge variant="cyan" size="sm">
                              {client.isInterno ? 'Casa' : 'Ativo'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* LINHA DE ASSINATURA: 5 BOTÕES CIRCULARES + ABAS CONECTADAS À FOLHA */}
                      <div className="mt-4 px-1 flex flex-wrap items-end justify-between gap-3">
                        <div className="flex items-center gap-1.5 pb-1.5">
                          <ActionIconButton
                            variant="cyan"
                            size="md"
                            onClick={() => setProfileTab('projetos')}
                            title="Projetos da conta"
                          >
                            <Folder className="w-3.5 h-3.5" />
                          </ActionIconButton>
                          <ActionIconButton
                            variant="cyan"
                            size="md"
                            onClick={() => {
                              setProfileTab('timeline');
                              window.setTimeout(() => composerInputRef.current?.focus(), 60);
                            }}
                            title="Escrever alinhamento"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </ActionIconButton>
                          <ActionIconButton
                            variant="cyan"
                            size="md"
                            onClick={() => {
                              if (projects[0]) {
                                setTaskProjectId(projects[0].id);
                                setTaskAssigneeId(projects[0].liderId);
                                setTaskDue(projects[0].prazoEntrega);
                                setIsNewTaskModalOpen(true);
                              } else {
                                setActiveSection('projetos');
                              }
                            }}
                            title="Nova tarefa para este cliente"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </ActionIconButton>
                          <ActionIconButton
                            variant="cyan"
                            size="md"
                            onClick={() => setProfileTab('entregas')}
                            title="Entregas do cliente"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </ActionIconButton>
                          <ActionIconButton
                            variant="cyan"
                            size="md"
                            onClick={() => setProfileTab('financeiro')}
                            title="Financeiro do cliente"
                          >
                            <Wallet className="w-3.5 h-3.5" />
                          </ActionIconButton>
                        </div>

                        <div className="flex items-end gap-3 overflow-x-auto max-w-full">
                          <FolderTabs
                            layoutId="client-folder-tabs"
                            value={profileTab}
                            onChange={setProfileTab}
                            items={[
                              { id: 'timeline', label: 'Linha do tempo' },
                              {
                                id: 'projetos',
                                label: 'Projetos',
                                count: projects.length,
                              },
                              {
                                id: 'entregas',
                                label: 'Entregas',
                                count: artifacts.length,
                              },
                              {
                                id: 'financeiro',
                                label: 'Financeiro',
                                count: finances.length,
                              },
                            ]}
                          />
                        </div>
                      </div>

                      {/* FOLHA PRINCIPAL CONECTADA ÀS ABAS */}
                      <div className="rounded-[22px] bg-white dark:bg-[#15181f] border border-[#0f1115]/8 dark:border-[#f2f4f7]/10 p-4 sm:p-5 shadow-[0_6px_24px_rgba(15,17,21,0.04)]">
                        {profileTab === 'timeline' && (
                          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
                            {/* CENTRO-ESQUERDA (7/12): TIMELINE + CHAT AO VIVO */}
                            <div className="xl:col-span-7 space-y-4">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[12.5px] font-semibold text-[#0f1115]/70 dark:text-[#f2f4f7]/70">
                                  Histórico e alinhamento
                                </span>
                                <div className="flex items-center gap-1">
                                  {(
                                    [
                                      { id: 'todas', label: 'Tudo' },
                                      { id: 'entregas', label: 'Entregas' },
                                      { id: 'decisoes', label: 'Decisões' },
                                    ] as const
                                  ).map((f) => (
                                    <Button
                                      key={f.id}
                                      size="xs"
                                      shape="pill"
                                      variant={timelineFilter === f.id ? 'primary' : 'ghost'}
                                      onClick={() => setTimelineFilter(f.id)}
                                    >
                                      {f.label}
                                    </Button>
                                  ))}
                                </div>
                              </div>

                              {/* Timeline Cards */}
                              <div className="space-y-2.5">
                                {timelineItems.length === 0 ? (
                                  <div className="rounded-[16px] bg-[#f6f8fa] dark:bg-[#10141b] p-5 text-center text-[12.5px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                                    Nenhuma movimentação registrada nesse filtro.
                                  </div>
                                ) : (
                                  timelineItems.slice(0, 3).map((item) => (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedTaskId(item.taskId);
                                        setActiveSection('tarefas');
                                      }}
                                      className="w-full text-left flex items-center gap-3 group cursor-pointer"
                                    >
                                      <span className="hidden sm:block w-12 shrink-0 text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 tabular-nums">
                                        {item.dateLabel.split(',')[0]}
                                      </span>

                                      <div className="flex-1 rounded-[16px] bg-[#f6f8fa] dark:bg-[#10141b] hover:bg-[#eef2f6] dark:hover:bg-[#171d27] border border-[#0f1115]/6 dark:border-[#f2f4f7]/6 px-3.5 py-3 flex items-center justify-between gap-3 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0">
                                          <span
                                            className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center ${
                                              item.kind === 'decisao'
                                                ? 'bg-[#163744]/12 text-[#163744] dark:bg-[#9fdce6]/18 dark:text-[#9fdce6]'
                                                : item.kind === 'entrega'
                                                  ? 'bg-[#9fdce6]/55 text-[#0f1115]'
                                                  : 'bg-white dark:bg-[#1b2029] text-[#0f1115]/70 dark:text-[#f2f4f7]/70'
                                            }`}
                                          >
                                            {item.kind === 'decisao' ? (
                                              <AlertCircle className="w-4 h-4" />
                                            ) : item.kind === 'entrega' ? (
                                              <Layers className="w-4 h-4" />
                                            ) : (
                                              <Calendar className="w-4 h-4" />
                                            )}
                                          </span>

                                          <div className="min-w-0">
                                            <div className="text-[13px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate group-hover:text-[#163744] dark:group-hover:text-[#9fdce6] transition-colors">
                                              {item.title}
                                            </div>
                                            <div className="text-[11.5px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55 truncate">
                                              {item.subtitle}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                          <div className="flex items-center gap-1.5">
                                            <MemberAvatar member={item.actor} size="xs" />
                                            <span className="text-[11px] text-[#0f1115]/60 dark:text-[#f2f4f7]/60 hidden sm:inline">
                                              {item.actor?.nome.split(' ')[0]}
                                            </span>
                                          </div>
                                          <Badge variant={item.badgeVariant} size="xs">
                                            {item.statusLabel}
                                          </Badge>
                                        </div>
                                      </div>
                                    </button>
                                  ))
                                )}
                              </div>

                              {/* Card Inferior: Canal de Alinhamento */}
                              <div className="rounded-[18px] bg-[#f6f8fa] dark:bg-[#10141b] border border-[#0f1115]/6 dark:border-[#f2f4f7]/6 p-4 space-y-3">
                                <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-[#0f1115]/6 dark:border-[#f2f4f7]/6">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <MemberAvatar
                                      member={leadMember}
                                      size="sm"
                                      showOperationalRing
                                    />
                                    <div className="min-w-0">
                                      <div className="text-[13px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                                        {primaryOpenTask
                                          ? `${primaryOpenTask.codigo} · ${primaryOpenTask.titulo}`
                                          : `Alinhamento · ${client.nome}`}
                                      </div>
                                      <div className="text-[11px] text-[#15803d] dark:text-[#4ade80] font-medium">
                                        Conectado ao fluxo da conta
                                      </div>
                                    </div>
                                  </div>

                                  {primaryOpenTask && (
                                    <ActionIconButton
                                      variant="neutral"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedTaskId(primaryOpenTask.id);
                                        setActiveSection('tarefas');
                                      }}
                                      title="Abrir tarefa completa"
                                    >
                                      <ArrowUpRight className="w-3.5 h-3.5" />
                                    </ActionIconButton>
                                  )}
                                </div>

                                <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                                  {threadMessages.length === 0 ? (
                                    <p className="text-[12px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 py-3 text-center">
                                      Envie uma orientação rápida abaixo para a equipe desta conta.
                                    </p>
                                  ) : (
                                    threadMessages.map((msg) => (
                                      <div
                                        key={msg.id}
                                        className={`flex flex-col ${
                                          msg.fromLucas ? 'items-end' : 'items-start'
                                        }`}
                                      >
                                        <div
                                          className={`max-w-[85%] rounded-[14px] px-3.5 py-2 text-[12.5px] leading-relaxed ${
                                            msg.fromLucas
                                              ? 'bg-[#0f1115] text-[#f2f4f7] dark:bg-[#9fdce6] dark:text-[#0f1115]'
                                              : 'bg-white text-[#0f1115] dark:bg-[#1b2029] dark:text-[#f2f4f7] border border-[#0f1115]/6 dark:border-white/6'
                                          }`}
                                        >
                                          {msg.text}
                                        </div>
                                        <span className="mt-0.5 text-[10.5px] text-[#0f1115]/42 dark:text-[#f2f4f7]/42 tabular-nums px-1">
                                          {msg.senderName} · {msg.time}
                                        </span>
                                      </div>
                                    ))
                                  )}
                                </div>

                                <form
                                  onSubmit={handleSendNote}
                                  className="flex items-center gap-2 rounded-[14px] bg-white dark:bg-[#15181f] border border-[#0f1115]/8 dark:border-[#f2f4f7]/8 p-1.5 pl-3.5"
                                >
                                  <input
                                    ref={composerInputRef}
                                    type="text"
                                    value={noteInput}
                                    onChange={(e) => setNoteInput(e.target.value)}
                                    placeholder={
                                      primaryOpenTask
                                        ? `Enviar mensagem em ${primaryOpenTask.codigo}...`
                                        : `Registrar nota para ${client.nome}...`
                                    }
                                    className="flex-1 bg-transparent text-[12.5px] text-[#0f1115] dark:text-[#f2f4f7] placeholder:text-[#0f1115]/42 dark:placeholder:text-[#f2f4f7]/42 focus:outline-none"
                                  />
                                  <ActionIconButton
                                    type="submit"
                                    variant="cyan"
                                    size="sm"
                                    disabled={!noteInput.trim()}
                                    aria-label="Enviar mensagem"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                  </ActionIconButton>
                                </form>
                              </div>
                            </div>

                            {/* DIREITA (5/12): DOIS CARDS DE ASSINATURA EMPILHADOS */}
                            <div className="xl:col-span-5 space-y-4">
                              {/* Card Superior Petróleo */}
                              <div className="rounded-[20px] bg-[#163744] text-[#f2f4f7] p-5 space-y-4 shadow-[0_12px_30px_rgba(22,55,68,0.2)] relative overflow-hidden">
                                <div className="flex items-start justify-between gap-2 relative z-10">
                                  <div>
                                    <div className="text-[11px] text-white/65">
                                      Resumo da conta
                                    </div>
                                    <h3 className="mt-0.5 text-[16px] font-semibold tracking-[-0.015em] leading-snug">
                                      {projects[0]?.nome ?? client.nome}
                                    </h3>
                                  </div>
                                  <ActionIconButton
                                    variant="petroleo"
                                    size="sm"
                                    onClick={() => setProfileTab('financeiro')}
                                    title="Abrir financeiro"
                                  >
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                  </ActionIconButton>
                                </div>

                                <div className="rounded-[12px] bg-white/10 backdrop-blur-md border border-white/12 p-1 grid grid-cols-3 gap-1 text-[11px]">
                                  {['Briefing', 'Produção', 'Entrega'].map((lbl, idx) => (
                                    <div
                                      key={lbl}
                                      className={`py-1.5 rounded-[9px] text-center font-medium ${
                                        stageIndex === idx
                                          ? 'bg-white text-[#0f1115] font-semibold'
                                          : 'text-white/70'
                                      }`}
                                    >
                                      {lbl}
                                    </div>
                                  ))}
                                </div>

                                <div>
                                  <div className="text-[11px] text-white/65">
                                    {client.isInterno
                                      ? 'Investimento interno'
                                      : 'Carteira prevista'}
                                  </div>
                                  <div className="mt-0.5 text-[26px] font-semibold tracking-[-0.03em] tabular-nums leading-none">
                                    {receivable > 0
                                      ? formatBRL(receivable)
                                      : 'Conta da Casa'}
                                  </div>
                                  {receivable > 0 && (
                                    <div className="mt-1 text-[11px] text-[#9fdce6] tabular-nums">
                                      Liquidado: {formatBRL(paid)}
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-1.5 text-[12px]">
                                  <div className="flex items-center gap-2 text-white/90">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#9fdce6] shrink-0" />
                                    <span>
                                      {projects.length}{' '}
                                      {projects.length === 1 ? 'projeto' : 'projetos'} no
                                      estúdio
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-white/90">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#9fdce6] shrink-0" />
                                    <span>
                                      {artifacts.filter((a) => a.artifact.aprovado).length} de{' '}
                                      {artifacts.length} entregas aprovadas
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-white/85">
                                    {pendingDecisions.length > 0 ? (
                                      <AlertCircle className="w-3.5 h-3.5 text-[#fbbf24] shrink-0" />
                                    ) : (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-[#9fdce6] shrink-0" />
                                    )}
                                    <span>
                                      {pendingDecisions.length > 0
                                        ? `${pendingDecisions.length} decisão aguardando Lucas`
                                        : 'Nenhuma pendência bloqueando'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Card Inferior Ciano */}
                              <div className="rounded-[20px] bg-[#9fdce6] text-[#0f1115] p-5 space-y-3.5 shadow-[0_10px_26px_rgba(159,220,230,0.24)]">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="text-[11px] font-medium text-[#0f1115]/68">
                                      {topPendingDecision
                                        ? 'Aprovação pendente'
                                        : 'Próxima entrega'}
                                    </div>
                                    <h3 className="mt-0.5 text-[15.5px] font-semibold tracking-[-0.015em] leading-snug">
                                      {topPendingDecision
                                        ? topPendingDecision.titulo
                                        : primaryOpenTask?.titulo ?? 'Criar frente'}
                                    </h3>
                                  </div>
                                  <Sparkles className="w-4 h-4 text-[#163744] shrink-0 mt-0.5" />
                                </div>

                                {primaryOpenTask && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedTaskId(primaryOpenTask.id);
                                      setActiveSection('tarefas');
                                    }}
                                    className="w-full rounded-[13px] bg-white/92 hover:bg-white p-2.5 flex items-center justify-between gap-2.5 text-left transition-colors cursor-pointer"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <span className="w-8 h-8 rounded-[9px] bg-[#f2f4f7] text-[#163744] flex items-center justify-center shrink-0">
                                        <FileText className="w-4 h-4" />
                                      </span>
                                      <div className="min-w-0">
                                        <div className="text-[12.5px] font-semibold text-[#0f1115] truncate">
                                          {primaryOpenTask.codigo} ·{' '}
                                          {TASK_STATUS_META[primaryOpenTask.estado].label}
                                        </div>
                                        <div className="text-[11px] text-[#0f1115]/55 tabular-nums">
                                          Prazo {formatShortDate(primaryOpenTask.prazo)}
                                        </div>
                                      </div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-[#0f1115]/60 shrink-0" />
                                  </button>
                                )}

                                {topPendingDecision ? (
                                  <div className="space-y-3">
                                    <p className="text-[12px] text-[#0f1115]/82 leading-relaxed">
                                      {topPendingDecision.pergunta}
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                      <Button
                                        variant="dark"
                                        size="md"
                                        shape="pill"
                                        onClick={() =>
                                          resolveDecision(topPendingDecision.id, 'aprovada')
                                        }
                                        className="w-full"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        <span className="truncate">
                                          {topPendingDecision.acaoPrimaria}
                                        </span>
                                      </Button>
                                      <Button
                                        variant="secondary"
                                        size="md"
                                        shape="pill"
                                        onClick={() =>
                                          resolveDecision(topPendingDecision.id, 'ajuste')
                                        }
                                        className="w-full bg-white/90 text-[#0f1115]"
                                      >
                                        <span className="truncate">
                                          {topPendingDecision.acaoSecundaria}
                                        </span>
                                      </Button>
                                    </div>
                                  </div>
                                ) : primaryOpenTask &&
                                  primaryOpenTask.subtarefas.length > 0 ? (
                                  <div className="space-y-2.5">
                                    {primaryOpenTask.subtarefas.slice(0, 2).map((sub) => (
                                      <button
                                        key={sub.id}
                                        type="button"
                                        onClick={() =>
                                          toggleSubtask(primaryOpenTask.id, sub.id)
                                        }
                                        className="w-full flex items-center gap-2 text-left text-[12px] cursor-pointer"
                                      >
                                        <span
                                          className={`w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 border ${
                                            sub.concluida
                                              ? 'bg-[#0f1115] border-[#0f1115] text-white'
                                              : 'bg-white/80 border-[#0f1115]/25'
                                          }`}
                                        >
                                          {sub.concluida && <Check className="w-3 h-3" />}
                                        </span>
                                        <span
                                          className={`truncate ${
                                            sub.concluida
                                              ? 'line-through text-[#0f1115]/50'
                                              : 'text-[#0f1115]/88 font-medium'
                                          }`}
                                        >
                                          {sub.titulo}
                                        </span>
                                      </button>
                                    ))}
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                      <Button
                                        variant="dark"
                                        size="md"
                                        shape="pill"
                                        onClick={() => {
                                          setSelectedTaskId(primaryOpenTask.id);
                                          setActiveSection('tarefas');
                                        }}
                                      >
                                        Abrir tarefa
                                      </Button>
                                      <Button
                                        variant="secondary"
                                        size="md"
                                        shape="pill"
                                        onClick={() => {
                                          if (projects[0]) {
                                            setTaskProjectId(projects[0].id);
                                            setTaskAssigneeId(projects[0].liderId);
                                            setIsNewTaskModalOpen(true);
                                          }
                                        }}
                                        className="bg-white/90 text-[#0f1115]"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Nova</span>
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button
                                    variant="dark"
                                    size="md"
                                    shape="pill"
                                    className="w-full"
                                    onClick={() => {
                                      if (projects[0]) {
                                        setTaskProjectId(projects[0].id);
                                        setTaskAssigneeId(projects[0].liderId);
                                        setIsNewTaskModalOpen(true);
                                      } else {
                                        setActiveSection('projetos');
                                      }
                                    }}
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Criar primeira entrega</span>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {profileTab === 'projetos' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {projects.length === 0 ? (
                              <div className="md:col-span-2">
                                <EmptyState
                                  title="Este cliente ainda não possui projetos cadastrados."
                                  actionLabel="Criar projeto"
                                  onAction={() => setActiveSection('projetos')}
                                />
                              </div>
                            ) : (
                              projects.map((proj) => {
                                const leader = getMember(proj.liderId);
                                const pMeta = PROJECT_STATUS_META[proj.estado];
                                const pTasks = state.tasks.filter(
                                  (t) => t.projetoId === proj.id
                                );
                                const pDone = pTasks.filter(
                                  (t) => t.estado === 'concluida'
                                ).length;
                                const pct = pTasks.length
                                  ? Math.round((pDone / pTasks.length) * 100)
                                  : 0;

                                return (
                                  <BentoCard
                                    key={proj.id}
                                    onClick={() => {
                                      setSelectedProjectId(proj.id);
                                      setActiveSection('projetos');
                                    }}
                                    className="p-5 flex flex-col justify-between gap-4 group"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0 space-y-1">
                                        <StatusIndicator
                                          label={pMeta.label}
                                          dotClass={pMeta.dotClass}
                                          textClass={pMeta.textClass}
                                        />
                                        <h3 className="text-[15.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] group-hover:text-[#163744] dark:group-hover:text-[#9fdce6] transition-colors">
                                          {proj.nome}
                                        </h3>
                                        <p className="text-[12px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55 line-clamp-2">
                                          {proj.descricao}
                                        </p>
                                      </div>

                                      <MicroRing
                                        value={pct}
                                        size={44}
                                        strokeWidth={4}
                                        label={`${pct}%`}
                                      />
                                    </div>

                                    <ProportionBar
                                      heightClass="h-1.5"
                                      segments={[
                                        {
                                          key: 'done',
                                          value: pDone,
                                          colorClass: 'bg-[#15803d] dark:bg-[#4ade80]',
                                        },
                                        {
                                          key: 'open',
                                          value: Math.max(0, pTasks.length - pDone),
                                          colorClass: 'bg-[#163744] dark:bg-[#9fdce6]',
                                        },
                                      ]}
                                    />

                                    <div className="flex items-center justify-between text-[12px] text-[#0f1115]/58 dark:text-[#f2f4f7]/58 tabular-nums">
                                      <div className="flex items-center gap-2">
                                        <MemberAvatar member={leader} size="xs" />
                                        <span>{leader?.nome}</span>
                                      </div>
                                      <span>
                                        {pDone}/{pTasks.length} ·{' '}
                                        {formatShortDate(proj.prazoEntrega)}
                                      </span>
                                    </div>
                                  </BentoCard>
                                );
                              })
                            )}
                          </div>
                        )}

                        {profileTab === 'entregas' && (
                          <div>
                            {artifacts.length === 0 ? (
                              <EmptyState title="Nenhuma entrega produzida para esta conta ainda." />
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                {artifacts.map(({ artifact, taskId, taskCode, taskTitle }) => (
                                  <BentoCard
                                    key={artifact.id}
                                    className="overflow-hidden flex flex-col justify-between group"
                                  >
                                    <div className="relative h-44 bg-[#ebeff3] dark:bg-[#10141b] overflow-hidden">
                                      {artifact.previewUrl ? (
                                        <img
                                          src={artifact.previewUrl}
                                          alt={artifact.titulo}
                                          referrerPolicy="no-referrer"
                                          onClick={() =>
                                            setPreviewArtifact({ artifact, taskId })
                                          }
                                          className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-[1.03]"
                                        />
                                      ) : (
                                        <div
                                          onClick={() =>
                                            setPreviewArtifact({ artifact, taskId })
                                          }
                                          className="w-full h-full p-4 flex flex-col justify-between cursor-pointer"
                                        >
                                          <FileText className="w-5 h-5 text-[#163744] dark:text-[#9fdce6]" />
                                          <p className="text-[12px] text-[#0f1115]/65 dark:text-[#f2f4f7]/65 line-clamp-4">
                                            {artifact.resumoConteudo}
                                          </p>
                                        </div>
                                      )}

                                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                                        <Badge variant="neutral" size="xs">
                                          {artifact.versao}
                                        </Badge>

                                        <div className="flex items-center gap-1.5">
                                          <Button
                                            size="xs"
                                            variant={artifact.aprovado ? 'primary' : 'secondary'}
                                            onClick={() =>
                                              approveArtifact(
                                                taskId,
                                                artifact.id,
                                                !artifact.aprovado
                                              )
                                            }
                                          >
                                            <Check className="w-3 h-3" />
                                            <span>
                                              {artifact.aprovado ? 'Aprovado' : 'Aprovar'}
                                            </span>
                                          </Button>
                                          <ActionIconButton
                                            variant="glass"
                                            size="sm"
                                            onClick={() =>
                                              setPreviewArtifact({ artifact, taskId })
                                            }
                                            title="Ampliar"
                                          >
                                            <Maximize2 className="w-3.5 h-3.5" />
                                          </ActionIconButton>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="p-4">
                                      <div className="text-[13.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                                        {artifact.titulo}
                                      </div>
                                      <div className="text-[11.5px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 truncate">
                                        {taskCode} · {taskTitle}
                                      </div>
                                    </div>
                                  </BentoCard>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {profileTab === 'financeiro' && (
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <h3 className="text-[15px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                                  Resultado financeiro do cliente
                                </h3>
                                <p className="text-[12px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 tabular-nums">
                                  Recebido: {formatBRL(paid)} · Total contratado:{' '}
                                  {formatBRL(receivable)}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setActiveSection('financeiro')}
                              >
                                <span>Abrir Financeiro completo</span>
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </Button>
                            </div>

                            {!client.isInterno && (
                              <div className="rounded-[18px] bg-[#f6f8fa] dark:bg-[#10141b] border border-[#0f1115]/8 dark:border-[#f2f4f7]/8 p-4 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <div className="text-[11.5px] font-medium text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                                      Veredito de rentabilidade
                                    </div>
                                    <div className="mt-0.5 flex items-center gap-2.5">
                                      <span
                                        className={`text-[22px] font-semibold tracking-[-0.025em] tabular-nums ${
                                          financialSummary.deuLucro
                                            ? 'text-[#15803d] dark:text-[#4ade80]'
                                            : 'text-[#b91c1c] dark:text-[#f87171]'
                                        }`}
                                      >
                                        {financialSummary.deuLucro ? '+' : '−'}{' '}
                                        {formatBRL(
                                          Math.abs(financialSummary.lucroLiquidoCentavos)
                                        )}
                                      </span>
                                      <Badge
                                        variant={
                                          financialSummary.margemPercentual >= 25
                                            ? 'success'
                                            : financialSummary.deuLucro
                                              ? 'warning'
                                              : 'danger'
                                        }
                                        size="sm"
                                      >
                                        {financialSummary.deuLucro
                                          ? `Deu lucro · Margem ${financialSummary.margemPercentual}%`
                                          : `Prejuízo · ${financialSummary.margemPercentual}%`}
                                      </Badge>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {financialSummary.faturasVencidas.length > 0 && (
                                      <Badge variant="danger" size="xs">
                                        {financialSummary.faturasVencidas.length} vencida(s)
                                      </Badge>
                                    )}
                                    {financialSummary.notasPendentes.length > 0 && (
                                      <Badge variant="warning" size="xs">
                                        {financialSummary.notasPendentes.length} nota pendente (+10d)
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-[12px] tabular-nums">
                                  <div className="rounded-[12px] bg-white dark:bg-[#15181f] p-2.5 border border-[#0f1115]/6 dark:border-white/6">
                                    <div className="text-[11px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50">
                                      Receita total
                                    </div>
                                    <div className="mt-0.5 font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                                      {formatBRL(financialSummary.receitaTotalCentavos)}
                                    </div>
                                  </div>
                                  <div className="rounded-[12px] bg-white dark:bg-[#15181f] p-2.5 border border-[#0f1115]/6 dark:border-white/6">
                                    <div className="text-[11px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50">
                                      Custos diretos
                                    </div>
                                    <div className="mt-0.5 font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                                      − {formatBRL(financialSummary.custosDiretosCentavos)}
                                    </div>
                                  </div>
                                  <div className="rounded-[12px] bg-white dark:bg-[#15181f] p-2.5 border border-[#0f1115]/6 dark:border-white/6">
                                    <div className="text-[11px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50">
                                      Impostos previstos
                                    </div>
                                    <div className="mt-0.5 font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                                      − {formatBRL(financialSummary.impostosPrevistosCentavos)}
                                    </div>
                                  </div>
                                  <div className="rounded-[12px] bg-white dark:bg-[#15181f] p-2.5 border border-[#0f1115]/6 dark:border-white/6">
                                    <div className="text-[11px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50">
                                      Rateio fixo estúdio
                                    </div>
                                    <div className="mt-0.5 font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                                      − {formatBRL(financialSummary.rateioCustosFixosCentavos)}
                                    </div>
                                  </div>
                                </div>

                                <ProportionBar
                                  heightClass="h-1.5"
                                  segments={[
                                    {
                                      key: 'lucro',
                                      value: Math.max(0, financialSummary.lucroLiquidoCentavos),
                                      colorClass: 'bg-[#15803d] dark:bg-[#4ade80]',
                                    },
                                    {
                                      key: 'direto',
                                      value: financialSummary.custosDiretosCentavos,
                                      colorClass: 'bg-[#b45309] dark:bg-[#fbbf24]',
                                    },
                                    {
                                      key: 'imp_fixo',
                                      value:
                                        financialSummary.impostosPrevistosCentavos +
                                        financialSummary.rateioCustosFixosCentavos,
                                      colorClass: 'bg-[#163744] dark:bg-[#9fdce6]',
                                    },
                                  ]}
                                />
                              </div>
                            )}

                            {financialSummary.clientContracts.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-[12px] font-semibold text-[#0f1115]/62 dark:text-[#f2f4f7]/62">
                                  Contratos assinados
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {financialSummary.clientContracts.map((ctr) => (
                                    <div
                                      key={ctr.id}
                                      className="rounded-[14px] bg-[#f6f8fa] dark:bg-[#10141b] border border-[#0f1115]/6 dark:border-white/6 p-3 flex items-center justify-between gap-3"
                                    >
                                      <div className="min-w-0">
                                        <div className="text-[12.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                                          {ctr.titulo}
                                        </div>
                                        <div className="text-[11px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 tabular-nums">
                                          {ctr.parcelas}× parcelas · Assinado{' '}
                                          {formatShortDate(ctr.assinadoEm)}
                                        </div>
                                      </div>
                                      <div className="text-[13px] font-semibold tabular-nums text-[#163744] dark:text-[#9fdce6] shrink-0">
                                        {formatBRL(ctr.valorTotalCentavos)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {finances.length === 0 ? (
                              <p className="text-[13px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 py-6">
                                Nenhum lançamento financeiro cadastrado para este cliente.
                              </p>
                            ) : (
                              <div className="divide-y divide-[#0f1115]/6 dark:divide-[#f2f4f7]/6 rounded-[14px] bg-[#f6f8fa] dark:bg-[#10141b]">
                                {finances.map((entry) => {
                                  const isPaid = entry.status === 'liquidado';
                                  const overdue = isInvoiceOverdue(entry);
                                  const noteWarn = isInvoiceNotePending(entry);
                                  return (
                                    <div
                                      key={entry.id}
                                      className="px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                                    >
                                      <div className="min-w-0 space-y-0.5">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className="text-[13.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                                            {entry.descricao}
                                          </span>
                                          {overdue && (
                                            <Badge variant="danger" size="xs">
                                              Vencida {getOverdueDays(entry)}d
                                            </Badge>
                                          )}
                                          {noteWarn && (
                                            <Badge variant="warning" size="xs">
                                              Nota pendente ({getDaysSincePayment(entry)}d)
                                            </Badge>
                                          )}
                                          {entry.isImposto && (
                                            <Badge variant="neutral" size="xs">
                                              Imposto auto
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="text-[11.5px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 tabular-nums">
                                          {entry.categoria} · Vence{' '}
                                          {formatShortDate(entry.vencimento)}
                                          {entry.notaFiscal?.status === 'emitida' &&
                                          entry.notaFiscal.numero
                                            ? ` · ${entry.notaFiscal.numero}`
                                            : ''}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-3 shrink-0">
                                        <span
                                          className={`text-[14px] font-semibold tabular-nums ${
                                            entry.tipo === 'receber'
                                              ? 'text-[#15803d] dark:text-[#4ade80]'
                                              : 'text-[#0f1115] dark:text-[#f2f4f7]'
                                          }`}
                                        >
                                          {entry.tipo === 'receber' ? '+' : '−'}{' '}
                                          {formatBRL(entry.valorCentavos)}
                                        </span>
                                        <Button
                                          size="sm"
                                          variant={isPaid ? 'primary' : 'secondary'}
                                          onClick={() => toggleFinanceStatus(entry.id)}
                                        >
                                          {isPaid ? 'Liquidado' : 'Marcar pago'}
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* MODAL NOVO CLIENTE */}
      {isNewModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1115]/55 backdrop-blur-xs p-4"
          onClick={() => setIsNewModalOpen(false)}
        >
          <form
            onSubmit={handleCreateClient}
            onClick={(e) => e.stopPropagation()}
            className="eagle-modal w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                Novo cliente
              </h2>
              <ActionIconButton
                variant="neutral"
                size="sm"
                onClick={() => setIsNewModalOpen(false)}
              >
                <X className="w-3.5 h-3.5" />
              </ActionIconButton>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                  Nome do cliente
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Instituto Pinheiros"
                  className="eagle-input w-full h-9.5 px-3 text-[13.5px]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                  Segmento
                </label>
                <input
                  type="text"
                  value={segmento}
                  onChange={(e) => setSegmento(e.target.value)}
                  placeholder="Ex: Cultura e Eventos"
                  className="eagle-input w-full h-9.5 px-3 text-[13.5px]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                  Contato principal
                </label>
                <input
                  type="text"
                  value={contato}
                  onChange={(e) => setContato(e.target.value)}
                  placeholder="Ex: Juliana Prado · Diretoria"
                  className="eagle-input w-full h-9.5 px-3 text-[13.5px]"
                />
              </div>

              <label className="flex items-center gap-2 pt-1 text-[13px] text-[#0f1115]/80 dark:text-[#f2f4f7]/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInterno}
                  onChange={(e) => setIsInterno(e.target.checked)}
                  className="w-4 h-4 accent-[#163744] dark:accent-[#9fdce6]"
                />
                <span>Conta interna da Eagle Digital House</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsNewModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary">
                Salvar cliente
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL NOVA TAREFA RÁPIDA PARA O CLIENTE */}
      {isNewTaskModalOpen && activeSummary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1115]/55 backdrop-blur-xs p-4"
          onClick={() => setIsNewTaskModalOpen(false)}
        >
          <form
            onSubmit={handleCreateClientTask}
            onClick={(e) => e.stopPropagation()}
            className="eagle-modal w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                Nova tarefa · {activeSummary.client.nome}
              </h2>
              <ActionIconButton
                variant="neutral"
                size="sm"
                onClick={() => setIsNewTaskModalOpen(false)}
              >
                <X className="w-3.5 h-3.5" />
              </ActionIconButton>
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
                  placeholder="Ex: Revisar proposta de cenografia"
                  className="eagle-input w-full h-9.5 px-3 text-[13.5px]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                  Projeto
                </label>
                <select
                  value={taskProjectId}
                  onChange={(e) => setTaskProjectId(e.target.value)}
                  className="eagle-input w-full h-9.5 px-3 text-[13px]"
                >
                  {activeSummary.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
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
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsNewTaskModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary">
                Criar tarefa
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
