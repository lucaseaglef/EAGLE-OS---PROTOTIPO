import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  CheckCircle2,
  Download,
  FileCheck2,
  FileSignature,
  Lock,
  Receipt,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Badge, Button } from '../components/DesignSystem';
import {
  EmptyState,
  SegmentedControl,
  StatusIndicator,
} from '../components/SharedUI';
import { BentoCard } from '../components/VisualWidgets';
import {
  PortalClientProfile,
  PortalInvoice,
  PortalProposalContract,
  PortalRole,
  PortalUser,
} from '../types/portal';
import { formatBRL, formatShortDate } from '../utils/formatters';

export type ContractFilter = 'todos' | 'pendentes' | 'assinados';
type ContractDrawerTab = 'clausulas' | 'parcelas' | 'assinatura';

interface PortalContractsViewProps {
  client: PortalClientProfile;
  user: PortalUser;
  role: PortalRole;
  contracts: PortalProposalContract[];
  invoices: PortalInvoice[];
  filter: ContractFilter;
  onSignContract: (contractId: string, signerName: string) => void;
  onDownloadContract: (contract: PortalProposalContract) => void;
}

function deriveClauses(contract: PortalProposalContract) {
  if (contract.clausulas && contract.clausulas.length > 0) {
    return contract.clausulas;
  }
  return [
    {
      titulo: '1. Objeto e Entregas',
      texto: contract.escopoResumo,
    },
    {
      titulo: '2. Vigência e Prazos',
      texto: `Execução prevista para o ciclo ${contract.prazoEstimado}, acompanhada etapa a etapa no Portal.`,
    },
    {
      titulo: '3. Condição Financeira',
      texto: `Investimento total de ${formatBRL(contract.valorCentavos)} conforme condição: ${contract.condicaoPagamento}.`,
    },
  ];
}

function buildInstallmentsForContract(
  contract: PortalProposalContract,
  clientInvoices: PortalInvoice[]
): Array<{
  id: string;
  label: string;
  dueLabel: string;
  amountCents: number;
  status: 'paga' | 'vencida' | 'em_aberto' | 'prevista';
}> {
  const titleWords = contract.titulo
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 5);

  const matched = clientInvoices.filter((inv) => {
    const desc = inv.descricao.toLowerCase();
    return titleWords.some((word) => desc.includes(word));
  });

  if (matched.length > 0) {
    return matched.map((inv, idx) => ({
      id: inv.id,
      label: inv.descricao || `Parcela ${idx + 1}`,
      dueLabel:
        inv.status === 'paga'
          ? `Pago ${formatShortDate(inv.pagoEm || inv.vencimento)}`
          : formatShortDate(inv.vencimento),
      amountCents: inv.valorCentavos,
      status: inv.status,
    }));
  }

  const cond = contract.condicaoPagamento.toLowerCase();
  const countMatch = cond.match(/(\d+)\s*(?:parcelas|x|×)/);
  const count = countMatch
    ? Math.max(1, Math.min(6, Number(countMatch[1])))
    : cond.includes('50%')
      ? 2
      : 1;

  const baseVal = Math.round(contract.valorCentavos / count);
  return Array.from({ length: count }).map((_, idx) => ({
    id: `${contract.id}-inst-${idx + 1}`,
    label:
      count === 1
        ? `${contract.codigo ?? 'Minuta'} · Parcela única`
        : `${contract.codigo ?? 'Minuta'} · Parcela ${idx + 1}/${count}`,
    dueLabel:
      contract.status === 'assinado'
        ? idx === 0
          ? 'Faturada'
          : 'Próximo vencimento'
        : 'Após assinatura',
    amountCents:
      idx === count - 1
        ? contract.valorCentavos - baseVal * (count - 1)
        : baseVal,
    status: 'prevista' as const,
  }));
}

function ContractDetailDrawer({
  contract,
  initialTab,
  client,
  user,
  role,
  invoices,
  onClose,
  onSignContract,
  onDownloadContract,
}: {
  contract: PortalProposalContract;
  initialTab: ContractDrawerTab;
  client: PortalClientProfile;
  user: PortalUser;
  role: PortalRole;
  invoices: PortalInvoice[];
  onClose: () => void;
  onSignContract: (contractId: string, signerName: string) => void;
  onDownloadContract: (contract: PortalProposalContract) => void;
}) {
  const isSigned = contract.status === 'assinado';
  const canSign = role === 'responsavel';

  const [drawerTab, setDrawerTab] = useState<ContractDrawerTab>(initialTab);
  const [signerName, setSignerName] = useState(user.nome);
  const [agreed, setAgreed] = useState(true);

  useEffect(() => {
    setDrawerTab(initialTab);
  }, [contract.id, initialTab]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const clauses = useMemo(() => deriveClauses(contract), [contract]);
  const installments = useMemo(
    () => buildInstallmentsForContract(contract, invoices),
    [contract, invoices]
  );

  const handleConfirmSign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSign || isSigned || !signerName.trim() || !agreed) return;
    onSignContract(contract.id, signerName.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end p-2 sm:p-4 bg-[#0f1115]/48 backdrop-blur-[4px]"
      onClick={onClose}
    >
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={contract.titulo}
        initial={{ x: 32, opacity: 0, scale: 0.985 }}
        animate={{ x: 0, opacity: 1, scale: 1 }}
        exit={{ x: 32, opacity: 0, scale: 0.985 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[500px] h-full rounded-[22px] bg-[#ffffff]/96 dark:bg-[#15181f]/96 backdrop-blur-xl border border-[#0f1115]/10 dark:border-white/12 shadow-[0_24px_64px_rgba(15,17,21,0.28)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.62)] flex flex-col min-h-0 overflow-hidden"
      >
        {/* TOPO ARQUITETURAL */}
        <div className="px-5 pt-4.5 pb-3.5 border-b border-[#0f1115]/8 dark:border-[#f2f4f7]/8 space-y-4 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <StatusIndicator
                label={isSigned ? 'Assinado' : 'Aguardando assinatura'}
                dotClass={
                  isSigned
                    ? 'bg-[#15803d] dark:bg-[#4ade80]'
                    : 'bg-[#b45309] dark:bg-[#fbbf24]'
                }
                textClass={
                  isSigned
                    ? 'text-[#166534] dark:text-[#4ade80]'
                    : 'text-[#92400e] dark:text-[#fbbf24]'
                }
                live={!isSigned}
              />
              {contract.codigo && (
                <>
                  <span
                    className="text-[#0f1115]/25 dark:text-[#f2f4f7]/25"
                    aria-hidden="true"
                  >
                    ·
                  </span>
                  <span className="text-[11.5px] font-mono font-medium text-[#0f1115]/58 dark:text-[#f2f4f7]/58 tabular-nums">
                    {contract.codigo}
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar minuta"
              className="w-8 h-8 rounded-full inline-flex items-center justify-center bg-[#f2f4f7] dark:bg-[#1d222c] hover:bg-[#e6e9ed] dark:hover:bg-[#262d3a] text-[#0f1115]/70 dark:text-[#f2f4f7]/75 transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 border ${
                isSigned
                  ? 'bg-[#163744]/8 dark:bg-[#9fdce6]/10 border-[#163744]/12 dark:border-[#9fdce6]/18 text-[#163744] dark:text-[#9fdce6]'
                  : 'bg-[#b45309]/10 dark:bg-[#fbbf24]/14 border-[#b45309]/18 dark:border-[#fbbf24]/25 text-[#92400e] dark:text-[#fbbf24]'
              }`}
            >
              {isSigned ? (
                <FileCheck2 className="w-4.5 h-4.5" />
              ) : (
                <FileSignature className="w-4.5 h-4.5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[#0f1115] dark:text-[#f2f4f7] leading-snug">
                {contract.titulo}
              </h2>
              <p className="mt-0.5 text-[12px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55 truncate">
                {client.nome}
                {contract.modalidade ? ` · ${contract.modalidade}` : ''}
                {` · Enviado em ${contract.enviadoEm}`}
              </p>
            </div>
          </div>

          {/* TIRA DE MÉTRICAS */}
          <div className="rounded-[14px] bg-[#f2f4f7] dark:bg-[#10141b] border border-[#0f1115]/6 dark:border-white/8 px-4 py-3 grid grid-cols-12 items-center gap-3">
            <div className="col-span-7 min-w-0">
              <div className="text-[11px] font-medium text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                {contract.modalidade === 'Retainer mensal'
                  ? 'Mensalidade contratada'
                  : 'Valor do contrato'}
              </div>
              <div className="mt-1 text-[23px] font-semibold tracking-[-0.03em] tabular-nums leading-none text-[#0f1115] dark:text-[#f2f4f7]">
                {formatBRL(contract.valorCentavos)}
              </div>
            </div>

            <div className="col-span-5 pl-3.5 border-l border-[#0f1115]/8 dark:border-white/8 min-w-0">
              <div className="text-[11px] font-medium text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                Vigência
              </div>
              <div className="mt-1 text-[13px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7] truncate">
                {contract.prazoEstimado}
              </div>
              <div className="mt-0.5 text-[11px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 truncate">
                {contract.condicaoPagamento}
              </div>
            </div>
          </div>

          <SegmentedControl
            layoutId="portal-contract-drawer-tab"
            ariaLabel="Seções da minuta"
            value={drawerTab}
            onChange={setDrawerTab}
            options={[
              { id: 'clausulas', label: 'Cláusulas' },
              { id: 'parcelas', label: 'Parcelas' },
              { id: 'assinatura', label: 'Assinatura' },
            ]}
          />
        </div>

        {/* CORPO COM SCROLL */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
          {drawerTab === 'clausulas' && (
            <>
              <div className="rounded-[14px] border border-[#0f1115]/8 dark:border-white/10 divide-y divide-[#0f1115]/6 dark:divide-white/8 overflow-hidden">
                {clauses.map((clause) => (
                  <div key={clause.titulo} className="p-3.5 space-y-1">
                    <div className="text-[12.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                      {clause.titulo}
                    </div>
                    <p className="text-[12.5px] leading-relaxed text-[#0f1115]/68 dark:text-[#f2f4f7]/68">
                      {clause.texto}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="text-[11.5px] font-semibold text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                  Entregas garantidas na minuta
                </div>
                <div className="rounded-[14px] border border-[#0f1115]/8 dark:border-white/10 divide-y divide-[#0f1115]/6 dark:divide-white/8">
                  {contract.entregasIncluidas.map((item) => (
                    <div
                      key={item}
                      className="px-3.5 py-2.5 flex items-start gap-2.5 text-[12.5px] text-[#0f1115]/84 dark:text-[#f2f4f7]/84"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#163744] dark:text-[#9fdce6] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {drawerTab === 'parcelas' && (
            <div className="space-y-3">
              <div className="rounded-[13px] bg-[#f2f4f7]/80 dark:bg-[#10141b] border border-[#0f1115]/6 dark:border-white/8 px-3.5 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Receipt className="w-4 h-4 text-[#163744] dark:text-[#9fdce6] shrink-0" />
                  <span className="text-[12.5px] font-medium text-[#0f1115]/82 dark:text-[#f2f4f7]/82 truncate">
                    {contract.condicaoPagamento}
                  </span>
                </div>
                <span className="text-[12px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7] shrink-0">
                  {installments.length}{' '}
                  {installments.length === 1 ? 'título' : 'títulos'}
                </span>
              </div>

              <div className="rounded-[14px] border border-[#0f1115]/8 dark:border-white/10 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#0f1115]/8 dark:border-white/8 text-[11px] font-medium text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                      <th className="py-2.5 pl-3.5 pr-2 font-medium">Parcela</th>
                      <th className="py-2.5 px-2 font-medium">Previsão</th>
                      <th className="py-2.5 pl-2 pr-3.5 font-medium text-right">
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0f1115]/6 dark:divide-white/8 text-[12.5px]">
                    {installments.map((inst) => (
                      <tr key={inst.id}>
                        <td className="py-2.5 pl-3.5 pr-2">
                          <div className="font-medium text-[#0f1115] dark:text-[#f2f4f7] truncate max-w-[200px]">
                            {inst.label}
                          </div>
                          <div className="text-[11px] mt-0.5">
                            {inst.status === 'paga' ? (
                              <span className="text-[#166534] dark:text-[#4ade80] font-medium">
                                Quitada
                              </span>
                            ) : inst.status === 'vencida' ? (
                              <span className="text-[#991b1b] dark:text-[#f87171] font-medium">
                                Vencida no Financeiro
                              </span>
                            ) : inst.status === 'em_aberto' ? (
                              <span className="text-[#92400e] dark:text-[#fbbf24] font-medium">
                                Em aberto
                              </span>
                            ) : (
                              <span className="text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                                Programada
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-[12px] tabular-nums text-[#0f1115]/65 dark:text-[#f2f4f7]/65 whitespace-nowrap">
                          {inst.dueLabel}
                        </td>
                        <td className="py-2.5 pl-2 pr-3.5 text-right font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7] whitespace-nowrap">
                          {formatBRL(inst.amountCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {drawerTab === 'assinatura' && (
            <>
              {isSigned ? (
                <div className="rounded-[16px] bg-[#15803d]/[0.07] dark:bg-[#4ade80]/[0.08] border border-[#15803d]/20 dark:border-[#4ade80]/20 p-4 space-y-3.5">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-[#166534] dark:text-[#4ade80] shrink-0" />
                    <div>
                      <div className="text-[13.5px] font-semibold text-[#166534] dark:text-[#4ade80]">
                        Minuta assinada e formalizada
                      </div>
                      <div className="text-[11.5px] text-[#0f1115]/60 dark:text-[#f2f4f7]/60">
                        Registro digital válido entre {client.nome} e EAGLE Digital House
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[12px] bg-white/80 dark:bg-[#15181f]/80 border border-[#0f1115]/8 dark:border-white/10 divide-y divide-[#0f1115]/6 dark:divide-white/8 text-[12.5px]">
                    <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                      <span className="text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                        Signatário
                      </span>
                      <span className="font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                        {contract.assinadoPor}
                      </span>
                    </div>
                    <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                      <span className="text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                        Data do aceite
                      </span>
                      <span className="font-medium tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                        {contract.assinadoEm}
                      </span>
                    </div>
                    <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                      <span className="text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                        Autenticação
                      </span>
                      <span className="font-mono text-[12px] font-semibold text-[#163744] dark:text-[#9fdce6]">
                        {contract.autenticidadeHash ?? '#EAG-26-VERIFIED'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : canSign ? (
                <form
                  id="contract-drawer-sign-form"
                  onSubmit={handleConfirmSign}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-[12px] font-medium text-[#0f1115]/70 dark:text-[#f2f4f7]/70 mb-1.5">
                      Assinatura digital (nome completo)
                    </label>
                    <input
                      type="text"
                      required
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      className="eagle-input w-full h-10 px-3 text-[13.5px] font-medium"
                    />
                  </div>

                  <label className="flex items-start gap-2.5 text-[12.5px] text-[#0f1115]/75 dark:text-[#f2f4f7]/75 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[#163744] rounded"
                    />
                    <span>
                      Concordo com as cláusulas, prazos e valores descritos nesta minuta contratual em nome de {client.nome}.
                    </span>
                  </label>
                </form>
              ) : (
                <div className="rounded-[14px] bg-[#f2f4f7] dark:bg-[#10141b] border border-[#0f1115]/8 dark:border-white/10 p-4 flex items-start gap-3">
                  <Lock className="w-4.5 h-4.5 text-[#92400e] dark:text-[#fbbf24] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="text-[13px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                      Assinatura restrita ao Responsável
                    </div>
                    <p className="text-[12px] text-[#0f1115]/60 dark:text-[#f2f4f7]/60 leading-relaxed">
                      Você pode revisar todas as cláusulas, parcelas previstas e baixar o PDF. A formalização digital deve ser feita pelo perfil Responsável da conta.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* RODAPÉ FIXO */}
        <div className="px-5 py-3.5 border-t border-[#0f1115]/8 dark:border-[#f2f4f7]/8 bg-[#f2f4f7]/55 dark:bg-[#10141b]/80 flex items-center justify-between gap-2.5 shrink-0">
          <Button
            variant="secondary"
            size="md"
            onClick={() => onDownloadContract(contract)}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar PDF</span>
          </Button>

          {!isSigned && canSign ? (
            drawerTab === 'assinatura' ? (
              <Button
                type="submit"
                form="contract-drawer-sign-form"
                variant="primary"
                size="md"
                disabled={!signerName.trim() || !agreed}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Assinar contrato</span>
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={() => setDrawerTab('assinatura')}
              >
                <FileSignature className="w-4 h-4" />
                <span>Ir para assinatura</span>
              </Button>
            )
          ) : (
            <Button variant="secondary" size="md" onClick={onClose}>
              Fechar
            </Button>
          )}
        </div>
      </motion.aside>
    </div>
  );
}

export function PortalContractsView({
  client,
  user,
  role,
  contracts,
  invoices,
  filter,
  onSignContract,
  onDownloadContract,
}: PortalContractsViewProps) {
  const [selectedContractId, setSelectedContractId] = useState<string | null>(
    null
  );
  const [drawerInitialTab, setDrawerInitialTab] =
    useState<ContractDrawerTab>('clausulas');

  const stats = useMemo(() => {
    const pending = contracts.filter((c) => c.status === 'aguardando_assinatura');
    const signed = contracts.filter((c) => c.status === 'assinado');

    const totalSignedCents = signed.reduce((sum, c) => sum + c.valorCentavos, 0);
    const totalPendingCents = pending.reduce((sum, c) => sum + c.valorCentavos, 0);
    const totalAllCents = Math.max(1, totalSignedCents + totalPendingCents);

    const pctSignedCount =
      contracts.length > 0
        ? Math.round((signed.length / contracts.length) * 100)
        : 100;
    const pctSignedValue = Math.round((totalSignedCents / totalAllCents) * 100);
    const latestSigned = signed[0];

    return {
      pending,
      signed,
      totalSignedCents,
      totalPendingCents,
      totalAllCents: totalSignedCents + totalPendingCents,
      pctSignedCount,
      pctSignedValue,
      latestSigned,
    };
  }, [contracts]);

  const rows = useMemo(() => {
    const filtered = contracts.filter((c) => {
      if (filter === 'pendentes') return c.status === 'aguardando_assinatura';
      if (filter === 'assinados') return c.status === 'assinado';
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (a.status === b.status) return 0;
      return a.status === 'aguardando_assinatura' ? -1 : 1;
    });
  }, [contracts, filter]);

  const selectedContract = useMemo(
    () => contracts.find((c) => c.id === selectedContractId) ?? null,
    [contracts, selectedContractId]
  );

  const openContractDrawer = (
    contract: PortalProposalContract,
    tab: ContractDrawerTab = 'clausulas'
  ) => {
    setDrawerInitialTab(tab);
    setSelectedContractId(contract.id);
  };

  return (
    <div className="max-w-[1380px] mx-auto space-y-5">
      {/* FAIXA DE RESUMO CONTRATUAL (100% ORIENTADA A DADOS) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <BentoCard className="xl:col-span-4 p-5 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[12px] font-medium text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                Contratos vigentes · {client.nome}
              </span>
              <div className="mt-1.5 text-[28px] font-semibold tracking-[-0.03em] tabular-nums text-[#0f1115] dark:text-[#f2f4f7] leading-none">
                {formatBRL(stats.totalSignedCents)}
              </div>
            </div>

            {stats.pending.length > 0 ? (
              <Badge variant="warning" size="sm">
                {stats.pending.length}{' '}
                {stats.pending.length === 1 ? 'pendente' : 'pendentes'}
              </Badge>
            ) : (
              <Badge variant="success" size="sm">
                Formalizados
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#0f1115]/6 dark:border-white/8 text-[12px]">
            <span className="text-[#0f1115]/55 dark:text-[#f2f4f7]/55 tabular-nums truncate">
              {stats.pending.length > 0
                ? `Aguardando assinatura: ${formatBRL(stats.totalPendingCents)}`
                : `${stats.signed.length} minutas ativas e assinadas`}
            </span>
            {stats.pending.length > 0 && (
              <Button
                variant="primary"
                size="xs"
                onClick={() => openContractDrawer(stats.pending[0], 'assinatura')}
              >
                Revisar
              </Button>
            )}
          </div>
        </BentoCard>

        <BentoCard className="xl:col-span-4 p-5 flex flex-col justify-between gap-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[12px] font-medium text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                Formalização
              </span>
              <div className="mt-1.5 text-[22px] font-semibold tracking-[-0.025em] tabular-nums text-[#163744] dark:text-[#9fdce6] leading-none">
                {stats.pctSignedCount}%
              </div>
              <p className="text-[11.5px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 mt-1.5 tabular-nums">
                {stats.signed.length} de {contracts.length} minutas
              </p>
            </div>

            <div className="border-l border-[#0f1115]/8 dark:border-white/8 pl-4 min-w-0">
              <span className="text-[12px] font-medium text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                Última assinatura
              </span>
              <div className="mt-1.5 text-[14px] font-semibold tracking-[-0.01em] text-[#0f1115] dark:text-[#f2f4f7] truncate">
                {stats.latestSigned?.assinadoPor ?? '—'}
              </div>
              <p className="text-[11.5px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 mt-1 tabular-nums truncate">
                {stats.latestSigned?.assinadoEm ?? 'Aguardando'}
              </p>
            </div>
          </div>

          <div className="h-1.5 w-full rounded-full bg-[#e6e9ed] dark:bg-[#202631] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#9fdce6] transition-all duration-300"
              style={{ width: `${stats.pctSignedCount}%` }}
            />
          </div>
        </BentoCard>

        <BentoCard className="xl:col-span-4 p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
              Composição contratual
            </span>
            <span className="text-[12px] font-semibold tabular-nums text-[#163744] dark:text-[#9fdce6]">
              {formatBRL(stats.totalAllCents)}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="w-16 text-[12px] text-[#0f1115]/58 dark:text-[#f2f4f7]/58 shrink-0">
                Assinados
              </span>
              <div className="flex-1 h-7 rounded-[9px] bg-[#f2f4f7] dark:bg-[#10141b] overflow-hidden relative flex items-center">
                <div
                  className="h-full rounded-[9px] bg-[#9fdce6] transition-all duration-300"
                  style={{
                    width: `${Math.max(
                      stats.pctSignedValue > 0 ? 18 : 0,
                      stats.pctSignedValue
                    )}%`,
                  }}
                />
                <span className="absolute left-2.5 text-[11.5px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                  {stats.pctSignedValue}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-16 text-[12px] text-[#0f1115]/58 dark:text-[#f2f4f7]/58 shrink-0">
                Pendentes
              </span>
              <div className="flex-1 h-7 rounded-[9px] bg-[#f2f4f7] dark:bg-[#10141b] overflow-hidden relative flex items-center">
                <div
                  className="h-full rounded-[9px] bg-[#dfe5ec] dark:bg-[#232b38] transition-all duration-300"
                  style={{
                    width: `${Math.max(
                      100 - stats.pctSignedValue > 0 ? 18 : 0,
                      100 - stats.pctSignedValue
                    )}%`,
                  }}
                />
                <span className="absolute left-2.5 text-[11.5px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                  {100 - stats.pctSignedValue}%
                </span>
              </div>
            </div>
          </div>
        </BentoCard>
      </div>

      {/* TABELA ARQUITETÔNICA DE CONTRATOS */}
      {rows.length === 0 ? (
        <EmptyState title="Nenhum contrato encontrado neste filtro." />
      ) : (
        <BentoCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#0f1115]/8 dark:border-[#f2f4f7]/8 text-[11.5px] font-medium text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                  <th className="py-3.5 pl-5 pr-4 font-medium">Código</th>
                  <th className="py-3.5 px-4 font-medium">Contrato</th>
                  <th className="py-3.5 px-4 font-medium">Vigência</th>
                  <th className="py-3.5 px-4 font-medium">Assinado por</th>
                  <th className="py-3.5 px-4 font-medium">Situação</th>
                  <th className="py-3.5 px-4 font-medium text-right">Valor</th>
                  <th className="py-3.5 pl-4 pr-5 font-medium text-right">
                    Documento
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0f1115]/6 dark:divide-[#f2f4f7]/6 text-[13.5px]">
                {rows.map((ctr) => {
                  const isSigned = ctr.status === 'assinado';
                  const isSelected = selectedContractId === ctr.id;

                  return (
                    <tr
                      key={ctr.id}
                      onClick={() =>
                        openContractDrawer(
                          ctr,
                          !isSigned && role === 'responsavel'
                            ? 'assinatura'
                            : 'clausulas'
                        )
                      }
                      className={`group transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#163744]/[0.05] dark:bg-[#9fdce6]/[0.08]'
                          : !isSigned
                            ? 'bg-[#b45309]/[0.025] dark:bg-[#fbbf24]/[0.04] hover:bg-[#b45309]/[0.05]'
                            : 'hover:bg-[#f6f8fa] dark:hover:bg-[#191d26]'
                      }`}
                    >
                      <td className="py-3.5 pl-5 pr-4 whitespace-nowrap font-mono text-[12px] tabular-nums text-[#0f1115]/60 dark:text-[#f2f4f7]/60">
                        {ctr.codigo ?? 'CTR-26'}
                      </td>

                      <td className="py-3.5 px-4 min-w-[260px]">
                        <div className="font-semibold text-[#0f1115] dark:text-[#f2f4f7] group-hover:text-[#163744] dark:group-hover:text-[#9fdce6] transition-colors">
                          {ctr.titulo}
                        </div>
                        <div className="text-[12px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 line-clamp-1 mt-0.5">
                          {ctr.modalidade ? `${ctr.modalidade} · ` : ''}
                          {ctr.escopoResumo}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap tabular-nums text-[12.5px] text-[#0f1115]/68 dark:text-[#f2f4f7]/68">
                        {ctr.prazoEstimado}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-[12.5px] text-[#0f1115]/72 dark:text-[#f2f4f7]/72">
                        {ctr.assinadoPor ? (
                          <div>
                            <div className="font-medium">{ctr.assinadoPor}</div>
                            <div className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 tabular-nums">
                              {ctr.assinadoEm}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#0f1115]/40 dark:text-[#f2f4f7]/40">
                            Pendente
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusIndicator
                          label={isSigned ? 'Assinado' : 'Aguardando'}
                          dotClass={
                            isSigned
                              ? 'bg-[#15803d] dark:bg-[#4ade80]'
                              : 'bg-[#b45309] dark:bg-[#fbbf24]'
                          }
                          textClass={
                            isSigned
                              ? 'text-[#166534] dark:text-[#4ade80]'
                              : 'text-[#92400e] dark:text-[#fbbf24]'
                          }
                          live={!isSigned}
                        />
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                          {formatBRL(ctr.valorCentavos)}
                        </div>
                        <div className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 truncate max-w-[160px] ml-auto">
                          {ctr.condicaoPagamento}
                        </div>
                      </td>

                      <td
                        className="py-3.5 pl-4 pr-5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => onDownloadContract(ctr)}
                            title="Baixar minuta PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </Button>

                          {!isSigned && role === 'responsavel' ? (
                            <Button
                              variant="primary"
                              size="xs"
                              onClick={() => openContractDrawer(ctr, 'assinatura')}
                            >
                              <FileSignature className="w-3.5 h-3.5" />
                              <span>Assinar</span>
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() => openContractDrawer(ctr, 'clausulas')}
                            >
                              <Check className="w-3.5 h-3.5 text-[#163744] dark:text-[#9fdce6]" />
                              <span>Minuta</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </BentoCard>
      )}

      {/* PAINEL LATERAL DE DETALHE DO CONTRATO */}
      <AnimatePresence>
        {selectedContract && (
          <ContractDetailDrawer
            key={selectedContract.id}
            contract={selectedContract}
            initialTab={drawerInitialTab}
            client={client}
            user={user}
            role={role}
            invoices={invoices}
            onClose={() => setSelectedContractId(null)}
            onSignContract={onSignContract}
            onDownloadContract={onDownloadContract}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
