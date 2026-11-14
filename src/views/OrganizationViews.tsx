import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Clock,
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
import { BentoCard, MicroRing } from '../components/VisualWidgets';
import { useEagle } from '../context/EagleContext';
import { AgentOperationalStatus, Goal, Member } from '../types/eagle';
import { AGENT_STATUS_META } from '../utils/formatters';

/* -------------------------------------------------------------------------- */
/* AGENTES (Grade de cards operacionais de IA)                                */
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

  const allAgents = useMemo(
    () => state.members.filter((m) => m.tipo === 'agente'),
    [state.members]
  );

  const agents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allAgents.filter((m) => {
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
  }, [allAgents, search, statusFilter]);

  const counts = useMemo(() => {
    return {
      working: allAgents.filter((a) => a.estadoOperacional === 'trabalhando').length,
      idle: allAgents.filter((a) => a.estadoOperacional === 'parado').length,
      issue: allAgents.filter((a) => a.estadoOperacional === 'problema').length,
    };
  }, [allAgents]);

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

      <div className="flex-1 overflow-y-auto p-5 lg:p-7">
        <div className="max-w-[1380px] mx-auto space-y-5">
          {/* Resumo operacional em 3 blocos bento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <BentoCard
              onClick={() =>
                setStatusFilter(statusFilter === 'trabalhando' ? 'todos' : 'trabalhando')
              }
              className="p-4 flex items-center justify-between"
            >
              <div>
                <div className="text-[12px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                  Trabalhando agora
                </div>
                <div className="mt-1 text-[24px] font-semibold tabular-nums text-[#15803d] dark:text-[#4ade80]">
                  {String(counts.working).padStart(2, '0')}
                </div>
              </div>
              <StatusIndicator
                label="Ao vivo"
                dotClass="bg-[#15803d] dark:bg-[#4ade80]"
                textClass="text-[#166534] dark:text-[#4ade80]"
                live={counts.working > 0}
              />
            </BentoCard>

            <BentoCard
              onClick={() =>
                setStatusFilter(statusFilter === 'parado' ? 'todos' : 'parado')
              }
              className="p-4 flex items-center justify-between"
            >
              <div>
                <div className="text-[12px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                  Disponíveis
                </div>
                <div className="mt-1 text-[24px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                  {String(counts.idle).padStart(2, '0')}
                </div>
              </div>
              <StatusIndicator
                label="Parados"
                dotClass="bg-[#6b7280] dark:bg-[#9ca3af]"
                textClass="text-[#0f1115]/58 dark:text-[#f2f4f7]/58"
              />
            </BentoCard>

            <BentoCard
              onClick={() =>
                setStatusFilter(statusFilter === 'problema' ? 'todos' : 'problema')
              }
              className="p-4 flex items-center justify-between"
            >
              <div>
                <div className="text-[12px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                  Precisam de atenção
                </div>
                <div className="mt-1 text-[24px] font-semibold tabular-nums text-[#b91c1c] dark:text-[#f87171]">
                  {String(counts.issue).padStart(2, '0')}
                </div>
              </div>
              <StatusIndicator
                label="Com problema"
                dotClass="bg-[#b91c1c] dark:bg-[#f87171]"
                textClass="text-[#991b1b] dark:text-[#f87171]"
              />
            </BentoCard>
          </div>

          {agents.length === 0 ? (
            <EmptyState title="Nenhum agente encontrado com esse filtro." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {agents.map((ag) => {
                const st = AGENT_STATUS_META[ag.estadoOperacional ?? 'parado'];
                const currentTask = ag.tarefaAtualId
                  ? getTask(ag.tarefaAtualId)
                  : undefined;
                const skills = state.skills.filter((s) =>
                  ag.habilidadesIds?.includes(s.id)
                );
                const totalSub = currentTask?.subtarefas.length ?? 0;
                const doneSub =
                  currentTask?.subtarefas.filter((s) => s.concluida).length ?? 0;

                return (
                  <BentoCard
                    key={ag.id}
                    className="flex flex-col justify-between overflow-hidden"
                  >
                    <div className="p-5 space-y-4">
                      {/* Topo: avatar + nome + estado */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <MemberAvatar member={ag} size="lg" showOperationalRing />
                          <div className="min-w-0">
                            <h2 className="text-[15.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                              {ag.nome}
                            </h2>
                            <div className="text-[12px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 truncate">
                              {ag.cargo}
                            </div>
                          </div>
                        </div>

                        <StatusIndicator
                          label={st.label}
                          dotClass={st.dotClass}
                          textClass={st.textClass}
                          live={ag.estadoOperacional === 'trabalhando'}
                        />
                      </div>

                      {/* Bloco do que está fazendo agora */}
                      <div className="rounded-[12px] bg-[#f2f4f7]/85 dark:bg-[#10141b] p-3.5 space-y-2.5">
                        <p className="text-[12.5px] text-[#0f1115]/78 dark:text-[#f2f4f7]/78 leading-snug line-clamp-2">
                          {ag.observacaoEstado ?? 'Pronto para receber uma nova tarefa.'}
                        </p>

                        {currentTask && (
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between gap-2 text-[11.5px]">
                              <span className="font-semibold text-[#163744] dark:text-[#9fdce6] tabular-nums">
                                {currentTask.codigo}
                              </span>
                              {totalSub > 0 && (
                                <span className="text-[#0f1115]/48 dark:text-[#f2f4f7]/48 tabular-nums">
                                  {doneSub}/{totalSub} etapas
                                </span>
                              )}
                            </div>
                            {totalSub > 0 && (
                              <div className="h-1 w-full rounded-full bg-[#e6e9ed] dark:bg-[#232934] overflow-hidden">
                                <div
                                  className="h-full bg-[#163744] dark:bg-[#9fdce6] rounded-full transition-all duration-300"
                                  style={{
                                    width: `${Math.round((doneSub / totalSub) * 100)}%`,
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {skills.length > 0 && (
                        <div className="text-[11.5px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 truncate">
                          {skills.map((s) => s.nome).join(' · ')}
                        </div>
                      )}
                    </div>

                    {/* Dock inferior de ações */}
                    <div className="px-5 py-3 border-t border-[#0f1115]/7 dark:border-[#f2f4f7]/7 bg-[#f2f4f7]/45 dark:bg-[#11141a] flex items-center justify-between gap-2">
                      {currentTask ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTaskId(currentTask.id);
                            setActiveSection('tarefas');
                          }}
                          className="text-[12px] font-medium text-[#163744] dark:text-[#9fdce6] hover:underline inline-flex items-center gap-1 truncate cursor-pointer"
                        >
                          <span className="truncate">Abrir {currentTask.codigo}</span>
                          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveSection('tarefas')}
                          className="text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 hover:text-[#163744] dark:hover:text-[#9fdce6] cursor-pointer"
                        >
                          Atribuir tarefa
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleAgentOperationalStatus(ag.id)}
                        className="eagle-btn-secondary h-7.5 px-3 text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer shrink-0"
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
                  </BentoCard>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* EQUIPE (Cards limpos de pessoas e acesso)                                  */
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

      <div className="flex-1 overflow-y-auto p-5 lg:p-7">
        <div className="max-w-[1380px] mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {people.map((person) => {
            const activeTasks = state.tasks.filter(
              (t) =>
                t.responsavelId === person.id &&
                t.estado !== 'concluida' &&
                t.estado !== 'cancelada'
            ).length;
            const reviewTasks = state.tasks.filter(
              (t) =>
                t.revisorId === person.id &&
                t.estado === 'em_revisao'
            ).length;

            return (
              <BentoCard key={person.id} className="p-5 flex flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <MemberAvatar member={person} size="lg" />
                    <div className="min-w-0">
                      <h2 className="text-[15px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                        {person.nome}
                      </h2>
                      <div className="text-[12px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 truncate">
                        {person.cargo}
                      </div>
                    </div>
                  </div>

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

                <div className="rounded-[12px] bg-[#f2f4f7]/80 dark:bg-[#10141b] px-3.5 py-2.5 grid grid-cols-2 gap-3 tabular-nums">
                  <div>
                    <div className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                      Tarefas atribuídas
                    </div>
                    <div className="text-[16px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                      {activeTasks}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                      Em revisão com você
                    </div>
                    <div className="text-[16px] font-semibold text-[#163744] dark:text-[#9fdce6]">
                      {reviewTasks}
                    </div>
                  </div>
                </div>

                <div className="text-[12px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55 truncate">
                  {person.email}
                </div>
              </BentoCard>
            );
          })}
        </div>
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
/* ROTINAS (Cards modulares com switch CSS raiz e execução imediata)          */
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

      <div className="flex-1 overflow-y-auto p-5 lg:p-7">
        <div className="max-w-[1380px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4">
          {routines.map((rot) => {
            const member = getMember(rot.responsavelId);
            const project = getProject(rot.projetoId);

            return (
              <BentoCard
                key={rot.id}
                className={`flex flex-col justify-between overflow-hidden ${
                  rot.ativa ? '' : 'opacity-75'
                }`}
              >
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-[15.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] leading-snug">
                        {rot.titulo}
                      </h2>
                      <div className="mt-1 text-[12px] text-[#163744] dark:text-[#9fdce6] font-medium">
                        {project?.nome}
                      </div>
                    </div>

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

                  <div className="rounded-[12px] bg-[#f2f4f7]/80 dark:bg-[#10141b] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[12px]">
                    <span className="inline-flex items-center gap-1.5 font-medium text-[#0f1115]/80 dark:text-[#f2f4f7]/80 tabular-nums">
                      <Clock className="w-3.5 h-3.5 text-[#163744] dark:text-[#9fdce6]" />
                      <span>{rot.frequencia}</span>
                    </span>
                    <span className="text-[#0f1115]/48 dark:text-[#f2f4f7]/48 tabular-nums">
                      Próxima: {rot.proximoDisparo}
                    </span>
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-[#0f1115]/7 dark:border-[#f2f4f7]/7 bg-[#f2f4f7]/45 dark:bg-[#11141a] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <MemberAvatar member={member} size="xs" showOperationalRing />
                    <span className="text-[12px] text-[#0f1115]/72 dark:text-[#f2f4f7]/72 truncate">
                      {member?.nome}
                      {rot.ultimaExecucao ? ` · Última ${rot.ultimaExecucao}` : ''}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => triggerRoutineNow(rot.id)}
                    className="eagle-btn-secondary h-7.5 px-3 text-[12px] font-medium cursor-pointer shrink-0"
                  >
                    Executar agora
                  </button>
                </div>
              </BentoCard>
            );
          })}
        </div>
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
/* METAS (Árvore visual em blocos bento com anel de progresso)                */
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

  const getStatusMeta = (status: Goal['status']) =>
    status === 'concluida'
      ? {
          label: 'Concluída',
          dotClass: 'bg-[#15803d] dark:bg-[#4ade80]',
          textClass: 'text-[#166534] dark:text-[#4ade80]',
          tone: 'success' as const,
        }
      : status === 'atencao'
        ? {
            label: 'Atenção',
            dotClass: 'bg-[#b45309] dark:bg-[#fbbf24]',
            textClass: 'text-[#92400e] dark:text-[#fbbf24]',
            tone: 'warning' as const,
          }
        : {
            label: 'No prazo',
            dotClass: 'bg-[#163744] dark:bg-[#9fdce6]',
            textClass: 'text-[#163744] dark:text-[#9fdce6]',
            tone: 'accent' as const,
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

      <div className="flex-1 overflow-y-auto p-5 lg:p-7">
        <div className="max-w-5xl mx-auto space-y-4">
          {rootGoals.map((goal) => {
            const children = state.goals.filter((g) => g.paiId === goal.id);
            const hasChildren = children.length > 0;
            const isOpen = expanded[goal.id] ?? true;
            const owner = getMember(goal.responsavelId);
            const meta = getStatusMeta(goal.status);

            return (
              <BentoCard key={goal.id} className="p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {hasChildren ? (
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded((prev) => ({ ...prev, [goal.id]: !isOpen }))
                        }
                        aria-label="Expandir sub-metas"
                        className="mt-1 w-6.5 h-6.5 rounded-[8px] inline-flex items-center justify-center text-[#0f1115]/55 dark:text-[#f2f4f7]/55 hover:bg-[#ebeff3] dark:hover:bg-[#232934] cursor-pointer shrink-0"
                      >
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    ) : (
                      <span className="w-6.5 shrink-0" />
                    )}

                    <div className="min-w-0">
                      <h2 className="text-[16px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                        {goal.titulo}
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                        <MemberAvatar member={owner} size="xs" />
                        <span>{owner?.nome}</span>
                        <span>·</span>
                        <span className="tabular-nums">{goal.prazo}</span>
                        <span>·</span>
                        <StatusIndicator
                          label={meta.label}
                          dotClass={meta.dotClass}
                          textClass={meta.textClass}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <MicroRing
                      value={goal.progresso}
                      size={46}
                      strokeWidth={4}
                      label={`${goal.progresso}%`}
                      tone={meta.tone}
                    />
                    <button
                      type="button"
                      onClick={() => updateGoalProgress(goal.id, goal.progresso + 5)}
                      title="Avançar progresso em 5%"
                      className="eagle-btn-secondary h-8 px-2.5 text-[12px] font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>5%</span>
                    </button>
                  </div>
                </div>

                {hasChildren && isOpen && (
                  <div className="rounded-[12px] bg-[#f2f4f7]/80 dark:bg-[#10141b] divide-y divide-[#0f1115]/6 dark:divide-[#f2f4f7]/6">
                    {children.map((child) => {
                      const cOwner = getMember(child.responsavelId);
                      const cMeta = getStatusMeta(child.status);
                      return (
                        <div
                          key={child.id}
                          className="px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-[13.5px] font-medium text-[#0f1115] dark:text-[#f2f4f7]">
                              {child.titulo}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                              <MemberAvatar member={cOwner} size="xs" />
                              <span>{cOwner?.nome}</span>
                              <span>·</span>
                              <span className="tabular-nums">{child.prazo}</span>
                              <span>·</span>
                              <StatusIndicator
                                label={cMeta.label}
                                dotClass={cMeta.dotClass}
                                textClass={cMeta.textClass}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="w-24 h-1.5 rounded-full bg-[#e6e9ed] dark:bg-[#232934] overflow-hidden">
                              <div
                                className="h-full bg-[#163744] dark:bg-[#9fdce6] rounded-full transition-all duration-200"
                                style={{ width: `${child.progresso}%` }}
                              />
                            </div>
                            <span className="text-[12.5px] font-semibold tabular-nums w-9 text-right text-[#0f1115] dark:text-[#f2f4f7]">
                              {child.progresso}%
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateGoalProgress(child.id, child.progresso + 5)
                              }
                              title="Avançar progresso em 5%"
                              className="eagle-btn-secondary w-7 h-7 inline-flex items-center justify-center cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </BentoCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* HABILIDADES (Receitas estruturadas em etapas modulares)                    */
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

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[330px_minmax(0,1fr)] overflow-hidden">
        <div className="overflow-y-auto border-b lg:border-b-0 lg:border-r border-[#0f1115]/8 dark:border-[#f2f4f7]/8 divide-y divide-[#0f1115]/6 dark:divide-[#f2f4f7]/6 bg-white/55 dark:bg-[#15181f]/55">
          {filtered.map((sk) => {
            const selected = activeSkill?.id === sk.id;
            return (
              <button
                key={sk.id}
                type="button"
                onClick={() => setSelectedSkillId(sk.id)}
                className={`relative w-full text-left px-5 py-4 transition-colors cursor-pointer ${
                  selected
                    ? 'bg-white dark:bg-[#1b2029]'
                    : 'hover:bg-white/75 dark:hover:bg-[#181c24]'
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
          <div className="p-5 lg:p-7 overflow-y-auto space-y-5">
            <BentoCard className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#163744] dark:text-[#9fdce6] font-medium">
                <span>{activeSkill.categoria}</span>
                <span className="tabular-nums text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                  {activeSkill.usosRecentes} execuções no mês
                </span>
              </div>
              <h2 className="mt-1.5 text-[20px] font-semibold tracking-[-0.02em] text-[#0f1115] dark:text-[#f2f4f7]">
                {activeSkill.nome}
              </h2>
              <p className="mt-2 text-[13.5px] text-[#0f1115]/72 dark:text-[#f2f4f7]/72 leading-relaxed max-w-2xl">
                {activeSkill.resumo}
              </p>
            </BentoCard>

            <div className="space-y-3">
              <h3 className="text-[12.5px] font-semibold text-[#0f1115]/60 dark:text-[#f2f4f7]/60">
                Sequência de execução
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeSkill.passos.map((passo, idx) => (
                  <BentoCard key={idx} className="p-4 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-[8px] bg-[#163744] text-[#f2f4f7] dark:bg-[#9fdce6] dark:text-[#0f1115] text-[11.5px] font-semibold tabular-nums inline-flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-[13.5px] text-[#0f1115]/85 dark:text-[#f2f4f7]/85 leading-snug">
                      {passo}
                    </span>
                  </BentoCard>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[12.5px] font-semibold text-[#0f1115]/60 dark:text-[#f2f4f7]/60">
                Agentes habilitados
              </h3>
              <div className="flex flex-wrap gap-3">
                {activeSkill.agentesIds.map((id) => {
                  const ag = getMember(id);
                  if (!ag) return null;
                  return (
                    <BentoCard
                      key={id}
                      className="flex items-center gap-2.5 px-3.5 py-2.5"
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
                    </BentoCard>
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
