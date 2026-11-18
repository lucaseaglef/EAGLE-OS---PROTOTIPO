import {
  AgentOperationalStatus,
  Contract,
  DecisionStatus,
  FinanceEntry,
  ProjectStatus,
  TaskStatus,
} from '../types/eagle';

export const TODAY_ISO = '2026-11-17';

export function formatBRL(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavos / 100);
}

const MONTHS_PT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export function formatShortDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const [, month, day] = parts;
  const monthIdx = Math.max(0, Math.min(11, parseInt(month, 10) - 1));
  return `${day} ${MONTHS_PT[monthIdx]}`;
}

export function formatFullDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const [year, month, day] = parts;
  const monthIdx = Math.max(0, Math.min(11, parseInt(month, 10) - 1));
  return `${day} ${MONTHS_PT[monthIdx]} ${year}`;
}

function parseIsoUtcMs(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return 0;
  return Date.UTC(y, m - 1, d);
}

function utcMsToIso(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function diffDaysISO(laterIso: string, earlierIso: string): number {
  const a = parseIsoUtcMs(laterIso);
  const b = parseIsoUtcMs(earlierIso);
  if (!a || !b) return 0;
  return Math.round((a - b) / 86400000);
}

export function addDaysISO(isoDate: string, days: number): string {
  const ms = parseIsoUtcMs(isoDate);
  if (!ms) return isoDate;
  return utcMsToIso(ms + days * 86400000);
}

export function addMonthsISO(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return isoDate;
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  return utcMsToIso(dt.getTime());
}

export function computeTaxDueDate(pagoEmIso: string): string {
  const [y, m] = pagoEmIso.split('-').map((n) => parseInt(n, 10));
  if (!y || !m) return addDaysISO(pagoEmIso, 30);
  const dt = new Date(Date.UTC(y, m, 20)); // Dia 20 do mês seguinte
  return utcMsToIso(dt.getTime());
}

export function isInvoiceOverdue(entry: FinanceEntry, todayIso = TODAY_ISO): boolean {
  return entry.status === 'pendente' && entry.vencimento < todayIso;
}

export function getOverdueDays(entry: FinanceEntry, todayIso = TODAY_ISO): number {
  if (!isInvoiceOverdue(entry, todayIso)) return 0;
  return Math.max(1, diffDaysISO(todayIso, entry.vencimento));
}

export function getDaysSincePayment(entry: FinanceEntry, todayIso = TODAY_ISO): number {
  if (entry.status !== 'liquidado') return 0;
  const settledAt = entry.pagoEm || entry.vencimento;
  return Math.max(0, diffDaysISO(todayIso, settledAt));
}

export function isInvoiceNotePending(entry: FinanceEntry, todayIso = TODAY_ISO): boolean {
  if (entry.tipo !== 'receber' || entry.status !== 'liquidado') return false;
  if (entry.notaFiscal?.status === 'emitida' || entry.notaFiscal?.status === 'nao_aplicavel') {
    return false;
  }
  return getDaysSincePayment(entry, todayIso) >= 10;
}

export function calculateFixedCostsMonthly(finances: FinanceEntry[]): {
  totalMensalCentavos: number;
  itens: FinanceEntry[];
  custoHoraEstudioCentavos: number;
  horasProdutivasMes: number;
} {
  const itens = finances.filter((f) => f.tipo === 'pagar' && Boolean(f.isCustoFixo));
  const totalMensalCentavos = itens.reduce((acc, item) => {
    if (item.periodicidade === 'anual') return acc + Math.round(item.valorCentavos / 12);
    return acc + item.valorCentavos;
  }, 0);
  const horasProdutivasMes = 160;
  const custoHoraEstudioCentavos = Math.round(totalMensalCentavos / horasProdutivasMes);
  return {
    totalMensalCentavos,
    itens,
    custoHoraEstudioCentavos,
    horasProdutivasMes,
  };
}

export interface CashflowDayPoint {
  iso: string;
  label: string;
  deltaCentavos: number;
  saldoCentavos: number;
  isFuture: boolean;
  isToday: boolean;
  entriesCount: number;
}

export function build60DayCashflowSeries(
  finances: FinanceEntry[],
  initialBalanceCentavos: number,
  todayIso = TODAY_ISO
): {
  points: CashflowDayPoint[];
  saldoHojeCentavos: number;
  previsaoMesCentavos: number;
  minSaldo: number;
  maxSaldo: number;
} {
  const startIso = addDaysISO(todayIso, -29);
  const endIso = addDaysISO(todayIso, 30);

  // Movimentações anteriores à janela de 60 dias que já foram liquidadas
  let runningBalance = initialBalanceCentavos;

  for (const entry of finances) {
    const effectiveDate =
      entry.status === 'liquidado' ? entry.pagoEm || entry.vencimento : entry.vencimento;
    const signed = entry.tipo === 'receber' ? entry.valorCentavos : -entry.valorCentavos;

    if (effectiveDate < startIso) {
      if (entry.status === 'liquidado') {
        runningBalance += signed;
      }
      continue;
    }
  }

  const points: CashflowDayPoint[] = [];
  let saldoHojeCentavos = runningBalance;
  let previsaoMesCentavos = runningBalance;
  let minSaldo = runningBalance;
  let maxSaldo = runningBalance;

  const currentMonthPrefix = todayIso.slice(0, 7); // '2026-11'

  // Primeiro calcular saldo exato realizado até hoje (sem pendentes colocados hoje)
  let realizedUpToToday = initialBalanceCentavos;
  for (const entry of finances) {
    if (entry.status !== 'liquidado') continue;
    const settledDate = entry.pagoEm || entry.vencimento;
    if (settledDate <= todayIso) {
      realizedUpToToday +=
        entry.tipo === 'receber' ? entry.valorCentavos : -entry.valorCentavos;
    }
  }

  for (let i = 0; i < 60; i++) {
    const iso = addDaysISO(startIso, i);
    const isToday = iso === todayIso;
    const isFuture = iso > todayIso;

    let dayDelta = 0;
    let count = 0;

    if (!isFuture) {
      // Até hoje: apenas realizados no dia exato
      for (const entry of finances) {
        if (entry.status === 'liquidado') {
          const d = entry.pagoEm || entry.vencimento;
          if (d === iso) {
            dayDelta +=
              entry.tipo === 'receber' ? entry.valorCentavos : -entry.valorCentavos;
            count += 1;
          }
        }
      }
      runningBalance += dayDelta;
      if (isToday) {
        saldoHojeCentavos = runningBalance;
      }
    } else {
      // Futuro: inclui pendentes agendados no dia + eventuais vencidos pendentes no primeiro dia futuro
      if (i === 30) {
        for (const entry of finances) {
          if (entry.status === 'pendente' && entry.vencimento <= todayIso) {
            dayDelta +=
              entry.tipo === 'receber' ? entry.valorCentavos : -entry.valorCentavos;
            count += 1;
          }
        }
      }
      for (const entry of finances) {
        if (entry.status === 'pendente' && entry.vencimento === iso) {
          dayDelta +=
            entry.tipo === 'receber' ? entry.valorCentavos : -entry.valorCentavos;
          count += 1;
        }
      }
      runningBalance += dayDelta;
    }

    if (iso.startsWith(currentMonthPrefix)) {
      previsaoMesCentavos = runningBalance;
    }

    if (runningBalance < minSaldo) minSaldo = runningBalance;
    if (runningBalance > maxSaldo) maxSaldo = runningBalance;

    points.push({
      iso,
      label: formatShortDate(iso),
      deltaCentavos: dayDelta,
      saldoCentavos: runningBalance,
      isFuture,
      isToday,
      entriesCount: count,
    });
  }

  return {
    points,
    saldoHojeCentavos: realizedUpToToday,
    previsaoMesCentavos,
    minSaldo,
    maxSaldo,
  };
}

export interface ClientFinancialSummary {
  receitaRecebidaCentavos: number;
  receitaAReceberCentavos: number;
  receitaTotalCentavos: number;
  custosDiretosCentavos: number;
  impostosPrevistosCentavos: number;
  rateioCustosFixosCentavos: number;
  lucroLiquidoCentavos: number;
  margemPercentual: number;
  deuLucro: boolean;
  clientFinances: FinanceEntry[];
  clientContracts: Contract[];
  faturasVencidas: FinanceEntry[];
  notasPendentes: FinanceEntry[];
}

export function calculateClientFinancialSummary(
  clientId: string,
  finances: FinanceEntry[],
  contracts: Contract[],
  nonInternalClientCount: number,
  totalFixedCostsMonthly: number,
  todayIso = TODAY_ISO
): ClientFinancialSummary {
  const clientFinances = finances.filter((f) => f.clienteId === clientId);
  const clientContracts = contracts.filter((c) => c.clienteId === clientId);

  const receitaRecebidaCentavos = clientFinances
    .filter((f) => f.tipo === 'receber' && f.status === 'liquidado')
    .reduce((acc, f) => acc + f.valorCentavos, 0);

  const receitaAReceberCentavos = clientFinances
    .filter((f) => f.tipo === 'receber' && f.status === 'pendente')
    .reduce((acc, f) => acc + f.valorCentavos, 0);

  const receitaTotalCentavos = receitaRecebidaCentavos + receitaAReceberCentavos;

  const custosDiretosCentavos = clientFinances
    .filter((f) => f.tipo === 'pagar' && !f.isImposto && !f.isCustoFixo)
    .reduce((acc, f) => acc + f.valorCentavos, 0);

  const impostosLancados = clientFinances
    .filter((f) => f.tipo === 'pagar' && Boolean(f.isImposto))
    .reduce((acc, f) => acc + f.valorCentavos, 0);

  const impostosEstimadosPendentes = clientFinances
    .filter((f) => f.tipo === 'receber' && f.status === 'pendente')
    .reduce(
      (acc, f) => acc + Math.round(f.valorCentavos * (f.aliquotaImposto ?? 0.115)),
      0
    );

  const impostosPrevistosCentavos = impostosLancados + impostosEstimadosPendentes;

  // Rateio proporcional ou igualitário entre clientes externos ativos
  const rateioCustosFixosCentavos =
    receitaTotalCentavos > 0 && nonInternalClientCount > 0
      ? Math.round(totalFixedCostsMonthly / Math.max(1, nonInternalClientCount))
      : 0;

  const lucroLiquidoCentavos =
    receitaTotalCentavos -
    custosDiretosCentavos -
    impostosPrevistosCentavos -
    rateioCustosFixosCentavos;

  const margemPercentual =
    receitaTotalCentavos > 0
      ? Math.round((lucroLiquidoCentavos / receitaTotalCentavos) * 100)
      : 0;

  const faturasVencidas = clientFinances.filter(
    (f) => f.tipo === 'receber' && isInvoiceOverdue(f, todayIso)
  );
  const notasPendentes = clientFinances.filter((f) =>
    isInvoiceNotePending(f, todayIso)
  );

  return {
    receitaRecebidaCentavos,
    receitaAReceberCentavos,
    receitaTotalCentavos,
    custosDiretosCentavos,
    impostosPrevistosCentavos,
    rateioCustosFixosCentavos,
    lucroLiquidoCentavos,
    margemPercentual,
    deuLucro: lucroLiquidoCentavos > 0,
    clientFinances,
    clientContracts,
    faturasVencidas,
    notasPendentes,
  };
}

export const TASK_STATUS_META: Record<
  TaskStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  a_fazer: {
    label: 'A fazer',
    dotClass: 'bg-[#6b7280] dark:bg-[#9ca3af]',
    textClass: 'text-[#4b5563] dark:text-[#9ca3af]',
  },
  em_andamento: {
    label: 'Em andamento',
    dotClass: 'bg-[#163744] dark:bg-[#9fdce6]',
    textClass: 'text-[#163744] dark:text-[#9fdce6]',
  },
  em_revisao: {
    label: 'Em revisão',
    dotClass: 'bg-[#b45309] dark:bg-[#fbbf24]',
    textClass: 'text-[#92400e] dark:text-[#fbbf24]',
  },
  bloqueada: {
    label: 'Bloqueada',
    dotClass: 'bg-[#b91c1c] dark:bg-[#f87171]',
    textClass: 'text-[#991b1b] dark:text-[#f87171]',
  },
  concluida: {
    label: 'Concluída',
    dotClass: 'bg-[#15803d] dark:bg-[#4ade80]',
    textClass: 'text-[#166534] dark:text-[#4ade80]',
  },
  cancelada: {
    label: 'Cancelada',
    dotClass: 'bg-[#9ca3af] dark:bg-[#525866]',
    textClass: 'text-[#6b7280] dark:text-[#71788a]',
  },
};

export const AGENT_STATUS_META: Record<
  AgentOperationalStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  trabalhando: {
    label: 'Trabalhando',
    dotClass: 'bg-[#15803d] dark:bg-[#4ade80]',
    textClass: 'text-[#166534] dark:text-[#4ade80]',
  },
  parado: {
    label: 'Parado',
    dotClass: 'bg-[#6b7280] dark:bg-[#9ca3af]',
    textClass: 'text-[#4b5563] dark:text-[#9ca3af]',
  },
  problema: {
    label: 'Com problema',
    dotClass: 'bg-[#b91c1c] dark:bg-[#f87171]',
    textClass: 'text-[#991b1b] dark:text-[#f87171]',
  },
};

export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  ativo: {
    label: 'Ativo',
    dotClass: 'bg-[#163744] dark:bg-[#9fdce6]',
    textClass: 'text-[#163744] dark:text-[#9fdce6]',
  },
  em_pausa: {
    label: 'Em pausa',
    dotClass: 'bg-[#b45309] dark:bg-[#fbbf24]',
    textClass: 'text-[#92400e] dark:text-[#fbbf24]',
  },
  concluido: {
    label: 'Concluído',
    dotClass: 'bg-[#15803d] dark:bg-[#4ade80]',
    textClass: 'text-[#166534] dark:text-[#4ade80]',
  },
};

export const DECISION_STATUS_META: Record<
  DecisionStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  pendente: {
    label: 'Aguardando você',
    dotClass: 'bg-[#b45309] dark:bg-[#fbbf24]',
    textClass: 'text-[#92400e] dark:text-[#fbbf24]',
  },
  aprovada: {
    label: 'Aprovada',
    dotClass: 'bg-[#15803d] dark:bg-[#4ade80]',
    textClass: 'text-[#166534] dark:text-[#4ade80]',
  },
  ajuste: {
    label: 'Em ajuste',
    dotClass: 'bg-[#163744] dark:bg-[#9fdce6]',
    textClass: 'text-[#163744] dark:text-[#9fdce6]',
  },
  recusada: {
    label: 'Recusada',
    dotClass: 'bg-[#b91c1c] dark:bg-[#f87171]',
    textClass: 'text-[#991b1b] dark:text-[#f87171]',
  },
};
