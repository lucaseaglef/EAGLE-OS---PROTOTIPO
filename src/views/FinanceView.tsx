import React, { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import {
  EmptyState,
  PageHeader,
  SegmentedControl,
  StatusIndicator,
} from '../components/SharedUI';
import {
  BentoCard,
  ProportionBar,
  SparkBars,
} from '../components/VisualWidgets';
import { useEagle } from '../context/EagleContext';
import { FinanceStatus, FinanceType } from '../types/eagle';
import { formatBRL, formatShortDate } from '../utils/formatters';

type LedgerFilter = 'todos' | 'a_receber' | 'recebido' | 'a_pagar' | 'pago';

export function FinanceView({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const { state, getClient, createFinanceEntry, toggleFinanceStatus } = useEagle();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<LedgerFilter>('todos');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<FinanceType>('receber');
  const [status, setStatus] = useState<FinanceStatus>('pendente');
  const [valorReais, setValorReais] = useState('');
  const [vencimento, setVencimento] = useState('2026-11-28');
  const [clienteId, setClienteId] = useState(state.clients[0]?.id ?? 'cli-eagle');
  const [categoria, setCategoria] = useState('Projeto');

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.finances.filter((f) => {
      if (filter === 'a_receber' && !(f.tipo === 'receber' && f.status === 'pendente'))
        return false;
      if (filter === 'recebido' && !(f.tipo === 'receber' && f.status === 'liquidado'))
        return false;
      if (filter === 'a_pagar' && !(f.tipo === 'pagar' && f.status === 'pendente'))
        return false;
      if (filter === 'pago' && !(f.tipo === 'pagar' && f.status === 'liquidado'))
        return false;

      if (q) {
        const cli = getClient(f.clienteId)?.nome.toLowerCase() ?? '';
        return (
          f.descricao.toLowerCase().includes(q) ||
          f.categoria.toLowerCase().includes(q) ||
          cli.includes(q)
        );
      }
      return true;
    });
  }, [state.finances, filter, search, getClient]);

  const totals = useMemo(() => {
    let aReceber = 0;
    let recebido = 0;
    let aPagar = 0;
    let pago = 0;
    for (const f of state.finances) {
      if (f.tipo === 'receber' && f.status === 'pendente') aReceber += f.valorCentavos;
      if (f.tipo === 'receber' && f.status === 'liquidado') recebido += f.valorCentavos;
      if (f.tipo === 'pagar' && f.status === 'pendente') aPagar += f.valorCentavos;
      if (f.tipo === 'pagar' && f.status === 'liquidado') pago += f.valorCentavos;
    }
    return {
      aReceber,
      recebido,
      aPagar,
      pago,
      totalEntradas: recebido + aReceber,
      totalSaidas: pago + aPagar,
      saldoProjetado: recebido + aReceber - (pago + aPagar),
    };
  }, [state.finances]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = parseFloat(valorReais.replace(',', '.'));
    if (!descricao.trim() || Number.isNaN(numeric) || numeric <= 0) return;

    createFinanceEntry({
      descricao: descricao.trim(),
      tipo,
      status,
      valorCentavos: Math.round(numeric * 100),
      vencimento,
      clienteId,
      categoria: categoria.trim() || 'Operação',
    });

    setDescricao('');
    setValorReais('');
    setIsNewModalOpen(false);
  };

  const filtersSlot = (
    <SegmentedControl
      layoutId="finance-filter"
      ariaLabel="Filtrar lançamentos financeiros"
      value={filter}
      onChange={setFilter}
      options={[
        { id: 'todos', label: 'Todos' },
        { id: 'a_receber', label: 'A receber' },
        { id: 'recebido', label: 'Recebido' },
        { id: 'a_pagar', label: 'A pagar' },
        { id: 'pago', label: 'Pago' },
      ]}
    />
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader
        title="Financeiro"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar lançamento, categoria ou cliente..."
        filters={filtersSlot}
        primaryAction={{
          label: 'Novo lançamento',
          onClick: () => setIsNewModalOpen(true),
        }}
        onOpenMobileMenu={onOpenMobileMenu}
      />

      <div className="flex-1 overflow-y-auto p-5 lg:p-7">
        <div className="max-w-[1380px] mx-auto space-y-5">
          {/* FAIXA DE BENTO FINANCEIRO (3 BLOCOS) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <BentoCard className="p-5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                  Saldo projetado
                </div>
                <div className="mt-1 text-[24px] font-semibold tracking-[-0.03em] tabular-nums text-[#0f1115] dark:text-[#f2f4f7] truncate">
                  {formatBRL(totals.saldoProjetado)}
                </div>
                <div className="mt-1.5 text-[11.5px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 tabular-nums">
                  {state.finances.length} lançamentos no período
                </div>
              </div>
              <div className="w-20 shrink-0">
                <SparkBars
                  height={46}
                  items={[
                    { key: 'rec', label: 'Recebido', value: totals.recebido, tone: 'success' },
                    { key: 'arec', label: 'A receber', value: totals.aReceber, tone: 'accent' },
                    { key: 'pag', label: 'Pago', value: totals.pago, tone: 'muted' },
                    { key: 'apag', label: 'A pagar', value: totals.aPagar, tone: 'warning' },
                  ]}
                />
              </div>
            </BentoCard>

            <BentoCard className="p-5 flex flex-col justify-between gap-3">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <div className="text-[12px] font-medium text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                    Entradas previstas
                  </div>
                  <div className="mt-1 text-[22px] font-semibold tracking-[-0.025em] tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                    {formatBRL(totals.totalEntradas)}
                  </div>
                </div>
                <span className="text-[12px] font-medium tabular-nums text-[#163744] dark:text-[#9fdce6]">
                  {Math.round(
                    (totals.recebido / Math.max(1, totals.totalEntradas)) * 100
                  )}
                  % recebido
                </span>
              </div>

              <ProportionBar
                heightClass="h-1.5"
                showLegend
                segments={[
                  {
                    key: 'recebido',
                    value: totals.recebido,
                    colorClass: 'bg-[#15803d] dark:bg-[#4ade80]',
                    label: `Recebido ${formatBRL(totals.recebido)}`,
                  },
                  {
                    key: 'a_receber',
                    value: totals.aReceber,
                    colorClass: 'bg-[#163744] dark:bg-[#9fdce6]',
                    label: `A receber ${formatBRL(totals.aReceber)}`,
                  },
                ]}
              />
            </BentoCard>

            <BentoCard className="p-5 flex flex-col justify-between gap-3">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <div className="text-[12px] font-medium text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                    Saídas do estúdio
                  </div>
                  <div className="mt-1 text-[22px] font-semibold tracking-[-0.025em] tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                    {formatBRL(totals.totalSaidas)}
                  </div>
                </div>
                <span className="text-[12px] font-medium tabular-nums text-[#92400e] dark:text-[#fbbf24]">
                  {formatBRL(totals.aPagar)} em aberto
                </span>
              </div>

              <ProportionBar
                heightClass="h-1.5"
                showLegend
                segments={[
                  {
                    key: 'pago',
                    value: totals.pago,
                    colorClass: 'bg-[#6b7280] dark:bg-[#9ca3af]',
                    label: `Pago ${formatBRL(totals.pago)}`,
                  },
                  {
                    key: 'a_pagar',
                    value: totals.aPagar,
                    colorClass: 'bg-[#b45309] dark:bg-[#fbbf24]',
                    label: `A pagar ${formatBRL(totals.aPagar)}`,
                  },
                ]}
              />
            </BentoCard>
          </div>

          {/* TABELA DE LANÇAMENTOS EM CARD ÚNICO */}
          {filteredEntries.length === 0 ? (
            <EmptyState
              title="Nenhum lançamento financeiro neste filtro."
              actionLabel="Registrar lançamento"
              onAction={() => setIsNewModalOpen(true)}
            />
          ) : (
            <BentoCard className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#0f1115]/8 dark:border-[#f2f4f7]/8 text-[11.5px] font-medium text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                      <th className="py-3.5 pl-5 pr-4 font-medium">Vencimento</th>
                      <th className="py-3.5 px-4 font-medium">Lançamento</th>
                      <th className="py-3.5 px-4 font-medium">Cliente</th>
                      <th className="py-3.5 px-4 font-medium">Situação</th>
                      <th className="py-3.5 px-4 font-medium text-right">Valor</th>
                      <th className="py-3.5 pl-4 pr-5 font-medium text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0f1115]/6 dark:divide-[#f2f4f7]/6 text-[13.5px]">
                    {filteredEntries.map((entry) => {
                      const client = getClient(entry.clienteId);
                      const isInflow = entry.tipo === 'receber';
                      const isPaid = entry.status === 'liquidado';
                      const statusLabel = isInflow
                        ? isPaid
                          ? 'Recebido'
                          : 'A receber'
                        : isPaid
                          ? 'Pago'
                          : 'A pagar';
                      const dotClass = isPaid
                        ? 'bg-[#15803d] dark:bg-[#4ade80]'
                        : isInflow
                          ? 'bg-[#163744] dark:bg-[#9fdce6]'
                          : 'bg-[#b45309] dark:bg-[#fbbf24]';
                      const textClass = isPaid
                        ? 'text-[#166534] dark:text-[#4ade80]'
                        : isInflow
                          ? 'text-[#163744] dark:text-[#9fdce6]'
                          : 'text-[#92400e] dark:text-[#fbbf24]';

                      return (
                        <tr
                          key={entry.id}
                          className="group hover:bg-[#f6f8fa] dark:hover:bg-[#191d26] transition-colors"
                        >
                          <td className="py-3 pl-5 pr-4 tabular-nums text-[12.5px] text-[#0f1115]/58 dark:text-[#f2f4f7]/58 whitespace-nowrap">
                            {formatShortDate(entry.vencimento)}
                          </td>
                          <td className="py-3 px-4 min-w-[220px]">
                            <div className="font-medium text-[#0f1115] dark:text-[#f2f4f7]">
                              {entry.descricao}
                            </div>
                            <div className="text-[11.5px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                              {entry.categoria}
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="text-[12.5px] font-medium text-[#0f1115]/75 dark:text-[#f2f4f7]/75">
                              {client?.nome ?? 'Eagle'}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <StatusIndicator
                              label={statusLabel}
                              dotClass={dotClass}
                              textClass={textClass}
                            />
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-semibold tabular-nums whitespace-nowrap ${
                              isInflow
                                ? 'text-[#0f1115] dark:text-[#f2f4f7]'
                                : 'text-[#0f1115]/68 dark:text-[#f2f4f7]/68'
                            }`}
                          >
                            {isInflow ? '+' : '−'} {formatBRL(entry.valorCentavos)}
                          </td>
                          <td className="py-3 pl-4 pr-5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => toggleFinanceStatus(entry.id)}
                              className="eagle-btn-secondary inline-flex items-center gap-1 h-7.5 px-2.5 text-[12px] font-medium cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>
                                {isPaid
                                  ? 'Reabrir'
                                  : isInflow
                                    ? 'Receber'
                                    : 'Pagar'}
                              </span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </BentoCard>
          )}
        </div>
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
                Novo lançamento
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
                  Descrição
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Aditivo de animação metrô — Parcela única"
                  className="eagle-input w-full h-9.5 px-3 text-[13.5px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                    Tipo
                  </label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as FinanceType)}
                    className="eagle-input w-full h-9.5 px-3 text-[13px]"
                  >
                    <option value="receber">Entrada (A receber)</option>
                    <option value="pagar">Saída (A pagar)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                    Situação
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as FinanceStatus)}
                    className="eagle-input w-full h-9.5 px-3 text-[13px]"
                  >
                    <option value="pendente">Em aberto</option>
                    <option value="liquidado">Liquidado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="text"
                    required
                    value={valorReais}
                    onChange={(e) => setValorReais(e.target.value)}
                    placeholder="18500,00"
                    className="eagle-input w-full h-9.5 px-3 text-[13px] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                    Vencimento
                  </label>
                  <input
                    type="date"
                    value={vencimento}
                    onChange={(e) => setVencimento(e.target.value)}
                    className="eagle-input w-full h-9.5 px-3 text-[13px] tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mb-1">
                    Cliente
                  </label>
                  <select
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
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
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="eagle-input w-full h-9.5 px-3 text-[13px]"
                  />
                </div>
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
                Registrar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
