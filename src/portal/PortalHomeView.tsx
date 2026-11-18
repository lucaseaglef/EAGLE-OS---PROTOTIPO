import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Check,
  ChevronDown,
  Download,
  FileCheck2,
  FolderKanban,
  Inbox,
  Layers,
  Maximize2,
  MessageSquare,
  PackageCheck,
  Palette,
  Plus,
  Receipt,
  ScrollText,
} from 'lucide-react';
import {
  ActionIconButton,
  Badge,
  Button,
} from '../components/DesignSystem';
import { MemberAvatar, StatusIndicator } from '../components/SharedUI';
import {
  BentoCard,
  MicroRing,
  ProportionBar,
  SplineTrendChart,
  StudioSculptureGraphic,
} from '../components/VisualWidgets';
import { Member } from '../types/eagle';
import {
  PortalClientProfile,
  PortalConversation,
  PortalDeliverable,
  PortalInvoice,
  PortalPiece,
  PortalProject,
  PortalProposalContract,
  PortalRequest,
  PortalResults,
  PortalRole,
  PortalSection,
  PortalUser,
} from '../types/portal';
import { formatBRL, formatShortDate } from '../utils/formatters';

export interface PortalHomeViewProps {
  client: PortalClientProfile;
  user: PortalUser;
  role: PortalRole;
  projects: PortalProject[];
  pieces: PortalPiece[];
  deliverables: PortalDeliverable[];
  requests: PortalRequest[];
  conversations: PortalConversation[];
  contracts: PortalProposalContract[];
  invoices: PortalInvoice[];
  results?: PortalResults;
  getMember: (id: string) => Member | undefined;
  onNavigate: (section: PortalSection) => void;
  onOpenProject: (projectId: string) => void;
  onOpenProofing: (pieceId: string) => void;
  onQuickApprovePiece: (pieceId: string) => void;
  onOpenNewRequest: (projectId?: string) => void;
  onOpenContract: (contract: PortalProposalContract) => void;
  onOpenInvoice: (invoice: PortalInvoice) => void;
  onOpenConversation: (conversationId: string) => void;
  onDownloadDeliverable: (deliverable: PortalDeliverable) => void;
}

export function PortalHomeView({
  client,
  user,
  role,
  projects,
  pieces,
  deliverables,
  requests,
  conversations,
  contracts,
  invoices,
  results,
  getMember,
  onNavigate,
  onOpenProject,
  onOpenProofing,
  onQuickApprovePiece,
  onOpenNewRequest,
  onOpenContract,
  onOpenInvoice,
  onOpenConversation,
  onDownloadDeliverable,
}: PortalHomeViewProps) {
  const firstName = user.nome.split(' ')[0];

  const [resultsMetric, setResultsMetric] = useState<'alcance' | 'engajamento'>('alcance');
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(
    projects[0]?.id ?? null
  );

  // Indicadores derivados exclusivamente de dados reais do cliente
  const stats = useMemo(() => {
    const awaitingApproval = pieces.filter((p) => p.status === 'aguardando_aprovacao');
    const adjustingPieces = pieces.filter((p) => p.status === 'ajustes_solicitados');
    const approvedPieces = pieces.filter((p) => p.status === 'aprovada');
    const pendingPieces = [...awaitingApproval, ...adjustingPieces];

    const activeProjects = projects.filter((p) => p.progressoPct < 100);
    const deliveredProjects = projects.filter((p) => p.progressoPct >= 100);
    const priorityProject =
      activeProjects.find((p) => Boolean(p.esperandoCliente)) ??
      activeProjects[0] ??
      projects[0];

    const formalContracts = contracts.filter((c) => c.tipo === 'Contrato');
    const signedContracts = formalContracts.filter((c) => c.status === 'assinado');
    const pendingContractsOnly = formalContracts.filter(
      (c) => c.status === 'aguardando_assinatura'
    );

    const proposals = contracts.filter((c) => c.tipo === 'Proposta');
    const pendingProposals = proposals.filter((c) => c.status === 'aguardando_assinatura');

    const pendingContractsForRole =
      role === 'responsavel'
        ? contracts.filter((c) => c.status === 'aguardando_assinatura')
        : role === 'financeiro'
          ? pendingContractsOnly
          : [];

    const openInvoices =
      role !== 'solicitante' ? invoices.filter((i) => i.status !== 'paga') : [];
    const paidInvoices =
      role !== 'solicitante' ? invoices.filter((i) => i.status === 'paga') : [];
    const overdueInvoices = openInvoices.filter((i) => i.status === 'vencida');
    const nextDueInvoice = [...openInvoices].sort((a, b) =>
      a.vencimento.localeCompare(b.vencimento)
    )[0];

    const requestsInAnalysis = requests.filter((r) => r.status === 'em_analise').length;
    const requestsInProduction = requests.filter((r) => r.status === 'em_producao').length;
    const requestsReady = requests.filter((r) => r.status === 'pronto_revisao').length;
    const openRequests = requests.filter((r) => r.status !== 'pronto_revisao').length;

    const unreadMessages = conversations.reduce((acc, c) => acc + c.naoLidas, 0);

    const totalOpenCount =
      awaitingApproval.length +
      (role === 'responsavel'
        ? pendingContractsForRole.length + openInvoices.length
        : 0);

    const totalPaidBRL = paidInvoices.reduce((s, i) => s + i.valorCentavos, 0);
    const totalOpenBRL = openInvoices.reduce((s, i) => s + i.valorCentavos, 0);
    const totalBillingBRL = totalPaidBRL + totalOpenBRL;
    const pctPaidBRL =
      totalBillingBRL > 0 ? Math.round((totalPaidBRL / totalBillingBRL) * 100) : 100;
    const pctOpenBRL = Math.max(0, 100 - pctPaidBRL);
    const notesAvailable = paidInvoices.filter((i) => Boolean(i.notaFiscalArquivo)).length;

    const pendingProposalsBRL = pendingProposals.reduce(
      (s, p) => s + p.valorCentavos,
      0
    );

    const upcomingMilestones = activeProjects.flatMap((proj) =>
      proj.etapas
        .filter((e) => e.status === 'em_andamento' || e.status === 'proxima')
        .slice(0, 2)
        .map((etapa) => ({
          id: `${proj.id}-${etapa.id}`,
          projectId: proj.id,
          projectName: proj.nome,
          stageName: etapa.nome,
          stageStatus: etapa.status,
          dateLabel: etapa.dataLabel ?? proj.previsaoEntrega,
          summary: etapa.resumo,
          progress: proj.progressoPct,
        }))
    );

    return {
      awaitingApproval,
      adjustingPieces,
      approvedPieces,
      pendingPieces,
      activeProjects,
      deliveredProjects,
      priorityProject,
      formalContracts,
      signedContracts,
      pendingContractsOnly,
      pendingProposals,
      pendingProposalsBRL,
      pendingContractsForRole,
      openInvoices,
      paidInvoices,
      overdueInvoices,
      nextDueInvoice,
      requestsInAnalysis,
      requestsInProduction,
      requestsReady,
      openRequests,
      unreadMessages,
      totalOpenCount,
      totalPaidBRL,
      totalOpenBRL,
      totalBillingBRL,
      pctPaidBRL,
      pctOpenBRL,
      notesAvailable,
      upcomingMilestones,
    };
  }, [pieces, projects, contracts, invoices, requests, conversations, role]);

  // Série real das 4 semanas publicadas da campanha (sem semanas inventadas)
  const realCampaignChart = useMemo(() => {
    if (!results?.temDados || results.serieSemanal.length === 0) return null;
    const labels = results.serieSemanal.map((s) => s.semana);
    const values = results.serieSemanal.map((s) =>
      resultsMetric === 'alcance' ? s.alcance : s.engajamento
    );
    let peakIndex = 0;
    values.forEach((v, idx) => {
      if (v >= values[peakIndex]) peakIndex = idx;
    });
    const peakVal = values[peakIndex];
    const primaryKpi =
      resultsMetric === 'alcance' ? results.kpis[0] : results.kpis[1];

    return {
      labels,
      values,
      peakIndex,
      peakCallout: peakVal.toLocaleString('pt-BR'),
      headline: primaryKpi?.valor ?? peakVal.toLocaleString('pt-BR'),
      variacao: primaryKpi?.variacao,
      label: primaryKpi?.label ?? (resultsMetric === 'alcance' ? 'Alcance' : 'Engajamento'),
      secondaryKpis: results.kpis.slice(2, 4),
    };
  }, [results, resultsMetric]);

  /* ======================================================================== */
  /* VISÃO DEDICADA FINANCEIRO — MÉTRICAS REAIS DE FATURAS, NOTAS E CONTRATOS */
  /* ======================================================================== */
  if (role === 'financeiro') {
    const sortedInvoices = [...invoices].sort((a, b) =>
      b.vencimento.localeCompare(a.vencimento)
    );

    return (
      <div className="max-w-[1380px] mx-auto space-y-5">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
          {/* Coluna Esquerda: Resumo financeiro da conta */}
          <BentoCard className="xl:col-span-4 p-5 flex flex-col justify-between gap-4 relative overflow-hidden">
            <div className="flex items-center justify-between gap-3 relative z-10">
              <div className="min-w-0">
                <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[#0f1115] dark:text-[#f2f4f7] truncate">
                  Olá, {firstName}
                </h2>
                <p className="text-[12px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 truncate">
                  {client.nome} · Financeiro e contratos
                </p>
              </div>
              <ActionIconButton
                variant="neutral"
                onClick={() => onNavigate('financeiro')}
                title="Abrir faturas"
              >
                <ArrowUpRight className="w-4 h-4" />
              </ActionIconButton>
            </div>

            <div className="relative pt-1">
              <div className="h-[146px] flex justify-end items-start -mr-2">
                <div className="w-full max-w-[260px] h-[180px] -mt-4">
                  <StudioSculptureGraphic />
                </div>
              </div>

              <div className="relative z-10 -mt-[86px] rounded-[18px] overflow-hidden backdrop-blur-xl backdrop-saturate-150 bg-white/52 dark:bg-[#141922]/58 border border-white/80 dark:border-white/15 p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_14px_34px_rgba(22,55,68,0.10)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_16px_36px_rgba(0,0,0,0.44)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11.5px] font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60">
                      Saldo em aberto com a EAGLE
                    </div>
                    <div className="text-[24px] font-semibold tracking-[-0.03em] tabular-nums text-[#0f1115] dark:text-[#f2f4f7] leading-tight mt-0.5">
                      {formatBRL(stats.totalOpenBRL)}
                    </div>
                  </div>
                  <span className="w-8 h-8 rounded-[10px] bg-white/80 dark:bg-white/10 border border-white/85 dark:border-white/15 text-[#163744] dark:text-[#9fdce6] flex items-center justify-center shrink-0">
                    <Receipt className="w-4 h-4" />
                  </span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#0f1115]/8 dark:border-white/10 flex items-center justify-between gap-2 text-[11.5px]">
                  <span className="text-[#0f1115]/60 dark:text-[#f2f4f7]/60">
                    {stats.nextDueInvoice
                      ? `Próximo vencimento: ${formatShortDate(stats.nextDueInvoice.vencimento)}`
                      : 'Nenhuma fatura pendente'}
                  </span>
                  <span className="font-semibold text-[#163744] dark:text-[#9fdce6] tabular-nums">
                    {stats.notesAvailable} NFS-e
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('financeiro')}
                className="rounded-[14px] bg-[#9fdce6] text-[#0f1115] p-3.5 text-left cursor-pointer hover:brightness-95 transition-all"
              >
                <div className="text-[11px] font-medium text-[#0f1115]/70">
                  Total quitado
                </div>
                <div className="text-[16px] font-semibold tracking-[-0.02em] tabular-nums mt-1">
                  {formatBRL(stats.totalPaidBRL)}
                </div>
                <div className="text-[11px] text-[#0f1115]/65 mt-0.5 tabular-nums">
                  {stats.paidInvoices.length}{' '}
                  {stats.paidInvoices.length === 1 ? 'fatura paga' : 'faturas pagas'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('contratos')}
                className="rounded-[14px] bg-[#163744] text-white dark:bg-[#234f60] p-3.5 text-left cursor-pointer hover:brightness-110 transition-all"
              >
                <div className="text-[11px] font-medium text-white/75">
                  Contratos ativos
                </div>
                <div className="text-[16px] font-semibold tracking-[-0.02em] tabular-nums mt-1">
                  {stats.signedContracts.length} vigentes
                </div>
                <div className="text-[11px] text-white/75 mt-0.5 tabular-nums">
                  {stats.pendingContractsOnly.length} para assinar
                </div>
              </button>
            </div>
          </BentoCard>

          {/* Direita: Faturas do período + Pendências */}
          <div className="xl:col-span-8 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <BentoCard className="md:col-span-7 p-5 flex flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                      Histórico real de faturamento
                    </h3>
                    <p className="text-[12px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 mt-0.5 tabular-nums">
                      Total faturado: {formatBRL(stats.totalBillingBRL)} · {stats.pctPaidBRL}% quitado
                    </p>
                  </div>
                  <ActionIconButton
                    variant="neutral"
                    onClick={() => onNavigate('financeiro')}
                    title="Abrir módulo financeiro"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </ActionIconButton>
                </div>

                <ProportionBar
                  heightClass="h-2"
                  showLegend
                  segments={[
                    {
                      key: 'paid',
                      value: stats.totalPaidBRL,
                      colorClass: 'bg-[#15803d] dark:bg-[#4ade80]',
                      label: `Pagas (${formatBRL(stats.totalPaidBRL)})`,
                    },
                    {
                      key: 'open',
                      value: stats.totalOpenBRL,
                      colorClass: 'bg-[#163744] dark:bg-[#9fdce6]',
                      label: `Em aberto (${formatBRL(stats.totalOpenBRL)})`,
                    },
                  ]}
                />

                <div className="space-y-2">
                  {sortedInvoices.slice(0, 3).map((inv) => (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => onOpenInvoice(inv)}
                      className="w-full rounded-[12px] bg-[#f2f4f7]/75 dark:bg-[#10141b] hover:bg-[#e6e9ed] dark:hover:bg-[#1a202b] px-3.5 py-2.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                          {inv.descricao}
                        </div>
                        <div className="text-[11px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 tabular-nums">
                          {inv.competencia} · Venc. {formatShortDate(inv.vencimento)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-[13px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                          {formatBRL(inv.valorCentavos)}
                        </span>
                        <Badge
                          size="xs"
                          variant={
                            inv.status === 'paga'
                              ? 'success'
                              : inv.status === 'vencida'
                                ? 'danger'
                                : 'warning'
                          }
                        >
                          {inv.status === 'paga'
                            ? 'Paga'
                            : inv.status === 'vencida'
                              ? 'Vencida'
                              : 'Em aberto'}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </BentoCard>

              <BentoCard className="md:col-span-5 p-5 flex flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                      Contratos & termos
                    </h3>
                    <p className="text-[12px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 mt-0.5">
                      {stats.formalContracts.length} documentos registrados
                    </p>
                  </div>
                  <ActionIconButton
                    variant="neutral"
                    onClick={() => onNavigate('contratos')}
                    title="Abrir contratos"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </ActionIconButton>
                </div>

                <div className="space-y-2">
                  {stats.formalContracts.slice(0, 3).map((ctr) => (
                    <button
                      key={ctr.id}
                      type="button"
                      onClick={() => onOpenContract(ctr)}
                      className="w-full rounded-[12px] bg-[#f2f4f7]/75 dark:bg-[#10141b] hover:bg-[#e6e9ed] dark:hover:bg-[#1a202b] px-3.5 py-2.5 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                          {ctr.titulo}
                        </div>
                        <div className="text-[11px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 tabular-nums">
                          {ctr.codigo ?? ctr.modalidade ?? 'Contrato'} ·{' '}
                          {formatBRL(ctr.valorCentavos)}
                        </div>
                      </div>
                      <Badge
                        size="xs"
                        variant={
                          ctr.status === 'assinado' ? 'success' : 'warning'
                        }
                      >
                        {ctr.status === 'assinado' ? 'Vigente' : 'Assinar'}
                      </Badge>
                    </button>
                  ))}
                </div>
              </BentoCard>
            </div>

            <BentoCard className="p-5 flex-1 flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                  Pendências de pagamento e assinatura
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigate('contratos')}
                    className="text-[12px] font-medium text-[#163744] dark:text-[#9fdce6] hover:underline cursor-pointer"
                  >
                    Contratos
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('financeiro')}
                    className="text-[12px] font-medium text-[#163744] dark:text-[#9fdce6] hover:underline cursor-pointer"
                  >
                    Ver faturas
                  </button>
                </div>
              </div>

              {stats.openInvoices.length === 0 &&
              stats.pendingContractsForRole.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-8 text-[13px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                  Tudo quitado e assinado no momento.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {stats.openInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="rounded-[14px] bg-[#f2f4f7]/75 dark:bg-[#10141b] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <StatusIndicator
                            label={inv.status === 'vencida' ? 'Vencida' : 'Em aberto'}
                            dotClass={
                              inv.status === 'vencida'
                                ? 'bg-[#b91c1c] dark:bg-[#f87171]'
                                : 'bg-[#b45309] dark:bg-[#fbbf24]'
                            }
                            textClass={
                              inv.status === 'vencida'
                                ? 'text-[#991b1b] dark:text-[#f87171]'
                                : 'text-[#92400e] dark:text-[#fbbf24]'
                            }
                          />
                          <span className="text-[12px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 tabular-nums">
                            Vence {formatShortDate(inv.vencimento)}
                          </span>
                        </div>
                        <div className="text-[14px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate mt-0.5">
                          {inv.descricao}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[15px] font-semibold tabular-nums">
                          {formatBRL(inv.valorCentavos)}
                        </span>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onOpenInvoice(inv)}
                        >
                          Pagar
                        </Button>
                      </div>
                    </div>
                  ))}

                  {stats.pendingContractsForRole.map((ctr) => (
                    <div
                      key={ctr.id}
                      className="rounded-[14px] bg-[#f2f4f7]/75 dark:bg-[#10141b] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-[12px] text-[#92400e] dark:text-[#fbbf24] font-medium">
                          {ctr.modalidade ?? ctr.tipo} · Aguardando assinatura
                        </div>
                        <div className="text-[14px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate mt-0.5">
                          {ctr.titulo}
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onOpenContract(ctr)}
                      >
                        Revisar e assinar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </BentoCard>
          </div>
        </div>
      </div>
    );
  }

  /* ======================================================================== */
  /* VISÃO PRINCIPAL (RESPONSÁVEL & SOLICITANTE) — MÉTRICAS DO CLIENTE        */
  /* ======================================================================== */
  const heroLead = stats.priorityProject
    ? getMember(stats.priorityProject.liderEagleId)
    : undefined;

  return (
    <div className="max-w-[1380px] mx-auto space-y-5">
      {/* FAIXA 1: RESUMO DO CLIENTE (ANCORA ESQUERDA + BENTO DE MÉTRICAS REAIS) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        {/* COLUNA ESQUERDA: O QUE IMPORTA AGORA PARA O CLIENTE */}
        <BentoCard className="xl:col-span-4 p-5 flex flex-col justify-between gap-4 relative overflow-hidden">
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="min-w-0">
              <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[#0f1115] dark:text-[#f2f4f7] truncate">
                Olá, {firstName}
              </h2>
              <p className="text-[12px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 truncate">
                {client.nome} · Parceiros desde {client.desdeAno}
              </p>
            </div>

            <ActionIconButton
              variant="neutral"
              onClick={() => onNavigate('projetos')}
              title="Ver projetos"
            >
              <ArrowUpRight className="w-4 h-4" />
            </ActionIconButton>
          </div>

          {/* Zona Escultórica + Painel em Glassmorfismo Real com Ação Imediata */}
          <div className="relative pt-1">
            <div className="h-[144px] flex justify-end items-start -mr-2">
              <div className="w-full max-w-[260px] h-[178px] -mt-4">
                <StudioSculptureGraphic />
              </div>
            </div>

            <div className="relative z-10 -mt-[86px] rounded-[18px] overflow-hidden backdrop-blur-xl backdrop-saturate-150 bg-white/50 dark:bg-[#141922]/56 border border-white/80 dark:border-white/15 p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_14px_34px_rgba(22,55,68,0.10)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_16px_36px_rgba(0,0,0,0.44)]">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/80 dark:bg-white/25"
                aria-hidden="true"
              />

              <div className="relative z-10">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11.5px] font-medium text-[#0f1115]/58 dark:text-[#f2f4f7]/60">
                      Aguardando sua atenção
                    </div>
                    <div className="mt-0.5 flex items-baseline gap-2">
                      <span className="text-[28px] font-semibold tracking-[-0.03em] tabular-nums text-[#0f1115] dark:text-[#f2f4f7] leading-none">
                        {stats.totalOpenCount}
                      </span>
                      <span className="text-[12px] font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60">
                        {stats.totalOpenCount === 0
                          ? 'tudo em dia'
                          : stats.totalOpenCount === 1
                            ? 'pendência com você'
                            : 'pendências com você'}
                      </span>
                    </div>
                  </div>

                  <span className="w-8 h-8 rounded-[10px] bg-white/80 dark:bg-white/10 border border-white/85 dark:border-white/15 text-[#163744] dark:text-[#9fdce6] flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </span>
                </div>

                {/* 4 ações rápidas circulares de acesso direto */}
                <div className="mt-3.5 pt-3 border-t border-[#0f1115]/8 dark:border-white/10 grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenNewRequest(projects[0]?.id)}
                    className="flex flex-col items-center gap-1.5 group cursor-pointer"
                  >
                    <span className="w-9 h-9 rounded-full bg-[#163744] text-white dark:bg-[#9fdce6] dark:text-[#0f1115] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Plus className="w-4 h-4" />
                    </span>
                    <span className="text-[10.5px] font-medium text-[#0f1115]/75 dark:text-[#f2f4f7]/75 whitespace-nowrap">
                      Pedir
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate('aprovacoes')}
                    className="flex flex-col items-center gap-1.5 group cursor-pointer"
                  >
                    <span className="w-9 h-9 rounded-full bg-white/85 dark:bg-white/10 border border-[#0f1115]/8 dark:border-white/15 text-[#0f1115] dark:text-white flex items-center justify-center group-hover:bg-white dark:group-hover:bg-white/20 transition-colors">
                      <Check className="w-4 h-4" />
                    </span>
                    <span className="text-[10.5px] font-medium text-[#0f1115]/75 dark:text-[#f2f4f7]/75 whitespace-nowrap">
                      Aprovar
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate('entregas')}
                    className="flex flex-col items-center gap-1.5 group cursor-pointer"
                  >
                    <span className="w-9 h-9 rounded-full bg-white/85 dark:bg-white/10 border border-[#0f1115]/8 dark:border-white/15 text-[#0f1115] dark:text-white flex items-center justify-center group-hover:bg-white dark:group-hover:bg-white/20 transition-colors">
                      <PackageCheck className="w-4 h-4" />
                    </span>
                    <span className="text-[10.5px] font-medium text-[#0f1115]/75 dark:text-[#f2f4f7]/75 whitespace-nowrap">
                      Entregas
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate('conversas')}
                    className="flex flex-col items-center gap-1.5 group cursor-pointer"
                  >
                    <span className="w-9 h-9 rounded-full bg-white/85 dark:bg-white/10 border border-[#0f1115]/8 dark:border-white/15 text-[#0f1115] dark:text-white flex items-center justify-center group-hover:bg-white dark:group-hover:bg-white/20 transition-colors">
                      <MessageSquare className="w-4 h-4" />
                    </span>
                    <span className="text-[10.5px] font-medium text-[#0f1115]/75 dark:text-[#f2f4f7]/75 whitespace-nowrap">
                      Chat
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Foco de entrega do projeto prioritário */}
          {stats.priorityProject && (
            <button
              type="button"
              onClick={() => onOpenProject(stats.priorityProject.id)}
              className="w-full rounded-[14px] bg-[#f2f4f7]/80 dark:bg-[#10141b] hover:bg-[#e6e9ed] dark:hover:bg-[#161c26] p-3 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2 text-[11px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                <span className="truncate">Próxima entrega prevista</span>
                <span className="font-semibold tabular-nums text-[#163744] dark:text-[#9fdce6] shrink-0">
                  {stats.priorityProject.previsaoEntrega}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                  {stats.priorityProject.nome}
                </span>
                <span className="text-[12px] font-semibold tabular-nums text-[#0f1115]/70 dark:text-[#f2f4f7]/70 shrink-0">
                  {stats.priorityProject.progressoPct}%
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-[#dfe5ec] dark:bg-[#232b38] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#163744] dark:bg-[#9fdce6] transition-all duration-300"
                  style={{ width: `${stats.priorityProject.progressoPct}%` }}
                />
              </div>
            </button>
          )}

          {/* Duas métricas de base alinhadas ao cenário do cliente */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onNavigate('aprovacoes')}
              className="rounded-[14px] bg-[#9fdce6] text-[#0f1115] p-3.5 text-left cursor-pointer hover:brightness-95 transition-all"
            >
              <div className="text-[20px] font-semibold tracking-[-0.02em] tabular-nums leading-none">
                {stats.awaitingApproval.length}
              </div>
              <div className="text-[11.5px] font-semibold mt-1.5">
                Peças para aprovar
              </div>
              <div className="text-[10.5px] text-[#0f1115]/70 mt-0.5 tabular-nums">
                {stats.approvedPieces.length} já aprovadas
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('projetos')}
              className="rounded-[14px] bg-[#163744] text-white dark:bg-[#234f60] p-3.5 text-left cursor-pointer hover:brightness-110 transition-all"
            >
              <div className="text-[20px] font-semibold tracking-[-0.02em] tabular-nums leading-none">
                {stats.activeProjects.length}
              </div>
              <div className="text-[11.5px] font-semibold mt-1.5">
                Projetos em curso
              </div>
              <div className="text-[10.5px] text-white/75 mt-0.5 tabular-nums">
                {stats.deliveredProjects.length}{' '}
                {stats.deliveredProjects.length === 1 ? 'entregue' : 'entregues'}
              </div>
            </button>
          </div>
        </BentoCard>

        {/* COLUNA DIREITA: 4 CARDS MODULARES COM DADOS REAIS DO PORTAL */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          {/* LINHA SUPERIOR */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* CARD 1 (5/12): Status das peças enviadas para você */}
            <BentoCard className="md:col-span-5 p-5 flex flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                    Peças em revisão
                  </h2>
                  <p className="mt-0.5 text-[12px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 tabular-nums">
                    {pieces.length} {pieces.length === 1 ? 'peça enviada' : 'peças enviadas'} pela EAGLE
                  </p>
                </div>

                <ActionIconButton
                  variant="neutral"
                  onClick={() => onNavigate('aprovacoes')}
                  title="Abrir aprovações"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </ActionIconButton>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => onNavigate('aprovacoes')}
                  className="w-full rounded-[12px] bg-[#163744] text-white dark:bg-[#234f60] px-3.5 py-2.5 flex items-center justify-between gap-3 text-left cursor-pointer hover:brightness-110 transition-all"
                >
                  <div>
                    <div className="text-[12.5px] font-semibold">
                      Aguardando seu aval
                    </div>
                    <div className="text-[11px] text-white/70">
                      Prontas para aprovar ou marcar pontos
                    </div>
                  </div>
                  <span className="text-[18px] font-semibold tabular-nums">
                    {stats.awaitingApproval.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('aprovacoes')}
                  className="w-full rounded-[12px] bg-[#9fdce6] text-[#0f1115] px-3.5 py-2.5 flex items-center justify-between gap-3 text-left cursor-pointer hover:brightness-95 transition-all"
                >
                  <div>
                    <div className="text-[12.5px] font-semibold">
                      Em ajuste com a equipe
                    </div>
                    <div className="text-[11px] text-[#0f1115]/70">
                      Pinos comentados em atualização
                    </div>
                  </div>
                  <span className="text-[18px] font-semibold tabular-nums">
                    {stats.adjustingPieces.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('aprovacoes')}
                  className="w-full rounded-[12px] bg-[#f2f4f7]/80 dark:bg-[#10141b] px-3.5 py-2.5 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-[#e6e9ed] dark:hover:bg-[#1a202b] transition-colors"
                >
                  <div>
                    <div className="text-[12.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                      Aprovadas por você
                    </div>
                    <div className="text-[11px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                      Liberadas para fechamento
                    </div>
                  </div>
                  <span className="text-[18px] font-semibold tabular-nums text-[#15803d] dark:text-[#4ade80]">
                    {stats.approvedPieces.length}
                  </span>
                </button>
              </div>
            </BentoCard>

            {/* CARD 2 (7/12): Resultados reais (se publicados) OU Cronograma de entregas */}
            {realCampaignChart ? (
              <BentoCard className="md:col-span-7 p-5 flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                      Desempenho da campanha
                    </h2>
                    <p className="mt-0.5 text-[12px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 truncate">
                      {results?.periodoLabel}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="inline-flex items-center p-0.5 rounded-full bg-[#f2f4f7] dark:bg-[#10141b] border border-[#0f1115]/8 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => setResultsMetric('alcance')}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                          resultsMetric === 'alcance'
                            ? 'bg-white dark:bg-[#1e2530] text-[#0f1115] dark:text-white shadow-sm'
                            : 'text-[#0f1115]/55 dark:text-[#f2f4f7]/55'
                        }`}
                      >
                        Alcance
                      </button>
                      <button
                        type="button"
                        onClick={() => setResultsMetric('engajamento')}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                          resultsMetric === 'engajamento'
                            ? 'bg-white dark:bg-[#1e2530] text-[#0f1115] dark:text-white shadow-sm'
                            : 'text-[#0f1115]/55 dark:text-[#f2f4f7]/55'
                        }`}
                      >
                        Engajamento
                      </button>
                    </div>

                    <ActionIconButton
                      variant="neutral"
                      onClick={() => onNavigate('resultados')}
                      title="Ver resultados completos"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </ActionIconButton>
                  </div>
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-[28px] font-semibold tracking-[-0.03em] tabular-nums text-[#0f1115] dark:text-[#f2f4f7] leading-none">
                      {realCampaignChart.headline}
                    </span>
                    {realCampaignChart.variacao && (
                      <Badge variant="success" size="xs">
                        {realCampaignChart.variacao}
                      </Badge>
                    )}
                  </div>

                  {realCampaignChart.secondaryKpis.length > 0 && (
                    <div className="flex items-center gap-4 text-[11.5px]">
                      {realCampaignChart.secondaryKpis.map((kpi) => (
                        <div key={kpi.label} className="text-right">
                          <div className="text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                            {kpi.label}
                          </div>
                          <div className="font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                            {kpi.valor}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <SplineTrendChart
                  labels={realCampaignChart.labels}
                  values={realCampaignChart.values}
                  peakIndex={realCampaignChart.peakIndex}
                  peakCallout={realCampaignChart.peakCallout}
                />
              </BentoCard>
            ) : (
              <BentoCard className="md:col-span-7 p-5 flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                      Próximas entregas e prazos
                    </h2>
                    <p className="mt-0.5 text-[12px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50">
                      Etapas em produção e próximos marcos acordados
                    </p>
                  </div>

                  <ActionIconButton
                    variant="neutral"
                    onClick={() => onNavigate('projetos')}
                    title="Abrir projetos"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </ActionIconButton>
                </div>

                <div className="space-y-2">
                  {stats.upcomingMilestones.slice(0, 3).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onOpenProject(m.projectId)}
                      className="w-full rounded-[12px] bg-[#f2f4f7]/80 dark:bg-[#10141b] hover:bg-[#e6e9ed] dark:hover:bg-[#1a202b] px-3.5 py-2.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <MicroRing
                          value={m.progress}
                          size={34}
                          strokeWidth={3}
                          label={`${m.progress}%`}
                        />
                        <div className="min-w-0">
                          <div className="text-[12.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                            {m.stageName} · {m.projectName}
                          </div>
                          <div className="text-[11px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 truncate">
                            {m.summary}
                          </div>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums text-[#163744] dark:text-[#9fdce6] shrink-0">
                        <Calendar className="w-3 h-3" />
                        {m.dateLabel}
                      </span>
                    </button>
                  ))}
                </div>
              </BentoCard>
            )}
          </div>

          {/* LINHA INFERIOR */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1">
            {/* CARD 3 (6/12): Pedidos abertos & Entregas liberadas */}
            <BentoCard className="md:col-span-6 p-5 flex flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                    Pedidos & arquivos finais
                  </h2>
                  <p className="mt-0.5 text-[12px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50">
                    Demandas registradas e pacotes liberados
                  </p>
                </div>

                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => onOpenNewRequest(projects[0]?.id)}
                >
                  <Plus className="w-3 h-3" />
                  <span>Novo pedido</span>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('pedidos')}
                  className="rounded-[12px] bg-[#f2f4f7]/80 dark:bg-[#10141b] hover:bg-[#e6e9ed] dark:hover:bg-[#1a202b] p-3 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[20px] font-semibold tracking-[-0.02em] tabular-nums text-[#0f1115] dark:text-[#f2f4f7] leading-none">
                      {requests.length}
                    </span>
                    <Inbox className="w-4 h-4 text-[#163744] dark:text-[#9fdce6]" />
                  </div>
                  <div className="text-[12px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] mt-1.5">
                    Pedidos enviados
                  </div>
                  <div className="text-[11px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 mt-0.5 tabular-nums">
                    {stats.requestsInProduction} em produção · {stats.requestsInAnalysis} em análise
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('entregas')}
                  className="rounded-[12px] bg-[#f2f4f7]/80 dark:bg-[#10141b] hover:bg-[#e6e9ed] dark:hover:bg-[#1a202b] p-3 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[20px] font-semibold tracking-[-0.02em] tabular-nums text-[#0f1115] dark:text-[#f2f4f7] leading-none">
                      {deliverables.length}
                    </span>
                    <PackageCheck className="w-4 h-4 text-[#163744] dark:text-[#9fdce6]" />
                  </div>
                  <div className="text-[12px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] mt-1.5">
                    Arquivos liberados
                  </div>
                  <div className="text-[11px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 mt-0.5 truncate">
                    Prontos para baixar na pasta
                  </div>
                </button>
              </div>
            </BentoCard>

            {/* CARD 4 (6/12): Comercial & Faturas (Responsável) OU Atendimento & Marca (Solicitante) */}
            {role === 'responsavel' ? (
              <BentoCard className="md:col-span-6 p-5 flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                      Propostas, contratos e faturas
                    </h2>
                    <p className="mt-0.5 text-[12px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50">
                      Resumo administrativo da conta
                    </p>
                  </div>
                  <ActionIconButton
                    variant="neutral"
                    onClick={() => onNavigate('financeiro')}
                    title="Abrir financeiro"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </ActionIconButton>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('propostas')}
                    className="w-full rounded-[11px] bg-[#f2f4f7]/80 dark:bg-[#10141b] hover:bg-[#e6e9ed] dark:hover:bg-[#1a202b] px-3.5 py-2 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-[12.5px] font-medium text-[#0f1115] dark:text-[#f2f4f7]">
                      <ScrollText className="w-3.5 h-3.5 text-[#163744] dark:text-[#9fdce6]" />
                      Propostas em avaliação
                    </span>
                    <span className="text-[12px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                      {stats.pendingProposals.length > 0
                        ? `${stats.pendingProposals.length} · ${formatBRL(stats.pendingProposalsBRL)}`
                        : 'Nenhuma aberta'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate('contratos')}
                    className="w-full rounded-[11px] bg-[#f2f4f7]/80 dark:bg-[#10141b] hover:bg-[#e6e9ed] dark:hover:bg-[#1a202b] px-3.5 py-2 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-[12.5px] font-medium text-[#0f1115] dark:text-[#f2f4f7]">
                      <FileCheck2 className="w-3.5 h-3.5 text-[#163744] dark:text-[#9fdce6]" />
                      Contratos & aditivos
                    </span>
                    <span className="text-[12px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                      {stats.pendingContractsOnly.length > 0
                        ? `${stats.pendingContractsOnly.length} para assinar`
                        : `${stats.signedContracts.length} vigentes`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate('financeiro')}
                    className="w-full rounded-[11px] bg-[#f2f4f7]/80 dark:bg-[#10141b] hover:bg-[#e6e9ed] dark:hover:bg-[#1a202b] px-3.5 py-2 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-[12.5px] font-medium text-[#0f1115] dark:text-[#f2f4f7]">
                      <Receipt className="w-3.5 h-3.5 text-[#163744] dark:text-[#9fdce6]" />
                      Faturas em aberto
                    </span>
                    <span className="text-[12px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                      {stats.openInvoices.length > 0
                        ? `${formatBRL(stats.totalOpenBRL)} · ${
                            stats.nextDueInvoice
                              ? `venc. ${formatShortDate(stats.nextDueInvoice.vencimento)}`
                              : ''
                          }`
                        : 'Tudo quitado'}
                    </span>
                  </button>
                </div>
              </BentoCard>
            ) : (
              <BentoCard className="md:col-span-6 p-5 flex flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                      Atendimento & acervo da marca
                    </h2>
                    <p className="mt-0.5 text-[12px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50">
                      Canal direto com a equipe e materiais oficiais
                    </p>
                  </div>
                  <ActionIconButton
                    variant="neutral"
                    onClick={() => onNavigate('conversas')}
                    title="Abrir conversas"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </ActionIconButton>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigate('conversas')}
                    className="rounded-[12px] bg-[#f2f4f7]/80 dark:bg-[#10141b] hover:bg-[#e6e9ed] dark:hover:bg-[#1a202b] p-3 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[20px] font-semibold tracking-[-0.02em] tabular-nums text-[#0f1115] dark:text-[#f2f4f7] leading-none">
                        {stats.unreadMessages > 0
                          ? stats.unreadMessages
                          : conversations.length}
                      </span>
                      {heroLead && (
                        <MemberAvatar member={heroLead} size="xs" showOperationalRing />
                      )}
                    </div>
                    <div className="text-[12px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] mt-1.5">
                      {stats.unreadMessages > 0
                        ? 'Mensagens novas'
                        : 'Canais ativos'}
                    </div>
                    <div className="text-[11px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 mt-0.5 truncate">
                      {heroLead
                        ? `Com ${heroLead.nome.split(' ')[0]} e equipe`
                        : 'Fale direto por projeto'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate('marca')}
                    className="rounded-[12px] bg-[#f2f4f7]/80 dark:bg-[#10141b] hover:bg-[#e6e9ed] dark:hover:bg-[#1a202b] p-3 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold text-[#163744] dark:text-[#9fdce6]">
                        Brand Book
                      </span>
                      <Palette className="w-4 h-4 text-[#163744] dark:text-[#9fdce6]" />
                    </div>
                    <div className="text-[12px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] mt-2">
                      Acervo da marca
                    </div>
                    <div className="text-[11px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 mt-0.5 truncate">
                      Logos, cores, fontes e manuais
                    </div>
                  </button>
                </div>
              </BentoCard>
            )}
          </div>
        </div>
      </div>

      {/* FAIXA 2: NA SUA MESA AGORA + EM QUE PÉ ESTÁ CADA PROJETO */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <BentoCard className="xl:col-span-7 p-5 flex flex-col">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                Na sua mesa agora
              </h2>
              <span className="text-[12px] font-medium text-[#0f1115]/45 dark:text-[#f2f4f7]/45 tabular-nums">
                {stats.pendingPieces.length +
                  (role === 'responsavel'
                    ? stats.pendingContractsForRole.length + stats.openInvoices.length
                    : 0)}
              </span>
            </div>

            <ActionIconButton
              variant="neutral"
              onClick={() => onNavigate('aprovacoes')}
              title="Ver todas as peças"
            >
              <ArrowUpRight className="w-4 h-4" />
            </ActionIconButton>
          </div>

          {stats.pendingPieces.length === 0 &&
          (role !== 'responsavel' ||
            (stats.pendingContractsForRole.length === 0 &&
              stats.openInvoices.length === 0)) ? (
            <div className="py-10 text-center">
              <p className="text-[13.5px] font-medium text-[#0f1115]/62 dark:text-[#f2f4f7]/62">
                Tudo aprovado por aqui. Nossa equipe segue avançando nas entregas.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {stats.pendingPieces.slice(0, 3).map((piece) => {
                const proj = projects.find((p) => p.id === piece.projectId);
                const lead = proj ? getMember(proj.liderEagleId) : undefined;
                const isPending = piece.status === 'aguardando_aprovacao';

                return (
                  <div
                    key={piece.id}
                    className="rounded-[14px] bg-[#f2f4f7]/75 dark:bg-[#10141b] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => onOpenProofing(piece.id)}
                        title="Abrir peça e marcar pontos"
                        className="relative w-16 h-12 rounded-[10px] overflow-hidden shrink-0 group cursor-pointer bg-[#e6e9ed] dark:bg-[#1e2530]"
                      >
                        {piece.previewUrl && (
                          <img
                            src={piece.previewUrl}
                            alt={piece.titulo}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                        )}
                        <span className="absolute inset-0 bg-[#0f1115]/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Maximize2 className="w-3.5 h-3.5" />
                        </span>
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                          {piece.titulo}
                        </div>
                        <div className="mt-0.5 text-[12px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 flex items-center gap-1.5 truncate">
                          <span>{lead?.nome.split(' ')[0] ?? 'EAGLE'}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#163744] dark:text-[#9fdce6] font-medium truncate">
                            {proj?.nome}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums shrink-0">{piece.versao}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {role === 'responsavel' && isPending && (
                        <button
                          type="button"
                          onClick={() => onQuickApprovePiece(piece.id)}
                          className="eagle-btn-primary h-8 px-3 text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Aprovar</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenProofing(piece.id)}
                        className="eagle-btn-secondary h-8 px-3 text-[12px] font-medium cursor-pointer whitespace-nowrap"
                      >
                        {piece.pins.length > 0
                          ? `Revisar (${piece.pins.length})`
                          : 'Marcar peça'}
                      </button>
                    </div>
                  </div>
                );
              })}

              {role === 'responsavel' &&
                stats.pendingContractsForRole.slice(0, 1).map((ctr) => (
                  <div
                    key={ctr.id}
                    className="rounded-[14px] bg-[#f2f4f7]/75 dark:bg-[#10141b] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-16 h-12 rounded-[10px] bg-[#163744]/10 dark:bg-[#9fdce6]/14 text-[#163744] dark:text-[#9fdce6] flex items-center justify-center shrink-0">
                        <FileCheck2 className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                          {ctr.titulo}
                        </div>
                        <div className="mt-0.5 text-[12px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 tabular-nums">
                          {ctr.tipo} · {formatBRL(ctr.valorCentavos)} · Enviado em{' '}
                          {ctr.enviadoEm}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenContract(ctr)}
                      className="eagle-btn-primary h-8 px-3 text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <span>Revisar e assinar</span>
                    </button>
                  </div>
                ))}

              {role === 'responsavel' &&
                stats.openInvoices.slice(0, 1).map((inv) => (
                  <div
                    key={inv.id}
                    className="rounded-[14px] bg-[#f2f4f7]/75 dark:bg-[#10141b] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-16 h-12 rounded-[10px] bg-[#b45309]/10 dark:bg-[#fbbf24]/15 text-[#92400e] dark:text-[#fbbf24] flex items-center justify-center shrink-0">
                        <Receipt className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                          {inv.descricao}
                        </div>
                        <div className="mt-0.5 text-[12px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 tabular-nums">
                          {formatBRL(inv.valorCentavos)} · Vence{' '}
                          {formatShortDate(inv.vencimento)}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenInvoice(inv)}
                      className="eagle-btn-secondary h-8 px-3 text-[12px] font-medium cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Pagar fatura
                    </button>
                  </div>
                ))}
            </div>
          )}
        </BentoCard>

        {/* Direita: Projetos com gaveta expansível */}
        <BentoCard className="xl:col-span-5 p-5 flex flex-col">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
              Em que pé está cada projeto
            </h2>
            <ActionIconButton
              variant="neutral"
              onClick={() => onNavigate('projetos')}
              title="Ver todos os projetos"
            >
              <ArrowUpRight className="w-4 h-4" />
            </ActionIconButton>
          </div>

          <div className="space-y-2.5">
            {projects.map((proj) => {
              const lead = getMember(proj.liderEagleId);
              const isOpen = expandedProjectId === proj.id;
              const conv = conversations.find((c) => c.projectId === proj.id);
              const doneCount = proj.etapas.filter(
                (s) => s.status === 'concluida'
              ).length;
              const activeCount = proj.etapas.filter(
                (s) => s.status === 'em_andamento'
              ).length;
              const nextCount = Math.max(
                0,
                proj.etapas.length - doneCount - activeCount
              );

              return (
                <div
                  key={proj.id}
                  className={`rounded-[16px] overflow-hidden border transition-colors ${
                    isOpen
                      ? 'bg-[#f6f8fa] dark:bg-[#10141b] border-[#163744]/22 dark:border-[#9fdce6]/25'
                      : 'bg-[#f2f4f7]/75 dark:bg-[#10141b]/80 border-transparent hover:border-[#0f1115]/10 dark:hover:border-white/10'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedProjectId((prev) =>
                        prev === proj.id ? null : proj.id
                      )
                    }
                    aria-expanded={isOpen}
                    className="w-full p-3.5 text-left flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <MicroRing
                        value={proj.progressoPct}
                        size={38}
                        strokeWidth={3.5}
                        label={`${proj.progressoPct}%`}
                      />
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                          {proj.nome}
                        </div>
                        <div className="mt-0.5 text-[11.5px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 flex items-center gap-1.5 truncate">
                          <span>{proj.faseAtual}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{proj.previsaoEntrega}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0 transition-transform ${
                        isOpen
                          ? 'bg-[#163744] text-white dark:bg-[#9fdce6] dark:text-[#0f1115]'
                          : 'bg-white dark:bg-[#1b2029] text-[#0f1115]/65 dark:text-white/65'
                      }`}
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="proj-drawer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-3.5 pb-3.5 pt-2 border-t border-[#0f1115]/7 dark:border-white/8 space-y-3">
                          <ProportionBar
                            heightClass="h-1.5"
                            segments={[
                              {
                                key: 'done',
                                value: doneCount,
                                colorClass: 'bg-[#15803d] dark:bg-[#4ade80]',
                              },
                              {
                                key: 'active',
                                value: activeCount,
                                colorClass: 'bg-[#163744] dark:bg-[#9fdce6]',
                              },
                              {
                                key: 'next',
                                value: nextCount,
                                colorClass: 'bg-[#dfe5ec] dark:bg-[#232934]',
                              },
                            ]}
                          />

                          <p className="text-[12px] text-[#0f1115]/70 dark:text-[#f2f4f7]/70 leading-relaxed">
                            {proj.ultimoUpdate}
                          </p>

                          <div className="space-y-1.5">
                            {proj.etapas.map((etapa, idx) => (
                              <div
                                key={etapa.id}
                                className="flex items-center justify-between gap-2 text-[11.5px]"
                              >
                                <span className="flex items-center gap-2 min-w-0 truncate">
                                  <span
                                    className={`w-4 h-4 rounded-full inline-flex items-center justify-center text-[9.5px] font-semibold tabular-nums shrink-0 ${
                                      etapa.status === 'concluida'
                                        ? 'bg-[#15803d]/15 text-[#166534] dark:bg-[#4ade80]/15 dark:text-[#4ade80]'
                                        : etapa.status === 'em_andamento'
                                          ? 'bg-[#163744] text-white dark:bg-[#9fdce6] dark:text-[#0f1115]'
                                          : 'bg-[#e6e9ed] text-[#0f1115]/48 dark:bg-[#1e2530] dark:text-white/45'
                                    }`}
                                  >
                                    {etapa.status === 'concluida' ? (
                                      <Check className="w-2.5 h-2.5" />
                                    ) : (
                                      idx + 1
                                    )}
                                  </span>
                                  <span
                                    className={`truncate ${
                                      etapa.status === 'concluida'
                                        ? 'text-[#0f1115]/52 dark:text-[#f2f4f7]/52'
                                        : etapa.status === 'em_andamento'
                                          ? 'font-semibold text-[#0f1115] dark:text-[#f2f4f7]'
                                          : 'text-[#0f1115]/58 dark:text-[#f2f4f7]/58'
                                    }`}
                                  >
                                    {etapa.nome}
                                  </span>
                                </span>
                                {etapa.dataLabel && (
                                  <span className="text-[11px] text-[#0f1115]/45 dark:text-[#f2f4f7]/45 tabular-nums shrink-0">
                                    {etapa.dataLabel}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-[#0f1115]/7 dark:border-white/8 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <MemberAvatar
                                member={lead}
                                size="xs"
                                showOperationalRing
                              />
                              <span className="text-[11.5px] font-medium text-[#0f1115]/70 dark:text-[#f2f4f7]/70 truncate">
                                {lead?.nome.split(' ')[0] ?? 'Equipe'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {conv && (
                                <ActionIconButton
                                  variant="neutral"
                                  size="sm"
                                  onClick={() => onOpenConversation(conv.id)}
                                  title="Conversar neste projeto"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </ActionIconButton>
                              )}
                              <Button
                                variant="secondary"
                                size="xs"
                                onClick={() => onOpenProject(proj.id)}
                              >
                                <span>Detalhes</span>
                                <ArrowRight className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </BentoCard>
      </div>

      {/* FAIXA 3: ENTREGAS RECENTES PRONTAS PARA DOWNLOAD */}
      <BentoCard className="p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
              Entregas recentes liberadas
            </h2>
            <span className="text-[12px] font-medium text-[#0f1115]/45 dark:text-[#f2f4f7]/45 tabular-nums">
              {deliverables.length}
            </span>
          </div>

          <ActionIconButton
            variant="neutral"
            onClick={() => onNavigate('entregas')}
            title="Ver todas as entregas"
          >
            <ArrowUpRight className="w-4 h-4" />
          </ActionIconButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {deliverables.slice(0, 3).map((dlv) => {
            const proj = projects.find((p) => p.id === dlv.projectId);
            return (
              <div
                key={dlv.id}
                className="rounded-[14px] bg-[#f2f4f7]/75 dark:bg-[#10141b] px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-[9px] bg-white dark:bg-[#15181f] border border-[#0f1115]/8 dark:border-white/8 text-[#163744] dark:text-[#9fdce6] flex items-center justify-center shrink-0">
                    <FolderKanban className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                      {dlv.titulo}
                    </div>
                    <div className="text-[11px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 truncate tabular-nums">
                      {proj?.nome ?? dlv.categoria} · {dlv.formato} · {dlv.tamanho}
                    </div>
                  </div>
                </div>

                <ActionIconButton
                  variant="neutral"
                  size="sm"
                  onClick={() => onDownloadDeliverable(dlv)}
                  title={`Baixar ${dlv.arquivoNome}`}
                >
                  <Download className="w-3.5 h-3.5" />
                </ActionIconButton>
              </div>
            );
          })}
        </div>
      </BentoCard>
    </div>
  );
}
