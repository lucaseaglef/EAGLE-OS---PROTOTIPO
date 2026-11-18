import { useMemo } from 'react';
import {
  CreditCard,
  Download,
  FileCheck2,
  QrCode,
  Receipt,
  ScanBarcode,
} from 'lucide-react';
import { Badge, Button } from '../components/DesignSystem';
import { EmptyState, StatusIndicator } from '../components/SharedUI';
import { BentoCard } from '../components/VisualWidgets';
import { PortalClientProfile, PortalInvoice } from '../types/portal';
import { formatBRL, formatFullDate, formatShortDate } from '../utils/formatters';

export type FinanceFilter = 'todas' | 'abertas' | 'pagas';

interface PortalFinanceViewProps {
  client: PortalClientProfile;
  invoices: PortalInvoice[];
  filter: FinanceFilter;
  onPayInvoice: (invoice: PortalInvoice) => void;
  onDownloadNfse: (invoice: PortalInvoice) => void;
}

export function PortalFinanceView({
  client,
  invoices,
  filter,
  onPayInvoice,
  onDownloadNfse,
}: PortalFinanceViewProps) {
  const stats = useMemo(() => {
    const overdue = invoices.filter((i) => i.status === 'vencida');
    const allOpen = invoices.filter((i) => i.status !== 'paga');
    const paid = invoices.filter((i) => i.status === 'paga');

    const totalOpenCents = allOpen.reduce((sum, i) => sum + i.valorCentavos, 0);
    const totalPaidCents = paid.reduce((sum, i) => sum + i.valorCentavos, 0);
    const totalCycleCents = Math.max(1, totalOpenCents + totalPaidCents);
    const pctPaid = Math.round((totalPaidCents / totalCycleCents) * 100);
    const nfseCount = paid.filter((i) => Boolean(i.notaFiscalArquivo)).length;

    const nextDue = [...allOpen].sort((a, b) =>
      a.vencimento.localeCompare(b.vencimento)
    )[0];

    return {
      overdue,
      allOpen,
      paid,
      totalOpenCents,
      totalPaidCents,
      pctPaid,
      nfseCount,
      nextDue,
    };
  }, [invoices]);

  const rows = useMemo(() => {
    const list = invoices.filter((inv) => {
      if (filter === 'abertas') return inv.status !== 'paga';
      if (filter === 'pagas') return inv.status === 'paga';
      return true;
    });
    const order: Record<PortalInvoice['status'], number> = {
      vencida: 0,
      em_aberto: 1,
      paga: 2,
    };
    return [...list].sort((a, b) => order[a.status] - order[b.status]);
  }, [invoices, filter]);

  const renderMethodIcon = (forma: PortalInvoice['formaPreferida']) => {
    if (forma === 'Pix') return <QrCode className="w-3.5 h-3.5" />;
    if (forma === 'Boleto') return <ScanBarcode className="w-3.5 h-3.5" />;
    return <CreditCard className="w-3.5 h-3.5" />;
  };

  return (
    <div className="max-w-[1380px] mx-auto space-y-5">
      {/* FAIXA DE RESUMO FINANCEIRO */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <BentoCard className="xl:col-span-4 p-5 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[12px] font-medium text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                Saldo em aberto · {client.nome}
              </span>
              <div className="mt-1.5 text-[28px] font-semibold tracking-[-0.03em] tabular-nums text-[#0f1115] dark:text-[#f2f4f7] leading-none">
                {formatBRL(stats.totalOpenCents)}
              </div>
            </div>

            {stats.overdue.length > 0 ? (
              <Badge variant="danger" size="sm">
                {stats.overdue.length} vencida
              </Badge>
            ) : stats.allOpen.length > 0 ? (
              <Badge variant="warning" size="sm">
                {stats.allOpen.length} a vencer
              </Badge>
            ) : (
              <Badge variant="success" size="sm">
                Em dia
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#0f1115]/6 dark:border-white/8 text-[12px]">
            <span className="text-[#0f1115]/55 dark:text-[#f2f4f7]/55 tabular-nums truncate">
              {stats.nextDue
                ? `Próximo vencimento: ${formatFullDate(stats.nextDue.vencimento)}`
                : 'Nenhuma fatura pendente'}
            </span>
            {stats.nextDue && (
              <Button
                variant="primary"
                size="xs"
                onClick={() => onPayInvoice(stats.nextDue!)}
              >
                Pagar
              </Button>
            )}
          </div>
        </BentoCard>

        <BentoCard className="xl:col-span-4 p-5 flex flex-col justify-between gap-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[12px] font-medium text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                Quitado no ciclo
              </span>
              <div className="mt-1.5 text-[22px] font-semibold tracking-[-0.025em] tabular-nums text-[#163744] dark:text-[#9fdce6] leading-none">
                {formatBRL(stats.totalPaidCents)}
              </div>
              <p className="text-[11.5px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 mt-1.5 tabular-nums">
                {stats.paid.length} pagas
              </p>
            </div>

            <div className="border-l border-[#0f1115]/8 dark:border-white/8 pl-4">
              <span className="text-[12px] font-medium text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                Notas fiscais
              </span>
              <div className="mt-1.5 text-[22px] font-semibold tracking-[-0.025em] tabular-nums text-[#0f1115] dark:text-[#f2f4f7] leading-none">
                {stats.nfseCount} NFS-e
              </div>
              <p className="text-[11.5px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 mt-1.5">
                Disponíveis em PDF
              </p>
            </div>
          </div>

          <div className="h-1.5 w-full rounded-full bg-[#e6e9ed] dark:bg-[#202631] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#9fdce6] transition-all duration-300"
              style={{ width: `${stats.pctPaid}%` }}
            />
          </div>
        </BentoCard>

        <BentoCard className="xl:col-span-4 p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
              Composição do faturamento
            </span>
            <span className="text-[12px] font-semibold tabular-nums text-[#163744] dark:text-[#9fdce6]">
              {stats.pctPaid}% quitado
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="w-16 text-[12px] text-[#0f1115]/58 dark:text-[#f2f4f7]/58 shrink-0">
                Pagas
              </span>
              <div className="flex-1 h-7 rounded-[9px] bg-[#f2f4f7] dark:bg-[#10141b] overflow-hidden relative flex items-center">
                <div
                  className="h-full rounded-[9px] bg-[#9fdce6]"
                  style={{ width: `${Math.max(stats.pctPaid > 0 ? 18 : 0, stats.pctPaid)}%` }}
                />
                <span className="absolute left-2.5 text-[11.5px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                  {stats.pctPaid}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-16 text-[12px] text-[#0f1115]/58 dark:text-[#f2f4f7]/58 shrink-0">
                Em aberto
              </span>
              <div className="flex-1 h-7 rounded-[9px] bg-[#f2f4f7] dark:bg-[#10141b] overflow-hidden relative flex items-center">
                <div
                  className="h-full rounded-[9px] bg-[#dfe5ec] dark:bg-[#232b38]"
                  style={{
                    width: `${Math.max(100 - stats.pctPaid > 0 ? 18 : 0, 100 - stats.pctPaid)}%`,
                  }}
                />
                <span className="absolute left-2.5 text-[11.5px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                  {100 - stats.pctPaid}%
                </span>
              </div>
            </div>
          </div>
        </BentoCard>
      </div>

      {/* TABELA ÚNICA DE FATURAS E NOTAS FISCAIS (IGUAL FINANCEVIEW) */}
      {rows.length === 0 ? (
        <EmptyState title="Nenhuma fatura encontrada neste filtro." />
      ) : (
        <BentoCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#0f1115]/8 dark:border-[#f2f4f7]/8 text-[11.5px] font-medium text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                  <th className="py-3.5 pl-5 pr-4 font-medium">Vencimento / Pagto</th>
                  <th className="py-3.5 px-4 font-medium">Fatura</th>
                  <th className="py-3.5 px-4 font-medium">Competência</th>
                  <th className="py-3.5 px-4 font-medium">Meio</th>
                  <th className="py-3.5 px-4 font-medium">Nota Fiscal (NFS-e)</th>
                  <th className="py-3.5 px-4 font-medium text-right">Valor</th>
                  <th className="py-3.5 pl-4 pr-5 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0f1115]/6 dark:divide-[#f2f4f7]/6 text-[13.5px]">
                {rows.map((inv) => {
                  const isOverdue = inv.status === 'vencida';
                  const isPaid = inv.status === 'paga';

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => (!isPaid ? onPayInvoice(inv) : undefined)}
                      className={`group transition-colors ${
                        !isPaid ? 'cursor-pointer' : ''
                      } ${
                        isOverdue
                          ? 'bg-[#b91c1c]/[0.03] dark:bg-[#f87171]/[0.05] hover:bg-[#b91c1c]/[0.06]'
                          : 'hover:bg-[#f6f8fa] dark:hover:bg-[#191d26]'
                      }`}
                    >
                      <td className="py-3.5 pl-5 pr-4 whitespace-nowrap tabular-nums">
                        {isOverdue ? (
                          <StatusIndicator
                            label={`Vencida · ${formatShortDate(inv.vencimento)}`}
                            dotClass="bg-[#b91c1c] dark:bg-[#f87171]"
                            textClass="text-[#991b1b] dark:text-[#f87171]"
                            live
                          />
                        ) : isPaid ? (
                          <StatusIndicator
                            label={`Pago ${formatShortDate(inv.pagoEm || inv.vencimento)}`}
                            dotClass="bg-[#15803d] dark:bg-[#4ade80]"
                            textClass="text-[#166534] dark:text-[#4ade80]"
                          />
                        ) : (
                          <StatusIndicator
                            label={`Vence ${formatShortDate(inv.vencimento)}`}
                            dotClass="bg-[#b45309] dark:bg-[#fbbf24]"
                            textClass="text-[#92400e] dark:text-[#fbbf24]"
                          />
                        )}
                      </td>

                      <td className="py-3.5 px-4 min-w-[230px]">
                        <div className="font-semibold text-[#0f1115] dark:text-[#f2f4f7] group-hover:text-[#163744] dark:group-hover:text-[#9fdce6] transition-colors">
                          {inv.descricao}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-[12.5px] text-[#0f1115]/65 dark:text-[#f2f4f7]/65">
                        {inv.competencia}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-[12px] text-[#0f1115]/60 dark:text-[#f2f4f7]/60">
                        <span className="inline-flex items-center gap-1.5">
                          {renderMethodIcon(inv.formaPreferida)}
                          <span>{inv.formaPreferida}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {inv.notaFiscalNumero ? (
                          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#15803d] dark:text-[#4ade80] tabular-nums">
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>{inv.notaFiscalNumero}</span>
                          </span>
                        ) : (
                          <span className="text-[12px] text-[#0f1115]/40 dark:text-[#f2f4f7]/40">
                            Emitida após pgto
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-semibold tabular-nums whitespace-nowrap text-[#0f1115] dark:text-[#f2f4f7]">
                        {formatBRL(inv.valorCentavos)}
                      </td>

                      <td
                        className="py-3.5 pl-4 pr-5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!isPaid ? (
                          <Button
                            variant="primary"
                            size="xs"
                            onClick={() => onPayInvoice(inv)}
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Pagar</span>
                          </Button>
                        ) : inv.notaFiscalArquivo ? (
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => onDownloadNfse(inv)}
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>NFS-e</span>
                          </Button>
                        ) : null}
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
  );
}
