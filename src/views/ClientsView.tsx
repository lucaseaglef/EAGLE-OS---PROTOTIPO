import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ArrowUpRight, FileText, Folder, X } from 'lucide-react';
import {
  EmptyState,
  MemberAvatar,
  PageHeader,
  SegmentedControl,
  StatusIndicator,
} from '../components/SharedUI';
import { BentoCard, MicroRing, ProportionBar } from '../components/VisualWidgets';
import { useEagle } from '../context/EagleContext';
import { formatBRL, formatShortDate, PROJECT_STATUS_META } from '../utils/formatters';

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function ClientsView({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const {
    state,
    createClient,
    setActiveSection,
    setSelectedProjectId,
    setPreviewArtifact,
    getMember,
  } = useEagle();

  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<'todos' | 'externos' | 'internos'>('todos');
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const [nome, setNome] = useState('');
  const [segmento, setSegmento] = useState('');
  const [contato, setContato] = useState('');
  const [isInterno, setIsInterno] = useState(false);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.clients.filter((c) => {
      if (scope === 'externos' && c.isInterno) return false;
      if (scope === 'internos' && !c.isInterno) return false;
      if (q) {
        return (
          c.nome.toLowerCase().includes(q) ||
          c.segmento.toLowerCase().includes(q) ||
          c.contatoPrincipal.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [state.clients, scope, search]);

  const activeClient = useMemo(
    () => state.clients.find((c) => c.id === activeClientId) ?? null,
    [state.clients, activeClientId]
  );

  const handleCreate = (e: React.FormEvent) => {
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
    setActiveClientId(created.id);
  };

  const filtersSlot = (
    <SegmentedControl
      layoutId="clients-scope"
      ariaLabel="Filtrar clientes"
      value={scope}
      onChange={setScope}
      options={[
        { id: 'todos', label: 'Todos' },
        { id: 'externos', label: 'Clientes' },
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

      <div className="flex-1 overflow-y-auto p-5 lg:p-7">
        {filteredClients.length === 0 ? (
          <div className="max-w-3xl mx-auto pt-4">
            <EmptyState
              title="Nenhum cliente encontrado."
              actionLabel="Cadastrar cliente"
              onAction={() => setIsNewModalOpen(true)}
            />
          </div>
        ) : (
          <div className="max-w-[1380px] mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredClients.map((client) => {
              const projects = state.projects.filter((p) => p.clienteId === client.id);
              const projectIds = new Set(projects.map((p) => p.id));
              const clientTasks = state.tasks.filter((t) => projectIds.has(t.projetoId));
              const doneTasks = clientTasks.filter((t) => t.estado === 'concluida').length;
              const openTasks = clientTasks.filter(
                (t) => t.estado !== 'concluida' && t.estado !== 'cancelada'
              ).length;
              const blockedTasks = clientTasks.filter((t) => t.estado === 'bloqueada').length;
              const artifactsCount = clientTasks.reduce(
                (sum, t) => sum + t.artefatos.length,
                0
              );

              return (
                <BentoCard
                  key={client.id}
                  onClick={() => setActiveClientId(client.id)}
                  className="p-5 flex flex-col justify-between gap-4 group"
                >
                  {/* Identidade do cliente */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-[12px] inline-flex items-center justify-center text-[13.5px] font-semibold tracking-tight shrink-0 ${
                          client.isInterno
                            ? 'bg-[#163744] text-[#f2f4f7] dark:bg-[#9fdce6] dark:text-[#0f1115]'
                            : 'bg-[#ebeff3] text-[#0f1115] dark:bg-[#222833] dark:text-[#f2f4f7]'
                        }`}
                      >
                        {getInitials(client.nome)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h2 className="text-[15.5px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7] truncate">
                            {client.nome}
                          </h2>
                        </div>
                        <div className="text-[12px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 truncate">
                          {client.isInterno ? `Estúdio interno · ${client.segmento}` : client.segmento}
                        </div>
                      </div>
                    </div>

                    <ArrowUpRight className="w-4 h-4 text-[#0f1115]/28 dark:text-[#f2f4f7]/28 group-hover:text-[#163744] dark:group-hover:text-[#9fdce6] transition-colors shrink-0" />
                  </div>

                  {/* Contadores visuais compactos */}
                  <div className="rounded-[12px] bg-[#f2f4f7]/80 dark:bg-[#10141b] px-3.5 py-2.5 grid grid-cols-3 gap-2 tabular-nums">
                    <div>
                      <div className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                        Projetos
                      </div>
                      <div className="text-[16px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                        {projects.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                        Em aberto
                      </div>
                      <div className="text-[16px] font-semibold text-[#163744] dark:text-[#9fdce6]">
                        {openTasks}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                        Entregas
                      </div>
                      <div className="text-[16px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                        {artifactsCount}
                      </div>
                    </div>
                  </div>

                  {/* Progresso da conta + Contato */}
                  <div className="space-y-2.5">
                    <div className="space-y-1.5">
                      <ProportionBar
                        heightClass="h-1.5"
                        segments={[
                          {
                            key: 'done',
                            value: doneTasks,
                            colorClass: 'bg-[#15803d] dark:bg-[#4ade80]',
                          },
                          {
                            key: 'open',
                            value: Math.max(0, openTasks - blockedTasks),
                            colorClass: 'bg-[#163744] dark:bg-[#9fdce6]',
                          },
                          {
                            key: 'blocked',
                            value: blockedTasks,
                            colorClass: 'bg-[#b91c1c] dark:bg-[#f87171]',
                          },
                        ]}
                      />
                      <div className="flex items-center justify-between text-[11.5px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 tabular-nums">
                        <span>
                          {doneTasks}/{clientTasks.length} tarefas concluídas
                        </span>
                        {blockedTasks > 0 && (
                          <span className="text-[#b91c1c] dark:text-[#f87171] font-medium">
                            {blockedTasks} travada{blockedTasks > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-[#0f1115]/6 dark:border-[#f2f4f7]/6 flex items-center justify-between gap-2 text-[12px]">
                      <span className="text-[#0f1115]/60 dark:text-[#f2f4f7]/60 truncate">
                        {client.contatoPrincipal}
                      </span>
                      <span className="font-medium text-[#163744] dark:text-[#9fdce6] shrink-0">
                        Abrir ficha
                      </span>
                    </div>
                  </div>
                </BentoCard>
              );
            })}
          </div>
        )}
      </div>

      {/* DOSSIÊ COMPLETO DO CLIENTE (GAVETA LATERAL) */}
      <AnimatePresence>
        {activeClient && (() => {
          const clientProjects = state.projects.filter(
            (p) => p.clienteId === activeClient.id
          );
          const projIds = new Set(clientProjects.map((p) => p.id));
          const clientTasks = state.tasks.filter((t) => projIds.has(t.projetoId));
          const openTasks = clientTasks.filter(
            (t) => t.estado !== 'concluida' && t.estado !== 'cancelada'
          );
          const clientArtifacts = clientTasks.flatMap((t) =>
            t.artefatos.map((a) => ({ artifact: a, taskId: t.id, taskCode: t.codigo }))
          );
          const clientFinances = state.finances.filter(
            (f) => f.clienteId === activeClient.id
          );
          const totalInflows = clientFinances
            .filter((f) => f.tipo === 'receber')
            .reduce((acc, f) => acc + f.valorCentavos, 0);

          return (
            <div
              key="client-dossier"
              className="fixed inset-0 z-40 flex justify-end bg-[#0f1115]/45 backdrop-blur-xs p-2 sm:p-3"
              onClick={() => setActiveClientId(null)}
            >
              <motion.aside
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="eagle-sheet w-full max-w-2xl h-full flex flex-col overflow-hidden"
              >
                {/* Topo da ficha */}
                <div className="px-6 py-5 border-b border-[#0f1115]/8 dark:border-[#f2f4f7]/8 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-[14px] inline-flex items-center justify-center text-[15px] font-semibold shrink-0 ${
                        activeClient.isInterno
                          ? 'bg-[#163744] text-[#f2f4f7] dark:bg-[#9fdce6] dark:text-[#0f1115]'
                          : 'bg-[#ebeff3] text-[#0f1115] dark:bg-[#222833] dark:text-[#f2f4f7]'
                      }`}
                    >
                      {getInitials(activeClient.nome)}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-[#0f1115] dark:text-[#f2f4f7] truncate">
                        {activeClient.nome}
                      </h2>
                      <p className="text-[12.5px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55 truncate">
                        {activeClient.segmento} · {activeClient.contatoPrincipal}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveClientId(null)}
                    aria-label="Fechar ficha do cliente"
                    className="eagle-btn-secondary w-8.5 h-8.5 inline-flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Corpo rolável do dossiê */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Resumo visual em 3 blocos */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-[12px] bg-[#f2f4f7]/80 dark:bg-[#10141b] p-3.5">
                      <div className="text-[11.5px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50">
                        Projetos
                      </div>
                      <div className="mt-1 text-[20px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                        {clientProjects.length}
                      </div>
                    </div>
                    <div className="rounded-[12px] bg-[#f2f4f7]/80 dark:bg-[#10141b] p-3.5">
                      <div className="text-[11.5px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50">
                        Tarefas em aberto
                      </div>
                      <div className="mt-1 text-[20px] font-semibold tabular-nums text-[#163744] dark:text-[#9fdce6]">
                        {openTasks.length}
                      </div>
                    </div>
                    <div className="rounded-[12px] bg-[#f2f4f7]/80 dark:bg-[#10141b] p-3.5">
                      <div className="text-[11.5px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50">
                        Receita vinculada
                      </div>
                      <div className="mt-1 text-[18px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7] truncate">
                        {formatBRL(totalInflows)}
                      </div>
                    </div>
                  </div>

                  {/* Projetos da conta */}
                  <section className="space-y-3">
                    <h3 className="text-[13.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                      Projetos da conta
                    </h3>

                    {clientProjects.length === 0 ? (
                      <p className="text-[13px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                        Nenhum projeto cadastrado para este cliente ainda.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {clientProjects.map((proj) => {
                          const leader = getMember(proj.liderId);
                          const meta = PROJECT_STATUS_META[proj.estado];
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
                                setActiveClientId(null);
                                setActiveSection('projetos');
                              }}
                              className="rounded-[14px] bg-[#f2f4f7]/80 dark:bg-[#10141b] hover:bg-[#ebeff3] dark:hover:bg-[#1b2029] p-4 text-left transition-colors cursor-pointer flex flex-col justify-between gap-3 group"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="inline-flex items-center gap-1.5 text-[11.5px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50">
                                    <Folder className="w-3 h-3" />
                                    <span className="truncate">
                                      {proj.configuracoes.disciplina}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-[14px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] leading-snug group-hover:text-[#163744] dark:group-hover:text-[#9fdce6] transition-colors">
                                    {proj.nome}
                                  </div>
                                </div>

                                <MicroRing
                                  value={pct}
                                  size={38}
                                  strokeWidth={3.5}
                                  label={`${pct}%`}
                                />
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-1 text-[11.5px] text-[#0f1115]/58 dark:text-[#f2f4f7]/58">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <MemberAvatar member={leader} size="xs" />
                                  <span className="truncate">{leader?.nome}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 tabular-nums">
                                  <StatusIndicator
                                    label={meta.label}
                                    dotClass={meta.dotClass}
                                    textClass={meta.textClass}
                                  />
                                  <ArrowRight className="w-3.5 h-3.5 opacity-45 group-hover:opacity-100" />
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  {/* Entregas e artefatos */}
                  {clientArtifacts.length > 0 && (
                    <section className="space-y-3">
                      <h3 className="text-[13.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                        Entregas recentes
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {clientArtifacts.slice(0, 4).map(({ artifact, taskId, taskCode }) => (
                          <button
                            key={artifact.id}
                            type="button"
                            onClick={() => setPreviewArtifact({ artifact, taskId })}
                            className="rounded-[12px] bg-[#f2f4f7]/80 dark:bg-[#10141b] hover:bg-[#ebeff3] dark:hover:bg-[#1b2029] overflow-hidden text-left transition-colors cursor-pointer flex items-center gap-3 p-2.5"
                          >
                            {artifact.previewUrl ? (
                              <img
                                src={artifact.previewUrl}
                                alt={artifact.titulo}
                                referrerPolicy="no-referrer"
                                className="w-16 h-12 rounded-[8px] object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-16 h-12 rounded-[8px] bg-white dark:bg-[#15181f] flex items-center justify-center text-[#163744] dark:text-[#9fdce6] shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="text-[12.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                                {artifact.titulo}
                              </div>
                              <div className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 tabular-nums truncate">
                                {taskCode} · {artifact.versao} · {artifact.formato}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Lançamentos financeiros vinculados */}
                  {clientFinances.length > 0 && (
                    <section className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[13.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                          Movimento financeiro
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveClientId(null);
                            setActiveSection('financeiro');
                          }}
                          className="text-[12px] font-medium text-[#163744] dark:text-[#9fdce6] hover:underline cursor-pointer"
                        >
                          Ver no Financeiro
                        </button>
                      </div>

                      <div className="rounded-[12px] bg-[#f2f4f7]/80 dark:bg-[#10141b] divide-y divide-[#0f1115]/6 dark:divide-[#f2f4f7]/6">
                        {clientFinances.map((entry) => (
                          <div
                            key={entry.id}
                            className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-[12.5px]"
                          >
                            <div className="min-w-0">
                              <div className="font-medium text-[#0f1115] dark:text-[#f2f4f7] truncate">
                                {entry.descricao}
                              </div>
                              <div className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 tabular-nums">
                                Vencimento {formatShortDate(entry.vencimento)} ·{' '}
                                {entry.status === 'liquidado' ? 'Liquidado' : 'Em aberto'}
                              </div>
                            </div>
                            <span className="font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7] shrink-0">
                              {entry.tipo === 'receber' ? '+' : '−'}{' '}
                              {formatBRL(entry.valorCentavos)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </motion.aside>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* MODAL NOVO CLIENTE */}
      {isNewModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1115]/55 backdrop-blur-xs p-4"
          onClick={() => setIsNewModalOpen(false)}
        >
          <form
            onSubmit={handleCreate}
            onClick={(e) => e.stopPropagation()}
            className="eagle-modal w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                Novo cliente
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
                Salvar cliente
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
