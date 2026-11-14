import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { EagleState, INITIAL_EAGLE_STATE } from '../data/seedData';
import {
  Artifact,
  Client,
  DecisionStatus,
  FinanceEntry,
  Goal,
  Member,
  MessageReaction,
  NavSection,
  Project,
  ProjectStatus,
  QueuedMessage,
  Routine,
  Skill,
  Task,
  TaskExecution,
  TaskMessage,
  TaskStatus,
  ThemePreference,
} from '../types/eagle';

const STORAGE_KEY = 'eagle-os-state-v3';
const THEME_KEY = 'eagle-os-theme';

export const AI_MODEL_OPTIONS = [
  'Claude Sonnet 4.6',
  'Claude Opus 4.6',
  'Gemini 2.5 Pro',
  'GPT-5',
];

export interface SendMessageOptions {
  targetAgentId?: string;
  modeloIA?: string;
  anexosNomes?: string[];
  forceImmediate?: boolean;
}

interface EagleContextValue {
  state: EagleState;
  activeSection: NavSection;
  setActiveSection: (section: NavSection) => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  selectedDateFilter: string | null;
  setSelectedDateFilter: (date: string | null) => void;
  themePreference: ThemePreference;
  resolvedTheme: 'light' | 'dark';
  setThemePreference: (pref: ThemePreference) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  previewArtifact: { artifact: Artifact; taskId?: string } | null;
  setPreviewArtifact: (val: { artifact: Artifact; taskId?: string } | null) => void;
  typingTaskId: string | null;

  // Lookup helpers
  getMember: (id: string) => Member | undefined;
  getProject: (id: string) => Project | undefined;
  getClient: (id: string) => Client | undefined;
  getTask: (id: string) => Task | undefined;

  // Task actions
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  updateTaskAssignee: (taskId: string, memberId: string) => void;
  updateTaskReviewer: (taskId: string, memberId: string) => void;
  updateTaskBriefing: (taskId: string, briefing: string) => void;
  updateTaskFields: (taskId: string, patch: Partial<Task>, systemNote?: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  updateSubtaskStatus: (taskId: string, subtaskId: string, estado: TaskStatus) => void;
  updateSubtaskAssignee: (taskId: string, subtaskId: string, responsavelId: string) => void;
  addSubtask: (taskId: string, titulo: string, responsavelId?: string) => void;
  createTask: (input: {
    titulo: string;
    briefing?: string;
    projetoId: string;
    responsavelId: string;
    revisorId?: string;
    prazo: string;
    estado?: TaskStatus;
  }) => Task;
  sendTaskMessage: (taskId: string, texto: string, opts?: SendMessageOptions) => void;
  reactToMessage: (taskId: string, msgId: string, reacao: MessageReaction) => void;
  answerMessageOptions: (taskId: string, msgId: string, opcao: string) => void;
  reorderQueuedMessage: (taskId: string, queueId: string, direction: 'up' | 'down') => void;
  editQueuedMessage: (taskId: string, queueId: string, texto: string) => void;
  removeQueuedMessage: (taskId: string, queueId: string) => void;
  interruptAgentAndFlushQueue: (taskId: string, specificQueueId?: string) => void;
  toggleTaskExecution: (taskId: string) => void;
  approveArtifact: (taskId: string, artifactId: string, approved: boolean) => void;

  // Decision actions
  resolveDecision: (
    decisionId: string,
    status: Exclude<DecisionStatus, 'pendente'>,
    resposta?: string
  ) => void;

  // Project & Client actions
  createProject: (input: {
    nome: string;
    clienteId: string;
    liderId: string;
    prazoEntrega: string;
    descricao: string;
    disciplina: string;
  }) => Project;
  updateProjectStatus: (projectId: string, estado: ProjectStatus) => void;
  updateProjectSettings: (
    projectId: string,
    updates: Partial<Project['configuracoes']> & { descricao?: string }
  ) => void;
  createClient: (input: {
    nome: string;
    segmento: string;
    contatoPrincipal: string;
    isInterno?: boolean;
  }) => Client;

  // Finance actions
  createFinanceEntry: (input: Omit<FinanceEntry, 'id'>) => void;
  toggleFinanceStatus: (entryId: string) => void;

  // Organization actions
  toggleAgentOperationalStatus: (agentId: string) => void;
  inviteTeamMember: (input: {
    nome: string;
    cargo: string;
    email: string;
    acesso: Member['acesso'];
  }) => void;
  toggleRoutineActive: (routineId: string) => void;
  triggerRoutineNow: (routineId: string) => void;
  createRoutine: (input: Omit<Routine, 'id'>) => void;
  updateGoalProgress: (goalId: string, progresso: number) => void;
  resetDemoState: () => void;
}

const EagleContext = createContext<EagleContextValue | null>(null);

function nowHour(): string {
  const d = new Date();
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function buildContextualAgentReply(
  agent: Member | undefined,
  task: Task,
  project: Project | undefined,
  userText: string
): { reply: string; nextStatus?: TaskStatus; newArtifact?: Artifact } {
  const lower = userText.toLowerCase();
  const role = agent?.cargo ?? 'Especialista';
  const projectName = project?.nome ?? 'o projeto';

  if (lower.includes('aprov') || lower.includes('fechado') || lower.includes('ok') || lower.includes('segue')) {
    return {
      reply: `Perfeito, Lucas. Registrado como aprovado para ${projectName}. Já marquei os ajustes finais e atualizei o andamento da entrega.`,
      nextStatus: 'concluida',
    };
  }

  if (lower.includes('ajust') || lower.includes('mud') || lower.includes('alter') || lower.includes('revis')) {
    return {
      reply: `Entendido. Como ${role}, vou refinar exatamente esse ponto mantendo o padrão do ${projectName}. Assim que a nova versão estiver pronta, subo nos artefatos para você conferir.`,
      nextStatus: 'em_andamento',
      newArtifact: {
        id: `art-${Date.now()}`,
        titulo: `Revisão solicitada — ${task.titulo.slice(0, 32)}`,
        tipo: 'documento',
        versao: `v${task.artefatos.length + 2}.0`,
        formato: 'PDF · Atualizado',
        tamanho: '1,6 MB',
        autorId: task.responsavelId,
        criadoEm: `Hoje, ${nowHour()}`,
        resumoConteudo: `Nota de revisão aplicada conforme orientação do Lucas: "${userText}". Margens, contraste e alinhamento conferidos.`,
        aprovado: false,
      },
    };
  }

  if (lower.includes('prazo') || lower.includes('quando') || lower.includes('tempo')) {
    return {
      reply: `Estou dentro da janela de ${task.prazo.split('-').reverse().join('/')}. Consigo fechar a próxima rodada ainda hoje antes das 18h sem comprometer o restante do ${projectName}.`,
    };
  }

  if (lower.includes('cliente') || lower.includes('reuni') || lower.includes('apresent')) {
    return {
      reply: `Preparei os argumentos objetivos para apresentar ao cliente sem excesso de texto. Se quiser, posso exportar a prancha limpa em PDF para a reunião.`,
    };
  }

  const byRole: Record<string, string> = {
    'Diretora de Arte': `Recebido, Lucas. Apliquei sua observação na composição visual do ${projectName}, preservando respiro e hierarquia limpa. Me avise se quer validar a nova prancha.`,
    'Designer Sênior': `Anotado. Vou ajustar o grid e verificar o acabamento técnico antes de fechar o arquivo final.`,
    'Desenvolvedor Front-end': `Certo. Já estou aplicando essa melhoria no código mantendo a transição suave e os números alinhados em tabela.`,
    'Gerente de Contas': `Entendido, Lucas. Vou alinhar o retorno com o contato do cliente ainda hoje e atualizo o estado aqui na tarefa.`,
    'Estrategista de Marca': `Faz total sentido. Reorganizei o argumento central para ficar mais direto e sem adjetivos desnecessários.`,
    'Redatora Chefe': `Recebido. Vou enxugar o texto em 20% mantendo precisão e ritmo natural em português.`,
  };

  return {
    reply:
      byRole[role] ??
      `Entendido, Lucas. Já incorporei sua orientação nesta entrega de ${projectName} e atualizei o andamento aqui na mesa.`,
  };
}

export function EagleProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<EagleState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as EagleState;
        if (
          parsed &&
          Array.isArray(parsed.tasks) &&
          (parsed.tasks.length === 0 ||
            (Array.isArray(parsed.tasks[0].filaMensagens) &&
              Array.isArray(parsed.tasks[0].execucoes)))
        ) {
          return parsed;
        }
      }
    } catch {
      // Fallback silencioso para semente padrão
    }
    return INITIAL_EAGLE_STATE;
  });

  const [activeSection, setActiveSection] = useState<NavSection>('tarefas');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>('tsk-101');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [previewArtifact, setPreviewArtifact] = useState<{
    artifact: Artifact;
    taskId?: string;
  } | null>(null);
  const [typingTaskId, setTypingTaskId] = useState<string | null>(null);

  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY) as ThemePreference | null;
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    } catch {
      // ignore
    }
    return 'system';
  });

  const [systemDark, setSystemDark] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolvedTheme: 'light' | 'dark' =
    themePreference === 'system' ? (systemDark ? 'dark' : 'light') : themePreference;

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  const setThemePreference = useCallback((pref: ThemePreference) => {
    setThemePreferenceState(pref);
    try {
      localStorage.setItem(THEME_KEY, pref);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  // Atalho global ⌘K / Ctrl+K
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const getMember = useCallback(
    (id: string) => state.members.find((m) => m.id === id),
    [state.members]
  );

  const getProject = useCallback(
    (id: string) => state.projects.find((p) => p.id === id),
    [state.projects]
  );

  const getClient = useCallback(
    (id: string) => state.clients.find((c) => c.id === id),
    [state.clients]
  );

  const getTask = useCallback(
    (id: string) => state.tasks.find((t) => t.id === id),
    [state.tasks]
  );

  const STATUS_LABEL_PT: Record<TaskStatus, string> = {
    a_fazer: 'A fazer',
    em_andamento: 'Em andamento',
    em_revisao: 'Em revisão',
    bloqueada: 'Bloqueada',
    concluida: 'Concluída',
    cancelada: 'Cancelada',
  };

  const updateTaskStatus = useCallback((taskId: string, status: TaskStatus) => {
    const hora = nowHour();
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== taskId || t.estado === status) return t;
        const sysMsg: TaskMessage = {
          id: `msg-sys-${Date.now()}`,
          remetenteId: 'mem-lucas',
          tipo: 'sistema',
          texto: `Estado alterado de ${STATUS_LABEL_PT[t.estado]} para ${STATUS_LABEL_PT[status]}`,
          horario: hora,
        };
        return {
          ...t,
          estado: status,
          execucaoAtiva: status === 'em_andamento' ? t.execucaoAtiva : false,
          iniciadaEm:
            status === 'em_andamento' && !t.iniciadaEm ? `Hoje, ${hora}` : t.iniciadaEm,
          concluidaEm:
            status === 'concluida'
              ? `Hoje, ${hora}`
              : status !== 'cancelada'
                ? undefined
                : t.concluidaEm,
          atualizadaEm: 'Agora',
          mensagens: [...t.mensagens, sysMsg],
        };
      }),
    }));
  }, []);

  const updateTaskAssignee = useCallback((taskId: string, memberId: string) => {
    const hora = nowHour();
    setState((prev) => {
      const nextMember = prev.members.find((m) => m.id === memberId);
      return {
        ...prev,
        tasks: prev.tasks.map((t) => {
          if (t.id !== taskId || t.responsavelId === memberId) return t;
          const sysMsg: TaskMessage = {
            id: `msg-sys-${Date.now()}`,
            remetenteId: memberId,
            tipo: 'sistema',
            texto: `Responsável alterado para ${nextMember?.nome ?? 'membro da equipe'}`,
            horario: hora,
          };
          return {
            ...t,
            responsavelId: memberId,
            atualizadaEm: 'Agora',
            mensagens: [...t.mensagens, sysMsg],
          };
        }),
      };
    });
  }, []);

  const updateTaskReviewer = useCallback((taskId: string, memberId: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId ? { ...t, revisorId: memberId, atualizadaEm: 'Agora' } : t
      ),
    }));
  }, []);

  const updateTaskBriefing = useCallback((taskId: string, briefing: string) => {
    const clean = briefing.trim();
    if (!clean) return;
    const hora = nowHour();
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              briefing: clean,
              atualizadaEm: 'Agora',
              mensagens: [
                ...t.mensagens,
                {
                  id: `msg-sys-${Date.now()}`,
                  remetenteId: 'mem-lucas',
                  tipo: 'sistema',
                  texto: 'Briefing original atualizado por Lucas',
                  horario: hora,
                },
              ],
            }
          : t
      ),
    }));
  }, []);

  const updateTaskFields = useCallback(
    (taskId: string, patch: Partial<Task>, systemNote?: string) => {
      const hora = nowHour();
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => {
          if (t.id !== taskId) return t;
          const nextMsgs = systemNote
            ? [
                ...t.mensagens,
                {
                  id: `msg-sys-${Date.now()}`,
                  remetenteId: 'mem-lucas',
                  tipo: 'sistema' as const,
                  texto: systemNote,
                  horario: hora,
                },
              ]
            : t.mensagens;
          return {
            ...t,
            ...patch,
            atualizadaEm: 'Agora',
            mensagens: nextMsgs,
          };
        }),
      }));
    },
    []
  );

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          atualizadaEm: 'Agora',
          subtarefas: t.subtarefas.map((s) => {
            if (s.id !== subtaskId) return s;
            const nextDone = !s.concluida;
            return {
              ...s,
              concluida: nextDone,
              estado: nextDone ? 'concluida' : 'a_fazer',
            };
          }),
        };
      }),
    }));
  }, []);

  const updateSubtaskStatus = useCallback(
    (taskId: string, subtaskId: string, estado: TaskStatus) => {
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            atualizadaEm: 'Agora',
            subtarefas: t.subtarefas.map((s) =>
              s.id === subtaskId
                ? { ...s, estado, concluida: estado === 'concluida' }
                : s
            ),
          };
        }),
      }));
    },
    []
  );

  const updateSubtaskAssignee = useCallback(
    (taskId: string, subtaskId: string, responsavelId: string) => {
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            atualizadaEm: 'Agora',
            subtarefas: t.subtarefas.map((s) =>
              s.id === subtaskId ? { ...s, responsavelId } : s
            ),
          };
        }),
      }));
    },
    []
  );

  const addSubtask = useCallback((taskId: string, titulo: string, responsavelId?: string) => {
    const clean = titulo.trim();
    if (!clean) return;
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          atualizadaEm: 'Agora',
          subtarefas: [
            ...t.subtarefas,
            {
              id: `sub-${Date.now()}`,
              titulo: clean,
              concluida: false,
              estado: 'a_fazer',
              responsavelId: responsavelId ?? t.responsavelId,
            },
          ],
        };
      }),
    }));
  }, []);

  const createTask = useCallback(
    (input: {
      titulo: string;
      briefing?: string;
      projetoId: string;
      responsavelId: string;
      revisorId?: string;
      prazo: string;
      estado?: TaskStatus;
    }) => {
      const nextNum = 101 + state.tasks.length;
      const assignee = state.members.find((m) => m.id === input.responsavelId);
      const project = state.projects.find((p) => p.id === input.projetoId);
      const isAgent = assignee?.tipo === 'agente';
      const initialStatus: TaskStatus =
        input.estado ?? (isAgent ? 'em_andamento' : 'a_fazer');
      const hora = nowHour();
      const slug = (project?.nome ?? 'estudio')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 26);

      const newTask: Task = {
        id: `tsk-${Date.now()}`,
        codigo: `EAG-${nextNum}`,
        titulo: input.titulo.trim(),
        briefing:
          input.briefing?.trim() ||
          `Executar "${input.titulo.trim()}" seguindo o padrão de acabamento e consistência da Eagle Digital House.`,
        criadoPorId: 'mem-lucas',
        projetoId: input.projetoId,
        responsavelId: input.responsavelId,
        revisorId: input.revisorId ?? 'mem-lucas',
        aprovadorId: 'mem-lucas',
        observadoresIds: [],
        vigilanteId: 'mem-mariana',
        etiquetas: [],
        tarefaPaiId: null,
        bloqueadaPorIds: [],
        bloqueiaIds: [],
        pastaArquivos: `/estudio/${slug}/EAG-${nextNum}/`,
        modeloPreferido: 'Claude Sonnet 4.6',
        execucaoAtiva: isAgent,
        execucoes: isAgent
          ? [
              {
                id: `exec-${Date.now()}`,
                numero: 1,
                agenteId: input.responsavelId,
                modeloIA: 'Claude Sonnet 4.6',
                estado: 'executando',
                inicio: `Hoje, ${hora}`,
                resumo: 'Analisando briefing inicial e preparando primeira rodada de entrega.',
                etapas: [
                  'Leitura do briefing e contexto do projeto',
                  'Produção da primeira versão (em curso)',
                ],
              },
            ]
          : [],
        filaMensagens: [],
        estado: initialStatus,
        prazo: input.prazo,
        criadaEm: `Hoje, ${hora}`,
        iniciadaEm: isAgent ? `Hoje, ${hora}` : undefined,
        atualizadaEm: 'Agora',
        subtarefas: isAgent
          ? [
              {
                id: `sub-${Date.now()}-1`,
                titulo: 'Analisar briefing e referências do projeto',
                concluida: true,
                estado: 'concluida',
                responsavelId: input.responsavelId,
              },
              {
                id: `sub-${Date.now()}-2`,
                titulo: 'Produzir primeira rodada para revisão do Lucas',
                concluida: false,
                estado: 'em_andamento',
                responsavelId: input.responsavelId,
              },
            ]
          : [],
        artefatos: [],
        mensagens: isAgent
          ? [
              {
                id: `msg-sys-${Date.now()}`,
                remetenteId: input.responsavelId,
                tipo: 'sistema',
                texto: `${assignee?.nome ?? 'Agente'} iniciou a execução #1 usando Claude Sonnet 4.6`,
                horario: hora,
              },
              {
                id: `msg-${Date.now() + 1}`,
                remetenteId: input.responsavelId,
                tipo: 'mensagem',
                modeloIA: 'Claude Sonnet 4.6',
                resumoRodada: 'Rodada #1 · Abertura e levantamento do briefing',
                texto: `Briefing recebido, Lucas. Como ${assignee?.cargo ?? 'agente'}, já iniciei o trabalho em "${input.titulo.trim()}" e aviso aqui assim que a primeira versão estiver pronta para sua revisão.`,
                horario: hora,
              },
            ]
          : [],
      };

      setState((prev) => ({
        ...prev,
        tasks: [newTask, ...prev.tasks],
        members: prev.members.map((m) =>
          m.id === input.responsavelId && m.tipo === 'agente'
            ? {
                ...m,
                estadoOperacional: 'trabalhando',
                tarefaAtualId: newTask.id,
                observacaoEstado: `Trabalhando em: ${newTask.titulo}`,
              }
            : m
        ),
      }));

      return newTask;
    },
    [state.members, state.projects, state.tasks.length]
  );

  const dispatchMessageAndReply = useCallback(
    (
      taskId: string,
      clean: string,
      opts?: { targetAgentId?: string; modeloIA?: string; anexosNomes?: string[] }
    ) => {
      const targetTask = state.tasks.find((t) => t.id === taskId);
      if (!targetTask) return;

      const agentId = opts?.targetAgentId || targetTask.responsavelId;
      const modeloIA = opts?.modeloIA || targetTask.modeloPreferido || 'Claude Sonnet 4.6';
      const hora = nowHour();

      const userMsg: TaskMessage = {
        id: `msg-${Date.now()}`,
        remetenteId: 'mem-lucas',
        tipo: 'mensagem',
        texto: clean,
        horario: hora,
        anexosNomes: opts?.anexosNomes?.length ? opts.anexosNomes : undefined,
      };

      const assignee = state.members.find((m) => m.id === agentId);
      const nextExecNum = (targetTask.execucoes[0]?.numero ?? 0) + 1;

      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                responsavelId: agentId,
                modeloPreferido: modeloIA,
                atualizadaEm: 'Agora',
                mensagens: [...t.mensagens, userMsg],
              }
            : t
        ),
      }));

      if (assignee?.tipo === 'agente') {
        setTypingTaskId(taskId);
        const project = state.projects.find((p) => p.id === targetTask.projetoId);
        const generated = buildContextualAgentReply(assignee, targetTask, project, clean);

        window.setTimeout(() => {
          const replyHora = nowHour();
          const newExec: TaskExecution = {
            id: `exec-${Date.now()}`,
            numero: nextExecNum,
            agenteId: assignee.id,
            modeloIA,
            estado: 'concluida',
            inicio: replyHora,
            fim: replyHora,
            resumo: generated.reply.slice(0, 120),
            etapas: [
              `Leitura da orientação de Lucas (${modeloIA})`,
              generated.newArtifact
                ? `Geração de artefato: ${generated.newArtifact.titulo}`
                : 'Atualização direta na conversa da tarefa',
            ],
            artefatosIds: generated.newArtifact ? [generated.newArtifact.id] : undefined,
          };

          setState((prev) => ({
            ...prev,
            tasks: prev.tasks.map((t) => {
              if (t.id !== taskId) return t;
              const nextArtefatos = generated.newArtifact
                ? [...t.artefatos, generated.newArtifact]
                : t.artefatos;
              return {
                ...t,
                estado: generated.nextStatus ?? t.estado,
                concluidaEm:
                  generated.nextStatus === 'concluida'
                    ? `Hoje, ${replyHora}`
                    : t.concluidaEm,
                atualizadaEm: 'Agora',
                artefatos: nextArtefatos,
                execucoes: [newExec, ...t.execucoes],
                mensagens: [
                  ...t.mensagens,
                  {
                    id: `msg-${Date.now() + 1}`,
                    remetenteId: assignee.id,
                    tipo: 'mensagem',
                    modeloIA,
                    resumoRodada: `Rodada #${nextExecNum} · ${assignee.nome} via ${modeloIA}`,
                    texto: generated.reply,
                    horario: replyHora,
                    artefatoId: generated.newArtifact?.id,
                  },
                ],
              };
            }),
          }));
          setTypingTaskId((curr) => (curr === taskId ? null : curr));
        }, 420);
      }
    },
    [state.members, state.projects, state.tasks]
  );

  const sendTaskMessage = useCallback(
    (taskId: string, texto: string, opts?: SendMessageOptions) => {
      const clean = texto.trim();
      if (!clean) return;

      const targetTask = state.tasks.find((t) => t.id === taskId);
      if (!targetTask) return;

      if (targetTask.execucaoAtiva && !opts?.forceImmediate) {
        const queued: QueuedMessage = {
          id: `q-${Date.now()}`,
          texto: clean,
          destinatarioId: opts?.targetAgentId || targetTask.responsavelId,
          modeloIA: opts?.modeloIA || targetTask.modeloPreferido || 'Claude Sonnet 4.6',
          anexosNomes: opts?.anexosNomes?.length ? opts.anexosNomes : undefined,
          criadoEm: nowHour(),
        };
        setState((prev) => ({
          ...prev,
          tasks: prev.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  atualizadaEm: 'Agora',
                  filaMensagens: [...t.filaMensagens, queued],
                }
              : t
          ),
        }));
        return;
      }

      dispatchMessageAndReply(taskId, clean, opts);
    },
    [dispatchMessageAndReply, state.tasks]
  );

  const reactToMessage = useCallback(
    (taskId: string, msgId: string, reacao: MessageReaction) => {
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            mensagens: t.mensagens.map((m) =>
              m.id === msgId ? { ...m, reacao: m.reacao === reacao ? null : reacao } : m
            ),
          };
        }),
      }));
    },
    []
  );

  const answerMessageOptions = useCallback(
    (taskId: string, msgId: string, opcao: string) => {
      const targetTask = state.tasks.find((t) => t.id === taskId);
      if (!targetTask) return;
      const msg = targetTask.mensagens.find((m) => m.id === msgId);
      const linkedDecisionId = msg?.decisaoId;
      const hora = nowHour();

      setState((prev) => ({
        ...prev,
        decisions: linkedDecisionId
          ? prev.decisions.map((d) =>
              d.id === linkedDecisionId
                ? { ...d, status: 'aprovada', respostaLucas: `Escolha definida: ${opcao}` }
                : d
            )
          : prev.decisions,
        tasks: prev.tasks.map((t) => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            estado: t.estado === 'bloqueada' ? 'em_andamento' : t.estado,
            atualizadaEm: 'Agora',
            mensagens: [
              ...t.mensagens.map((m) =>
                m.id === msgId ? { ...m, opcaoEscolhida: opcao } : m
              ),
              {
                id: `msg-${Date.now()}`,
                remetenteId: 'mem-lucas',
                tipo: 'mensagem',
                texto: `Opção escolhida: ${opcao}`,
                horario: hora,
              },
            ],
          };
        }),
      }));

      const assignee = state.members.find((m) => m.id === targetTask.responsavelId);
      if (assignee?.tipo === 'agente') {
        setTypingTaskId(taskId);
        window.setTimeout(() => {
          setState((prev) => ({
            ...prev,
            tasks: prev.tasks.map((t) => {
              if (t.id !== taskId) return t;
              return {
                ...t,
                atualizadaEm: 'Agora',
                mensagens: [
                  ...t.mensagens,
                  {
                    id: `msg-${Date.now() + 1}`,
                    remetenteId: assignee.id,
                    tipo: 'mensagem',
                    modeloIA: t.modeloPreferido,
                    texto: `Perfeito, Lucas. Seguindo com "${opcao}". Já destravei a etapa seguinte e aviso assim que subir o resultado.`,
                    horario: nowHour(),
                  },
                ],
              };
            }),
          }));
          setTypingTaskId((curr) => (curr === taskId ? null : curr));
        }, 380);
      }
    },
    [state.members, state.tasks]
  );

  const reorderQueuedMessage = useCallback(
    (taskId: string, queueId: string, direction: 'up' | 'down') => {
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => {
          if (t.id !== taskId) return t;
          const idx = t.filaMensagens.findIndex((q) => q.id === queueId);
          if (idx === -1) return t;
          const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (nextIdx < 0 || nextIdx >= t.filaMensagens.length) return t;
          const copy = [...t.filaMensagens];
          const [moved] = copy.splice(idx, 1);
          copy.splice(nextIdx, 0, moved);
          return { ...t, filaMensagens: copy };
        }),
      }));
    },
    []
  );

  const editQueuedMessage = useCallback((taskId: string, queueId: string, texto: string) => {
    const clean = texto.trim();
    if (!clean) return;
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              filaMensagens: t.filaMensagens.map((q) =>
                q.id === queueId ? { ...q, texto: clean } : q
              ),
            }
          : t
      ),
    }));
  }, []);

  const removeQueuedMessage = useCallback((taskId: string, queueId: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? { ...t, filaMensagens: t.filaMensagens.filter((q) => q.id !== queueId) }
          : t
      ),
    }));
  }, []);

  const interruptAgentAndFlushQueue = useCallback(
    (taskId: string, specificQueueId?: string) => {
      const targetTask = state.tasks.find((t) => t.id === taskId);
      if (!targetTask) return;
      const hora = nowHour();
      const itemToRead = specificQueueId
        ? targetTask.filaMensagens.find((q) => q.id === specificQueueId)
        : targetTask.filaMensagens[0];
      const remainingQueue = itemToRead
        ? targetTask.filaMensagens.filter((q) => q.id !== itemToRead.id)
        : [];

      const assignee = state.members.find((m) => m.id === targetTask.responsavelId);

      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            execucaoAtiva: false,
            atualizadaEm: 'Agora',
            filaMensagens: remainingQueue,
            execucoes: t.execucoes.map((ex, i) =>
              i === 0 && ex.estado === 'executando'
                ? { ...ex, estado: 'interrompida', fim: `Hoje, ${hora}` }
                : ex
            ),
            mensagens: [
              ...t.mensagens,
              {
                id: `msg-sys-${Date.now()}`,
                remetenteId: 'mem-lucas',
                tipo: 'sistema',
                texto: `${assignee?.nome ?? 'Agente'} interrompido por Lucas para leitura imediata`,
                horario: hora,
              },
            ],
          };
        }),
      }));

      if (itemToRead) {
        window.setTimeout(() => {
          dispatchMessageAndReply(taskId, itemToRead.texto, {
            targetAgentId: itemToRead.destinatarioId,
            modeloIA: itemToRead.modeloIA,
            anexosNomes: itemToRead.anexosNomes,
          });
        }, 60);
      }
    },
    [dispatchMessageAndReply, state.members, state.tasks]
  );

  const toggleTaskExecution = useCallback((taskId: string) => {
    const hora = nowHour();
    setState((prev) => {
      const t = prev.tasks.find((item) => item.id === taskId);
      if (!t) return prev;
      const assignee = prev.members.find((m) => m.id === t.responsavelId);

      if (t.execucaoAtiva) {
        return {
          ...prev,
          tasks: prev.tasks.map((item) =>
            item.id === taskId
              ? {
                  ...item,
                  execucaoAtiva: false,
                  atualizadaEm: 'Agora',
                  execucoes: item.execucoes.map((ex, i) =>
                    i === 0 && ex.estado === 'executando'
                      ? { ...ex, estado: 'interrompida', fim: `Hoje, ${hora}` }
                      : ex
                  ),
                  mensagens: [
                    ...item.mensagens,
                    {
                      id: `msg-sys-${Date.now()}`,
                      remetenteId: item.responsavelId,
                      tipo: 'sistema',
                      texto: `Execução ao vivo pausada por Lucas às ${hora}`,
                      horario: hora,
                    },
                  ],
                }
              : item
          ),
        };
      }

      const nextNum = (t.execucoes[0]?.numero ?? 0) + 1;
      const newExec: TaskExecution = {
        id: `exec-${Date.now()}`,
        numero: nextNum,
        agenteId: t.responsavelId,
        modeloIA: t.modeloPreferido || 'Claude Sonnet 4.6',
        estado: 'executando',
        inicio: `Hoje, ${hora}`,
        resumo: `Rodada #${nextNum} em curso com ${assignee?.nome ?? 'agente'} (${t.modeloPreferido}).`,
        etapas: [
          'Lendo estado atual e artefatos da tarefa',
          'Processando entrega da rodada atual (ao vivo)',
        ],
      };

      return {
        ...prev,
        tasks: prev.tasks.map((item) =>
          item.id === taskId
            ? {
                ...item,
                estado: 'em_andamento',
                execucaoAtiva: true,
                iniciadaEm: item.iniciadaEm ?? `Hoje, ${hora}`,
                atualizadaEm: 'Agora',
                execucoes: [newExec, ...item.execucoes],
                mensagens: [
                  ...item.mensagens,
                  {
                    id: `msg-sys-${Date.now()}`,
                    remetenteId: item.responsavelId,
                    tipo: 'sistema',
                    texto: `${assignee?.nome ?? 'Agente'} iniciou a execução #${nextNum} ao vivo usando ${item.modeloPreferido}`,
                    horario: hora,
                  },
                ],
              }
            : item
        ),
      };
    });
  }, []);

  const approveArtifact = useCallback((taskId: string, artifactId: string, approved: boolean) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          atualizadaEm: 'Agora',
          artefatos: t.artefatos.map((a) =>
            a.id === artifactId ? { ...a, aprovado: approved } : a
          ),
        };
      }),
    }));
  }, []);

  const resolveDecision = useCallback(
    (decisionId: string, status: Exclude<DecisionStatus, 'pendente'>, resposta?: string) => {
      setState((prev) => {
        const decision = prev.decisions.find((d) => d.id === decisionId);
        if (!decision) return prev;

        const nextTaskStatus: TaskStatus | undefined =
          status === 'aprovada'
            ? 'concluida'
            : status === 'ajuste'
              ? 'em_andamento'
              : status === 'recusada'
                ? 'bloqueada'
                : undefined;

        const feedbackText =
          resposta?.trim() ||
          (status === 'aprovada'
            ? `Decisão aprovada por Lucas: "${decision.acaoPrimaria}".`
            : status === 'ajuste'
              ? `Lucas pediu ajuste: "${decision.acaoSecundaria}".`
              : `Decisão recusada por Lucas.`);

        return {
          ...prev,
          decisions: prev.decisions.map((d) =>
            d.id === decisionId ? { ...d, status, respostaLucas: feedbackText } : d
          ),
          tasks: prev.tasks.map((t) => {
            if (t.id !== decision.tarefaId) return t;
            return {
              ...t,
              estado: nextTaskStatus ?? t.estado,
              atualizadaEm: 'Agora',
              artefatos:
                status === 'aprovada' && decision.artefatoId
                  ? t.artefatos.map((a) =>
                      a.id === decision.artefatoId ? { ...a, aprovado: true } : a
                    )
                  : t.artefatos,
              mensagens: [
                ...t.mensagens,
                {
                  id: `msg-${Date.now()}`,
                  remetenteId: 'mem-lucas',
                  texto: feedbackText,
                  horario: nowHour(),
                },
              ],
            };
          }),
          members: prev.members.map((m) =>
            m.id === decision.solicitanteId && m.tipo === 'agente' && status === 'aprovada'
              ? {
                  ...m,
                  estadoOperacional: 'trabalhando',
                  observacaoEstado: `Seguindo após aprovação em ${decision.titulo}`,
                }
              : m
          ),
        };
      });
    },
    []
  );

  const createProject = useCallback(
    (input: {
      nome: string;
      clienteId: string;
      liderId: string;
      prazoEntrega: string;
      descricao: string;
      disciplina: string;
    }) => {
      const newProject: Project = {
        id: `prj-${Date.now()}`,
        nome: input.nome.trim(),
        clienteId: input.clienteId,
        estado: 'ativo',
        prazoEntrega: input.prazoEntrega,
        liderId: input.liderId,
        descricao: input.descricao.trim(),
        configuracoes: {
          disciplina: input.disciplina.trim() || 'Marca e Experiência',
          ritmoRevisao: 'Semanal',
          aprovacaoDiretaLucas: true,
        },
      };
      setState((prev) => ({ ...prev, projects: [newProject, ...prev.projects] }));
      return newProject;
    },
    []
  );

  const updateProjectStatus = useCallback((projectId: string, estado: ProjectStatus) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === projectId ? { ...p, estado } : p)),
    }));
  }, []);

  const updateProjectSettings = useCallback(
    (
      projectId: string,
      updates: Partial<Project['configuracoes']> & { descricao?: string }
    ) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const { descricao, ...cfg } = updates;
          return {
            ...p,
            descricao: descricao !== undefined ? descricao : p.descricao,
            configuracoes: { ...p.configuracoes, ...cfg },
          };
        }),
      }));
    },
    []
  );

  const createClient = useCallback(
    (input: {
      nome: string;
      segmento: string;
      contatoPrincipal: string;
      isInterno?: boolean;
    }) => {
      const newClient: Client = {
        id: `cli-${Date.now()}`,
        nome: input.nome.trim(),
        segmento: input.segmento.trim(),
        contatoPrincipal: input.contatoPrincipal.trim(),
        isInterno: Boolean(input.isInterno),
        status: 'ativo',
      };
      setState((prev) => ({ ...prev, clients: [...prev.clients, newClient] }));
      return newClient;
    },
    []
  );

  const createFinanceEntry = useCallback((input: Omit<FinanceEntry, 'id'>) => {
    const newEntry: FinanceEntry = {
      ...input,
      id: `fin-${Date.now()}`,
    };
    setState((prev) => ({ ...prev, finances: [newEntry, ...prev.finances] }));
  }, []);

  const toggleFinanceStatus = useCallback((entryId: string) => {
    setState((prev) => ({
      ...prev,
      finances: prev.finances.map((f) =>
        f.id === entryId
          ? { ...f, status: f.status === 'pendente' ? 'liquidado' : 'pendente' }
          : f
      ),
    }));
  }, []);

  const toggleAgentOperationalStatus = useCallback((agentId: string) => {
    setState((prev) => ({
      ...prev,
      members: prev.members.map((m) => {
        if (m.id !== agentId || m.tipo !== 'agente') return m;
        const nextStatus =
          m.estadoOperacional === 'trabalhando' ? 'parado' : 'trabalhando';
        return {
          ...m,
          estadoOperacional: nextStatus,
          observacaoEstado:
            nextStatus === 'parado'
              ? 'Pausado manualmente pelo Lucas'
              : 'Retomado na fila ativa do estúdio',
        };
      }),
    }));
  }, []);

  const inviteTeamMember = useCallback(
    (input: {
      nome: string;
      cargo: string;
      email: string;
      acesso: Member['acesso'];
    }) => {
      const parts = input.nome.trim().split(/\s+/);
      const iniciais =
        parts.length >= 2
          ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
          : input.nome.slice(0, 2).toUpperCase();
      const newMember: Member = {
        id: `mem-${Date.now()}`,
        nome: input.nome.trim(),
        cargo: input.cargo.trim(),
        email: input.email.trim(),
        acesso: input.acesso ?? 'Operação',
        tipo: 'pessoa',
        iniciais,
        convitePendente: true,
      };
      setState((prev) => ({ ...prev, members: [...prev.members, newMember] }));
    },
    []
  );

  const toggleRoutineActive = useCallback((routineId: string) => {
    setState((prev) => ({
      ...prev,
      routines: prev.routines.map((r) =>
        r.id === routineId ? { ...r, ativa: !r.ativa } : r
      ),
    }));
  }, []);

  const triggerRoutineNow = useCallback((routineId: string) => {
    setState((prev) => ({
      ...prev,
      routines: prev.routines.map((r) =>
        r.id === routineId ? { ...r, ultimaExecucao: `Hoje, ${nowHour()}` } : r
      ),
    }));
  }, []);

  const createRoutine = useCallback((input: Omit<Routine, 'id'>) => {
    setState((prev) => ({
      ...prev,
      routines: [{ ...input, id: `rot-${Date.now()}` }, ...prev.routines],
    }));
  }, []);

  const updateGoalProgress = useCallback((goalId: string, progresso: number) => {
    const clamped = Math.max(0, Math.min(100, progresso));
    setState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) =>
        g.id === goalId
          ? {
              ...g,
              progresso: clamped,
              status: clamped === 100 ? 'concluida' : clamped < 50 ? 'atencao' : 'no_prazo',
            }
          : g
      ),
    }));
  }, []);

  const resetDemoState = useCallback(() => {
    setState(INITIAL_EAGLE_STATE);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo<EagleContextValue>(
    () => ({
      state,
      activeSection,
      setActiveSection,
      selectedTaskId,
      setSelectedTaskId,
      selectedProjectId,
      setSelectedProjectId,
      selectedDateFilter,
      setSelectedDateFilter,
      themePreference,
      resolvedTheme,
      setThemePreference,
      isSearchOpen,
      setIsSearchOpen,
      previewArtifact,
      setPreviewArtifact,
      typingTaskId,
      getMember,
      getProject,
      getClient,
      getTask,
      updateTaskStatus,
      updateTaskAssignee,
      updateTaskReviewer,
      updateTaskBriefing,
      updateTaskFields,
      toggleSubtask,
      updateSubtaskStatus,
      updateSubtaskAssignee,
      addSubtask,
      createTask,
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
      createProject,
      updateProjectStatus,
      updateProjectSettings,
      createClient,
      createFinanceEntry,
      toggleFinanceStatus,
      toggleAgentOperationalStatus,
      inviteTeamMember,
      toggleRoutineActive,
      triggerRoutineNow,
      createRoutine,
      updateGoalProgress,
      resetDemoState,
    }),
    [
      state,
      activeSection,
      selectedTaskId,
      selectedProjectId,
      selectedDateFilter,
      themePreference,
      resolvedTheme,
      setThemePreference,
      isSearchOpen,
      previewArtifact,
      typingTaskId,
      getMember,
      getProject,
      getClient,
      getTask,
      updateTaskStatus,
      updateTaskAssignee,
      updateTaskReviewer,
      updateTaskBriefing,
      updateTaskFields,
      toggleSubtask,
      updateSubtaskStatus,
      updateSubtaskAssignee,
      addSubtask,
      createTask,
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
      createProject,
      updateProjectStatus,
      updateProjectSettings,
      createClient,
      createFinanceEntry,
      toggleFinanceStatus,
      toggleAgentOperationalStatus,
      inviteTeamMember,
      toggleRoutineActive,
      triggerRoutineNow,
      createRoutine,
      updateGoalProgress,
      resetDemoState,
    ]
  );

  return <EagleContext.Provider value={value}>{children}</EagleContext.Provider>;
}

export function useEagle(): EagleContextValue {
  const ctx = useContext(EagleContext);
  if (!ctx) throw new Error('useEagle deve ser usado dentro de EagleProvider');
  return ctx;
}
