import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Pause,
  Play,
  Plus,
  X,
} from 'lucide-react';
import {
  EmptyState,
  MemberAvatar,
  PageHeader,
  StatusIndicator,
} from '../components/SharedUI';
import { useEagle } from '../context/EagleContext';
import { AgentOperationalStatus, Goal, Member } from '../types/eagle';
import { AGENT_STATUS_META } from '../utils/formatters';

/* -------------------------------------------------------------------------- */
/* AGENTES                                                                    */
/* -------------------------------------------------------------------------- */
export function AgentsView({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const {
    state,
    getTask,
    toggleAgentOperationalStatus,
    setSelectedTaskId,
    setActiveSection,
  } = useEagle();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AgentOperationalStatus | 'todos'>(
    'todos'
  );

  const agents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.members.filter((m) => {
      if (m.tipo !== 'agente') return false;
      if (statusFilter !== 'todos' && m.estadoOperacional !== statusFilter) return false;
      if (q) {
        return (
          m.nome.toLowerCase().includes(q) ||
          m.cargo.toLowerCase().includes(q) ||
          (m.observacaoEstado ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [state.members, search, statusFilter]);

  const filtersSlot = (
    <select
      value={statusFilter}
      onChange={(e) =>
        setStatusFilter(e.target.value as AgentOperationalStatus | 'todos')
      }
      aria-label="Filtrar estado do agente"
      className="eagle-input h-9 px-2.5 text-[13px] cursor-pointer"
    >
      <option value="todos">Todos os agentes</option>
      <option value="trabalhando">Trabalhando</option>
      <option value="parado">Parados</option>
      <option value="problema">Com problema</option>
    </select>
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader
        title="Agentes"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar agente ou cargo..."
        filters={filtersSlot}
        onOpenMobileMenu={onOpenMobileMenu}
      />

      <div className="flex-1 overflow-y-auto">
        {agents.length === 0 ? (
          <div className="p-6 lg:p-9 max-w-4xl mx-auto">
            <EmptyState title="Nenhum agente encontrado com esse filtro." />
          </div>
        ) : (
          <div className="divide-y divide-[#0f1115]/8 dark:divide-[#f2f4f7]/8">
            {agents.map((ag) => {
              const st = AGENT_STATUS_META[ag.estadoOperacional ?? 'parado'];
              const currentTask = ag.tarefaAtualId
                ? getTask(ag.tarefaAtualId)
                : undefined;
              const skills = state.skills.filter((s) =>
                ag.habilidadesIds?.includes(s.id)
              );

              return (
                <div
                  key={ag.id}
                  className="px-6 lg:px-9 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-[#f6f8fa]/70 dark:hover:bg-[#191d26]/55 transition-colors"
                >
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <MemberAvatar member={ag} size="lg" showOperationalRing />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <h2 className="text-[15.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                          {ag.nome}
                        </h2>
                        <span className="text-[13px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                          {ag.cargo}
                        </span>
                        <StatusIndicator
                          label={st.label}
                          dotClass={st.dotClass}
                          textClass={st.textClass}
                          live={ag.estadoOperacional === 'trabalhando'}
                        />
                      </div>

                      {ag.observacaoEstado && (
                        <p className="mt-1 text-[13.5px] text-[#0f1115]/78 dark:text-[#f2f4f7]/78 leading-relaxed">
                          {ag.observacaoEstado}
                        </p>
                      )}

                      {skills.length > 0 && (
                        <div className="mt-1 text-[12px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                          Habilidades: {skills.map((s) => s.nome).join(' · ')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0 pl-14 lg:pl-0">
                    {currentTask ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTaskId(currentTask.id);
                          setActiveSection('tarefas');
                        }}
                        className="eagle-btn-secondary h-8.5 px-3 text-[12.5px] font-medium inline-flex items-center gap-1.5 max-w-[260px] cursor-pointer"
                      >
                        <span className="tabular-nums text-[#163744] dark:text-[#9fdce6] shrink-0">
                          {currentTask.codigo}
                        </span>
                        <span className="truncate">{currentTask.titulo}</span>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveSection('tarefas')}
                        className="eagle-btn-secondary h-8.5 px-3 text-[12.5px] font-medium cursor-pointer"
                      >
                        Atribuir tarefa
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleAgentOperationalStatus(ag.id)}
                      className="eagle-btn-secondary h-8.5 px-3 text-[12.5px] font-medium inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {ag.estadoOperacional === 'trabalhando' ? (
                        <>
                          <Pause className="w-3 h-3" />
                          <span>Pausar</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3" />
                          <span>Ativar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* EQUIPE                                                                     */
/* -------------------------------------------------------------------------- */
export function TeamView({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const { state, inviteTeamMember } = useEagle();
  const [search, setSearch] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [email, setEmail] = useState('');
  const [acesso, setAcesso] = useState<Member['acesso']>('Operação');

  const people = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.members.filter(
      (m) =>
        m.tipo === 'pessoa' &&
        (!q ||
          m.nome.toLowerCase().includes(q) ||
          m.cargo.toLowerCase().includes(q) ||
          (m.email ?? '').toLowerCase().includes(q))
    );
  }, [state.members, search]);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) return;
    inviteTeamMember({
      nome,
      cargo: cargo || 'Especialista',
      email,
      acesso,
    });
    setNome('');
    setCargo('');
    setEmail('');
    setIsInviteOpen(false);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader
        title="Equipe"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar pessoa, cargo ou e-mail..."
        primaryAction={{
          label: 'Convidar pessoa',
          onClick: () => setIsInviteOpen(true),
        }}
        onOpenMobileMenu={onOpenMobileMenu}
      />

      <div className="flex-1 overflow-y-auto divide-y divide-[#0f1115]/8 dark:divide-[#f2f4f7]/8">
        {people.map((person) => {
          const activeTasks = state.tasks.filter(
            (t) =>
              t.responsavelId === person.id &&
              t.estado !== 'concluida' &&
              t.estado !== 'cancelada'
          ).length;

          return (
            <div
              key={person.id}
              className="px-6 lg:px-9 py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-[#f6f8fa]/70 dark:hover:bg-[#191d26]/55 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <MemberAvatar member={person} size="md" />
                <div className="min-w-0">
                  <div className="text-[14.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                    {person.nome}
                  </div>
                  <div className="text-[12.5px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55 truncate">
                    {person.cargo} · {person.email}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-5 text-[12.5px] shrink-0">
                <span className="text-[#0f1115]/55 dark:text-[#f2f4f7]/55 tabular-nums">
                  {activeTasks} {activeTasks === 1 ? 'tarefa' : 'tarefas'}
                </span>
                {person.convitePendente ? (
                  <StatusIndicator
                    label="Convite enviado"
                    dotClass="bg-[#b45309] dark:bg-[#fbbf24]"
                    textClass="text-[#92400e] dark:text-[#fbbf24]"
                  />
                ) : (
                  <StatusIndicator
                    label={person.acesso ?? 'Operação'}
                    dotClass="bg-[#15803d] dark:bg-[#4ade80]"
                    textClass="text-[#0f1115]/75 dark:text-[#f2f4f7]/75"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isInviteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1115]/55 backdrop-blur-xs p-4"
          onClick={() => setIsInviteOpen(false)}
        >
          <form
            onSubmit={handleInvite}
            onClick={(e) => e.stopPropagation()}
            className="eagle-modal w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                Convidar para a Eagle OS
              </h2>
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="eagle-btn-secondary w-7.5 h-7.5 inline-flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                  Nome completo
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Pedro Vasconcelos"
                  className="eagle-input w-full h-9.5 px-3 text-[13.5px]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                  Cargo no estúdio
                </label>
                <input
                  type="text"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  placeholder="Ex: Designer de Movimento"
                  className="eagle-input w-full h-9.5 px-3 text-[13.5px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@eagledigital.com.br"
                    className="eagle-input w-full h-9.5 px-3 text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                    Nível de acesso
                  </label>
                  <select
                    value={acesso}
                    onChange={(e) => setAcesso(e.target.value as Member['acesso'])}
                    className="eagle-input w-full h-9.5 px-3 text-[13px]"
                  >
                    <option value="Operação">Operação</option>
                    <option value="Direção">Direção</option>
                    <option value="Administrador">Administrador</option>
                    <option value="Convidado">Convidado</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="eagle-btn-secondary h-9 px-3.5 text-[13px] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="eagle-btn-primary h-9 px-4 text-[13px] font-medium cursor-pointer"
              >
                Enviar convite
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ROTINAS (com switch Figma nativo em CSS raiz)                              */
/* -------------------------------------------------------------------------- */
export function RoutinesView({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const {
    state,
    getMember,
    getProject,
    toggleRoutineActive,
    triggerRoutineNow,
    createRoutine,
  } = useEagle();

  const [search, setSearch] = useState('');
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [frequencia, setFrequencia] = useState('Toda segunda · 09:00');
  const [responsavelId, setResponsavelId] = useState('ag-sofia');
  const [projetoId, setProjetoId] = useState(state.projects[0]?.id ?? 'prj-eagle-ops');

  const routines = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.routines.filter(
      (r) =>
        !q ||
        r.titulo.toLowerCase().includes(q) ||
        r.frequencia.toLowerCase().includes(q)
    );
  }, [state.routines, search]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    createRoutine({
      titulo: titulo.trim(),
      frequencia,
      proximoDisparo: 'Seg, 16 Nov',
      responsavelId,
      projetoId,
      ativa: true,
    });
    setTitulo('');
    setIsNewOpen(false);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader
        title="Rotinas"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar rotina automática..."
        primaryAction={{
          label: 'Nova rotina',
          onClick: () => setIsNewOpen(true),
        }}
        onOpenMobileMenu={onOpenMobileMenu}
      />

      <div className="flex-1 overflow-y-auto divide-y divide-[#0f1115]/8 dark:divide-[#f2f4f7]/8">
        {routines.map((rot) => {
          const member = getMember(rot.responsavelId);
          const project = getProject(rot.projetoId);

          return (
            <div
              key={rot.id}
              className="px-6 lg:px-9 py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-[#f6f8fa]/70 dark:hover:bg-[#191d26]/55 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <MemberAvatar member={member} size="md" showOperationalRing />
                <div className="min-w-0">
                  <div className="text-[14.5px] font-medium text-[#0f1115] dark:text-[#f2f4f7]">
                    {rot.titulo}
                  </div>
                  <div className="text-[12px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55 tabular-nums mt-0.5">
                    {rot.frequencia} · {member?.nome} · {project?.nome}
                    {rot.ultimaExecucao ? ` · Última: ${rot.ultimaExecucao}` : ''}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3.5 shrink-0">
                <button
                  type="button"
                  onClick={() => triggerRoutineNow(rot.id)}
                  className="eagle-btn-secondary h-8 px-3 text-[12px] font-medium cursor-pointer"
                >
                  Executar agora
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={rot.ativa}
                  aria-label={`${rot.ativa ? 'Pausar' : 'Ativar'} ${rot.titulo}`}
                  onClick={() => toggleRoutineActive(rot.id)}
                  data-checked={rot.ativa}
                  className="eagle-switch cursor-pointer shrink-0"
                >
                  <span className="eagle-switch-thumb" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isNewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1115]/55 backdrop-blur-xs p-4"
          onClick={() => setIsNewOpen(false)}
        >
          <form
            onSubmit={handleCreate}
            onClick={(e) => e.stopPropagation()}
            className="eagle-modal w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                Nova rotina
              </h2>
              <button
                type="button"
                onClick={() => setIsNewOpen(false)}
                className="eagle-btn-secondary w-7.5 h-7.5 inline-flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                  Trabalho recorrente
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Resumo de entregas da semana por cliente"
                  className="eagle-input w-full h-9.5 px-3 text-[13.5px]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                  Frequência
                </label>
                <input
                  type="text"
                  value={frequencia}
                  onChange={(e) => setFrequencia(e.target.value)}
                  className="eagle-input w-full h-9.5 px-3 text-[13.5px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                    Responsável
                  </label>
                  <select
                    value={responsavelId}
                    onChange={(e) => setResponsavelId(e.target.value)}
                    className="eagle-input w-full h-9.5 px-3 text-[13px]"
                  >
                    {state.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                    Projeto
                  </label>
                  <select
                    value={projetoId}
                    onChange={(e) => setProjetoId(e.target.value)}
                    className="eagle-input w-full h-9.5 px-3 text-[13px]"
                  >
                    {state.projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewOpen(false)}
                className="eagle-btn-secondary h-9 px-3.5 text-[13px] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="eagle-btn-primary h-9 px-4 text-[13px] font-medium cursor-pointer"
              >
                Criar rotina
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* METAS (em árvore limpa)                                                    */
/* -------------------------------------------------------------------------- */
export function GoalsView({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const { state, getMember, updateGoalProgress } = useEagle();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'met-1': true,
    'met-2': true,
    'met-3': true,
  });

  const rootGoals = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.goals.filter(
      (g) => g.paiId === null && (!q || g.titulo.toLowerCase().includes(q))
    );
  }, [state.goals, search]);

  const renderGoalNode = (goal: Goal, depth = 0) => {
    const children = state.goals.filter((g) => g.paiId === goal.id);
    const hasChildren = children.length > 0;
    const isOpen = expanded[goal.id] ?? true;
    const owner = getMember(goal.responsavelId);

    const statusMeta =
      goal.status === 'concluida'
        ? {
            label: 'Concluída',
            dotClass: 'bg-[#15803d] dark:bg-[#4ade80]',
            textClass: 'text-[#166534] dark:text-[#4ade80]',
          }
        : goal.status === 'atencao'
          ? {
              label: 'Atenção',
              dotClass: 'bg-[#b45309] dark:bg-[#fbbf24]',
              textClass: 'text-[#92400e] dark:text-[#fbbf24]',
            }
          : {
              label: 'No prazo',
              dotClass: 'bg-[#163744] dark:bg-[#9fdce6]',
              textClass: 'text-[#163744] dark:text-[#9fdce6]',
            };

    return (
      <div
        key={goal.id}
        className={
          depth > 0
            ? 'ml-7 pl-5 border-l border-[#0f1115]/10 dark:border-[#f2f4f7]/10'
            : ''
        }
      >
        <div className="py-4 border-b border-[#0f1115]/6 dark:border-[#f2f4f7]/6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={() =>
                  setExpanded((prev) => ({ ...prev, [goal.id]: !isOpen }))
                }
                aria-label="Expandir sub-metas"
                className="mt-0.5 w-5.5 h-5.5 rounded-[7px] inline-flex items-center justify-center text-[#0f1115]/55 dark:text-[#f2f4f7]/55 hover:bg-[#ebeff3] dark:hover:bg-[#232934] cursor-pointer shrink-0"
              >
                {isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span className="w-5.5 shrink-0" />
            )}

            <div className="min-w-0">
              <div
                className={`${
                  depth === 0 ? 'text-[15px] font-semibold' : 'text-[13.5px] font-medium'
                } text-[#0f1115] dark:text-[#f2f4f7]`}
              >
                {goal.titulo}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                <MemberAvatar member={owner} size="xs" />
                <span>{owner?.nome}</span>
                <span>·</span>
                <span className="tabular-nums">{goal.prazo}</span>
                <span>·</span>
                <StatusIndicator
                  label={statusMeta.label}
                  dotClass={statusMeta.dotClass}
                  textClass={statusMeta.textClass}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="w-28 h-1.5 rounded-full bg-[#ebeff3] dark:bg-[#232934] overflow-hidden">
              <div
                className="h-full bg-[#163744] dark:bg-[#9fdce6] transition-all duration-200"
                style={{ width: `${goal.progresso}%` }}
              />
            </div>
            <span className="text-[13px] font-semibold tabular-nums w-10 text-right text-[#0f1115] dark:text-[#f2f4f7]">
              {goal.progresso}%
            </span>
            <button
              type="button"
              onClick={() => updateGoalProgress(goal.id, goal.progresso + 5)}
              title="Avançar progresso em 5%"
              className="eagle-btn-secondary w-7 h-7 inline-flex items-center justify-center cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {hasChildren && isOpen && (
          <div>{children.map((c) => renderGoalNode(c, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader
        title="Metas"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar objetivo da Eagle..."
        onOpenMobileMenu={onOpenMobileMenu}
      />

      <div className="flex-1 overflow-y-auto px-6 lg:px-9 py-4">
        <div className="max-w-4xl space-y-2">
          {rootGoals.map((g) => renderGoalNode(g))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* HABILIDADES (receitas dos agentes)                                         */
/* -------------------------------------------------------------------------- */
export function SkillsView({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const { state, getMember } = useEagle();
  const [search, setSearch] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState<string>(
    state.skills[0]?.id ?? ''
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.skills.filter(
      (s) =>
        !q ||
        s.nome.toLowerCase().includes(q) ||
        s.categoria.toLowerCase().includes(q) ||
        s.resumo.toLowerCase().includes(q)
    );
  }, [state.skills, search]);

  const activeSkill =
    state.skills.find((s) => s.id === selectedSkillId) ?? filtered[0] ?? null;

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader
        title="Habilidades"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar receita ou método de trabalho..."
        onOpenMobileMenu={onOpenMobileMenu}
      />

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] overflow-hidden">
        <div className="overflow-y-auto border-b lg:border-b-0 lg:border-r border-[#0f1115]/8 dark:border-[#f2f4f7]/8 divide-y divide-[#0f1115]/6 dark:divide-[#f2f4f7]/6">
          {filtered.map((sk) => {
            const selected = activeSkill?.id === sk.id;
            return (
              <button
                key={sk.id}
                type="button"
                onClick={() => setSelectedSkillId(sk.id)}
                className={`relative w-full text-left px-5 py-4 transition-colors cursor-pointer ${
                  selected
                    ? 'bg-[#ebeff3]/80 dark:bg-[#1e2530]'
                    : 'hover:bg-[#f6f8fa] dark:hover:bg-[#191d26]'
                }`}
              >
                {selected && (
                  <motion.span
                    layoutId="active-skill-bar"
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute left-1 top-3.5 bottom-3.5 w-[3px] rounded-full bg-[#163744] dark:bg-[#9fdce6]"
                    aria-hidden="true"
                  />
                )}
                <div className="flex items-center justify-between text-[11.5px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50">
                  <span className="font-medium text-[#163744] dark:text-[#9fdce6]">
                    {sk.categoria}
                  </span>
                  <span className="tabular-nums">{sk.usosRecentes} execuções</span>
                </div>
                <div className="mt-1 text-[14px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                  {sk.nome}
                </div>
              </button>
            );
          })}
        </div>

        {activeSkill && (
          <div className="p-6 lg:p-8 overflow-y-auto space-y-6">
            <div>
              <div className="text-[12px] font-medium text-[#163744] dark:text-[#9fdce6]">
                {activeSkill.categoria} · {activeSkill.usosRecentes} execuções no mês
              </div>
              <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-[#0f1115] dark:text-[#f2f4f7]">
                {activeSkill.nome}
              </h2>
              <p className="mt-2 text-[14px] text-[#0f1115]/75 dark:text-[#f2f4f7]/75 leading-relaxed max-w-2xl">
                {activeSkill.resumo}
              </p>
            </div>

            <div className="pt-5 border-t border-[#0f1115]/8 dark:border-[#f2f4f7]/8">
              <h3 className="text-[12px] font-medium text-[#0f1115]/50 dark:text-[#f2f4f7]/50 mb-3">
                Sequência de execução
              </h3>
              <ol className="divide-y divide-[#0f1115]/6 dark:divide-[#f2f4f7]/6 max-w-2xl">
                {activeSkill.passos.map((passo, idx) => (
                  <li
                    key={idx}
                    className="py-3 flex items-start gap-3.5 text-[13.5px] text-[#0f1115]/85 dark:text-[#f2f4f7]/85"
                  >
                    <span className="w-5.5 h-5.5 rounded-[7px] bg-[#163744] text-[#f2f4f7] dark:bg-[#9fdce6] dark:text-[#0f1115] text-[11px] font-semibold tabular-nums inline-flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{passo}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="pt-5 border-t border-[#0f1115]/8 dark:border-[#f2f4f7]/8">
              <h3 className="text-[12px] font-medium text-[#0f1115]/50 dark:text-[#f2f4f7]/50 mb-3">
                Agentes habilitados
              </h3>
              <div className="flex flex-wrap gap-3">
                {activeSkill.agentesIds.map((id) => {
                  const ag = getMember(id);
                  if (!ag) return null;
                  return (
                    <div
                      key={id}
                      className="eagle-card flex items-center gap-2.5 px-3 py-2"
                    >
                      <MemberAvatar member={ag} size="sm" showOperationalRing />
                      <div>
                        <div className="text-[13px] font-medium text-[#0f1115] dark:text-[#f2f4f7]">
                          {ag.nome}
                        </div>
                        <div className="text-[11.5px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                          {ag.cargo}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
