import { Fragment, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  Download,
  FileSignature,
  ScrollText,
} from 'lucide-react';
import { Button } from '../components/DesignSystem';
import { EmptyState, StatusIndicator } from '../components/SharedUI';
import { BentoCard } from '../components/VisualWidgets';
import { PortalClientProfile, PortalProposalContract } from '../types/portal';
import { formatBRL } from '../utils/formatters';

export type ProposalFilter = 'todas' | 'pendentes' | 'aprovadas';

interface PortalProposalsViewProps {
  client: PortalClientProfile;
  proposals: PortalProposalContract[];
  filter: ProposalFilter;
  onReviewAndApprove: (proposal: PortalProposalContract) => void;
  onDownloadProposal: (proposal: PortalProposalContract) => void;
}

export function PortalProposalsView({
  client,
  proposals,
  filter,
  onReviewAndApprove,
  onDownloadProposal,
}: PortalProposalsViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    proposals.find((p) => p.status === 'aguardando_assinatura')?.id ?? null
  );

  const stats = useMemo(() => {
    const pending = proposals.filter((p) => p.status === 'aguardando_assinatura');
    const approved = proposals.filter((p) => p.status === 'assinado');
    const pendingCents = pending.reduce((sum, p) => sum + p.valorCentavos, 0);
    const approvedCents = approved.reduce((sum, p) => sum + p.valorCentavos, 0);

    return {
      pending,
      approved,
      pendingCents,
      approvedCents,
    };
  }, [proposals]);

  const rows = useMemo(() => {
    const filtered = proposals.filter((p) => {
      if (filter === 'pendentes') return p.status === 'aguardando_assinatura';
      if (filter === 'aprovadas') return p.status === 'assinado';
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (a.status === b.status) return 0;
      return a.status === 'aguardando_assinatura' ? -1 : 1;
    });
  }, [proposals, filter]);

  return (
    <div className="max-w-[1380px] mx-auto space-y-5">
      {/* FAIXA COMPACTA DE RESUMO (3 BLOCOS TABULARES) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BentoCard className="p-5 flex items-center justify-between gap-4">
          <div>
            <span className="text-[12px] font-medium text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
              Aguardando sua decisão
            </span>
            <div className="mt-1.5 text-[24px] font-semibold tracking-[-0.025em] tabular-nums text-[#0f1115] dark:text-[#f2f4f7] leading-none">
              {formatBRL(stats.pendingCents)}
            </div>
            <p className="text-[11.5px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 mt-1.5 tabular-nums">
              {stats.pending.length}{' '}
              {stats.pending.length === 1 ? 'proposta em análise' : 'propostas em análise'}
            </p>
          </div>
          <span className="w-9.5 h-9.5 rounded-[11px] bg-[#b45309]/10 dark:bg-[#fbbf24]/15 text-[#92400e] dark:text-[#fbbf24] flex items-center justify-center shrink-0">
            <ScrollText className="w-4.5 h-4.5" />
          </span>
        </BentoCard>

        <BentoCard className="p-5 flex items-center justify-between gap-4">
          <div>
            <span className="text-[12px] font-medium text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
              Propostas aprovadas
            </span>
            <div className="mt-1.5 text-[24px] font-semibold tracking-[-0.025em] tabular-nums text-[#163744] dark:text-[#9fdce6] leading-none">
              {formatBRL(stats.approvedCents)}
            </div>
            <p className="text-[11.5px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 mt-1.5 tabular-nums">
              {stats.approved.length} convertidas em entrega
            </p>
          </div>
          <span className="w-9.5 h-9.5 rounded-[11px] bg-[#15803d]/10 dark:bg-[#4ade80]/15 text-[#166534] dark:text-[#4ade80] flex items-center justify-center shrink-0">
            <Check className="w-4.5 h-4.5" />
          </span>
        </BentoCard>

        <BentoCard className="p-5 flex flex-col justify-center">
          <div className="text-[12.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
            Escopo e orçamento · {client.nome}
          </div>
          <p className="text-[12px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55 mt-1 leading-relaxed">
            Clique em qualquer proposta da tabela para expandir as entregas incluídas ou aprovar o orçamento.
          </p>
        </BentoCard>
      </div>

      {/* TABELA DE PROPOSTAS COMERCIAIS */}
      {rows.length === 0 ? (
        <EmptyState title="Nenhuma proposta encontrada neste filtro." />
      ) : (
        <BentoCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#0f1115]/8 dark:border-[#f2f4f7]/8 text-[11.5px] font-medium text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                  <th className="py-3.5 pl-5 pr-4 font-medium">Enviada em</th>
                  <th className="py-3.5 px-4 font-medium">Proposta</th>
                  <th className="py-3.5 px-4 font-medium">Prazo</th>
                  <th className="py-3.5 px-4 font-medium">Condição</th>
                  <th className="py-3.5 px-4 font-medium">Situação</th>
                  <th className="py-3.5 px-4 font-medium text-right">Investimento</th>
                  <th className="py-3.5 pl-4 pr-5 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0f1115]/6 dark:divide-[#f2f4f7]/6 text-[13.5px]">
                {rows.map((prop) => {
                  const isApproved = prop.status === 'assinado';
                  const isOpen = expandedId === prop.id;

                  return (
                    <Fragment key={prop.id}>
                      <tr
                        onClick={() =>
                          setExpandedId((prev) => (prev === prop.id ? null : prop.id))
                        }
                        className={`group transition-colors cursor-pointer ${
                          !isApproved
                            ? 'bg-[#b45309]/[0.025] dark:bg-[#fbbf24]/[0.04] hover:bg-[#b45309]/[0.05]'
                            : 'hover:bg-[#f6f8fa] dark:hover:bg-[#191d26]'
                        }`}
                      >
                        <td className="py-3.5 pl-5 pr-4 whitespace-nowrap tabular-nums text-[12.5px] text-[#0f1115]/60 dark:text-[#f2f4f7]/60">
                          {prop.enviadoEm}
                        </td>

                        <td className="py-3.5 px-4 min-w-[260px]">
                          <div className="flex items-center gap-2 font-semibold text-[#0f1115] dark:text-[#f2f4f7] group-hover:text-[#163744] dark:group-hover:text-[#9fdce6] transition-colors">
                            <span>{prop.titulo}</span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-[#0f1115]/40 dark:text-white/40 shrink-0 transition-transform duration-200 ${
                                isOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </div>
                          <div className="text-[12px] text-[#0f1115]/54 dark:text-[#f2f4f7]/54 line-clamp-1 mt-0.5">
                            {prop.escopoResumo}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-[12.5px] text-[#0f1115]/68 dark:text-[#f2f4f7]/68">
                          {prop.prazoEstimado}
                        </td>

                        <td className="py-3.5 px-4 text-[12px] text-[#0f1115]/62 dark:text-[#f2f4f7]/62 max-w-[200px]">
                          <span className="line-clamp-1">{prop.condicaoPagamento}</span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusIndicator
                            label={isApproved ? 'Aprovada' : 'Aguardando aceite'}
                            dotClass={
                              isApproved
                                ? 'bg-[#15803d] dark:bg-[#4ade80]'
                                : 'bg-[#b45309] dark:bg-[#fbbf24]'
                            }
                            textClass={
                              isApproved
                                ? 'text-[#166534] dark:text-[#4ade80]'
                                : 'text-[#92400e] dark:text-[#fbbf24]'
                            }
                            live={!isApproved}
                          />
                        </td>

                        <td className="py-3.5 px-4 text-right font-semibold tabular-nums whitespace-nowrap text-[#0f1115] dark:text-[#f2f4f7]">
                          {formatBRL(prop.valorCentavos)}
                        </td>

                        <td
                          className="py-3.5 pl-4 pr-5 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() => onDownloadProposal(prop)}
                              title="Baixar proposta em PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>PDF</span>
                            </Button>

                            {isApproved ? (
                              <Button
                                variant="secondary"
                                size="xs"
                                onClick={() => onReviewAndApprove(prop)}
                              >
                                <span>Detalhes</span>
                              </Button>
                            ) : (
                              <Button
                                variant="primary"
                                size="xs"
                                onClick={() => onReviewAndApprove(prop)}
                              >
                                <FileSignature className="w-3.5 h-3.5" />
                                <span>Aprovar</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr key={`${prop.id}-detail`} className="bg-[#f8fafc] dark:bg-[#10141b]">
                          <td colSpan={7} className="px-5 py-4">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              <div className="space-y-2">
                                <p className="text-[12.5px] text-[#0f1115]/75 dark:text-[#f2f4f7]/75 max-w-2xl">
                                  {prop.escopoResumo}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {prop.entregasIncluidas.map((item) => (
                                    <span
                                      key={item}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-white dark:bg-[#15181f] border border-[#0f1115]/8 dark:border-white/10 text-[12px] text-[#0f1115]/82 dark:text-[#f2f4f7]/82"
                                    >
                                      <Check className="w-3 h-3 text-[#163744] dark:text-[#9fdce6]" />
                                      <span>{item}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {isApproved && prop.assinadoPor && (
                                <div className="text-[12px] text-[#166534] dark:text-[#4ade80] shrink-0">
                                  Aprovada por <strong>{prop.assinadoPor}</strong> em{' '}
                                  {prop.assinadoEm}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </BentoCard>
      )}
    </div>
  );
}
