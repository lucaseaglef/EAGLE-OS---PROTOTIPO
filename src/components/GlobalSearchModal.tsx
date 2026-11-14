import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Search, X } from 'lucide-react';
import { useEagle } from '../context/EagleContext';
import { formatBRL } from '../utils/formatters';

interface SearchResult {
  id: string;
  kind: 'Tarefa' | 'Decisão' | 'Projeto' | 'Cliente' | 'Agente' | 'Financeiro';
  title: string;
  subtitle: string;
  onSelect: () => void;
}

export function GlobalSearchModal() {
  const {
    state,
    isSearchOpen,
    setIsSearchOpen,
    setActiveSection,
    setSelectedTaskId,
    setSelectedProjectId,
    getProject,
    getClient,
    getMember,
  } = useEagle();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      setQuery('');
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isSearchOpen]);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();

    const taskResults: SearchResult[] = state.tasks
      .filter(
        (t) =>
          !q ||
          t.titulo.toLowerCase().includes(q) ||
          t.codigo.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        kind: 'Tarefa',
        title: `${t.codigo} · ${t.titulo}`,
        subtitle: `${getProject(t.projetoId)?.nome ?? ''} · ${getMember(t.responsavelId)?.nome ?? ''}`,
        onSelect: () => {
          setActiveSection('tarefas');
          setSelectedTaskId(t.id);
          setIsSearchOpen(false);
        },
      }));

    const decisionResults: SearchResult[] = state.decisions
      .filter(
        (d) =>
          !q ||
          d.titulo.toLowerCase().includes(q) ||
          d.pergunta.toLowerCase().includes(q)
      )
      .slice(0, 3)
      .map((d) => ({
        id: d.id,
        kind: 'Decisão',
        title: d.titulo,
        subtitle: `${getMember(d.solicitanteId)?.nome ?? ''} · ${getProject(d.projetoId)?.nome ?? ''}`,
        onSelect: () => {
          setActiveSection('decisoes');
          setIsSearchOpen(false);
        },
      }));

    const projectResults: SearchResult[] = state.projects
      .filter((p) => !q || p.nome.toLowerCase().includes(q))
      .slice(0, 4)
      .map((p) => ({
        id: p.id,
        kind: 'Projeto',
        title: p.nome,
        subtitle: getClient(p.clienteId)?.nome ?? '',
        onSelect: () => {
          setActiveSection('projetos');
          setSelectedProjectId(p.id);
          setIsSearchOpen(false);
        },
      }));

    const clientResults: SearchResult[] = state.clients
      .filter((c) => !q || c.nome.toLowerCase().includes(q) || c.segmento.toLowerCase().includes(q))
      .slice(0, 3)
      .map((c) => ({
        id: c.id,
        kind: 'Cliente',
        title: c.nome,
        subtitle: c.segmento,
        onSelect: () => {
          setActiveSection('clientes');
          setIsSearchOpen(false);
        },
      }));

    const agentResults: SearchResult[] = state.members
      .filter(
        (m) =>
          m.tipo === 'agente' &&
          (!q || m.nome.toLowerCase().includes(q) || m.cargo.toLowerCase().includes(q))
      )
      .slice(0, 3)
      .map((m) => ({
        id: m.id,
        kind: 'Agente',
        title: m.nome,
        subtitle: m.cargo,
        onSelect: () => {
          setActiveSection('agentes');
          setIsSearchOpen(false);
        },
      }));

    const financeResults: SearchResult[] = state.finances
      .filter((f) => !q || f.descricao.toLowerCase().includes(q))
      .slice(0, 2)
      .map((f) => ({
        id: f.id,
        kind: 'Financeiro',
        title: f.descricao,
        subtitle: `${formatBRL(f.valorCentavos)} · ${getClient(f.clienteId)?.nome ?? ''}`,
        onSelect: () => {
          setActiveSection('financeiro');
          setIsSearchOpen(false);
        },
      }));

    return [
      ...decisionResults,
      ...taskResults,
      ...projectResults,
      ...clientResults,
      ...agentResults,
      ...financeResults,
    ].slice(0, 10);
  }, [
    query,
    state,
    getProject,
    getClient,
    getMember,
    setActiveSection,
    setSelectedTaskId,
    setSelectedProjectId,
    setIsSearchOpen,
  ]);

  if (!isSearchOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-[#0f1115]/55 backdrop-blur-xs"
      onClick={() => setIsSearchOpen(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.985, y: -6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="eagle-modal w-full max-w-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 h-13 border-b border-[#0f1115]/8 dark:border-[#f2f4f7]/8">
          <Search className="w-4 h-4 text-[#0f1115]/45 dark:text-[#f2f4f7]/45 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsSearchOpen(false);
              if (e.key === 'Enter' && results[0]) results[0].onSelect();
            }}
            placeholder="Ir para tarefa, projeto, cliente, decisão ou agente..."
            className="w-full bg-transparent text-[14px] text-[#0f1115] dark:text-[#f2f4f7] placeholder:text-[#0f1115]/40 dark:placeholder:text-[#f2f4f7]/40 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setIsSearchOpen(false)}
            aria-label="Fechar busca"
            className="eagle-btn-secondary w-7 h-7 inline-flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto divide-y divide-[#0f1115]/6 dark:divide-[#f2f4f7]/6">
          {results.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50">
              Nenhum item encontrado para "{query}".
            </div>
          ) : (
            results.map((item) => (
              <button
                key={`${item.kind}-${item.id}`}
                type="button"
                onClick={item.onSelect}
                className="w-full px-4 py-3 flex items-center justify-between gap-4 text-left hover:bg-[#f6f8fa] dark:hover:bg-[#1c212b] transition-colors cursor-pointer group"
              >
                <div className="min-w-0">
                  <div className="text-[13.5px] font-medium text-[#0f1115] dark:text-[#f2f4f7] truncate">
                    {item.title}
                  </div>
                  <div className="text-[12px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 truncate mt-0.5">
                    {item.kind} · {item.subtitle}
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#0f1115]/30 dark:text-[#f2f4f7]/30 group-hover:text-[#163744] dark:group-hover:text-[#9fdce6] shrink-0 transition-colors" />
              </button>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
