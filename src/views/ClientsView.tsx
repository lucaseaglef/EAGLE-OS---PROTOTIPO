import React, { useMemo, useState } from 'react';
import { ArrowRight, Building2, X } from 'lucide-react';
import {
  EmptyState,
  PageHeader,
  SegmentedControl,
  StatusIndicator,
} from '../components/SharedUI';
import { useEagle } from '../context/EagleContext';
import { formatShortDate, PROJECT_STATUS_META } from '../utils/formatters';

export function ClientsView({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const {
    state,
    createClient,
    setActiveSection,
    setSelectedProjectId,
    getMember,
  } = useEagle();

  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<'todos' | 'externos' | 'internos'>('todos');
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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    createClient({
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

      <div className="flex-1 overflow-y-auto divide-y divide-[#0f1115]/8 dark:divide-[#f2f4f7]/8">
        {filteredClients.length === 0 ? (
          <div className="p-6 lg:p-9 max-w-4xl mx-auto">
            <EmptyState
              title="Nenhum cliente encontrado."
              actionLabel="Cadastrar cliente"
              onAction={() => setIsNewModalOpen(true)}
            />
          </div>
        ) : (
          filteredClients.map((client) => {
            const projects = state.projects.filter((p) => p.clienteId === client.id);

            return (
              <section key={client.id} className="px-6 lg:px-9 py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-[10px] bg-[#ebeff3] dark:bg-[#1e2530] border border-[#0f1115]/8 dark:border-[#f2f4f7]/8 text-[#163744] dark:text-[#9fdce6] inline-flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-[#0f1115] dark:text-[#f2f4f7] truncate">
                          {client.nome}
                        </h2>
                        {client.isInterno && (
                          <span className="text-[12px] font-medium text-[#163744] dark:text-[#9fdce6]">
                            · Estúdio interno
                          </span>
                        )}
                      </div>
                      <div className="text-[12.5px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55 truncate">
                        {client.segmento} · {client.contatoPrincipal}
                      </div>
                    </div>
                  </div>

                  <span className="text-[12px] font-medium text-[#0f1115]/50 dark:text-[#f2f4f7]/50 tabular-nums">
                    {projects.length} {projects.length === 1 ? 'projeto' : 'projetos'}
                  </span>
                </div>

                {projects.length > 0 && (
                  <div className="mt-3 pl-12 divide-y divide-[#0f1115]/5 dark:divide-[#f2f4f7]/5">
                    {projects.map((proj) => {
                      const leader = getMember(proj.liderId);
                      const meta = PROJECT_STATUS_META[proj.estado];
                      const openTasks = state.tasks.filter(
                        (t) =>
                          t.projetoId === proj.id &&
                          t.estado !== 'concluida' &&
                          t.estado !== 'cancelada'
                      ).length;

                      return (
                        <button
                          key={proj.id}
                          type="button"
                          onClick={() => {
                            setSelectedProjectId(proj.id);
                            setActiveSection('projetos');
                          }}
                          className="w-full py-2.5 px-2.5 -mx-2.5 rounded-[10px] flex flex-wrap items-center justify-between gap-3 text-left hover:bg-[#f6f8fa] dark:hover:bg-[#191d26] transition-colors cursor-pointer group"
                        >
                          <div className="min-w-0">
                            <div className="text-[13.5px] font-medium text-[#0f1115] dark:text-[#f2f4f7] truncate">
                              {proj.nome}
                            </div>
                            <div className="text-[12px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 tabular-nums mt-0.5">
                              {proj.configuracoes.disciplina} · Líder {leader?.nome} ·{' '}
                              {openTasks} em aberto · Entrega {formatShortDate(proj.prazoEntrega)}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <StatusIndicator
                              label={meta.label}
                              dotClass={meta.dotClass}
                              textClass={meta.textClass}
                            />
                            <ArrowRight className="w-3.5 h-3.5 text-[#0f1115]/30 dark:text-[#f2f4f7]/30 group-hover:text-[#163744] dark:group-hover:text-[#9fdce6] transition-colors" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>

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
