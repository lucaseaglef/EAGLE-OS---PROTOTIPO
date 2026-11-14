import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  FolderOpen,
  Maximize2,
  Menu,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Pause,
  Play,
  Plus,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';
import { AI_MODEL_OPTIONS, useEagle } from '../context/EagleContext';
import { Artifact, Task, TaskExecution, TaskStatus } from '../types/eagle';
import { formatShortDate, TASK_STATUS_META } from '../utils/formatters';
import { RichTextBlock } from './RichTextBlock';
import { MemberAvatar, StatusIndicator } from './SharedUI';

type FixedTabId = 'propriedades' | 'subtarefas' | 'fila_agente' | 'artefatos';

interface ExtraTab {
  id: string;
  kind: 'task' | 'artifact' | 'execution';
  title: string;
  targetId: string;
}

const ALL_STATUSES: TaskStatus[] = [
  'a_fazer',
  'em_andamento',
  'em_revisao',
  'bloqueada',
  'concluida',
  'cancelada',
];

function triggerArtifactDownload(art: Artifact) {
  if (art.previewUrl) {
    const a = document.createElement('a');
    a.href = art.previewUrl;
    a.download = `${art.titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }
  const text = `${art.titulo}\n${art.versao} · ${art.formato}\n\n${
    art.resumoConteudo ?? 'Documento técnico preparado pela Eagle Digital House.'
  }`;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${art.titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Linha limpa de propriedade: rótulo discreto à esquerda, valor alinhado à direita sem caixas pesadas */
function PropRow({
  label,
  children,
  alignStart = false,
}: {
  label: string;
  children: React.ReactNode;
  alignStart?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[94px_minmax(0,1fr)] gap-2 min-h-[27px] ${
        alignStart ? 'items-start py-1' : 'items-center'
      }`}
    >
      <span className="text-[12px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 truncate">
        {label}
      </span>
      <div className="min-w-0 flex items-center">{children}</div>
    </div>
  );
}

/** Seletor limpo sem borda aparente, com seta discreta no hover */
function InlineSelect({
  value,
  onChange,
  ariaLabel,
  children,
  muted = false,
  leading,
}: {
  value: string;
  onChange: (val: string) => void;
  ariaLabel: string;
  children: React.ReactNode;
  muted?: boolean;
  leading?: React.ReactNode;
}) {
  return (
    <div className="relative inline-flex items-center gap-1.5 min-w-0 max-w-full overflow-hidden rounded-[7px] px-1.5 -ml-1.5 h-[26px] hover:bg-[#0f1115]/4 dark:hover:bg-[#f2f4f7]/6 transition-colors group">
      {leading}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className={`appearance-none bg-transparent min-w-0 max-w-full pr-4 text-[12px] font-medium truncate cursor-pointer focus:outline-none focus:shadow-none ${
          muted
            ? 'text-[#0f1115]/40 dark:text-[#f2f4f7]/40'
            : 'text-[#0f1115]/88 dark:text-[#f2f4f7]/88'
        }`}
      >
        {children}
      </select>
      <ChevronDown
        className="w-3 h-3 text-[#0f1115]/35 dark:text-[#f2f4f7]/35 group-hover:text-[#0f1115]/65 dark:group-hover:text-[#f2f4f7]/65 pointer-events-none absolute right-1"
        aria-hidden="true"
      />
    </div>
  );
}

export function TaskDetailPanel({
  task,
  onClose,
  onSelectTask,
  onOpenMobileMenu,
  showBackButton = false,
}: {
  task: Task;
  onClose: () => void;
  onSelectTask?: (taskId: string) => void;
  onOpenMobileMenu?: () => void;
  showBackButton?: boolean;
}) {
  const {
    state,
    getMember,
    getProject,
    getClient,
    getTask,
    updateTaskStatus,
    updateTaskAssignee,
    updateTaskReviewer,
    updateTaskBriefing,
    updateTaskFields,
    updateSubtaskStatus,
    updateSubtaskAssignee,
    addSubtask,
    sendTaskMessage,
    reactToMessage,
    answerMessageOptions,
    reorderQueuedMessage,
    editQueuedMessage,
    removeQueuedMessage,
    interruptAgentAndFlushQueue,
    toggleTaskExecution,
    approveArtifact,
    resolveDecision,
    setPreviewArtifact,
    setActiveSection,
    setSelectedProjectId,
    typingTaskId,
  } = useEagle();

  // Painel lateral (folha independente sobre a mesa: recolhível, alargável, tela cheia)
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelFullscreen, setPanelFullscreen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(430);
  const [containerWidth, setContainerWidth] = useState(1080);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  // Abas: 4 fixas + abas extras fecháveis estilo navegador
  const [activeTab, setActiveTab] = useState<string>('propriedades');
  const [extraTabs, setExtraTabs] = useState<ExtraTab[]>([]);
  const [tabPickerOpen, setTabPickerOpen] = useState(false);

  // Edição do briefing
  const [editingBriefing, setEditingBriefing] = useState(false);
  const [briefingDraft, setBriefingDraft] = useState(task.briefing);

  // Compositor
  const [draft, setDraft] = useState('');
  const [targetAgentId, setTargetAgentId] = useState(task.responsavelId);
  const [selectedModel, setSelectedModel] = useState(
    task.modeloPreferido || AI_MODEL_OPTIONS[0]
  );
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rolagem da conversa
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Ações inline
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState(false);
  const [editingQueueId, setEditingQueueId] = useState<string | null>(null);
  const [editingQueueText, setEditingQueueText] = useState('');

  // Subtarefas e propriedades
  const [newSubtask, setNewSubtask] = useState('');
  const [newSubAssigneeId, setNewSubAssigneeId] = useState(task.responsavelId);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [addingTag, setAddingTag] = useState(false);
  const [editingFolder, setEditingFolder] = useState(false);
  const [folderDraft, setFolderDraft] = useState(task.pastaArquivos);

  const creator = getMember(task.criadoPorId) ?? getMember('mem-lucas');
  const assignee = getMember(task.responsavelId);
  const reviewer = getMember(task.revisorId);
  const approver = getMember(task.aprovadorId);
  const project = getProject(task.projetoId);
  const client = project ? getClient(project.clienteId) : undefined;
  const statusMeta = TASK_STATUS_META[task.estado];
  const isTyping = typingTaskId === task.id;
  const isLive = task.estado === 'em_andamento' || task.execucaoAtiva;

  const agentsList = useMemo(
    () => state.members.filter((m) => m.tipo === 'agente'),
    [state.members]
  );

  const agentQueueTasks = useMemo(
    () => state.tasks.filter((t) => t.responsavelId === task.responsavelId),
    [state.tasks, task.responsavelId]
  );

  const activeExecution: TaskExecution | undefined = task.execucoes[0];

  const participants = useMemo(() => {
    const ids = Array.from(
      new Set([task.responsavelId, task.revisorId, task.aprovadorId, ...task.observadoresIds])
    );
    return ids.map((id) => getMember(id)).filter(Boolean);
  }, [getMember, task.aprovadorId, task.observadoresIds, task.responsavelId, task.revisorId]);

  useEffect(() => {
    setBriefingDraft(task.briefing);
    setEditingBriefing(false);
    setTargetAgentId(task.responsavelId);
    setSelectedModel(task.modeloPreferido || AI_MODEL_OPTIONS[0]);
    setNewSubAssigneeId(task.responsavelId);
    setFolderDraft(task.pastaArquivos);
    setEditingFolder(false);
    setExtraTabs([]);
    setActiveTab('propriedades');
    setTabPickerOpen(false);
  }, [task.id]);

  useEffect(() => {
    setTargetAgentId(task.responsavelId);
    setNewSubAssigneeId(task.responsavelId);
  }, [task.responsavelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [task.id, task.mensagens.length, task.filaMensagens.length, isTyping]);

  useEffect(() => {
    const el = splitContainerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const updateWidth = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setContainerWidth(w);
    };
    updateWidth();
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isSideBySide = containerWidth >= 700;
  const effectivePanelWidth = useMemo(() => {
    const maxSafe = Math.max(300, Math.min(580, Math.floor(containerWidth * 0.43)));
    return Math.max(300, Math.min(panelWidth, maxSafe));
  }, [containerWidth, panelWidth]);

  useEffect(() => {
    if (!isDraggingSplit) return;
    const onMove = (e: PointerEvent) => {
      const container = splitContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const desired = rect.right - e.clientX;
      const maxAllowed = Math.max(300, Math.min(580, rect.width - 380));
      setPanelWidth(Math.max(290, Math.min(maxAllowed, desired)));
    };
    const onUp = () => setIsDraggingSplit(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [isDraggingSplit]);

  const handleChatScroll = () => {
    const el = chatScrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBottom(distFromBottom > 140);
  };

  const openExtraTab = (tab: ExtraTab) => {
    setPanelOpen(true);
    setExtraTabs((prev) => {
      if (prev.some((t) => t.id === tab.id)) return prev;
      return [...prev, tab];
    });
    setActiveTab(tab.id);
  };

  const closeExtraTab = (tabId: string) => {
    setExtraTabs((prev) => prev.filter((t) => t.id !== tabId));
    if (activeTab === tabId) {
      setActiveTab('propriedades');
    }
  };

  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedMsgId(msgId);
    window.setTimeout(() => {
      setCopiedMsgId((curr) => (curr === msgId ? null : curr));
    }, 1500);
  };

  const handleCopyPath = () => {
    navigator.clipboard?.writeText(task.pastaArquivos).catch(() => {});
    setCopiedPath(true);
    window.setTimeout(() => setCopiedPath(false), 1500);
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setAttachedFiles((prev) => [...prev, ...files.map((f) => f.name)]);
    e.target.value = '';
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!draft.trim()) return;
    sendTaskMessage(task.id, draft, {
      targetAgentId,
      modeloIA: selectedModel,
      anexosNomes: attachedFiles,
    });
    setDraft('');
    setAttachedFiles([]);
  };

  const handleSaveBriefing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!briefingDraft.trim()) return;
    updateTaskBriefing(task.id, briefingDraft);
    setEditingBriefing(false);
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    addSubtask(task.id, newSubtask, newSubAssigneeId);
    setNewSubtask('');
    setAddingSubtask(false);
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTag.trim();
    if (!clean) return;
    if (!task.etiquetas.includes(clean)) {
      updateTaskFields(task.id, { etiquetas: [...task.etiquetas, clean] });
    }
    setNewTag('');
    setAddingTag(false);
  };

  const completedSubtasks = task.subtarefas.filter(
    (s) => s.concluida || s.estado === 'concluida'
  ).length;

  const FIXED_TABS: Array<{ id: FixedTabId; label: string; count?: number }> = [
    { id: 'propriedades', label: 'Propriedades' },
    { id: 'subtarefas', label: 'Subtarefas', count: task.subtarefas.length },
    { id: 'fila_agente', label: 'Tarefas do agente', count: agentQueueTasks.length },
    { id: 'artefatos', label: 'Artefatos', count: task.artefatos.length },
  ];

  const parentTask = task.tarefaPaiId ? getTask(task.tarefaPaiId) : undefined;
  const activeExtraTab = extraTabs.find((t) => t.id === activeTab);
  const otherTasks = useMemo(
    () => state.tasks.filter((t) => t.id !== task.id),
    [state.tasks, task.id]
  );

  const selectedComposerAgent = getMember(targetAgentId);

  return (
    <motion.div
      key={task.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.14 }}
      ref={splitContainerRef}
      className={`flex-1 min-h-0 h-full flex ${
        isSideBySide && !panelFullscreen ? 'flex-row' : 'flex-col gap-2.5'
      } ${isDraggingSplit ? 'select-none' : ''}`}
    >
      {/* FOLHA PRINCIPAL DA TAREFA: TOPO + CONVERSA + COMPOSITOR */}
      {!panelFullscreen && (
        <div className="eagle-sheet-canvas flex-1 min-w-0 min-h-0 h-full overflow-hidden flex flex-col">
          {/* Barra superior fina e alinhada */}
          <header className="h-11 shrink-0 px-4 sm:px-6 border-b border-[#0f1115]/7 dark:border-[#f2f4f7]/8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {onOpenMobileMenu && (
                <button
                  type="button"
                  onClick={onOpenMobileMenu}
                  aria-label="Abrir menu lateral"
                  className="lg:hidden w-7 h-7 rounded-[8px] inline-flex items-center justify-center text-[#0f1115]/60 dark:text-[#f2f4f7]/60 hover:bg-[#0f1115]/5 dark:hover:bg-[#f2f4f7]/6 cursor-pointer shrink-0"
                >
                  <Menu className="w-4 h-4" />
                </button>
              )}

              {showBackButton && !onOpenMobileMenu && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Voltar para tarefas"
                  className="w-7 h-7 rounded-[8px] inline-flex items-center justify-center text-[#0f1115]/60 dark:text-[#f2f4f7]/60 hover:bg-[#0f1115]/5 dark:hover:bg-[#f2f4f7]/6 cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 hover:text-[#163744] dark:hover:text-[#9fdce6] transition-colors cursor-pointer shrink-0"
              >
                Tarefas
              </button>

              <ChevronRight
                className="w-3.5 h-3.5 text-[#0f1115]/30 dark:text-[#f2f4f7]/30 shrink-0"
                aria-hidden="true"
              />

              <span
                className={`w-2 h-2 rounded-full shrink-0 ${statusMeta.dotClass}`}
                aria-hidden="true"
              />

              <span className="text-[12.5px] font-medium text-[#0f1115]/82 dark:text-[#f2f4f7]/82 truncate">
                {task.titulo}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11.5px] font-medium text-[#0f1115]/44 dark:text-[#f2f4f7]/44 tabular-nums">
                {task.codigo}
              </span>

              <button
                type="button"
                onClick={() => setPanelOpen((v) => !v)}
                title={panelOpen ? 'Recolher painel lateral' : 'Abrir painel lateral'}
                aria-label={panelOpen ? 'Recolher painel lateral' : 'Abrir painel lateral'}
                className="w-7 h-7 rounded-[8px] inline-flex items-center justify-center text-[#0f1115]/55 dark:text-[#f2f4f7]/55 hover:text-[#0f1115] dark:hover:text-[#f2f4f7] hover:bg-[#0f1115]/5 dark:hover:bg-[#f2f4f7]/6 transition-colors cursor-pointer"
              >
                {panelOpen ? (
                  <PanelRightClose className="w-3.5 h-3.5" />
                ) : (
                  <PanelRightOpen className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </header>

          {/* Área principal de leitura e conversa */}
          <div className="relative flex-1 min-h-0 flex flex-col">
            <div
              ref={chatScrollRef}
              onScroll={handleChatScroll}
              className="flex-1 overflow-y-auto px-5 sm:px-8 pt-6 pb-8"
            >
              <div className="max-w-[740px] mx-auto space-y-6">
                {/* Título da tarefa + projeto + participantes */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span
                        className={`mt-2 w-2.5 h-2.5 rounded-full shrink-0 ${statusMeta.dotClass}`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <h1 className="text-[20px] sm:text-[21px] font-semibold tracking-[-0.02em] text-[#0f1115] dark:text-[#f2f4f7] leading-snug">
                          {task.titulo}
                          <span className="ml-2.5 text-[14px] font-normal text-[#0f1115]/40 dark:text-[#f2f4f7]/40 tabular-nums">
                            {task.codigo}
                          </span>
                        </h1>
                      </div>
                    </div>

                    {assignee?.tipo === 'agente' && (
                      <button
                        type="button"
                        onClick={() => toggleTaskExecution(task.id)}
                        className={`h-7 px-2.5 rounded-[8px] text-[11.5px] font-medium inline-flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                          task.execucaoAtiva
                            ? 'bg-[#163744]/10 text-[#163744] dark:bg-[#9fdce6]/14 dark:text-[#9fdce6]'
                            : 'text-[#0f1115]/52 dark:text-[#f2f4f7]/52 hover:bg-[#0f1115]/5 dark:hover:bg-[#f2f4f7]/6'
                        }`}
                      >
                        {task.execucaoAtiva ? (
                          <>
                            <Pause className="w-3 h-3" />
                            <span>Ao vivo</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3" />
                            <span>Rodar</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pl-5 text-[12px] text-[#0f1115]/56 dark:text-[#f2f4f7]/56">
                    {project && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProjectId(project.id);
                          setActiveSection('projetos');
                        }}
                        className="inline-flex items-center gap-1.5 hover:text-[#163744] dark:hover:text-[#9fdce6] transition-colors cursor-pointer"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-[#0f1115]/40 dark:text-[#f2f4f7]/40" />
                        <span>{client && !client.isInterno ? `${client.nome} · ` : ''}{project.nome}</span>
                      </button>
                    )}

                    <div className="flex items-center -space-x-1.5">
                      {participants.map((p) =>
                        p ? (
                          <div
                            key={p.id}
                            className="ring-2 ring-[#f2f4f7] dark:ring-[#0f1115] rounded-[8px]"
                          >
                            <MemberAvatar member={p} size="xs" />
                          </div>
                        ) : null
                      )}
                    </div>

                    <StatusIndicator
                      label={statusMeta.label}
                      dotClass={statusMeta.dotClass}
                      textClass={statusMeta.textClass}
                      live={isLive}
                    />
                  </div>
                </div>

                {/* 1. O briefing vem primeiro, limpo direto na folha */}
                <section aria-label="Briefing da tarefa" className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h2 className="text-[15.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                        Pedido de {creator?.nome.split(' ')[0] ?? 'Lucas'}
                      </h2>
                      {creator?.tipo === 'agente' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[7px] bg-[#163744]/8 dark:bg-[#9fdce6]/12 text-[11px] font-medium text-[#163744] dark:text-[#9fdce6]">
                          <MemberAvatar member={creator} size="xs" />
                          <span>{creator.nome}</span>
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setBriefingDraft(task.briefing);
                        setEditingBriefing((v) => !v);
                      }}
                      className="text-[11.5px] font-medium text-[#0f1115]/46 dark:text-[#f2f4f7]/46 hover:text-[#163744] dark:hover:text-[#9fdce6] inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{editingBriefing ? 'Cancelar' : 'Editar briefing'}</span>
                    </button>
                  </div>

                  {editingBriefing ? (
                    <form onSubmit={handleSaveBriefing} className="space-y-2">
                      <textarea
                        rows={6}
                        value={briefingDraft}
                        onChange={(e) => setBriefingDraft(e.target.value)}
                        className="eagle-input w-full p-3.5 text-[13.5px] leading-relaxed"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingBriefing(false)}
                          className="eagle-btn-secondary h-7.5 px-3 text-[12px] cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="eagle-btn-primary h-7.5 px-3 text-[12px] font-medium cursor-pointer"
                        >
                          Salvar briefing
                        </button>
                      </div>
                    </form>
                  ) : (
                    <RichTextBlock content={task.briefing} collapseThreshold={230} />
                  )}
                </section>

                {/* Linha divisória discreta separando o briefing da conversa */}
                <div className="border-t border-[#0f1115]/7 dark:border-[#f2f4f7]/7" />

                {/* 2. Fluxo cronológico da conversa */}
                {task.mensagens.length === 0 ? (
                  <p className="py-6 text-[13px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                    Aguardando primeira atualização de {assignee?.nome ?? 'quem está na tarefa'}.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {task.mensagens.map((msg) => {
                      if (msg.tipo === 'sistema') {
                        return (
                          <div
                            key={msg.id}
                            className="flex items-center gap-3 text-[11px] text-[#0f1115]/44 dark:text-[#f2f4f7]/44"
                          >
                            <span className="tabular-nums shrink-0">{msg.horario}</span>
                            <span className="leading-snug">{msg.texto}</span>
                            <span className="flex-1 h-px bg-[#0f1115]/7 dark:bg-[#f2f4f7]/7" />
                          </div>
                        );
                      }

                      const sender = getMember(msg.remetenteId);
                      const isLucas = msg.remetenteId === 'mem-lucas';
                      const isAgent = sender?.tipo === 'agente';
                      const attachedArtifact = msg.artefatoId
                        ? task.artefatos.find((a) => a.id === msg.artefatoId)
                        : undefined;
                      const linkedDecision = msg.decisaoId
                        ? state.decisions.find((d) => d.id === msg.decisaoId)
                        : undefined;

                      if (isLucas) {
                        return (
                          <div key={msg.id} className="flex flex-col items-end space-y-1">
                            <div className="max-w-[78%] rounded-[16px] px-4 py-3 bg-[#163744] text-[#f2f4f7] dark:bg-[#1b3440] dark:text-[#f2f4f7] text-[13.5px] leading-relaxed shadow-[0_1px_2px_rgba(15,17,21,0.08)]">
                              <p className="whitespace-pre-wrap">{msg.texto}</p>
                              {msg.anexosNomes && msg.anexosNomes.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {msg.anexosNomes.map((fileName) => (
                                    <span
                                      key={fileName}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-white/12 text-[11px]"
                                    >
                                      <FileText className="w-3 h-3" />
                                      <span>{fileName}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className="text-[11px] text-[#0f1115]/40 dark:text-[#f2f4f7]/40 tabular-nums pr-1">
                              {msg.horario}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div key={msg.id} className="space-y-2">
                          <div className="flex items-center gap-2 text-[12px]">
                            <MemberAvatar member={sender} size="xs" showOperationalRing />
                            <span className="font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                              {sender?.nome ?? 'Equipe'}
                            </span>
                            {sender?.cargo && (
                              <span className="text-[#0f1115]/44 dark:text-[#f2f4f7]/44">
                                · {sender.cargo}
                              </span>
                            )}
                            {msg.modeloIA && (
                              <span className="text-[11px] text-[#0f1115]/38 dark:text-[#f2f4f7]/38">
                                · {msg.modeloIA}
                              </span>
                            )}
                            <span className="text-[11px] text-[#0f1115]/38 dark:text-[#f2f4f7]/38 tabular-nums ml-auto">
                              {msg.horario}
                            </span>
                          </div>

                          {msg.resumoRodada && (
                            <div className="text-[11.5px] font-medium text-[#163744] dark:text-[#9fdce6]">
                              {msg.resumoRodada}
                            </div>
                          )}

                          <RichTextBlock content={msg.texto} collapseThreshold={280} />

                          {/* Cartão compacto de artefato produzido (estilo miniatura limpa) */}
                          {attachedArtifact && (
                            <div className="pt-1 flex flex-wrap gap-3">
                              <div className="eagle-card w-[210px] overflow-hidden">
                                {attachedArtifact.previewUrl ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewArtifact({
                                        artifact: attachedArtifact,
                                        taskId: task.id,
                                      })
                                    }
                                    className="block w-full h-24 overflow-hidden cursor-pointer group"
                                  >
                                    <img
                                      src={attachedArtifact.previewUrl}
                                      alt={attachedArtifact.titulo}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                                    />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openExtraTab({
                                        id: `art-${attachedArtifact.id}`,
                                        kind: 'artifact',
                                        title: attachedArtifact.titulo.slice(0, 18),
                                        targetId: attachedArtifact.id,
                                      })
                                    }
                                    className="w-full h-20 bg-[#ebeff3]/65 dark:bg-[#1a1f28] flex items-center justify-center text-[#163744] dark:text-[#9fdce6] cursor-pointer"
                                  >
                                    <FileText className="w-5 h-5" />
                                  </button>
                                )}
                                <div className="p-2.5 space-y-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openExtraTab({
                                        id: `art-${attachedArtifact.id}`,
                                        kind: 'artifact',
                                        title: attachedArtifact.titulo.slice(0, 18),
                                        targetId: attachedArtifact.id,
                                      })
                                    }
                                    className="block w-full text-left text-[12px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate hover:text-[#163744] dark:hover:text-[#9fdce6] cursor-pointer"
                                  >
                                    {attachedArtifact.titulo}
                                  </button>
                                  <div className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 tabular-nums">
                                    {attachedArtifact.versao} · {attachedArtifact.tamanho}
                                  </div>
                                  <div className="flex items-center justify-between gap-1 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        approveArtifact(
                                          task.id,
                                          attachedArtifact.id,
                                          !attachedArtifact.aprovado
                                        )
                                      }
                                      className={`px-2 py-0.5 rounded-[6px] text-[10.5px] font-medium cursor-pointer ${
                                        attachedArtifact.aprovado
                                          ? 'bg-[#15803d]/12 text-[#166534] dark:bg-[#4ade80]/18 dark:text-[#4ade80]'
                                          : 'bg-[#163744]/8 text-[#163744] dark:bg-[#9fdce6]/14 dark:text-[#9fdce6]'
                                      }`}
                                    >
                                      {attachedArtifact.aprovado ? 'Aprovado' : 'Aprovar'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openExtraTab({
                                          id: `art-${attachedArtifact.id}`,
                                          kind: 'artifact',
                                          title: attachedArtifact.titulo.slice(0, 18),
                                          targetId: attachedArtifact.id,
                                        })
                                      }
                                      className="text-[11px] font-medium text-[#0f1115]/52 dark:text-[#f2f4f7]/52 hover:text-[#163744] dark:hover:text-[#9fdce6] cursor-pointer"
                                    >
                                      Abrir aba
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Pedido com opções clicáveis */}
                          {msg.opcoesResposta && msg.opcoesResposta.length > 0 && (
                            <div className="eagle-card p-3.5 max-w-lg bg-white dark:bg-[#161b23]">
                              <div className="text-[11.5px] font-semibold text-[#163744] dark:text-[#9fdce6] mb-2">
                                {msg.opcaoEscolhida
                                  ? 'Resposta registrada'
                                  : 'Aguardando sua escolha para continuar'}
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {msg.opcoesResposta.map((op) => {
                                  const chosen = msg.opcaoEscolhida === op;
                                  return (
                                    <button
                                      key={op}
                                      type="button"
                                      disabled={Boolean(msg.opcaoEscolhida)}
                                      onClick={() => answerMessageOptions(task.id, msg.id, op)}
                                      className={`h-7.5 px-3 rounded-[8px] text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors ${
                                        chosen
                                          ? 'bg-[#163744] text-[#f2f4f7] dark:bg-[#9fdce6] dark:text-[#0f1115]'
                                          : msg.opcaoEscolhida
                                            ? 'eagle-btn-secondary opacity-45'
                                            : 'eagle-btn-secondary hover:border-[#163744]/40 dark:hover:border-[#9fdce6]/45 cursor-pointer'
                                      }`}
                                    >
                                      {chosen && <Check className="w-3 h-3" />}
                                      <span>{op}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Decisão pendente vinculada */}
                          {linkedDecision &&
                            linkedDecision.status === 'pendente' &&
                            !msg.opcoesResposta?.length && (
                              <div className="eagle-card p-3.5 max-w-md bg-white dark:bg-[#161b23]">
                                <div className="text-[11px] font-semibold text-[#163744] dark:text-[#9fdce6] mb-1">
                                  Precisa do seu sim ou não
                                </div>
                                <div className="text-[13px] font-medium text-[#0f1115] dark:text-[#f2f4f7]">
                                  {linkedDecision.pergunta}
                                </div>
                                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => resolveDecision(linkedDecision.id, 'aprovada')}
                                    className="eagle-btn-primary h-7.5 px-3 text-[12px] font-medium cursor-pointer"
                                  >
                                    {linkedDecision.acaoPrimaria}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => resolveDecision(linkedDecision.id, 'ajuste')}
                                    className="eagle-btn-secondary h-7.5 px-3 text-[12px] font-medium cursor-pointer"
                                  >
                                    {linkedDecision.acaoSecundaria}
                                  </button>
                                </div>
                              </div>
                            )}

                          {/* Ações rápidas nas mensagens do agente */}
                          {isAgent && (
                            <div className="flex items-center gap-1 pt-0.5">
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(msg.id, msg.texto)}
                                className="h-6 px-1.5 rounded-[6px] text-[11px] text-[#0f1115]/46 dark:text-[#f2f4f7]/46 hover:text-[#0f1115] dark:hover:text-[#f2f4f7] hover:bg-[#0f1115]/5 dark:hover:bg-[#f2f4f7]/6 inline-flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                {copiedMsgId === msg.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-[#15803d] dark:text-[#4ade80]" />
                                    <span>Copiado</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copiar</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => reactToMessage(task.id, msg.id, 'gostei')}
                                aria-label="Gostei"
                                className={`h-6 px-1.5 rounded-[6px] text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer ${
                                  msg.reacao === 'gostei'
                                    ? 'text-[#163744] dark:text-[#9fdce6] bg-[#163744]/10 dark:bg-[#9fdce6]/14 font-medium'
                                    : 'text-[#0f1115]/46 dark:text-[#f2f4f7]/46 hover:text-[#0f1115] dark:hover:text-[#f2f4f7] hover:bg-[#0f1115]/5 dark:hover:bg-[#f2f4f7]/6'
                                }`}
                              >
                                <ThumbsUp className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                onClick={() => reactToMessage(task.id, msg.id, 'nao_gostei')}
                                aria-label="Não gostei"
                                className={`h-6 px-1.5 rounded-[6px] text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer ${
                                  msg.reacao === 'nao_gostei'
                                    ? 'text-[#b91c1c] dark:text-[#f87171] bg-[#b91c1c]/10 dark:bg-[#f87171]/14 font-medium'
                                    : 'text-[#0f1115]/46 dark:text-[#f2f4f7]/46 hover:text-[#0f1115] dark:hover:text-[#f2f4f7] hover:bg-[#0f1115]/5 dark:hover:bg-[#f2f4f7]/6'
                                }`}
                              >
                                <ThumbsDown className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Sinal ao vivo de execução em andamento */}
                {(task.execucaoAtiva || isTyping) && (
                  <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-[10px] bg-white/80 dark:bg-[#15181f] border border-[#163744]/14 dark:border-[#9fdce6]/20">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="relative inline-flex w-2 h-2 shrink-0">
                        <span className="eagle-live-halo absolute inset-0 rounded-full bg-[#163744] dark:bg-[#9fdce6]" />
                        <span className="relative w-1.5 h-1.5 rounded-full bg-[#163744] dark:bg-[#9fdce6] m-auto" />
                      </span>
                      <span className="text-[12px] font-medium text-[#163744] dark:text-[#9fdce6] truncate">
                        {isTyping
                          ? `${assignee?.nome ?? 'Agente'} está preparando a resposta...`
                          : `${assignee?.nome ?? 'Agente'} trabalhando ao vivo${
                              activeExecution ? ` · #${activeExecution.numero}` : ''
                            }`}
                      </span>
                    </div>
                    {task.execucaoAtiva && (
                      <button
                        type="button"
                        onClick={() => interruptAgentAndFlushQueue(task.id)}
                        className="text-[11.5px] font-medium text-[#0f1115]/68 dark:text-[#f2f4f7]/68 hover:text-[#163744] dark:hover:text-[#9fdce6] shrink-0 cursor-pointer"
                      >
                        Interromper
                      </button>
                    )}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {showScrollBottom && (
              <button
                type="button"
                onClick={() =>
                  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
                }
                aria-label="Ir para o fim da conversa"
                className="absolute bottom-28 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white dark:bg-[#1a1f28] border border-[#0f1115]/12 dark:border-[#f2f4f7]/14 shadow-[0_4px_12px_rgba(15,17,21,0.12)] inline-flex items-center justify-center text-[#0f1115]/70 dark:text-[#f2f4f7]/70 hover:text-[#163744] dark:hover:text-[#9fdce6] cursor-pointer"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Rodapé fixo: Fila (se houver) + Caixa de mensagem unificada */}
            <div className="shrink-0 px-4 sm:px-8 pb-4 pt-1">
              <div className="max-w-[740px] mx-auto space-y-2">
                {task.filaMensagens.length > 0 && (
                  <div className="rounded-[12px] px-3 py-2 bg-[#ebeff3]/85 dark:bg-[#171b23] border border-[#0f1115]/8 dark:border-[#f2f4f7]/9 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60">
                        Na fila ({task.filaMensagens.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => interruptAgentAndFlushQueue(task.id)}
                        className="font-medium text-[#163744] dark:text-[#9fdce6] hover:underline cursor-pointer"
                      >
                        Interromper agente e ler agora
                      </button>
                    </div>

                    {task.filaMensagens.map((item, idx) => {
                      const isEditingThis = editingQueueId === item.id;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 text-[12px] py-1 px-2 rounded-[8px] bg-white dark:bg-[#12151c]"
                        >
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded-[5px] bg-[#163744]/10 text-[#163744] dark:bg-[#9fdce6]/14 dark:text-[#9fdce6] text-[10.5px] font-medium shrink-0">
                              na fila
                            </span>
                            {isEditingThis ? (
                              <input
                                type="text"
                                value={editingQueueText}
                                onChange={(e) => setEditingQueueText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    editQueuedMessage(task.id, item.id, editingQueueText);
                                    setEditingQueueId(null);
                                  }
                                }}
                                autoFocus
                                className="eagle-input flex-1 h-6.5 px-2 text-[12px]"
                              />
                            ) : (
                              <span className="truncate text-[#0f1115]/82 dark:text-[#f2f4f7]/82">
                                {item.texto}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => reorderQueuedMessage(task.id, item.id, 'up')}
                              aria-label="Mover para cima"
                              className="w-5.5 h-5.5 rounded-[5px] inline-flex items-center justify-center text-[#0f1115]/48 dark:text-[#f2f4f7]/48 hover:bg-[#0f1115]/6 disabled:opacity-25 cursor-pointer"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === task.filaMensagens.length - 1}
                              onClick={() => reorderQueuedMessage(task.id, item.id, 'down')}
                              aria-label="Mover para baixo"
                              className="w-5.5 h-5.5 rounded-[5px] inline-flex items-center justify-center text-[#0f1115]/48 dark:text-[#f2f4f7]/48 hover:bg-[#0f1115]/6 disabled:opacity-25 cursor-pointer"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (isEditingThis) {
                                  editQueuedMessage(task.id, item.id, editingQueueText);
                                  setEditingQueueId(null);
                                } else {
                                  setEditingQueueId(item.id);
                                  setEditingQueueText(item.texto);
                                }
                              }}
                              aria-label="Editar"
                              className="w-5.5 h-5.5 rounded-[5px] inline-flex items-center justify-center text-[#0f1115]/48 dark:text-[#f2f4f7]/48 hover:bg-[#0f1115]/6 cursor-pointer"
                            >
                              {isEditingThis ? (
                                <Check className="w-3 h-3 text-[#15803d]" />
                              ) : (
                                <Edit3 className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeQueuedMessage(task.id, item.id)}
                              aria-label="Apagar"
                              className="w-5.5 h-5.5 rounded-[5px] inline-flex items-center justify-center text-[#0f1115]/48 dark:text-[#f2f4f7]/48 hover:text-[#b91c1c] cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <form
                  onSubmit={handleSend}
                  className="rounded-[18px] bg-white dark:bg-[#15181f] border border-[#0f1115]/9 dark:border-[#f2f4f7]/10 shadow-[0_2px_10px_rgba(15,17,21,0.04)] px-3.5 pt-3 pb-2.5 space-y-2"
                >
                  {attachedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {attachedFiles.map((name, idx) => (
                        <span
                          key={`${name}-${idx}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[7px] bg-[#ebeff3] dark:bg-[#1e2430] text-[11.5px] text-[#0f1115]/80 dark:text-[#f2f4f7]/80"
                        >
                          <FileText className="w-3 h-3" />
                          <span>{name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="cursor-pointer opacity-60 hover:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <textarea
                    rows={2}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={
                      task.execucaoAtiva
                        ? `Agente ocupado — enviar para a fila de ${
                            selectedComposerAgent?.nome ?? 'agente'
                          }...`
                        : `Mensagem para ${
                            selectedComposerAgent?.nome ?? 'responsável'
                          } — descreva o que você quer que seja feito...`
                    }
                    className="w-full bg-transparent text-[13.5px] leading-relaxed text-[#0f1115] dark:text-[#f2f4f7] placeholder:text-[#0f1115]/40 dark:placeholder:text-[#f2f4f7]/40 resize-none focus:outline-none focus:shadow-none"
                  />

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileAttach}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        title="Anexar arquivo"
                        aria-label="Anexar arquivo"
                        className="w-7.5 h-7.5 rounded-full inline-flex items-center justify-center text-[#0f1115]/55 dark:text-[#f2f4f7]/55 hover:bg-[#0f1115]/5 dark:hover:bg-[#f2f4f7]/6 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f2f4f7] dark:bg-[#1b2029] border border-[#0f1115]/7 dark:border-[#f2f4f7]/8 pl-2 pr-2.5 h-8">
                        <MemberAvatar member={selectedComposerAgent} size="xs" />
                        <select
                          value={targetAgentId}
                          onChange={(e) => setTargetAgentId(e.target.value)}
                          aria-label="Agente destinatário"
                          className="bg-transparent text-[12px] font-medium text-[#0f1115]/85 dark:text-[#f2f4f7]/85 focus:outline-none focus:shadow-none cursor-pointer max-w-[100px] truncate"
                        >
                          {agentsList.map((ag) => (
                            <option key={ag.id} value={ag.id} className="bg-white dark:bg-[#15181f]">
                              {ag.nome}
                            </option>
                          ))}
                        </select>
                        <span className="text-[#0f1115]/30 dark:text-[#f2f4f7]/30">·</span>
                        <select
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          aria-label="Modelo de IA"
                          className="bg-transparent text-[12px] text-[#0f1115]/60 dark:text-[#f2f4f7]/60 focus:outline-none focus:shadow-none cursor-pointer max-w-[130px] truncate"
                        >
                          {AI_MODEL_OPTIONS.map((mod) => (
                            <option key={mod} value={mod} className="bg-white dark:bg-[#15181f]">
                              {mod}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={!draft.trim()}
                        aria-label={task.execucaoAtiva ? 'Enfileirar mensagem' : 'Enviar mensagem'}
                        title={task.execucaoAtiva ? 'Enfileirar mensagem' : 'Enviar mensagem'}
                        className="w-8 h-8 rounded-full bg-[#0f1115] text-[#f2f4f7] dark:bg-[#9fdce6] dark:text-[#0f1115] inline-flex items-center justify-center disabled:opacity-28 transition-opacity cursor-pointer shrink-0"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Espaço da mesa / divisor arrastável entre a folha da tarefa e a folha de propriedades */}
      {panelOpen && !panelFullscreen && isSideBySide && (
        <div
          onPointerDown={() => setIsDraggingSplit(true)}
          role="separator"
          aria-orientation="vertical"
          aria-label="Ajustar largura do painel de propriedades"
          className="w-3 shrink-0 cursor-col-resize flex items-center justify-center group"
        >
          <span className="w-0.5 h-10 rounded-full bg-transparent group-hover:bg-[#163744]/35 dark:group-hover:bg-[#9fdce6]/40 transition-colors" />
        </div>
      )}

      {/* FOLHA INDEPENDENTE À DIREITA (FORA DO CONTAINER DA TAREFA) */}
      {panelOpen && (
        <aside
          style={
            panelFullscreen
              ? undefined
              : isSideBySide
                ? { width: `${effectivePanelWidth}px` }
                : undefined
          }
          className={`eagle-sheet flex flex-col min-h-0 overflow-hidden ${
            panelFullscreen
              ? 'flex-1 w-full h-full'
              : isSideBySide
                ? 'shrink-0 h-full'
                : 'w-full h-[46%] min-h-[220px] shrink-0'
          }`}
        >
          {/* Barra de abas limpa + abrir nova aba + expandir/fechar */}
          <div className="relative flex items-center justify-between gap-1 px-2.5 pt-1.5 border-b border-[#0f1115]/7 dark:border-[#f2f4f7]/7 shrink-0">
            <div className="flex items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-w-0">
              {FIXED_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setTabPickerOpen(false);
                    }}
                    className={`relative px-1.5 py-2.5 text-[11.5px] font-medium whitespace-nowrap shrink-0 inline-flex items-center gap-1 transition-colors cursor-pointer ${
                      isActive
                        ? 'text-[#0f1115] dark:text-[#f2f4f7]'
                        : 'text-[#0f1115]/48 dark:text-[#f2f4f7]/48 hover:text-[#0f1115]/80 dark:hover:text-[#f2f4f7]/80'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="text-[10px] tabular-nums opacity-55">
                        {tab.count}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute left-1.5 right-1.5 bottom-0 h-[2px] rounded-full bg-[#0f1115] dark:bg-[#9fdce6]" />
                    )}
                  </button>
                );
              })}

              {extraTabs.map((et) => {
                const isActive = activeTab === et.id;
                return (
                  <div
                    key={et.id}
                    className={`relative inline-flex items-center gap-1 pl-1.5 pr-1 py-2.5 text-[11.5px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                      isActive
                        ? 'text-[#0f1115] dark:text-[#f2f4f7]'
                        : 'text-[#0f1115]/48 dark:text-[#f2f4f7]/48 hover:text-[#0f1115]/80'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab(et.id);
                        setTabPickerOpen(false);
                      }}
                      className="truncate max-w-[90px] cursor-pointer"
                    >
                      {et.title}
                    </button>
                    <button
                      type="button"
                      onClick={() => closeExtraTab(et.id)}
                      aria-label={`Fechar aba ${et.title}`}
                      className="w-4 h-4 rounded-[4px] inline-flex items-center justify-center hover:bg-[#0f1115]/8 dark:hover:bg-[#f2f4f7]/10 cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                    {isActive && (
                      <span className="absolute left-2 right-1 bottom-0 h-[2px] rounded-full bg-[#0f1115] dark:bg-[#9fdce6]" />
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => setTabPickerOpen((v) => !v)}
                title="Abrir arquivo, execução ou tarefa em nova aba"
                aria-label="Abrir nova aba"
                className={`w-6 h-6 rounded-[6px] inline-flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                  tabPickerOpen
                    ? 'bg-[#0f1115]/7 dark:bg-[#f2f4f7]/9 text-[#0f1115] dark:text-[#f2f4f7]'
                    : 'text-[#0f1115]/42 dark:text-[#f2f4f7]/42 hover:text-[#0f1115] dark:hover:text-[#f2f4f7] hover:bg-[#0f1115]/5 dark:hover:bg-[#f2f4f7]/6'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-0.5 pb-1 shrink-0">
              <button
                type="button"
                onClick={() => setPanelFullscreen((v) => !v)}
                title={panelFullscreen ? 'Voltar para conversa' : 'Expandir painel em tela cheia'}
                aria-label={panelFullscreen ? 'Restaurar divisão' : 'Expandir painel'}
                className="w-6.5 h-6.5 rounded-[7px] inline-flex items-center justify-center text-[#0f1115]/48 dark:text-[#f2f4f7]/48 hover:bg-[#0f1115]/5 dark:hover:bg-[#f2f4f7]/6 cursor-pointer"
              >
                {panelFullscreen ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPanelFullscreen(false);
                  setPanelOpen(false);
                }}
                title="Recolher painel"
                aria-label="Recolher painel"
                className="w-6.5 h-6.5 rounded-[7px] inline-flex items-center justify-center text-[#0f1115]/48 dark:text-[#f2f4f7]/48 hover:bg-[#0f1115]/5 dark:hover:bg-[#f2f4f7]/6 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {tabPickerOpen && (
              <div className="absolute left-3 right-3 top-full mt-1 z-30 rounded-[12px] bg-white dark:bg-[#1a1f28] border border-[#0f1115]/10 dark:border-[#f2f4f7]/12 shadow-[0_12px_28px_rgba(15,17,21,0.12)] p-2 space-y-2 max-h-72 overflow-y-auto">
                {task.artefatos.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#0f1115]/42 dark:text-[#f2f4f7]/42">
                      Artefatos desta tarefa
                    </div>
                    {task.artefatos.map((art) => (
                      <button
                        key={art.id}
                        type="button"
                        onClick={() => {
                          openExtraTab({
                            id: `art-${art.id}`,
                            kind: 'artifact',
                            title: art.titulo.slice(0, 18),
                            targetId: art.id,
                          });
                          setTabPickerOpen(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-[7px] text-[12px] text-[#0f1115]/82 dark:text-[#f2f4f7]/82 hover:bg-[#f2f4f7] dark:hover:bg-[#222834] flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <span className="truncate">{art.titulo}</span>
                        <span className="text-[11px] text-[#0f1115]/42 dark:text-[#f2f4f7]/42 shrink-0">
                          {art.versao}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {task.execucoes.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#0f1115]/42 dark:text-[#f2f4f7]/42">
                      Execuções
                    </div>
                    {task.execucoes.map((exec) => (
                      <button
                        key={exec.id}
                        type="button"
                        onClick={() => {
                          openExtraTab({
                            id: `exec-${exec.id}`,
                            kind: 'execution',
                            title: `Execução #${exec.numero}`,
                            targetId: exec.id,
                          });
                          setTabPickerOpen(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-[7px] text-[12px] text-[#0f1115]/82 dark:text-[#f2f4f7]/82 hover:bg-[#f2f4f7] dark:hover:bg-[#222834] flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <span>Execução #{exec.numero}</span>
                        <span className="text-[11px] text-[#0f1115]/42 dark:text-[#f2f4f7]/42 capitalize">
                          {exec.estado}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {otherTasks.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#0f1115]/42 dark:text-[#f2f4f7]/42">
                      Outras tarefas
                    </div>
                    {otherTasks.slice(0, 5).map((ot) => (
                      <button
                        key={ot.id}
                        type="button"
                        onClick={() => {
                          openExtraTab({
                            id: `task-${ot.id}`,
                            kind: 'task',
                            title: ot.codigo,
                            targetId: ot.id,
                          });
                          setTabPickerOpen(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-[7px] text-[12px] text-[#0f1115]/82 dark:text-[#f2f4f7]/82 hover:bg-[#f2f4f7] dark:hover:bg-[#222834] flex items-center gap-2 cursor-pointer"
                      >
                        <span className="text-[11px] text-[#0f1115]/45 dark:text-[#f2f4f7]/45 tabular-nums shrink-0">
                          {ot.codigo}
                        </span>
                        <span className="truncate">{ot.titulo}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Conteúdo da aba selecionada */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
            {/* ABA 1: PROPRIEDADES — Ficha única alinhada e sem caixas pesadas */}
            {activeTab === 'propriedades' && (
              <div>
                {/* Bloco 1: O essencial */}
                <div className="space-y-0.5">
                  <PropRow label="Status">
                    <InlineSelect
                      value={task.estado}
                      onChange={(val) => updateTaskStatus(task.id, val as TaskStatus)}
                      ariaLabel="Status da tarefa"
                      leading={
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${statusMeta.dotClass}`}
                          aria-hidden="true"
                        />
                      }
                    >
                      {ALL_STATUSES.map((st) => (
                        <option key={st} value={st} className="bg-white dark:bg-[#15181f]">
                          {TASK_STATUS_META[st].label}
                        </option>
                      ))}
                    </InlineSelect>
                  </PropRow>

                  <PropRow label="Responsável">
                    <InlineSelect
                      value={task.responsavelId}
                      onChange={(val) => updateTaskAssignee(task.id, val)}
                      ariaLabel="Responsável"
                      leading={<MemberAvatar member={assignee} size="xs" />}
                    >
                      {state.members.map((m) => (
                        <option key={m.id} value={m.id} className="bg-white dark:bg-[#15181f]">
                          {m.nome}
                        </option>
                      ))}
                    </InlineSelect>
                  </PropRow>

                  <PropRow label="Modelo">
                    <InlineSelect
                      value={task.modeloPreferido}
                      onChange={(val) =>
                        updateTaskFields(task.id, { modeloPreferido: val })
                      }
                      ariaLabel="Modelo de IA"
                    >
                      {AI_MODEL_OPTIONS.map((mod) => (
                        <option key={mod} value={mod} className="bg-white dark:bg-[#15181f]">
                          {mod}
                        </option>
                      ))}
                    </InlineSelect>
                  </PropRow>

                  <PropRow label="Projeto">
                    <InlineSelect
                      value={task.projetoId}
                      onChange={(val) => updateTaskFields(task.id, { projetoId: val })}
                      ariaLabel="Projeto"
                      leading={
                        <FolderOpen className="w-3.5 h-3.5 text-[#0f1115]/42 dark:text-[#f2f4f7]/42 shrink-0" />
                      }
                    >
                      {state.projects.map((p) => (
                        <option key={p.id} value={p.id} className="bg-white dark:bg-[#15181f]">
                          {p.nome}
                        </option>
                      ))}
                    </InlineSelect>
                  </PropRow>

                  <PropRow label="Etiquetas" alignStart={task.etiquetas.length > 0 || addingTag}>
                    <div className="flex flex-wrap items-center gap-1">
                      {task.etiquetas.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] bg-[#ebeff3] dark:bg-[#1e2430] text-[11px] font-medium text-[#0f1115]/78 dark:text-[#f2f4f7]/78"
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateTaskFields(task.id, {
                                etiquetas: task.etiquetas.filter((e) => e !== tag),
                              })
                            }
                            className="opacity-50 hover:opacity-100 cursor-pointer"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                      {addingTag ? (
                        <form onSubmit={handleAddTag}>
                          <input
                            type="text"
                            autoFocus
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onBlur={() => {
                              if (!newTag.trim()) setAddingTag(false);
                            }}
                            placeholder="Etiqueta..."
                            className="eagle-input h-6 w-24 px-1.5 text-[11.5px]"
                          />
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAddingTag(true)}
                          className={`text-[12px] font-medium px-1.5 -ml-1.5 h-[24px] rounded-[6px] hover:bg-[#0f1115]/4 dark:hover:bg-[#f2f4f7]/6 cursor-pointer ${
                            task.etiquetas.length === 0
                              ? 'text-[#0f1115]/40 dark:text-[#f2f4f7]/40'
                              : 'text-[#163744] dark:text-[#9fdce6]'
                          }`}
                        >
                          {task.etiquetas.length === 0 ? 'Nenhum +' : '+'}
                        </button>
                      )}
                    </div>
                  </PropRow>
                </div>

                <div className="my-2.5 border-t border-[#0f1115]/7 dark:border-[#f2f4f7]/7" />

                {/* Bloco 2: Relações */}
                <div className="space-y-0.5">
                  <PropRow label="Tarefa pai">
                    {parentTask ? (
                      <div className="inline-flex items-center gap-1 min-w-0">
                        <button
                          type="button"
                          onClick={() =>
                            openExtraTab({
                              id: `task-${parentTask.id}`,
                              kind: 'task',
                              title: parentTask.codigo,
                              targetId: parentTask.id,
                            })
                          }
                          className="text-[12px] font-medium text-[#163744] dark:text-[#9fdce6] hover:underline truncate cursor-pointer"
                        >
                          {parentTask.codigo} · {parentTask.titulo}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateTaskFields(task.id, { tarefaPaiId: null })}
                          className="text-[#0f1115]/38 hover:text-[#0f1115] dark:hover:text-[#f2f4f7] shrink-0 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <InlineSelect
                        value=""
                        muted
                        onChange={(val) =>
                          updateTaskFields(task.id, { tarefaPaiId: val || null })
                        }
                        ariaLabel="Tarefa pai"
                      >
                        <option value="" className="bg-white dark:bg-[#15181f]">
                          Nenhum
                        </option>
                        {otherTasks.map((ot) => (
                          <option key={ot.id} value={ot.id} className="bg-white dark:bg-[#15181f]">
                            {ot.codigo} · {ot.titulo}
                          </option>
                        ))}
                      </InlineSelect>
                    )}
                  </PropRow>

                  <PropRow label="Bloqueada por" alignStart={task.bloqueadaPorIds.length > 0}>
                    {task.bloqueadaPorIds.length === 0 ? (
                      <span className="text-[12px] text-[#0f1115]/38 dark:text-[#f2f4f7]/38">
                        Nenhum
                      </span>
                    ) : (
                      <div className="space-y-0.5 min-w-0">
                        {task.bloqueadaPorIds.map((bid) => {
                          const bt = getTask(bid);
                          if (!bt) return null;
                          return (
                            <div key={bid} className="flex items-center gap-1 min-w-0">
                              <button
                                type="button"
                                onClick={() =>
                                  openExtraTab({
                                    id: `task-${bt.id}`,
                                    kind: 'task',
                                    title: bt.codigo,
                                    targetId: bt.id,
                                  })
                                }
                                className="text-[12px] font-medium text-[#b91c1c] dark:text-[#f87171] hover:underline truncate cursor-pointer"
                              >
                                {bt.codigo} · {bt.titulo}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </PropRow>

                  <PropRow label="Bloqueia" alignStart={task.bloqueiaIds.length > 0}>
                    {task.bloqueiaIds.length === 0 ? (
                      <span className="text-[12px] text-[#0f1115]/38 dark:text-[#f2f4f7]/38">
                        Nenhum
                      </span>
                    ) : (
                      <div className="space-y-0.5 min-w-0">
                        {task.bloqueiaIds.map((bid) => {
                          const bt = getTask(bid);
                          if (!bt) return null;
                          return (
                            <button
                              key={bid}
                              type="button"
                              onClick={() =>
                                openExtraTab({
                                  id: `task-${bt.id}`,
                                  kind: 'task',
                                  title: bt.codigo,
                                  targetId: bt.id,
                                })
                              }
                              className="block text-[12px] font-medium text-[#163744] dark:text-[#9fdce6] hover:underline truncate text-left cursor-pointer"
                            >
                              {bt.codigo} · {bt.titulo}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </PropRow>

                  <PropRow label="Subtarefas">
                    <button
                      type="button"
                      onClick={() => setActiveTab('subtarefas')}
                      className={`text-[12px] font-medium hover:underline tabular-nums cursor-pointer ${
                        task.subtarefas.length > 0
                          ? 'text-[#0f1115]/82 dark:text-[#f2f4f7]/82'
                          : 'text-[#0f1115]/38 dark:text-[#f2f4f7]/38'
                      }`}
                    >
                      {task.subtarefas.length > 0
                        ? `${completedSubtasks}/${task.subtarefas.length} concluídas`
                        : 'Nenhum'}
                    </button>
                  </PropRow>
                </div>

                <div className="my-2.5 border-t border-[#0f1115]/7 dark:border-[#f2f4f7]/7" />

                {/* Bloco 3: Quem participa */}
                <div className="space-y-0.5">
                  <PropRow label="Quem revisa">
                    <InlineSelect
                      value={task.revisorId}
                      onChange={(val) => updateTaskReviewer(task.id, val)}
                      ariaLabel="Quem revisa"
                      leading={<MemberAvatar member={reviewer} size="xs" />}
                    >
                      {state.members.map((m) => (
                        <option key={m.id} value={m.id} className="bg-white dark:bg-[#15181f]">
                          {m.nome}
                        </option>
                      ))}
                    </InlineSelect>
                  </PropRow>

                  <PropRow label="Quem aprova">
                    <InlineSelect
                      value={task.aprovadorId}
                      onChange={(val) => updateTaskFields(task.id, { aprovadorId: val })}
                      ariaLabel="Quem aprova"
                      leading={<MemberAvatar member={approver} size="xs" />}
                    >
                      {state.members.map((m) => (
                        <option key={m.id} value={m.id} className="bg-white dark:bg-[#15181f]">
                          {m.nome}
                        </option>
                      ))}
                    </InlineSelect>
                  </PropRow>

                  <PropRow label="Acompanha" alignStart={task.observadoresIds.length > 0}>
                    <div className="flex flex-wrap items-center gap-1">
                      {task.observadoresIds.map((oid) => {
                        const obs = getMember(oid);
                        if (!obs) return null;
                        return (
                          <span
                            key={oid}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] bg-[#ebeff3] dark:bg-[#1e2430] text-[11px] font-medium"
                          >
                            <span>{obs.nome.split(' ')[0]}</span>
                            <button
                              type="button"
                              onClick={() =>
                                updateTaskFields(task.id, {
                                  observadoresIds: task.observadoresIds.filter(
                                    (x) => x !== oid
                                  ),
                                })
                              }
                              className="opacity-50 hover:opacity-100 cursor-pointer"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        );
                      })}
                      <InlineSelect
                        value=""
                        muted={task.observadoresIds.length === 0}
                        onChange={(id) => {
                          if (id && !task.observadoresIds.includes(id)) {
                            updateTaskFields(task.id, {
                              observadoresIds: [...task.observadoresIds, id],
                            });
                          }
                        }}
                        ariaLabel="Adicionar observador"
                      >
                        <option value="" className="bg-white dark:bg-[#15181f]">
                          {task.observadoresIds.length === 0 ? 'Nenhum' : '+'}
                        </option>
                        {state.members
                          .filter((m) => !task.observadoresIds.includes(m.id))
                          .map((m) => (
                            <option key={m.id} value={m.id} className="bg-white dark:bg-[#15181f]">
                              {m.nome}
                            </option>
                          ))}
                      </InlineSelect>
                    </div>
                  </PropRow>

                  <PropRow label="Vigilância">
                    <InlineSelect
                      value={task.vigilanteId ?? ''}
                      muted={!task.vigilanteId}
                      onChange={(val) =>
                        updateTaskFields(task.id, { vigilanteId: val || undefined })
                      }
                      ariaLabel="Vigilância"
                    >
                      <option value="" className="bg-white dark:bg-[#15181f]">
                        Nenhum
                      </option>
                      {state.members.map((m) => (
                        <option key={m.id} value={m.id} className="bg-white dark:bg-[#15181f]">
                          {m.nome}
                        </option>
                      ))}
                    </InlineSelect>
                  </PropRow>
                </div>

                <div className="my-2.5 border-t border-[#0f1115]/7 dark:border-[#f2f4f7]/7" />

                {/* Bloco 4: O trabalho */}
                <div className="space-y-0.5">
                  <PropRow label="Execução">
                    {activeExecution ? (
                      <button
                        type="button"
                        onClick={() =>
                          openExtraTab({
                            id: `exec-${activeExecution.id}`,
                            kind: 'execution',
                            title: `Execução #${activeExecution.numero}`,
                            targetId: activeExecution.id,
                          })
                        }
                        className="text-[12px] font-medium text-[#163744] dark:text-[#9fdce6] hover:underline tabular-nums truncate cursor-pointer"
                      >
                        {task.codigo} · #{activeExecution.numero}
                      </button>
                    ) : (
                      <span className="text-[12px] text-[#0f1115]/38 dark:text-[#f2f4f7]/38">
                        Nenhum
                      </span>
                    )}
                  </PropRow>

                  <PropRow label="Pasta">
                    {editingFolder ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          updateTaskFields(task.id, {
                            pastaArquivos: folderDraft.trim() || task.pastaArquivos,
                          });
                          setEditingFolder(false);
                        }}
                        className="flex items-center gap-1 w-full"
                      >
                        <input
                          type="text"
                          value={folderDraft}
                          onChange={(e) => setFolderDraft(e.target.value)}
                          autoFocus
                          onBlur={() => setEditingFolder(false)}
                          className="eagle-input flex-1 h-6.5 px-2 text-[11.5px]"
                        />
                      </form>
                    ) : (
                      <div className="flex items-center gap-1 min-w-0 w-full">
                        <button
                          type="button"
                          onClick={handleCopyPath}
                          title="Clique para copiar o caminho"
                          className="inline-flex items-center gap-1.5 text-[12px] text-[#0f1115]/72 dark:text-[#f2f4f7]/72 hover:text-[#163744] dark:hover:text-[#9fdce6] truncate cursor-pointer min-w-0"
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-[#0f1115]/40 dark:text-[#f2f4f7]/40 shrink-0" />
                          <span className="truncate">
                            {copiedPath ? 'Copiado!' : task.pastaArquivos}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingFolder(true)}
                          title="Editar pasta"
                          className="text-[#0f1115]/35 hover:text-[#0f1115] dark:hover:text-[#f2f4f7] shrink-0 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </PropRow>
                </div>

                <div className="my-2.5 border-t border-[#0f1115]/7 dark:border-[#f2f4f7]/7" />

                {/* Bloco 5: Datas e origem */}
                <div className="space-y-0.5">
                  <PropRow label="Origem">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MemberAvatar member={creator} size="xs" />
                      <span className="text-[12px] font-medium text-[#0f1115]/85 dark:text-[#f2f4f7]/85 truncate">
                        {creator?.nome ?? 'Lucas Rezende'}
                      </span>
                    </div>
                  </PropRow>

                  <PropRow label="Prazo">
                    <input
                      type="date"
                      value={task.prazo}
                      onChange={(e) =>
                        updateTaskFields(task.id, { prazo: e.target.value })
                      }
                      className="bg-transparent -ml-1.5 px-1.5 h-[26px] rounded-[7px] hover:bg-[#0f1115]/4 dark:hover:bg-[#f2f4f7]/6 text-[12px] font-medium text-[#0f1115]/82 dark:text-[#f2f4f7]/82 tabular-nums cursor-pointer focus:outline-none focus:shadow-none transition-colors"
                    />
                  </PropRow>

                  <PropRow label="Início">
                    <span className="text-[12px] tabular-nums text-[#0f1115]/68 dark:text-[#f2f4f7]/68">
                      {task.iniciadaEm || '—'}
                    </span>
                  </PropRow>

                  <PropRow label="Conclusão">
                    <span className="text-[12px] tabular-nums text-[#0f1115]/68 dark:text-[#f2f4f7]/68">
                      {task.concluidaEm || '—'}
                    </span>
                  </PropRow>

                  <PropRow label="Criada">
                    <span className="text-[12px] tabular-nums text-[#0f1115]/68 dark:text-[#f2f4f7]/68">
                      {task.criadaEm}
                    </span>
                  </PropRow>

                  <PropRow label="Atualizada">
                    <span className="text-[12px] tabular-nums text-[#0f1115]/68 dark:text-[#f2f4f7]/68">
                      {task.atualizadaEm}
                    </span>
                  </PropRow>
                </div>
              </div>
            )}

            {/* ABA 2: SUBTAREFAS */}
            {activeTab === 'subtarefas' && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55 tabular-nums">
                    {completedSubtasks} de {task.subtarefas.length} concluídas
                  </span>
                  <button
                    type="button"
                    onClick={() => setAddingSubtask((v) => !v)}
                    className="text-[12px] font-medium text-[#163744] dark:text-[#9fdce6] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nova etapa</span>
                  </button>
                </div>

                {task.subtarefas.length === 0 ? (
                  <p className="py-6 text-center text-[12.5px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                    Nenhuma subtarefa dividida ainda.
                  </p>
                ) : (
                  <ul className="divide-y divide-[#0f1115]/7 dark:divide-[#f2f4f7]/7">
                    {task.subtarefas.map((sub) => {
                      const subStatus: TaskStatus =
                        sub.estado ?? (sub.concluida ? 'concluida' : 'a_fazer');
                      const subMeta = TASK_STATUS_META[subStatus];
                      const subOwner = getMember(sub.responsavelId ?? task.responsavelId);
                      return (
                        <li key={sub.id} className="py-2.5 space-y-1.5">
                          <div className="flex items-start gap-2">
                            <span
                              className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${subMeta.dotClass}`}
                            />
                            <span
                              className={`text-[12.5px] font-medium leading-snug ${
                                subStatus === 'concluida'
                                  ? 'line-through text-[#0f1115]/44 dark:text-[#f2f4f7]/44'
                                  : 'text-[#0f1115] dark:text-[#f2f4f7]'
                              }`}
                            >
                              {sub.titulo}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 pl-4">
                            <InlineSelect
                              value={sub.responsavelId ?? task.responsavelId}
                              onChange={(val) => updateSubtaskAssignee(task.id, sub.id, val)}
                              ariaLabel="Responsável pela etapa"
                              leading={<MemberAvatar member={subOwner} size="xs" />}
                            >
                              {state.members.map((m) => (
                                <option key={m.id} value={m.id} className="bg-white dark:bg-[#15181f]">
                                  {m.nome}
                                </option>
                              ))}
                            </InlineSelect>

                            <InlineSelect
                              value={subStatus}
                              onChange={(val) =>
                                updateSubtaskStatus(task.id, sub.id, val as TaskStatus)
                              }
                              ariaLabel="Status da etapa"
                            >
                              {ALL_STATUSES.map((st) => (
                                <option key={st} value={st} className="bg-white dark:bg-[#15181f]">
                                  {TASK_STATUS_META[st].label}
                                </option>
                              ))}
                            </InlineSelect>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {addingSubtask && (
                  <form onSubmit={handleAddSubtask} className="pt-2 space-y-2 border-t border-[#0f1115]/7 dark:border-[#f2f4f7]/7">
                    <input
                      type="text"
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      placeholder="Descrever etapa filha..."
                      autoFocus
                      className="eagle-input w-full h-8 px-2.5 text-[12.5px]"
                    />
                    <div className="flex items-center gap-1.5">
                      <select
                        value={newSubAssigneeId}
                        onChange={(e) => setNewSubAssigneeId(e.target.value)}
                        aria-label="Responsável pela nova etapa"
                        className="eagle-input flex-1 h-8 px-2 text-[12px] cursor-pointer truncate"
                      >
                        {state.members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nome}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="eagle-btn-primary h-8 px-3 text-[12px] font-medium cursor-pointer shrink-0"
                      >
                        Adicionar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* ABA 3: TAREFAS DO AGENTE */}
            {activeTab === 'fila_agente' && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2 pb-2 border-b border-[#0f1115]/7 dark:border-[#f2f4f7]/7">
                  <MemberAvatar member={assignee} size="xs" showOperationalRing />
                  <span className="text-[12.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                    {assignee?.nome ?? 'Responsável'}
                  </span>
                  <span className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 tabular-nums ml-auto">
                    {agentQueueTasks.length} tarefas
                  </span>
                </div>

                <div className="divide-y divide-[#0f1115]/7 dark:divide-[#f2f4f7]/7">
                  {agentQueueTasks.map((qt) => {
                    const meta = TASK_STATUS_META[qt.estado];
                    const isCurr = qt.id === task.id;
                    const qProj = getProject(qt.projetoId);
                    return (
                      <div key={qt.id} className="py-2.5 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-[#0f1115]/45 dark:text-[#f2f4f7]/45 tabular-nums">
                            {qt.codigo} {isCurr ? '· Aberta' : ''}
                          </span>
                          <StatusIndicator
                            label={meta.label}
                            dotClass={meta.dotClass}
                            textClass={meta.textClass}
                            live={qt.estado === 'em_andamento' || qt.execucaoAtiva}
                          />
                        </div>
                        <div className="text-[12.5px] font-medium text-[#0f1115] dark:text-[#f2f4f7] leading-snug">
                          {qt.titulo}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                          <span className="truncate">{qProj?.nome}</span>
                          <span className="tabular-nums shrink-0">{formatShortDate(qt.prazo)}</span>
                        </div>
                        {!isCurr && (
                          <div className="pt-1 flex items-center gap-3 text-[11.5px] font-medium">
                            <button
                              type="button"
                              onClick={() =>
                                openExtraTab({
                                  id: `task-${qt.id}`,
                                  kind: 'task',
                                  title: qt.codigo,
                                  targetId: qt.id,
                                })
                              }
                              className="text-[#0f1115]/60 dark:text-[#f2f4f7]/60 hover:text-[#163744] dark:hover:text-[#9fdce6] cursor-pointer"
                            >
                              Espiar em aba
                            </button>
                            {onSelectTask && (
                              <button
                                type="button"
                                onClick={() => onSelectTask(qt.id)}
                                className="text-[#163744] dark:text-[#9fdce6] hover:underline cursor-pointer"
                              >
                                Abrir conversa
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ABA 4: ARTEFATOS */}
            {activeTab === 'artefatos' && (
              <div className="space-y-3 pt-1">
                {task.artefatos.length === 0 ? (
                  <p className="py-6 text-center text-[12.5px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                    Nenhum arquivo entregue nesta tarefa até o momento.
                  </p>
                ) : (
                  task.artefatos.map((art) => (
                    <div
                      key={art.id}
                      className="rounded-[12px] border border-[#0f1115]/8 dark:border-[#f2f4f7]/9 overflow-hidden"
                    >
                      {art.previewUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewArtifact({ artifact: art, taskId: task.id })
                          }
                          className="block w-full h-28 overflow-hidden cursor-pointer group"
                        >
                          <img
                            src={art.previewUrl}
                            alt={art.titulo}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                          />
                        </button>
                      ) : (
                        <div className="px-3 pt-2.5 flex items-center gap-2 text-[#163744] dark:text-[#9fdce6] text-[12px] font-medium">
                          <FileText className="w-3.5 h-3.5" />
                          <span>Documento</span>
                        </div>
                      )}

                      <div className="p-2.5 space-y-2">
                        <div>
                          <div className="text-[12.5px] font-medium text-[#0f1115] dark:text-[#f2f4f7] leading-snug">
                            {art.titulo}
                          </div>
                          <div className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 tabular-nums">
                            {art.versao} · {art.formato} · {art.tamanho}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              openExtraTab({
                                id: `art-${art.id}`,
                                kind: 'artifact',
                                title: art.titulo.slice(0, 18),
                                targetId: art.id,
                              })
                            }
                            className="eagle-btn-secondary h-7 px-2 text-[11px] font-medium cursor-pointer"
                          >
                            Abrir aba
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerArtifactDownload(art)}
                            className="eagle-btn-secondary h-7 px-2 text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>Baixar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              approveArtifact(task.id, art.id, !art.aprovado)
                            }
                            className={`ml-auto h-7 px-2.5 rounded-[8px] text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer ${
                              art.aprovado
                                ? 'bg-[#15803d]/15 text-[#166534] dark:bg-[#4ade80]/20 dark:text-[#4ade80]'
                                : 'eagle-btn-primary'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            <span>{art.aprovado ? 'Aprovado' : 'Aprovar'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ABAS EXTRAS FECHÁVEIS */}
            {activeExtraTab && activeExtraTab.kind === 'task' && (() => {
              const relTask = getTask(activeExtraTab.targetId);
              if (!relTask) return null;
              const relStatus = TASK_STATUS_META[relTask.estado];
              const relAssignee = getMember(relTask.responsavelId);
              const relProj = getProject(relTask.projetoId);
              return (
                <div className="space-y-4 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11.5px] font-medium text-[#0f1115]/52 dark:text-[#f2f4f7]/52 tabular-nums">
                      {relTask.codigo} · {relProj?.nome}
                    </span>
                    <StatusIndicator
                      label={relStatus.label}
                      dotClass={relStatus.dotClass}
                      textClass={relStatus.textClass}
                      live={relTask.estado === 'em_andamento'}
                    />
                  </div>
                  <h4 className="text-[15px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] leading-snug">
                    {relTask.titulo}
                  </h4>
                  <div className="flex items-center gap-2 text-[12px] text-[#0f1115]/68 dark:text-[#f2f4f7]/68">
                    <MemberAvatar member={relAssignee} size="xs" />
                    <span>{relAssignee?.nome}</span>
                    <span>·</span>
                    <span className="tabular-nums">Prazo {formatShortDate(relTask.prazo)}</span>
                  </div>
                  <RichTextBlock content={relTask.briefing} collapseThreshold={260} />
                  {onSelectTask && (
                    <button
                      type="button"
                      onClick={() => onSelectTask(relTask.id)}
                      className="eagle-btn-primary h-8 px-3 text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir conversa desta tarefa</span>
                    </button>
                  )}
                </div>
              );
            })()}

            {activeExtraTab && activeExtraTab.kind === 'artifact' && (() => {
              const art = task.artefatos.find((a) => a.id === activeExtraTab.targetId);
              if (!art) return null;
              const author = getMember(art.autorId);
              return (
                <div className="space-y-4 pt-1">
                  <div>
                    <h4 className="text-[14.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                      {art.titulo}
                    </h4>
                    <p className="text-[11.5px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 tabular-nums mt-0.5">
                      {art.versao} · {art.formato} · {art.tamanho}
                      {author ? ` · ${author.nome}` : ''}
                    </p>
                  </div>
                  {art.previewUrl ? (
                    <div className="rounded-[12px] overflow-hidden border border-[#0f1115]/10 dark:border-[#f2f4f7]/10">
                      <img
                        src={art.previewUrl}
                        alt={art.titulo}
                        referrerPolicy="no-referrer"
                        className="w-full max-h-[380px] object-contain bg-[#ebeff3] dark:bg-[#11141a]"
                      />
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-[12px] bg-[#f2f4f7] dark:bg-[#11141a]">
                      <RichTextBlock
                        content={
                          art.resumoConteudo ??
                          'Documento técnico preparado pela Eagle Digital House.'
                        }
                        defaultExpanded
                      />
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => approveArtifact(task.id, art.id, !art.aprovado)}
                      className={`h-8 px-3 rounded-[9px] text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                        art.aprovado
                          ? 'bg-[#15803d]/15 text-[#166534] dark:bg-[#4ade80]/20 dark:text-[#4ade80]'
                          : 'eagle-btn-primary'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{art.aprovado ? 'Aprovado' : 'Aprovar arquivo'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerArtifactDownload(art)}
                      className="eagle-btn-secondary h-8 px-3 text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewArtifact({ artifact: art, taskId: task.id })}
                      className="eagle-btn-secondary h-8 px-3 text-[12px] font-medium cursor-pointer"
                    >
                      Ampliar
                    </button>
                  </div>
                </div>
              );
            })()}

            {activeExtraTab && activeExtraTab.kind === 'execution' && (() => {
              const exec = task.execucoes.find((e) => e.id === activeExtraTab.targetId);
              if (!exec) return null;
              const execAgent = getMember(exec.agenteId);
              return (
                <div className="space-y-4 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-[14.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] tabular-nums">
                      Execução #{exec.numero}
                    </h4>
                    <span className="px-2 py-0.5 rounded-[7px] bg-[#163744]/10 text-[#163744] dark:bg-[#9fdce6]/14 dark:text-[#9fdce6] text-[11px] font-medium capitalize">
                      {exec.estado}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-[#0f1115]/68 dark:text-[#f2f4f7]/68">
                    <MemberAvatar member={execAgent} size="xs" />
                    <span>{execAgent?.nome}</span>
                    <span>·</span>
                    <span>{exec.modeloIA}</span>
                  </div>
                  <p className="text-[12.5px] leading-relaxed text-[#0f1115]/84 dark:text-[#f2f4f7]/84">
                    {exec.resumo}
                  </p>
                  <div className="space-y-1.5 pt-1 border-t border-[#0f1115]/7 dark:border-[#f2f4f7]/7">
                    <div className="text-[11px] font-medium text-[#0f1115]/48 dark:text-[#f2f4f7]/48 tabular-nums">
                      Início: {exec.inicio} {exec.fim ? `· Fim: ${exec.fim}` : '· Em andamento'}
                    </div>
                    <ul className="space-y-1.5 pt-1">
                      {exec.etapas.map((step, idx) => (
                        <li
                          key={idx}
                          className="text-[12px] text-[#0f1115]/80 dark:text-[#f2f4f7]/80 flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#163744] dark:bg-[#9fdce6] shrink-0" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })()}
          </div>
        </aside>
      )}
    </motion.div>
  );
}
