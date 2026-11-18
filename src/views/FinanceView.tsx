import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Check,
  Copy,
  CreditCard,
  FileCheck2,
  FileText,
  FileWarning,
  Landmark,
  Paperclip,
  Pencil,
  Plus,
  QrCode,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  Button,
  CustomSelect,
  SegmentedChoice,
} from '../components/DesignSystem';
import {
  EmptyState,
  PageHeader,
  SegmentedControl,
  StatusIndicator,
} from '../components/SharedUI';
import { BentoCard, ProportionBar } from '../components/VisualWidgets';
import { useEagle } from '../context/EagleContext';
import {
  AsaasBillingType,
  AsaasStatus,
  FinanceEntry,
  FinanceStatus,
  FinanceType,
  NotaFiscalStatus,
  PaymentMethod,
} from '../types/eagle';
import {
  build60DayCashflowSeries,
  calculateClientFinancialSummary,
  calculateFixedCostsMonthly,
  CashflowDayPoint,
  formatBRL,
  formatFullDate,
  formatShortDate,
  getDaysSincePayment,
  getOverdueDays,
  isInvoiceNotePending,
  isInvoiceOverdue,
  TODAY_ISO,
} from '../utils/formatters';

type FinanceTab = 'painel' | 'fluxo' | 'receber' | 'pagar' | 'documentos';
type CashflowSubfilter = 'todos' | 'realizados' | 'previstos' | 'entradas' | 'saidas';
type PayableSubfilter = 'todas' | 'em_aberto' | 'recorrentes' | 'impostos' | 'projetos';
type DocSubfilter = 'todos' | 'pendentes_10d' | 'emitidas' | 'comprovantes';
type DrawerTab = 'pagamento' | 'documentos' | 'asaas';

/* -------------------------------------------------------------------------- */
/* CURVA SUAVE DO GRÁFICO DE 60 DIAS (CATMULL-ROM SPLINE)                     */
/* -------------------------------------------------------------------------- */
function buildSmoothPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function Cashflow60Chart({
  points,
  minSaldo,
  maxSaldo,
}: {
  points: CashflowDayPoint[];
  minSaldo: number;
  maxSaldo: number;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const width = 920;
  const height = 200;
  const padX = 14;
  const padTop = 26;
  const padBottom = 28;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;

  const safeMin = Math.min(minSaldo, 0);
  const safeMax = Math.max(maxSaldo, safeMin + 100000);
  const range = Math.max(1, safeMax - safeMin);

  const coords = points.map((pt, i) => {
    const x = padX + (i / Math.max(1, points.length - 1)) * innerW;
    const y = padTop + (1 - (pt.saldoCentavos - safeMin) / range) * innerH;
    return { x, y, pt };
  });

  const todayIdx = points.findIndex((p) => p.isToday);
  const splitIdx = todayIdx >= 0 ? todayIdx : Math.floor(points.length / 2);

  const pastCoords = coords.slice(0, splitIdx + 1);
  const futureCoords = coords.slice(splitIdx);

  const pastPath = buildSmoothPath(pastCoords);
  const futurePath = buildSmoothPath(futureCoords);

  const baseBottomY = padTop + innerH;
  const pastAreaPath =
    pastCoords.length > 0
      ? `${pastPath} L ${pastCoords[pastCoords.length - 1].x.toFixed(1)} ${baseBottomY.toFixed(1)} L ${pastCoords[0].x.toFixed(1)} ${baseBottomY.toFixed(1)} Z`
      : '';

  const activePoint = hoveredIdx !== null ? coords[hoveredIdx] : coords[splitIdx];
  const endPoint = points[points.length - 1];

  return (
    <div className="relative select-none flex flex-col justify-between h-full">
      <div>
        {/* Cabeçalho ultra-limpo */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-baseline gap-3">
            <h2 className="text-[15px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
              Projeção de caixa · 60 dias
            </h2>
            <span className="text-[12px] text-[#0f1115]/45 dark:text-[#f2f4f7]/45 tabular-nums">
              30d realizados + 30d previstos
            </span>
          </div>

          {activePoint && (
            <div className="inline-flex items-center gap-2.5 rounded-[10px] bg-[#f2f4f7] dark:bg-[#10141b] border border-[#0f1115]/6 dark:border-white/8 px-3 py-1 text-[12px] tabular-nums">
              <span className="font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60">
                {activePoint.pt.isToday ? 'Hoje' : formatShortDate(activePoint.pt.iso)}
              </span>
              <span className="font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                {formatBRL(activePoint.pt.saldoCentavos)}
              </span>
              {activePoint.pt.deltaCentavos !== 0 && (
                <span
                  className={`font-medium ${
                    activePoint.pt.deltaCentavos > 0
                      ? 'text-[#15803d] dark:text-[#4ade80]'
                      : 'text-[#b91c1c] dark:text-[#f87171]'
                  }`}
                >
                  {activePoint.pt.deltaCentavos > 0 ? '+' : '−'}
                  {formatBRL(Math.abs(activePoint.pt.deltaCentavos))}
                </span>
              )}
            </div>
          )}
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-[215px] overflow-visible"
          role="img"
          aria-label="Fluxo de caixa em 60 dias"
          onMouseLeave={() => setHoveredIdx(null)}
        >
        <defs>
          <linearGradient id="eagle-cashflow-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9fdce6" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#9fdce6" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {[0.25, 0.55, 0.85].map((pct) => (
          <line
            key={pct}
            x1={padX}
            x2={width - padX}
            y1={padTop + pct * innerH}
            y2={padTop + pct * innerH}
            stroke="currentColor"
            className="text-[#0f1115]/5 dark:text-[#f2f4f7]/6"
            strokeWidth="1"
          />
        ))}

        {pastAreaPath && <path d={pastAreaPath} fill="url(#eagle-cashflow-grad)" />}

        {pastPath && (
          <path
            d={pastPath}
            fill="none"
            className="stroke-[#163744] dark:stroke-[#9fdce6]"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
        )}

        {futurePath && (
          <path
            d={futurePath}
            fill="none"
            className="stroke-[#163744]/45 dark:stroke-[#9fdce6]/55"
            strokeWidth="2"
            strokeDasharray="4 5"
            strokeLinecap="round"
          />
        )}

        {coords[splitIdx] && (
          <g>
            <line
              x1={coords[splitIdx].x}
              x2={coords[splitIdx].x}
              y1={padTop - 4}
              y2={baseBottomY}
              className="stroke-[#163744]/25 dark:stroke-[#9fdce6]/30"
              strokeWidth="1"
              strokeDasharray="2 3"
            />
            <rect
              x={coords[splitIdx].x - 20}
              y={2}
              width="40"
              height="17"
              rx="8.5"
              className="fill-[#163744] dark:fill-[#9fdce6]"
            />
            <text
              x={coords[splitIdx].x}
              y={13.5}
              textAnchor="middle"
              className="fill-[#f2f4f7] dark:fill-[#0f1115] text-[9px] font-semibold tracking-wide"
            >
              HOJE
            </text>
          </g>
        )}

        {activePoint && (
          <g>
            <line
              x1={activePoint.x}
              x2={activePoint.x}
              y1={padTop}
              y2={baseBottomY}
              className="stroke-[#0f1115]/14 dark:stroke-[#f2f4f7]/18"
              strokeWidth="1"
            />
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="5"
              className="fill-white dark:fill-[#15181f] stroke-[#163744] dark:stroke-[#9fdce6]"
              strokeWidth="2.5"
            />
          </g>
        )}

        {[0, 15, splitIdx, 44, points.length - 1].map((idx) => {
          const c = coords[idx];
          if (!c) return null;
          return (
            <text
              key={`lbl-${idx}`}
              x={c.x}
              y={height - 6}
              textAnchor={idx === 0 ? 'start' : idx === points.length - 1 ? 'end' : 'middle'}
              className="fill-[#0f1115]/42 dark:fill-[#f2f4f7]/42 text-[10.5px] font-medium tabular-nums"
            >
              {c.pt.label}
            </text>
          );
        })}

        {coords.map((c, idx) => {
          const sliceW = innerW / Math.max(1, points.length);
          return (
            <rect
              key={`hit-${c.pt.iso}`}
              x={c.x - sliceW / 2}
              y={padTop - 8}
              width={sliceW}
              height={innerH + 16}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={() => setHoveredIdx(idx)}
            />
          );
        })}
      </svg>
      </div>

      <div className="mt-4 pt-3.5 border-t border-[#0f1115]/8 dark:border-[#f2f4f7]/8 grid grid-cols-3 gap-4 text-[12px] tabular-nums">
        <div>
          <div className="text-[#0f1115]/48 dark:text-[#f2f4f7]/48">Menor saldo (60d)</div>
          <div className="mt-0.5 font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
            {formatBRL(minSaldo)}
          </div>
        </div>
        <div>
          <div className="text-[#0f1115]/48 dark:text-[#f2f4f7]/48">Pico projetado</div>
          <div className="mt-0.5 font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
            {formatBRL(maxSaldo)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[#0f1115]/48 dark:text-[#f2f4f7]/48">Saldo em +30d</div>
          <div className="mt-0.5 font-semibold text-[#163744] dark:text-[#9fdce6]">
            {endPoint ? formatBRL(endPoint.saldoCentavos) : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SUBCOMPONENTE: SLOT MODERNO DE ARQUIVO ANEXO (PDF / COMPROVANTE / NF)      */
/* -------------------------------------------------------------------------- */
function AttachmentFileSlot({
  label,
  fileName,
  placeholder,
  suggestedName,
  onChange,
}: {
  label: string;
  fileName: string;
  placeholder: string;
  suggestedName: string;
  onChange: (nextName: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(fileName);

  const commitDraft = () => {
    onChange(draft.trim());
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-[#0f1115]/62 dark:text-[#f2f4f7]/62">
            {label}
          </span>
          <button
            type="button"
            onClick={() => {
              setDraft(fileName);
              setIsEditing(false);
            }}
            className="text-[11.5px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 hover:text-[#0f1115] dark:hover:text-[#f2f4f7] cursor-pointer"
          >
            Cancelar
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitDraft();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setDraft(fileName);
                setIsEditing(false);
              }
            }}
            placeholder={placeholder}
            className="eagle-input flex-1 h-9.5 px-3 text-[13px]"
          />
          <Button type="button" size="sm" variant="primary" onClick={commitDraft}>
            Aplicar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-[#0f1115]/62 dark:text-[#f2f4f7]/62">
          {label}
        </span>
      </div>

      {fileName ? (
        <div className="group rounded-[13px] bg-[#f2f4f7]/90 dark:bg-[#10141b] border border-[#0f1115]/8 dark:border-white/10 px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8.5 h-8.5 rounded-[9px] bg-[#163744]/10 dark:bg-[#9fdce6]/14 text-[#163744] dark:text-[#9fdce6] flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-[#0f1115] dark:text-[#f2f4f7] truncate">
                {fileName}
              </div>
              <div className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                PDF anexado
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setDraft(fileName);
                setIsEditing(true);
              }}
              aria-label={`Renomear ${label}`}
              className="w-7.5 h-7.5 rounded-[8px] inline-flex items-center justify-center text-[#0f1115]/48 dark:text-[#f2f4f7]/48 hover:bg-[#0f1115]/6 dark:hover:bg-white/8 hover:text-[#0f1115] dark:hover:text-[#f2f4f7] transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label={`Remover ${label}`}
              className="w-7.5 h-7.5 rounded-[8px] inline-flex items-center justify-center text-[#0f1115]/48 dark:text-[#f2f4f7]/48 hover:bg-[#b91c1c]/10 hover:text-[#b91c1c] dark:hover:text-[#f87171] transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-[13px] border border-dashed border-[#0f1115]/16 dark:border-white/16 bg-[#f2f4f7]/45 dark:bg-[#10141b]/55 px-3.5 py-2.5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onChange(suggestedName)}
            className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-[9px] bg-white dark:bg-[#191e28] border border-[#0f1115]/8 dark:border-white/10 flex items-center justify-center text-[#163744] dark:text-[#9fdce6] shrink-0 group-hover:scale-105 transition-transform">
              <Upload className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-medium text-[#0f1115]/82 dark:text-[#f2f4f7]/82 truncate group-hover:text-[#163744] dark:group-hover:text-[#9fdce6] transition-colors">
                Anexar arquivo PDF
              </div>
              <div className="text-[11px] text-[#0f1115]/45 dark:text-[#f2f4f7]/45 truncate">
                {suggestedName}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setDraft('');
              setIsEditing(true);
            }}
            className="text-[11.5px] font-medium text-[#0f1115]/58 dark:text-[#f2f4f7]/58 hover:text-[#0f1115] dark:hover:text-[#f2f4f7] px-2.5 py-1.5 rounded-[8px] hover:bg-[#0f1115]/5 dark:hover:bg-white/6 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Digitar nome
          </button>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PAINEL LATERAL DE DETALHE (FLUTUANTE, ARQUITETURAL E MODERNO)              */
/* -------------------------------------------------------------------------- */
function FinanceDetailDrawer({
  entry,
  allFinances,
  onClose,
  onSelectEntry,
}: {
  entry: FinanceEntry;
  allFinances: FinanceEntry[];
  onClose: () => void;
  onSelectEntry: (entryId: string) => void;
}) {
  const {
    getClient,
    getProject,
    registerFinancePayment,
    reopenFinanceEntry,
    updateFinanceDocument,
    updateFinanceAsaas,
  } = useEagle();

  const client = getClient(entry.clienteId);
  const project = entry.projetoId ? getProject(entry.projetoId) : undefined;

  const isInflow = entry.tipo === 'receber';
  const isPaid = entry.status === 'liquidado';
  const overdue = isInvoiceOverdue(entry);
  const overdueDays = getOverdueDays(entry);
  const notePending10d = isInvoiceNotePending(entry);
  const daysSincePaid = getDaysSincePayment(entry);

  const linkedTax = isInflow
    ? allFinances.find((f) => f.origemImpostoDeId === entry.id)
    : undefined;
  const taxSourceEntry = entry.origemImpostoDeId
    ? allFinances.find((f) => f.id === entry.origemImpostoDeId)
    : undefined;

  const [drawerTab, setDrawerTab] = useState<DrawerTab>(
    notePending10d ? 'documentos' : 'pagamento'
  );
  const [pagoEm, setPagoEm] = useState(entry.pagoEm || TODAY_ISO);
  const [formaPagamento, setFormaPagamento] = useState<PaymentMethod>(
    entry.formaPagamento || (entry.asaas?.billingType === 'BOLETO' ? 'Boleto' : 'Pix')
  );
  const [comprovanteInput, setComprovanteInput] = useState(entry.comprovanteNome || '');

  const [nfStatus, setNfStatus] = useState<NotaFiscalStatus>(
    entry.notaFiscal?.status ?? (isInflow ? 'pendente' : 'nao_aplicavel')
  );
  const [nfNumero, setNfNumero] = useState(entry.notaFiscal?.numero || '');
  const [nfEmitidaEm, setNfEmitidaEm] = useState(entry.notaFiscal?.emitidaEm || TODAY_ISO);
  const [nfArquivo, setNfArquivo] = useState(entry.notaFiscal?.arquivoNome || '');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const [billingType, setBillingType] = useState<AsaasBillingType>(
    entry.asaas?.billingType || 'PIX'
  );
  const [asaasStatus, setAsaasStatus] = useState<AsaasStatus>(
    entry.asaas?.status || 'rascunho'
  );
  const [externalReference, setExternalReference] = useState(
    entry.asaas?.externalReference || ''
  );
  const [paymentId, setPaymentId] = useState(entry.asaas?.paymentId || '');
  const [invoiceUrl, setInvoiceUrl] = useState(entry.asaas?.invoiceUrl || '');

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const estimatedTaxCentavos = Math.round(
    entry.valorCentavos * (entry.aliquotaImposto ?? 0.115)
  );

  const clientSlug = (client?.nome ?? 'Eagle')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 14);

  const suggestedReceiptName = `comprovante_${clientSlug.toLowerCase()}_${formaPagamento
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()}.pdf`;

  const suggestedNfName = `NFSe_${clientSlug}_${entry.parcelaNumero ?? '2026'}.pdf`;

  const flashSaved = (msg: string) => {
    setSavedNotice(msg);
    window.setTimeout(() => setSavedNotice(null), 2400);
  };

  const handleRegisterPayment = (e: React.FormEvent) => {
    e.preventDefault();
    registerFinancePayment(entry.id, {
      pagoEm,
      formaPagamento,
      comprovanteNome: comprovanteInput.trim() || undefined,
    });
    flashSaved(isInflow ? 'Recebimento registrado' : 'Pagamento registrado');
  };

  const handleSaveDocs = (e: React.FormEvent) => {
    e.preventDefault();
    updateFinanceDocument(entry.id, {
      notaStatus: nfStatus,
      numero: nfNumero,
      emitidaEm: nfEmitidaEm,
      arquivoNome: nfArquivo,
      comprovanteNome: comprovanteInput,
    });
    flashSaved('Documentos salvos');
  };

  const handleEmitirNfRapida = () => {
    const autoNum =
      nfNumero.trim() || `NFS-e 2026/${String(420 + (entry.parcelaNumero ?? 9))}`;
    const autoFile = nfArquivo.trim() || suggestedNfName;
    setNfStatus('emitida');
    setNfNumero(autoNum);
    setNfEmitidaEm(TODAY_ISO);
    setNfArquivo(autoFile);
    updateFinanceDocument(entry.id, {
      notaStatus: 'emitida',
      numero: autoNum,
      emitidaEm: TODAY_ISO,
      arquivoNome: autoFile,
      comprovanteNome: comprovanteInput,
    });
    flashSaved('NFS-e emitida');
  };

  const handleSaveAsaas = (e: React.FormEvent) => {
    e.preventDefault();
    updateFinanceAsaas(entry.id, {
      billingType,
      status: asaasStatus,
      externalReference: externalReference.trim() || undefined,
      paymentId: paymentId.trim() || undefined,
      invoiceUrl: invoiceUrl.trim() || undefined,
    });
    flashSaved('Cobrança Asaas salva');
  };

  const handleCopyUrl = () => {
    if (!invoiceUrl.trim()) return;
    navigator.clipboard?.writeText(invoiceUrl.trim()).catch(() => {});
    setCopiedUrl(true);
    window.setTimeout(() => setCopiedUrl(false), 1800);
  };

  const drawerTabs: Array<{ id: DrawerTab; label: string }> = isInflow
    ? [
        { id: 'pagamento', label: 'Pagamento' },
        { id: 'documentos', label: 'Notas fiscais' },
        { id: 'asaas', label: 'Asaas' },
      ]
    : [
        { id: 'pagamento', label: 'Pagamento' },
        { id: 'documentos', label: 'Comprovante' },
      ];

  const paymentMethodOptions: Array<{
    value: PaymentMethod;
    label: string;
    hint: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { value: 'Pix', label: 'Pix', hint: 'Instantâneo', icon: QrCode },
    { value: 'TED', label: 'TED', hint: 'Transferência', icon: Landmark },
    { value: 'Boleto', label: 'Boleto', hint: 'Compensação', icon: ReceiptText },
    { value: 'Cartão', label: 'Cartão', hint: 'Crédito', icon: CreditCard },
  ];

  const activeFormId =
    drawerTab === 'pagamento'
      ? !isPaid
        ? 'drawer-payment-form'
        : undefined
      : drawerTab === 'documentos'
        ? 'drawer-docs-form'
        : 'drawer-asaas-form';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end p-2 sm:p-4 bg-[#0f1115]/48 backdrop-blur-[4px]"
      onClick={onClose}
    >
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={entry.descricao}
        initial={{ x: 32, opacity: 0, scale: 0.985 }}
        animate={{ x: 0, opacity: 1, scale: 1 }}
        exit={{ x: 32, opacity: 0, scale: 0.985 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[468px] h-full rounded-[22px] bg-[#ffffff]/96 dark:bg-[#15181f]/96 backdrop-blur-xl border border-[#0f1115]/10 dark:border-white/12 shadow-[0_24px_64px_rgba(15,17,21,0.28)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.62)] flex flex-col min-h-0 overflow-hidden"
      >
        {/* TOPO ARQUITETURAL */}
        <div className="px-5 pt-4.5 pb-3.5 border-b border-[#0f1115]/8 dark:border-[#f2f4f7]/8 space-y-4 shrink-0">
          {/* Barra utilitária: Status + Fechar */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {isPaid ? (
                <StatusIndicator
                  label={isInflow ? 'Recebido' : 'Pago'}
                  dotClass="bg-[#15803d] dark:bg-[#4ade80]"
                  textClass="text-[#166534] dark:text-[#4ade80]"
                />
              ) : overdue ? (
                <StatusIndicator
                  label={`Vencida há ${overdueDays}d`}
                  dotClass="bg-[#b91c1c] dark:bg-[#f87171]"
                  textClass="text-[#991b1b] dark:text-[#f87171]"
                />
              ) : (
                <StatusIndicator
                  label="Em aberto"
                  dotClass="bg-[#b45309] dark:bg-[#fbbf24]"
                  textClass="text-[#92400e] dark:text-[#fbbf24]"
                />
              )}

              {notePending10d && (
                <>
                  <span className="text-[#0f1115]/25 dark:text-[#f2f4f7]/25" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-[12px] font-medium text-[#991b1b] dark:text-[#f87171] truncate">
                    Nota pendente ({daysSincePaid}d)
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar painel"
              className="w-8 h-8 rounded-full inline-flex items-center justify-center bg-[#f2f4f7] dark:bg-[#1d222c] hover:bg-[#e6e9ed] dark:hover:bg-[#262d3a] text-[#0f1115]/70 dark:text-[#f2f4f7]/75 transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Identidade do Lançamento */}
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 border ${
                isInflow
                  ? 'bg-[#15803d]/10 dark:bg-[#4ade80]/12 border-[#15803d]/15 dark:border-[#4ade80]/20 text-[#15803d] dark:text-[#4ade80]'
                  : 'bg-[#163744]/8 dark:bg-[#9fdce6]/10 border-[#163744]/12 dark:border-[#9fdce6]/18 text-[#163744] dark:text-[#9fdce6]'
              }`}
            >
              {isInflow ? (
                <ArrowDownRight className="w-4.5 h-4.5" />
              ) : (
                <ArrowUpRight className="w-4.5 h-4.5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[#0f1115] dark:text-[#f2f4f7] leading-snug">
                {entry.descricao}
              </h2>
              <p className="mt-0.5 text-[12px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55 truncate">
                {client?.nome ?? 'Eagle Digital House'}
                {project ? ` · ${project.nome}` : ''}
              </p>
            </div>
          </div>

          {/* Tira de Métricas Alinhada */}
          <div className="rounded-[14px] bg-[#f2f4f7] dark:bg-[#10141b] border border-[#0f1115]/6 dark:border-white/8 px-4 py-3 grid grid-cols-12 items-center gap-3">
            <div className="col-span-7 min-w-0">
              <div className="text-[11px] font-medium text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                {isInflow ? 'Valor a receber' : 'Valor da conta'}
              </div>
              <div className="mt-1 text-[24px] font-semibold tracking-[-0.03em] tabular-nums leading-none text-[#0f1115] dark:text-[#f2f4f7]">
                {isInflow ? '+' : '−'} {formatBRL(entry.valorCentavos)}
              </div>
            </div>

            <div className="col-span-5 pl-3.5 border-l border-[#0f1115]/8 dark:border-white/8 min-w-0">
              <div className="text-[11px] font-medium text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                Vencimento
              </div>
              <div className="mt-1 text-[13.5px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7] truncate">
                {formatShortDate(entry.vencimento)}
              </div>
              <div className="mt-0.5 text-[11px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 truncate tabular-nums">
                {entry.parcelaNumero && entry.parcelaTotal
                  ? `Parcela ${entry.parcelaNumero}/${entry.parcelaTotal}`
                  : entry.recorrente
                    ? 'Mensal recorrente'
                    : entry.categoria}
              </div>
            </div>
          </div>

          {/* Navegação por Abas com Mola Fluida */}
          <div
            className="eagle-segmented grid gap-1 w-full"
            style={{ gridTemplateColumns: `repeat(${drawerTabs.length}, minmax(0, 1fr))` }}
            role="tablist"
            aria-label="Seções do lançamento"
          >
            {drawerTabs.map((tab) => {
              const active = drawerTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setDrawerTab(tab.id)}
                  className={`relative h-8 px-2.5 rounded-[8px] text-[12.5px] font-medium transition-colors cursor-pointer whitespace-nowrap truncate ${
                    active
                      ? 'text-[#0f1115] dark:text-[#f2f4f7]'
                      : 'text-[#0f1115]/56 dark:text-[#f2f4f7]/56 hover:text-[#0f1115] dark:hover:text-[#f2f4f7]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="finance-drawer-tab-pill"
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-0 rounded-[8px] bg-white dark:bg-[#252c38] border border-[#0f1115]/8 dark:border-white/10 shadow-[0_1px_3px_rgba(15,17,21,0.08)]"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CORPO ROLÁVEL */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {taxSourceEntry && (
            <button
              type="button"
              onClick={() => onSelectEntry(taxSourceEntry.id)}
              className="w-full text-left rounded-[13px] bg-[#f2f4f7]/85 dark:bg-[#10141b] hover:bg-[#e6e9ed] dark:hover:bg-[#1a202b] border border-[#0f1115]/6 dark:border-white/8 px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer"
            >
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                  Gerado automaticamente pela fatura
                </div>
                <div className="mt-0.5 text-[13px] font-medium text-[#0f1115] dark:text-[#f2f4f7] truncate">
                  {taxSourceEntry.descricao}
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[#0f1115]/48 dark:text-[#f2f4f7]/48 shrink-0" />
            </button>
          )}

          {/* ============================================================== */}
          {/* ABA 1: PAGAMENTO                                               */}
          {/* ============================================================== */}
          {drawerTab === 'pagamento' && (
            <>
              {isPaid ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[14px] bg-[#f2f4f7] dark:bg-[#10141b] border border-[#0f1115]/6 dark:border-white/8 px-4 py-3">
                      <div className="text-[11px] font-medium text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                        {isInflow ? 'Recebido em' : 'Pago em'}
                      </div>
                      <div className="mt-1 text-[14px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                        {formatFullDate(entry.pagoEm || entry.vencimento)}
                      </div>
                    </div>

                    <div className="rounded-[14px] bg-[#f2f4f7] dark:bg-[#10141b] border border-[#0f1115]/6 dark:border-white/8 px-4 py-3">
                      <div className="text-[11px] font-medium text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                        Forma
                      </div>
                      <div className="mt-1 text-[14px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                        {entry.formaPagamento || 'Pix'}
                      </div>
                    </div>
                  </div>

                  {entry.comprovanteNome && (
                    <div className="rounded-[14px] bg-[#f2f4f7]/75 dark:bg-[#10141b] border border-[#0f1115]/6 dark:border-white/8 px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8.5 h-8.5 rounded-[9px] bg-[#15803d]/10 dark:bg-[#4ade80]/14 text-[#15803d] dark:text-[#4ade80] flex items-center justify-center shrink-0">
                          <FileCheck2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                            Comprovante anexado
                          </div>
                          <div className="text-[13px] font-medium text-[#0f1115] dark:text-[#f2f4f7] truncate">
                            {entry.comprovanteNome}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDrawerTab('documentos')}
                        className="text-[12px] font-medium text-[#163744] dark:text-[#9fdce6] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Ver arquivo
                      </button>
                    </div>
                  )}

                  {linkedTax && (
                    <button
                      type="button"
                      onClick={() => onSelectEntry(linkedTax.id)}
                      className="w-full text-left rounded-[14px] bg-[#163744]/6 dark:bg-[#9fdce6]/10 border border-[#163744]/14 dark:border-[#9fdce6]/22 px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-[#163744]/10 dark:hover:bg-[#9fdce6]/14 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-[11.5px] font-medium text-[#163744] dark:text-[#9fdce6]">
                          Imposto previsto em A pagar
                        </div>
                        <div className="mt-0.5 text-[14px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                          {formatBRL(linkedTax.valorCentavos)} · vence{' '}
                          {formatShortDate(linkedTax.vencimento)}
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-[#163744] dark:text-[#9fdce6] shrink-0" />
                    </button>
                  )}
                </div>
              ) : (
                <form
                  id="drawer-payment-form"
                  onSubmit={handleRegisterPayment}
                  className="space-y-5"
                >
                  {/* Data do pagamento com atalhos rápidos */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[12px] font-medium text-[#0f1115]/62 dark:text-[#f2f4f7]/62">
                        {isInflow ? 'Data do recebimento' : 'Data do pagamento'}
                      </label>
                      <div className="inline-flex items-center gap-1">
                        {[
                          { label: 'Hoje', iso: TODAY_ISO },
                          { label: 'Ontem', iso: '2026-11-16' },
                          { label: 'Vencimento', iso: entry.vencimento },
                        ].map((preset) => {
                          const active = pagoEm === preset.iso;
                          return (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => setPagoEm(preset.iso)}
                              className={`px-2 py-0.5 rounded-[7px] text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                                active
                                  ? 'bg-[#163744] text-white dark:bg-[#9fdce6] dark:text-[#0f1115]'
                                  : 'bg-[#f2f4f7] dark:bg-[#1b2029] text-[#0f1115]/58 dark:text-[#f2f4f7]/58 hover:text-[#0f1115] dark:hover:text-[#f2f4f7]'
                              }`}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="relative">
                      <Calendar className="w-4 h-4 text-[#0f1115]/40 dark:text-[#f2f4f7]/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="date"
                        value={pagoEm}
                        onChange={(e) => setPagoEm(e.target.value)}
                        className="eagle-input w-full h-10 pl-9.5 pr-3 text-[13px] tabular-nums"
                      />
                    </div>
                  </div>

                  {/* Meio de pagamento em grade tátil */}
                  <div className="space-y-2">
                    <label className="block text-[12px] font-medium text-[#0f1115]/62 dark:text-[#f2f4f7]/62">
                      Forma de pagamento
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {paymentMethodOptions.map((opt) => {
                        const Icon = opt.icon;
                        const active = formaPagamento === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setFormaPagamento(opt.value)}
                            className={`rounded-[12px] px-3 py-2.5 text-left border flex items-center gap-2.5 transition-all cursor-pointer ${
                              active
                                ? 'bg-[#163744]/8 dark:bg-[#9fdce6]/12 border-[#163744]/40 dark:border-[#9fdce6]/45 shadow-[0_1px_3px_rgba(22,55,68,0.08)]'
                                : 'bg-[#ffffff] dark:bg-[#10141b] border-[#0f1115]/8 dark:border-white/8 hover:border-[#0f1115]/18 dark:hover:border-white/18'
                            }`}
                          >
                            <div
                              className={`w-7.5 h-7.5 rounded-[8px] flex items-center justify-center shrink-0 ${
                                active
                                  ? 'bg-[#163744] text-white dark:bg-[#9fdce6] dark:text-[#0f1115]'
                                  : 'bg-[#f2f4f7] dark:bg-[#1b2029] text-[#0f1115]/60 dark:text-[#f2f4f7]/60'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[12.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] leading-tight">
                                {opt.label}
                              </div>
                              <div className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 leading-tight mt-0.5">
                                {opt.hint}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Slot moderno de Comprovante */}
                  <AttachmentFileSlot
                    label="Comprovante"
                    fileName={comprovanteInput}
                    placeholder="comprovante_pix.pdf"
                    suggestedName={suggestedReceiptName}
                    onChange={setComprovanteInput}
                  />

                  {/* Prévia limpa do imposto automático */}
                  {isInflow && (
                    <div className="pt-3 border-t border-[#0f1115]/8 dark:border-white/8 flex items-center justify-between text-[12px] tabular-nums">
                      <span className="text-[#0f1115]/58 dark:text-[#f2f4f7]/58">
                        Imposto previsto automático ({((entry.aliquotaImposto ?? 0.115) * 100).toFixed(1)}%)
                      </span>
                      <span className="font-semibold text-[#163744] dark:text-[#9fdce6]">
                        +{formatBRL(estimatedTaxCentavos)}
                      </span>
                    </div>
                  )}
                </form>
              )}
            </>
          )}

          {/* ============================================================== */}
          {/* ABA 2: NOTAS FISCAIS / COMPROVANTE                             */}
          {/* ============================================================== */}
          {drawerTab === 'documentos' && (
            <form
              id="drawer-docs-form"
              onSubmit={handleSaveDocs}
              className="space-y-5"
            >
              {notePending10d && (
                <div className="rounded-[14px] bg-[#b91c1c]/8 dark:bg-[#f87171]/12 border border-[#b91c1c]/18 dark:border-[#f87171]/24 px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileWarning className="w-4 h-4 text-[#b91c1c] dark:text-[#f87171] shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold text-[#991b1b] dark:text-[#f87171]">
                        Nota fiscal pendente
                      </div>
                      <div className="text-[11px] text-[#991b1b]/75 dark:text-[#f87171]/80 tabular-nums">
                        Fatura recebida há {daysSincePaid} dias
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="xs"
                    variant="cyan"
                    onClick={handleEmitirNfRapida}
                  >
                    Emitir agora
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-[12px] font-medium text-[#0f1115]/62 dark:text-[#f2f4f7]/62">
                  Situação da nota fiscal
                </label>
                <div
                  className="eagle-segmented grid grid-cols-3 gap-1 w-full"
                  role="radiogroup"
                  aria-label="Situação da nota fiscal"
                >
                  {(
                    [
                      { value: 'pendente', label: 'Pendente' },
                      { value: 'emitida', label: 'Emitida' },
                      { value: 'nao_aplicavel', label: 'Não aplica' },
                    ] as const
                  ).map((opt) => {
                    const active = nfStatus === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setNfStatus(opt.value)}
                        className={`relative h-8 px-2 rounded-[8px] text-[12px] font-medium transition-colors cursor-pointer truncate ${
                          active
                            ? 'text-[#0f1115] dark:text-[#f2f4f7]'
                            : 'text-[#0f1115]/56 dark:text-[#f2f4f7]/56 hover:text-[#0f1115] dark:hover:text-[#f2f4f7]'
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="drawer-nf-status-pill"
                            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                            className="absolute inset-0 rounded-[8px] bg-white dark:bg-[#252c38] border border-[#0f1115]/8 dark:border-white/10 shadow-[0_1px_2px_rgba(15,17,21,0.08)]"
                            aria-hidden="true"
                          />
                        )}
                        <span className="relative z-10">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {nfStatus !== 'nao_aplicavel' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-[12px] font-medium text-[#0f1115]/62 dark:text-[#f2f4f7]/62">
                        Número da NFS-e
                      </label>
                      <input
                        type="text"
                        value={nfNumero}
                        onChange={(e) => setNfNumero(e.target.value)}
                        placeholder="NFS-e 2026/0425"
                        className="eagle-input w-full h-10 px-3 text-[13px] tabular-nums"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[12px] font-medium text-[#0f1115]/62 dark:text-[#f2f4f7]/62">
                        Emissão
                      </label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 text-[#0f1115]/40 dark:text-[#f2f4f7]/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="date"
                          value={nfEmitidaEm}
                          onChange={(e) => setNfEmitidaEm(e.target.value)}
                          className="eagle-input w-full h-10 pl-9.5 pr-3 text-[13px] tabular-nums"
                        />
                      </div>
                    </div>
                  </div>

                  <AttachmentFileSlot
                    label="Arquivo da nota fiscal"
                    fileName={nfArquivo}
                    placeholder={suggestedNfName}
                    suggestedName={suggestedNfName}
                    onChange={setNfArquivo}
                  />
                </>
              )}

              <AttachmentFileSlot
                label="Comprovante bancário"
                fileName={comprovanteInput}
                placeholder={suggestedReceiptName}
                suggestedName={suggestedReceiptName}
                onChange={setComprovanteInput}
              />
            </form>
          )}

          {/* ============================================================== */}
          {/* ABA 3: ASAAS (CAMPOS PRONTOS OFFLINE)                          */}
          {/* ============================================================== */}
          {drawerTab === 'asaas' && isInflow && (
            <form
              id="drawer-asaas-form"
              onSubmit={handleSaveAsaas}
              className="space-y-5"
            >
              <div className="rounded-[14px] bg-[#163744]/6 dark:bg-[#9fdce6]/10 border border-[#163744]/12 dark:border-[#9fdce6]/18 px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-[9px] bg-[#163744] dark:bg-[#9fdce6] text-white dark:text-[#0f1115] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                      Cobrança Asaas
                    </div>
                    <div className="text-[11px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                      Campos preparados para integração futura
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-[#163744] dark:text-[#9fdce6] whitespace-nowrap shrink-0">
                  Offline
                </span>
              </div>

              <div className="space-y-2">
                <label className="block text-[12px] font-medium text-[#0f1115]/62 dark:text-[#f2f4f7]/62">
                  Meio de cobrança
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { value: 'PIX', label: 'Pix', icon: QrCode },
                      { value: 'BOLETO', label: 'Boleto', icon: ReceiptText },
                      { value: 'CREDIT_CARD', label: 'Cartão', icon: CreditCard },
                    ] as const
                  ).map((opt) => {
                    const Icon = opt.icon;
                    const active = billingType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setBillingType(opt.value)}
                        className={`rounded-[11px] h-10 px-3 flex items-center justify-center gap-2 border text-[12.5px] font-medium transition-all cursor-pointer ${
                          active
                            ? 'bg-[#163744] text-white dark:bg-[#9fdce6] dark:text-[#0f1115] border-transparent shadow-xs'
                            : 'bg-white dark:bg-[#10141b] text-[#0f1115]/72 dark:text-[#f2f4f7]/72 border-[#0f1115]/8 dark:border-white/8 hover:border-[#0f1115]/20'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[12px] font-medium text-[#0f1115]/62 dark:text-[#f2f4f7]/62">
                  Status da cobrança
                </label>
                <CustomSelect
                  value={asaasStatus}
                  onChange={setAsaasStatus}
                  options={[
                    { value: 'rascunho', label: 'Rascunho' },
                    { value: 'pronto', label: 'Pronto para envio' },
                    { value: 'enviado_manual', label: 'Enviado manual' },
                    { value: 'pago', label: 'Pago' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[12px] font-medium text-[#0f1115]/62 dark:text-[#f2f4f7]/62">
                    Referência externa
                  </label>
                  <input
                    type="text"
                    value={externalReference}
                    onChange={(e) => setExternalReference(e.target.value)}
                    placeholder="CTR-2026-1/2"
                    className="eagle-input w-full h-10 px-3 text-[12.5px] tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[12px] font-medium text-[#0f1115]/62 dark:text-[#f2f4f7]/62">
                    ID Asaas
                  </label>
                  <input
                    type="text"
                    value={paymentId}
                    onChange={(e) => setPaymentId(e.target.value)}
                    placeholder="pay_00018294"
                    className="eagle-input w-full h-10 px-3 text-[12.5px] tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[12px] font-medium text-[#0f1115]/62 dark:text-[#f2f4f7]/62">
                  Link da fatura
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={invoiceUrl}
                    onChange={(e) => setInvoiceUrl(e.target.value)}
                    placeholder="https://asaas.com/i/..."
                    className="eagle-input w-full h-10 pl-3 pr-10 text-[12.5px]"
                  />
                  {invoiceUrl.trim() && (
                    <button
                      type="button"
                      onClick={handleCopyUrl}
                      aria-label="Copiar link da fatura"
                      className="absolute right-1.5 w-7.5 h-7.5 rounded-[8px] inline-flex items-center justify-center text-[#0f1115]/55 dark:text-[#f2f4f7]/55 hover:bg-[#0f1115]/6 dark:hover:bg-white/8 transition-colors cursor-pointer"
                    >
                      {copiedUrl ? (
                        <Check className="w-3.5 h-3.5 text-[#15803d] dark:text-[#4ade80]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* RODAPÉ FIXO COM AÇÃO CONTEXTUAL */}
        <div className="px-5 py-3.5 border-t border-[#0f1115]/8 dark:border-[#f2f4f7]/8 bg-[#ffffff]/88 dark:bg-[#15181f]/88 backdrop-blur-md shrink-0 flex items-center justify-between gap-3">
          {savedNotice ? (
            <div className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#15803d] dark:text-[#4ade80] whitespace-nowrap">
              <Check className="w-4 h-4" />
              <span>{savedNotice}</span>
            </div>
          ) : drawerTab === 'pagamento' && isPaid ? (
            <span className="text-[12px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 truncate">
              Lançamento liquidado
            </span>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="text-[12.5px] font-medium text-[#0f1115]/56 dark:text-[#f2f4f7]/56 hover:text-[#0f1115] dark:hover:text-[#f2f4f7] transition-colors px-2 py-1.5 cursor-pointer"
            >
              Fechar
            </button>
          )}

          {drawerTab === 'pagamento' && isPaid ? (
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => reopenFinanceEntry(entry.id)}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reabrir lançamento</span>
            </Button>
          ) : (
            <Button type="submit" form={activeFormId} variant="primary" size="md">
              <Check className="w-4 h-4" />
              <span>
                {drawerTab === 'pagamento'
                  ? isInflow
                    ? 'Confirmar recebimento'
                    : 'Confirmar pagamento'
                  : drawerTab === 'documentos'
                    ? 'Salvar documentos'
                    : 'Salvar cobrança'}
              </span>
            </Button>
          )}
        </div>
      </motion.aside>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* VIEW PRINCIPAL DO FINANCEIRO (EDITORIAL, MODERNO E SEM POLUIÇÃO VISUAL)    */
/* -------------------------------------------------------------------------- */
export function FinanceView({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const {
    state,
    getClient,
    createFinanceEntry,
    signContractAndGenerateInvoices,
    setActiveSection,
  } = useEagle();

  const [activeTab, setActiveTab] = useState<FinanceTab>('painel');
  const [search, setSearch] = useState('');
  const [cashflowFilter, setCashflowFilter] = useState<CashflowSubfilter>('todos');
  const [payableFilter, setPayableFilter] = useState<PayableSubfilter>('todas');
  const [docFilter, setDocFilter] = useState<DocSubfilter>('todos');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  // Modal Novo Lançamento
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<FinanceType>('receber');
  const [status, setStatus] = useState<FinanceStatus>('pendente');
  const [valorReais, setValorReais] = useState('');
  const [vencimento, setVencimento] = useState('2026-11-28');
  const [clienteId, setClienteId] = useState(state.clients[0]?.id ?? 'cli-congesa');
  const [categoria, setCategoria] = useState('Projeto');
  const [recorrente, setRecorrente] = useState(false);
  const [isCustoFixo, setIsCustoFixo] = useState(false);

  // Modal Assinar Contrato
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [ctrClientId, setCtrClientId] = useState('cli-congesa');
  const [ctrTitulo, setCtrTitulo] = useState('Aditivo 2026/11 — Campanhas Congesa');
  const [ctrValorReais, setCtrValorReais] = useState('36000,00');
  const [ctrParcelas, setCtrParcelas] = useState(2);
  const [ctrPrimeiroVenc, setCtrPrimeiroVenc] = useState('2026-11-25');
  const [ctrAliquotaPct, setCtrAliquotaPct] = useState('11.5');
  const [ctrBillingType, setCtrBillingType] = useState<AsaasBillingType>('BOLETO');

  const selectedEntry = useMemo(
    () => state.finances.find((f) => f.id === selectedEntryId) ?? null,
    [state.finances, selectedEntryId]
  );

  const cashflow = useMemo(
    () =>
      build60DayCashflowSeries(
        state.finances,
        state.saldoInicialCaixaCentavos ?? 4850000,
        TODAY_ISO
      ),
    [state.finances, state.saldoInicialCaixaCentavos]
  );

  const fixedCosts = useMemo(
    () => calculateFixedCostsMonthly(state.finances),
    [state.finances]
  );

  const nonInternalClients = useMemo(
    () => state.clients.filter((c) => !c.isInterno),
    [state.clients]
  );

  const clientProfitability = useMemo(() => {
    return nonInternalClients
      .map((client) => ({
        client,
        summary: calculateClientFinancialSummary(
          client.id,
          state.finances,
          state.contracts,
          nonInternalClients.length,
          fixedCosts.totalMensalCentavos,
          TODAY_ISO
        ),
      }))
      .sort((a, b) => b.summary.lucroLiquidoCentavos - a.summary.lucroLiquidoCentavos);
  }, [
    nonInternalClients,
    state.finances,
    state.contracts,
    fixedCosts.totalMensalCentavos,
  ]);

  const metrics = useMemo(() => {
    let aReceberAberto = 0;
    let vencidoReceber = 0;
    let vencidoReceberCount = 0;
    let aPagarAberto = 0;
    let impostosAbertos = 0;
    let notasPendentes10dCount = 0;

    for (const f of state.finances) {
      if (f.tipo === 'receber' && f.status === 'pendente') {
        aReceberAberto += f.valorCentavos;
        if (isInvoiceOverdue(f)) {
          vencidoReceber += f.valorCentavos;
          vencidoReceberCount += 1;
        }
      }
      if (f.tipo === 'pagar' && f.status === 'pendente') {
        aPagarAberto += f.valorCentavos;
        if (f.isImposto) impostosAbertos += f.valorCentavos;
      }
      if (isInvoiceNotePending(f)) {
        notasPendentes10dCount += 1;
      }
    }

    return {
      aReceberAberto,
      vencidoReceber,
      vencidoReceberCount,
      aPagarAberto,
      impostosAbertos,
      notasPendentes10dCount,
    };
  }, [state.finances]);

  const searchMatches = (f: FinanceEntry) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const cli = getClient(f.clienteId)?.nome.toLowerCase() ?? '';
    return (
      f.descricao.toLowerCase().includes(q) ||
      f.categoria.toLowerCase().includes(q) ||
      cli.includes(q) ||
      (f.notaFiscal?.numero?.toLowerCase().includes(q) ?? false) ||
      (f.asaas?.externalReference?.toLowerCase().includes(q) ?? false)
    );
  };

  const cashflowLedger = useMemo(() => {
    const groups = new Map<
      string,
      { iso: string; items: FinanceEntry[]; netCentavos: number }
    >();
    let totalEntradas = 0;
    let totalSaidas = 0;

    for (const entry of state.finances) {
      if (!searchMatches(entry)) continue;
      if (cashflowFilter === 'realizados' && entry.status !== 'liquidado') continue;
      if (cashflowFilter === 'previstos' && entry.status !== 'pendente') continue;
      if (cashflowFilter === 'entradas' && entry.tipo !== 'receber') continue;
      if (cashflowFilter === 'saidas' && entry.tipo !== 'pagar') continue;

      if (entry.tipo === 'receber') totalEntradas += entry.valorCentavos;
      else totalSaidas += entry.valorCentavos;

      const dateKey =
        entry.status === 'liquidado' ? entry.pagoEm || entry.vencimento : entry.vencimento;
      const current = groups.get(dateKey) ?? {
        iso: dateKey,
        items: [],
        netCentavos: 0,
      };
      current.items.push(entry);
      current.netCentavos +=
        entry.tipo === 'receber' ? entry.valorCentavos : -entry.valorCentavos;
      groups.set(dateKey, current);
    }

    return {
      days: Array.from(groups.values()).sort((a, b) => b.iso.localeCompare(a.iso)),
      totalEntradas,
      totalSaidas,
      netTotal: totalEntradas - totalSaidas,
    };
  }, [state.finances, cashflowFilter, search, getClient]);

  const receivablesSorted = useMemo(() => {
    return state.finances
      .filter((f) => f.tipo === 'receber' && searchMatches(f))
      .sort((a, b) => {
        const aOverdue = isInvoiceOverdue(a);
        const bOverdue = isInvoiceOverdue(b);
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        if (aOverdue && bOverdue) return a.vencimento.localeCompare(b.vencimento);

        if (a.status !== b.status) return a.status === 'pendente' ? -1 : 1;
        if (a.status === 'pendente') return a.vencimento.localeCompare(b.vencimento);
        return (b.pagoEm || b.vencimento).localeCompare(a.pagoEm || a.vencimento);
      });
  }, [state.finances, search, getClient]);

  const payablesFiltered = useMemo(() => {
    return state.finances
      .filter((f) => {
        if (f.tipo !== 'pagar' || !searchMatches(f)) return false;
        if (payableFilter === 'em_aberto') return f.status === 'pendente';
        if (payableFilter === 'recorrentes') return Boolean(f.recorrente);
        if (payableFilter === 'impostos') return Boolean(f.isImposto);
        if (payableFilter === 'projetos') return !f.recorrente && !f.isImposto;
        return true;
      })
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'pendente' ? -1 : 1;
        return a.vencimento.localeCompare(b.vencimento);
      });
  }, [state.finances, payableFilter, search, getClient]);

  const documentsList = useMemo(() => {
    return state.finances
      .filter((f) => {
        if (!searchMatches(f)) return false;
        const hasNf = f.notaFiscal?.status === 'emitida';
        const hasReceipt = Boolean(f.comprovanteNome);
        const isPending10d = isInvoiceNotePending(f);
        if (docFilter === 'pendentes_10d') return isPending10d;
        if (docFilter === 'emitidas') return hasNf;
        if (docFilter === 'comprovantes') return hasReceipt;
        return hasNf || hasReceipt || isPending10d || (f.tipo === 'receber' && f.status === 'liquidado');
      })
      .sort((a, b) => {
        const aWarn = isInvoiceNotePending(a);
        const bWarn = isInvoiceNotePending(b);
        if (aWarn !== bWarn) return aWarn ? -1 : 1;
        return (b.pagoEm || b.vencimento).localeCompare(a.pagoEm || a.vencimento);
      });
  }, [state.finances, docFilter, search, getClient]);

  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = parseFloat(valorReais.replace(/\./g, '').replace(',', '.'));
    if (!descricao.trim() || Number.isNaN(numeric) || numeric <= 0) return;

    const created = createFinanceEntry({
      descricao: descricao.trim(),
      tipo,
      status,
      valorCentavos: Math.round(numeric * 100),
      vencimento,
      pagoEm: status === 'liquidado' ? TODAY_ISO : undefined,
      formaPagamento: status === 'liquidado' ? 'Pix' : undefined,
      clienteId,
      categoria: categoria.trim() || (recorrente ? 'Assinaturas' : 'Operação'),
      recorrente: tipo === 'pagar' ? recorrente : false,
      periodicidade: tipo === 'pagar' && recorrente ? 'mensal' : 'avulso',
      isCustoFixo: tipo === 'pagar' ? isCustoFixo : false,
      aliquotaImposto: tipo === 'receber' ? 0.115 : undefined,
    });

    setDescricao('');
    setValorReais('');
    setRecorrente(false);
    setIsCustoFixo(false);
    setIsNewModalOpen(false);
    setSelectedEntryId(created.id);
  };

  const handleSignContract = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = parseFloat(ctrValorReais.replace(/\./g, '').replace(',', '.'));
    if (!ctrTitulo.trim() || Number.isNaN(numeric) || numeric <= 0) return;

    const aliquotaNum = parseFloat(ctrAliquotaPct.replace(',', '.'));
    const { invoices } = signContractAndGenerateInvoices({
      titulo: ctrTitulo,
      clienteId: ctrClientId,
      projetoId: state.projects.find((p) => p.clienteId === ctrClientId)?.id,
      valorTotalCentavos: Math.round(numeric * 100),
      parcelas: ctrParcelas,
      primeiroVencimento: ctrPrimeiroVenc,
      aliquotaImposto: Number.isNaN(aliquotaNum) ? 0.115 : aliquotaNum / 100,
      billingType: ctrBillingType,
    });

    setIsContractModalOpen(false);
    setActiveTab('receber');
    if (invoices[0]) setSelectedEntryId(invoices[0].id);
  };

  const clientOptions = useMemo(
    () => state.clients.map((c) => ({ value: c.id, label: c.nome })),
    [state.clients]
  );

  const externalClientOptions = useMemo(
    () =>
      state.clients
        .filter((c) => !c.isInterno)
        .map((c) => ({ value: c.id, label: c.nome })),
    [state.clients]
  );

  const navTabs: Array<{ id: FinanceTab; label: string; count?: number; alert?: boolean }> = [
    { id: 'painel', label: 'Painel' },
    { id: 'fluxo', label: 'Fluxo de caixa' },
    {
      id: 'receber',
      label: 'A receber',
      count: metrics.vencidoReceberCount > 0 ? metrics.vencidoReceberCount : undefined,
      alert: metrics.vencidoReceberCount > 0,
    },
    { id: 'pagar', label: 'A pagar' },
    {
      id: 'documentos',
      label: 'Documentos',
      count: metrics.notasPendentes10dCount > 0 ? metrics.notasPendentes10dCount : undefined,
      alert: metrics.notasPendentes10dCount > 0,
    },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader
        title="Financeiro"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar lançamento, cliente ou NF..."
        primaryAction={{
          label: 'Novo lançamento',
          onClick: () => setIsNewModalOpen(true),
        }}
        onOpenMobileMenu={onOpenMobileMenu}
      />

      {/* BARRA DE NAVEGAÇÃO ARQUITETURAL SEPARADA (ZERO POLUIÇÃO NO TOPO) */}
      <div className="border-b border-[#0f1115]/8 dark:border-[#f2f4f7]/8 bg-[#ffffff]/72 dark:bg-[#15181f]/72 backdrop-blur-md px-5 lg:px-7 flex items-center justify-between gap-4 shrink-0">
        <nav
          role="tablist"
          aria-label="Seções do Financeiro"
          className="flex items-center gap-1 overflow-x-auto"
        >
          {navTabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`relative h-11 px-3.5 text-[13px] font-medium inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'text-[#0f1115] dark:text-[#f2f4f7] font-semibold'
                    : 'text-[#0f1115]/55 dark:text-[#f2f4f7]/55 hover:text-[#0f1115] dark:hover:text-[#f2f4f7]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-[6px] ${
                      tab.alert
                        ? 'bg-[#b91c1c]/12 text-[#991b1b] dark:bg-[#f87171]/16 dark:text-[#f87171]'
                        : 'bg-[#0f1115]/6 text-[#0f1115]/60 dark:bg-white/10 dark:text-[#f2f4f7]/70'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {active && (
                  <motion.span
                    layoutId="finance-nav-underline"
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute left-2 right-2 bottom-0 h-[2px] rounded-full bg-[#163744] dark:bg-[#9fdce6]"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="hidden sm:flex items-center gap-2 shrink-0 py-1.5">
          <Button
            size="xs"
            variant="secondary"
            onClick={() => setIsContractModalOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Assinar contrato</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 lg:p-7">
        <div className="max-w-[1380px] mx-auto space-y-5">
          {/* ================================================================ */}
          {/* VISTA 1: PAINEL EXECUTIVO (GRÁFICO + KPIs + LUCRO POR CLIENTE)   */}
          {/* ================================================================ */}
          {activeTab === 'painel' && (
            <>
              {/* 4 KPIs SIMÉTRICOS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Saldo hoje — Petróleo Hero */}
                <button
                  type="button"
                  onClick={() => setActiveTab('fluxo')}
                  className="text-left rounded-[18px] bg-[#163744] dark:bg-[#112731] text-white p-5 flex flex-col justify-between gap-3.5 border border-[#163744] dark:border-[#9fdce6]/18 hover:brightness-105 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[12px] font-medium text-[#9fdce6]">
                      Saldo hoje
                    </span>
                    <span className="text-[11.5px] text-white/60 tabular-nums">
                      17 Nov
                    </span>
                  </div>

                  <div className="text-[28px] font-semibold tracking-[-0.03em] tabular-nums leading-none">
                    {formatBRL(cashflow.saldoHojeCentavos)}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/12 text-[12px] tabular-nums w-full">
                    <span className="text-white/68">Previsão Nov</span>
                    <span className="font-semibold text-[#9fdce6]">
                      {formatBRL(cashflow.previsaoMesCentavos)}
                    </span>
                  </div>
                </button>

                {/* A receber */}
                <BentoCard
                  onClick={() => setActiveTab('receber')}
                  className="p-5 flex flex-col justify-between gap-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                      A receber
                    </span>
                    <StatusIndicator
                      label={
                        metrics.vencidoReceberCount > 0
                          ? `${metrics.vencidoReceberCount} vencidas`
                          : 'Em dia'
                      }
                      dotClass={
                        metrics.vencidoReceberCount > 0
                          ? 'bg-[#b91c1c] dark:bg-[#f87171]'
                          : 'bg-[#15803d] dark:bg-[#4ade80]'
                      }
                      textClass={
                        metrics.vencidoReceberCount > 0
                          ? 'text-[#991b1b] dark:text-[#f87171]'
                          : 'text-[#166534] dark:text-[#4ade80]'
                      }
                    />
                  </div>

                  <div className="text-[26px] font-semibold tracking-[-0.03em] tabular-nums leading-none text-[#0f1115] dark:text-[#f2f4f7]">
                    {formatBRL(metrics.aReceberAberto)}
                  </div>

                  <div className="space-y-2">
                    <ProportionBar
                      heightClass="h-1.5"
                      segments={[
                        {
                          key: 'vencido',
                          value: metrics.vencidoReceber,
                          colorClass: 'bg-[#b91c1c] dark:bg-[#f87171]',
                        },
                        {
                          key: 'a_vencer',
                          value: Math.max(0, metrics.aReceberAberto - metrics.vencidoReceber),
                          colorClass: 'bg-[#163744] dark:bg-[#9fdce6]',
                        },
                      ]}
                    />
                    <div className="flex items-center justify-between text-[11.5px] tabular-nums text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                      <span>Vencido: {formatBRL(metrics.vencidoReceber)}</span>
                      <span>{state.contracts.length} contratos</span>
                    </div>
                  </div>
                </BentoCard>

                {/* A pagar */}
                <BentoCard
                  onClick={() => setActiveTab('pagar')}
                  className="p-5 flex flex-col justify-between gap-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                      A pagar
                    </span>
                    <span className="text-[11.5px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 tabular-nums">
                      Fixos + impostos
                    </span>
                  </div>

                  <div className="text-[26px] font-semibold tracking-[-0.03em] tabular-nums leading-none text-[#0f1115] dark:text-[#f2f4f7]">
                    {formatBRL(metrics.aPagarAberto)}
                  </div>

                  <div className="space-y-2">
                    <ProportionBar
                      heightClass="h-1.5"
                      segments={[
                        {
                          key: 'impostos',
                          value: metrics.impostosAbertos,
                          colorClass: 'bg-[#b45309] dark:bg-[#fbbf24]',
                        },
                        {
                          key: 'contas',
                          value: Math.max(0, metrics.aPagarAberto - metrics.impostosAbertos),
                          colorClass: 'bg-[#6b7280] dark:bg-[#9ca3af]',
                        },
                      ]}
                    />
                    <div className="flex items-center justify-between text-[11.5px] tabular-nums text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                      <span>Fixos/mês: {formatBRL(fixedCosts.totalMensalCentavos)}</span>
                      <span>Impostos: {formatBRL(metrics.impostosAbertos)}</span>
                    </div>
                  </div>
                </BentoCard>

                {/* Notas & Documentos */}
                <BentoCard
                  onClick={() => {
                    setDocFilter(
                      metrics.notasPendentes10dCount > 0 ? 'pendentes_10d' : 'todos'
                    );
                    setActiveTab('documentos');
                  }}
                  className="p-5 flex flex-col justify-between gap-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                      Notas fiscais
                    </span>
                    <StatusIndicator
                      label={
                        metrics.notasPendentes10dCount > 0 ? 'Atenção +10d' : 'Em dia'
                      }
                      dotClass={
                        metrics.notasPendentes10dCount > 0
                          ? 'bg-[#b91c1c] dark:bg-[#f87171]'
                          : 'bg-[#15803d] dark:bg-[#4ade80]'
                      }
                      textClass={
                        metrics.notasPendentes10dCount > 0
                          ? 'text-[#991b1b] dark:text-[#f87171]'
                          : 'text-[#166534] dark:text-[#4ade80]'
                      }
                    />
                  </div>

                  <div className="text-[26px] font-semibold tracking-[-0.03em] tabular-nums leading-none text-[#0f1115] dark:text-[#f2f4f7]">
                    {metrics.notasPendentes10dCount > 0
                      ? `${metrics.notasPendentes10dCount} pendente`
                      : 'Sem pendências'}
                  </div>

                  <div className="pt-3 border-t border-[#0f1115]/8 dark:border-[#f2f4f7]/8 flex items-center justify-between text-[11.5px] tabular-nums text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                    <span>
                      {metrics.notasPendentes10dCount > 0
                        ? 'Fatura paga há +10 dias'
                        : 'Notas e comprovantes'}
                    </span>
                    <span className="font-medium text-[#163744] dark:text-[#9fdce6]">
                      Abrir notas →
                    </span>
                  </div>
                </BentoCard>
              </div>

              {/* GRÁFICO DE 60 DIAS + LUCRO POR CLIENTE (SEM EXTRATO JUNTO) */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
                <BentoCard className="xl:col-span-8 p-5 sm:p-6 flex flex-col justify-between">
                  <Cashflow60Chart
                    points={cashflow.points}
                    minSaldo={cashflow.minSaldo}
                    maxSaldo={cashflow.maxSaldo}
                  />
                </BentoCard>

                {/* Lucro por cliente */}
                <BentoCard className="xl:col-span-4 overflow-hidden flex flex-col">
                  <div className="px-5 py-4 border-b border-[#0f1115]/8 dark:border-[#f2f4f7]/8 flex items-center justify-between">
                    <h2 className="text-[14.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                      Lucro por cliente
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveSection('clientes')}
                      className="text-[12px] font-medium text-[#163744] dark:text-[#9fdce6] hover:underline cursor-pointer"
                    >
                      Ver clientes
                    </button>
                  </div>

                  <div className="divide-y divide-[#0f1115]/6 dark:divide-[#f2f4f7]/6 flex-1">
                    {clientProfitability.map(({ client, summary }) => {
                      const isPositive = summary.lucroLiquidoCentavos > 0;
                      return (
                        <div key={client.id} className="px-5 py-3.5 space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-[13.5px] font-medium text-[#0f1115] dark:text-[#f2f4f7] truncate">
                                {client.nome}
                              </div>
                              <div className="text-[11.5px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 tabular-nums">
                                Margem {summary.margemPercentual}%
                              </div>
                            </div>
                            <span
                              className={`text-[13.5px] font-semibold tabular-nums shrink-0 ${
                                isPositive
                                  ? 'text-[#15803d] dark:text-[#4ade80]'
                                  : 'text-[#b91c1c] dark:text-[#f87171]'
                              }`}
                            >
                              {isPositive ? '+' : '−'}{' '}
                              {formatBRL(Math.abs(summary.lucroLiquidoCentavos))}
                            </span>
                          </div>

                          <ProportionBar
                            heightClass="h-1"
                            segments={[
                              {
                                key: 'lucro',
                                value: Math.max(0, summary.lucroLiquidoCentavos),
                                colorClass: 'bg-[#15803d] dark:bg-[#4ade80]',
                              },
                              {
                                key: 'custos',
                                value:
                                  summary.custosDiretosCentavos +
                                  summary.impostosPrevistosCentavos +
                                  summary.rateioCustosFixosCentavos,
                                colorClass: 'bg-[#0f1115]/14 dark:bg-white/16',
                              },
                            ]}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="px-5 py-3 border-t border-[#0f1115]/8 dark:border-[#f2f4f7]/8 bg-[#f2f4f7]/55 dark:bg-[#10141b]/55 flex items-center justify-between">
                    <span className="text-[11.5px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                      Movimentação detalhada
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('fluxo')}
                      className="text-[12px] font-semibold text-[#163744] dark:text-[#9fdce6] hover:underline cursor-pointer"
                    >
                      Abrir fluxo de caixa →
                    </button>
                  </div>
                </BentoCard>
              </div>
            </>
          )}

          {/* ================================================================ */}
          {/* VISTA 2: FLUXO DE CAIXA (MOVIMENTOS POR DIA DEDICADO)            */}
          {/* ================================================================ */}
          {activeTab === 'fluxo' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SegmentedControl
                  layoutId="cashflow-ledger-filter"
                  ariaLabel="Filtro do fluxo de caixa"
                  value={cashflowFilter}
                  onChange={setCashflowFilter}
                  options={[
                    { id: 'todos', label: 'Todos' },
                    { id: 'realizados', label: 'Realizados' },
                    { id: 'previstos', label: 'Previstos' },
                    { id: 'entradas', label: 'Entradas' },
                    { id: 'saidas', label: 'Saídas' },
                  ]}
                />

                <div className="flex flex-wrap items-center gap-4 text-[12.5px] tabular-nums">
                  <span className="text-[#0f1115]/58 dark:text-[#f2f4f7]/58">
                    Entradas{' '}
                    <strong className="font-semibold text-[#15803d] dark:text-[#4ade80]">
                      +{formatBRL(cashflowLedger.totalEntradas)}
                    </strong>
                  </span>
                  <span className="text-[#0f1115]/25 dark:text-[#f2f4f7]/25" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-[#0f1115]/58 dark:text-[#f2f4f7]/58">
                    Saídas{' '}
                    <strong className="font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                      −{formatBRL(cashflowLedger.totalSaidas)}
                    </strong>
                  </span>
                  <span className="text-[#0f1115]/25 dark:text-[#f2f4f7]/25" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-[#0f1115]/58 dark:text-[#f2f4f7]/58">
                    Saldo{' '}
                    <strong
                      className={`font-semibold ${
                        cashflowLedger.netTotal >= 0
                          ? 'text-[#163744] dark:text-[#9fdce6]'
                          : 'text-[#b91c1c] dark:text-[#f87171]'
                      }`}
                    >
                      {cashflowLedger.netTotal >= 0 ? '+' : '−'}
                      {formatBRL(Math.abs(cashflowLedger.netTotal))}
                    </strong>
                  </span>
                </div>
              </div>

              {cashflowLedger.days.length === 0 ? (
                <EmptyState
                  title="Nenhum movimento neste filtro."
                  actionLabel="Novo lançamento"
                  onAction={() => setIsNewModalOpen(true)}
                />
              ) : (
                <BentoCard className="overflow-hidden">
                  <div className="divide-y divide-[#0f1115]/8 dark:divide-[#f2f4f7]/8">
                    {cashflowLedger.days.map((day) => {
                      const isFutureDay = day.iso > TODAY_ISO;
                      const isTodayDay = day.iso === TODAY_ISO;
                      return (
                        <div key={day.iso} className="px-5 py-4 space-y-2.5">
                          <div className="flex items-center justify-between text-[12px] tabular-nums">
                            <div className="flex items-center gap-2 font-semibold text-[#0f1115]/68 dark:text-[#f2f4f7]/68">
                              <span>
                                {isTodayDay ? 'Hoje · ' : ''}
                                {formatFullDate(day.iso)}
                              </span>
                              {isFutureDay && (
                                <span className="font-normal text-[#0f1115]/42 dark:text-[#f2f4f7]/42">
                                  · Previsto
                                </span>
                              )}
                            </div>
                            <span
                              className={`font-semibold ${
                                day.netCentavos >= 0
                                  ? 'text-[#15803d] dark:text-[#4ade80]'
                                  : 'text-[#0f1115]/65 dark:text-[#f2f4f7]/65'
                              }`}
                            >
                              {day.netCentavos >= 0 ? '+' : '−'}{' '}
                              {formatBRL(Math.abs(day.netCentavos))}
                            </span>
                          </div>

                          <div className="space-y-1">
                            {day.items.map((item) => {
                              const cli = getClient(item.clienteId);
                              const isInflow = item.tipo === 'receber';
                              const overdue = isInvoiceOverdue(item);
                              const noteWarn = isInvoiceNotePending(item);
                              const isPaid = item.status === 'liquidado';

                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => setSelectedEntryId(item.id)}
                                  className="w-full text-left rounded-[11px] hover:bg-[#f2f4f7] dark:hover:bg-[#1b2029] px-3 py-2.5 -mx-3 flex items-center justify-between gap-4 transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span
                                      className={`w-7.5 h-7.5 rounded-[9px] inline-flex items-center justify-center shrink-0 ${
                                        isInflow
                                          ? 'bg-[#15803d]/10 text-[#15803d] dark:bg-[#4ade80]/14 dark:text-[#4ade80]'
                                          : 'bg-[#0f1115]/6 text-[#0f1115]/65 dark:bg-white/8 dark:text-[#f2f4f7]/70'
                                      }`}
                                    >
                                      {isInflow ? (
                                        <ArrowDownRight className="w-4 h-4" />
                                      ) : (
                                        <ArrowUpRight className="w-4 h-4" />
                                      )}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="text-[13.5px] font-medium text-[#0f1115] dark:text-[#f2f4f7] truncate">
                                        {item.descricao}
                                      </div>
                                      <div className="text-[11.5px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 truncate">
                                        {cli?.nome ?? 'Eagle'} · {item.categoria}
                                        {item.formaPagamento ? ` · ${item.formaPagamento}` : ''}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4 shrink-0">
                                    <span className="hidden sm:inline-flex">
                                      {overdue ? (
                                        <StatusIndicator
                                          label="Vencida"
                                          dotClass="bg-[#b91c1c] dark:bg-[#f87171]"
                                          textClass="text-[#991b1b] dark:text-[#f87171]"
                                        />
                                      ) : noteWarn ? (
                                        <StatusIndicator
                                          label="Nota pendente"
                                          dotClass="bg-[#b45309] dark:bg-[#fbbf24]"
                                          textClass="text-[#92400e] dark:text-[#fbbf24]"
                                        />
                                      ) : isPaid ? (
                                        <StatusIndicator
                                          label={isInflow ? 'Recebido' : 'Pago'}
                                          dotClass="bg-[#15803d] dark:bg-[#4ade80]"
                                          textClass="text-[#166534] dark:text-[#4ade80]"
                                        />
                                      ) : (
                                        <span className="text-[12px] text-[#0f1115]/45 dark:text-[#f2f4f7]/45">
                                          Previsto
                                        </span>
                                      )}
                                    </span>

                                    <span
                                      className={`text-[13.5px] font-semibold tabular-nums min-w-[104px] text-right ${
                                        isInflow
                                          ? 'text-[#0f1115] dark:text-[#f2f4f7]'
                                          : 'text-[#0f1115]/68 dark:text-[#f2f4f7]/68'
                                      }`}
                                    >
                                      {isInflow ? '+' : '−'} {formatBRL(item.valorCentavos)}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </BentoCard>
              )}
            </>
          )}

          {/* ================================================================ */}
          {/* VISTA 3: A RECEBER                                               */}
          {/* ================================================================ */}
          {activeTab === 'receber' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4 text-[12.5px] tabular-nums">
                  <span className="text-[#0f1115]/58 dark:text-[#f2f4f7]/58">
                    Vencidas{' '}
                    <strong className="font-semibold text-[#b91c1c] dark:text-[#f87171]">
                      {formatBRL(metrics.vencidoReceber)}
                    </strong>
                  </span>
                  <span className="text-[#0f1115]/25 dark:text-[#f2f4f7]/25" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-[#0f1115]/58 dark:text-[#f2f4f7]/58">
                    Total em aberto{' '}
                    <strong className="font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                      {formatBRL(metrics.aReceberAberto)}
                    </strong>
                  </span>
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsContractModalOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Assinar contrato</span>
                </Button>
              </div>

              {receivablesSorted.length === 0 ? (
                <EmptyState
                  title="Nenhuma fatura encontrada."
                  actionLabel="Assinar contrato"
                  onAction={() => setIsContractModalOpen(true)}
                />
              ) : (
                <BentoCard className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#0f1115]/8 dark:border-[#f2f4f7]/8 text-[11.5px] font-medium text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                          <th className="py-3.5 pl-5 pr-4 font-medium">Vencimento</th>
                          <th className="py-3.5 px-4 font-medium">Fatura</th>
                          <th className="py-3.5 px-4 font-medium">Cliente</th>
                          <th className="py-3.5 px-4 font-medium">Nota</th>
                          <th className="py-3.5 px-4 font-medium">Asaas</th>
                          <th className="py-3.5 pl-4 pr-5 font-medium text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#0f1115]/6 dark:divide-[#f2f4f7]/6 text-[13.5px]">
                        {receivablesSorted.map((entry) => {
                          const client = getClient(entry.clienteId);
                          const overdue = isInvoiceOverdue(entry);
                          const overdueDays = getOverdueDays(entry);
                          const notePending10d = isInvoiceNotePending(entry);
                          const daysPaid = getDaysSincePayment(entry);
                          const isPaid = entry.status === 'liquidado';

                          return (
                            <tr
                              key={entry.id}
                              onClick={() => setSelectedEntryId(entry.id)}
                              className={`group transition-colors cursor-pointer ${
                                overdue
                                  ? 'bg-[#b91c1c]/[0.03] dark:bg-[#f87171]/[0.05] hover:bg-[#b91c1c]/[0.06]'
                                  : 'hover:bg-[#f6f8fa] dark:hover:bg-[#191d26]'
                              }`}
                            >
                              <td className="py-3.5 pl-5 pr-4 whitespace-nowrap tabular-nums">
                                {overdue ? (
                                  <StatusIndicator
                                    label={`${formatShortDate(entry.vencimento)} · ${overdueDays}d`}
                                    dotClass="bg-[#b91c1c] dark:bg-[#f87171]"
                                    textClass="text-[#991b1b] dark:text-[#f87171]"
                                  />
                                ) : isPaid ? (
                                  <StatusIndicator
                                    label={`Pago ${formatShortDate(entry.pagoEm || entry.vencimento)}`}
                                    dotClass="bg-[#15803d] dark:bg-[#4ade80]"
                                    textClass="text-[#166534] dark:text-[#4ade80]"
                                  />
                                ) : (
                                  <span className="text-[12.5px] text-[#0f1115]/65 dark:text-[#f2f4f7]/65">
                                    {formatShortDate(entry.vencimento)}
                                  </span>
                                )}
                              </td>

                              <td className="py-3.5 px-4 min-w-[230px]">
                                <div className="font-medium text-[#0f1115] dark:text-[#f2f4f7] group-hover:text-[#163744] dark:group-hover:text-[#9fdce6] transition-colors">
                                  {entry.descricao}
                                </div>
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap text-[12.5px] text-[#0f1115]/70 dark:text-[#f2f4f7]/70">
                                {client?.nome ?? '—'}
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {notePending10d ? (
                                  <StatusIndicator
                                    label={`Pendente · ${daysPaid}d`}
                                    dotClass="bg-[#b91c1c] dark:bg-[#f87171]"
                                    textClass="text-[#991b1b] dark:text-[#f87171]"
                                  />
                                ) : entry.notaFiscal?.status === 'emitida' ? (
                                  <span className="text-[12px] text-[#15803d] dark:text-[#4ade80] font-medium tabular-nums">
                                    {entry.notaFiscal.numero || 'Emitida'}
                                  </span>
                                ) : (
                                  <span className="text-[12px] text-[#0f1115]/40 dark:text-[#f2f4f7]/40">
                                    —
                                  </span>
                                )}
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap text-[12px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                                {entry.asaas?.billingType ?? 'PIX'}
                              </td>

                              <td className="py-3.5 pl-4 pr-5 text-right font-semibold tabular-nums whitespace-nowrap text-[#0f1115] dark:text-[#f2f4f7]">
                                {formatBRL(entry.valorCentavos)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </BentoCard>
              )}
            </>
          )}

          {/* ================================================================ */}
          {/* VISTA 4: A PAGAR                                                 */}
          {/* ================================================================ */}
          {activeTab === 'pagar' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SegmentedControl
                  layoutId="payables-subfilter"
                  ariaLabel="Filtro de contas a pagar"
                  value={payableFilter}
                  onChange={setPayableFilter}
                  options={[
                    { id: 'todas', label: 'Todas' },
                    { id: 'em_aberto', label: 'Em aberto' },
                    { id: 'recorrentes', label: 'Recorrentes' },
                    { id: 'impostos', label: 'Impostos' },
                    { id: 'projetos', label: 'Projetos' },
                  ]}
                />

                <button
                  type="button"
                  onClick={() => setActiveSection('habilidades')}
                  className="rounded-[10px] bg-white dark:bg-[#15181f] border border-[#0f1115]/8 dark:border-[#f2f4f7]/10 px-3.5 py-1.5 text-[12px] tabular-nums inline-flex items-center gap-2 hover:border-[#163744]/35 dark:hover:border-[#9fdce6]/35 transition-colors cursor-pointer"
                >
                  <span className="text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                    Fixos/mês {formatBRL(fixedCosts.totalMensalCentavos)}
                  </span>
                  <span className="font-semibold text-[#163744] dark:text-[#9fdce6]">
                    {formatBRL(fixedCosts.custoHoraEstudioCentavos)}/h nos Serviços
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#163744] dark:text-[#9fdce6]" />
                </button>
              </div>

              {payablesFiltered.length === 0 ? (
                <EmptyState
                  title="Nenhuma conta neste filtro."
                  actionLabel="Novo lançamento"
                  onAction={() => {
                    setTipo('pagar');
                    setIsNewModalOpen(true);
                  }}
                />
              ) : (
                <BentoCard className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#0f1115]/8 dark:border-[#f2f4f7]/8 text-[11.5px] font-medium text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                          <th className="py-3.5 pl-5 pr-4 font-medium">Vencimento</th>
                          <th className="py-3.5 px-4 font-medium">Conta</th>
                          <th className="py-3.5 px-4 font-medium">Tipo</th>
                          <th className="py-3.5 px-4 font-medium">Situação</th>
                          <th className="py-3.5 pl-4 pr-5 font-medium text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#0f1115]/6 dark:divide-[#f2f4f7]/6 text-[13.5px]">
                        {payablesFiltered.map((entry) => {
                          const client = getClient(entry.clienteId);
                          const isPaid = entry.status === 'liquidado';
                          return (
                            <tr
                              key={entry.id}
                              onClick={() => setSelectedEntryId(entry.id)}
                              className="group hover:bg-[#f6f8fa] dark:hover:bg-[#191d26] transition-colors cursor-pointer"
                            >
                              <td className="py-3.5 pl-5 pr-4 whitespace-nowrap tabular-nums text-[12.5px] text-[#0f1115]/62 dark:text-[#f2f4f7]/62">
                                {formatShortDate(entry.vencimento)}
                              </td>
                              <td className="py-3.5 px-4 min-w-[230px]">
                                <div className="font-medium text-[#0f1115] dark:text-[#f2f4f7] group-hover:text-[#163744] dark:group-hover:text-[#9fdce6] transition-colors">
                                  {entry.descricao}
                                </div>
                                <div className="text-[11.5px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                                  {client?.nome ?? 'Eagle'}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap text-[12px] text-[#0f1115]/62 dark:text-[#f2f4f7]/62">
                                {entry.recorrente
                                  ? 'Recorrente'
                                  : entry.isImposto
                                    ? 'Imposto'
                                    : 'Projeto'}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <StatusIndicator
                                  label={isPaid ? 'Pago' : 'A pagar'}
                                  dotClass={
                                    isPaid
                                      ? 'bg-[#15803d] dark:bg-[#4ade80]'
                                      : 'bg-[#b45309] dark:bg-[#fbbf24]'
                                  }
                                  textClass={
                                    isPaid
                                      ? 'text-[#166534] dark:text-[#4ade80]'
                                      : 'text-[#92400e] dark:text-[#fbbf24]'
                                  }
                                />
                              </td>
                              <td className="py-3.5 pl-4 pr-5 text-right font-semibold tabular-nums whitespace-nowrap text-[#0f1115]/82 dark:text-[#f2f4f7]/82">
                                − {formatBRL(entry.valorCentavos)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </BentoCard>
              )}
            </>
          )}

          {/* ================================================================ */}
          {/* VISTA 5: DOCUMENTOS                                              */}
          {/* ================================================================ */}
          {activeTab === 'documentos' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SegmentedControl
                  layoutId="docs-subfilter"
                  ariaLabel="Filtro de documentos"
                  value={docFilter}
                  onChange={setDocFilter}
                  options={[
                    { id: 'todos', label: 'Todos' },
                    {
                      id: 'pendentes_10d',
                      label:
                        metrics.notasPendentes10dCount > 0
                          ? `Nota pendente (${metrics.notasPendentes10dCount})`
                          : 'Nota pendente',
                    },
                    { id: 'emitidas', label: 'Emitidas' },
                    { id: 'comprovantes', label: 'Comprovantes' },
                  ]}
                />

                {metrics.notasPendentes10dCount > 0 && (
                  <div className="inline-flex items-center gap-2 text-[12px] font-medium text-[#991b1b] dark:text-[#f87171]">
                    <FileWarning className="w-3.5 h-3.5" />
                    <span>{metrics.notasPendentes10dCount} paga há +10d sem nota</span>
                  </div>
                )}
              </div>

              {documentsList.length === 0 ? (
                <EmptyState title="Nenhum documento encontrado neste filtro." />
              ) : (
                <BentoCard className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#0f1115]/8 dark:border-[#f2f4f7]/8 text-[11.5px] font-medium text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                          <th className="py-3.5 pl-5 pr-4 font-medium">Lançamento</th>
                          <th className="py-3.5 px-4 font-medium">Cliente</th>
                          <th className="py-3.5 px-4 font-medium">Nota Fiscal</th>
                          <th className="py-3.5 px-4 font-medium">Comprovante</th>
                          <th className="py-3.5 pl-4 pr-5 font-medium text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#0f1115]/6 dark:divide-[#f2f4f7]/6 text-[13.5px]">
                        {documentsList.map((entry) => {
                          const client = getClient(entry.clienteId);
                          const warn10d = isInvoiceNotePending(entry);
                          const daysPaid = getDaysSincePayment(entry);
                          const nfEmitida = entry.notaFiscal?.status === 'emitida';

                          return (
                            <tr
                              key={entry.id}
                              onClick={() => setSelectedEntryId(entry.id)}
                              className="group hover:bg-[#f6f8fa] dark:hover:bg-[#191d26] transition-colors cursor-pointer"
                            >
                              <td className="py-3.5 pl-5 pr-4 min-w-[230px]">
                                <div className="font-medium text-[#0f1115] dark:text-[#f2f4f7]">
                                  {entry.descricao}
                                </div>
                                <div className="text-[11.5px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 tabular-nums">
                                  {formatShortDate(entry.pagoEm || entry.vencimento)}
                                </div>
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap text-[12.5px] text-[#0f1115]/70 dark:text-[#f2f4f7]/70">
                                {client?.nome ?? 'Eagle'}
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {warn10d ? (
                                  <StatusIndicator
                                    label={`Nota pendente · ${daysPaid}d`}
                                    dotClass="bg-[#b91c1c] dark:bg-[#f87171]"
                                    textClass="text-[#991b1b] dark:text-[#f87171]"
                                  />
                                ) : nfEmitida ? (
                                  <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#15803d] dark:text-[#4ade80] tabular-nums">
                                    <FileCheck2 className="w-3.5 h-3.5" />
                                    <span>{entry.notaFiscal?.numero || 'Emitida'}</span>
                                  </span>
                                ) : (
                                  <span className="text-[12px] text-[#0f1115]/40 dark:text-[#f2f4f7]/40">
                                    —
                                  </span>
                                )}
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {entry.comprovanteNome ? (
                                  <span className="inline-flex items-center gap-1.5 text-[12px] text-[#0f1115]/72 dark:text-[#f2f4f7]/72">
                                    <Paperclip className="w-3.5 h-3.5 text-[#163744] dark:text-[#9fdce6]" />
                                    <span className="truncate max-w-[180px]">
                                      {entry.comprovanteNome}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-[12px] text-[#0f1115]/40 dark:text-[#f2f4f7]/40">
                                    —
                                  </span>
                                )}
                              </td>

                              <td className="py-3.5 pl-4 pr-5 text-right font-semibold tabular-nums whitespace-nowrap text-[#0f1115] dark:text-[#f2f4f7]">
                                {formatBRL(entry.valorCentavos)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </BentoCard>
              )}
            </>
          )}
        </div>
      </div>

      {/* PAINEL LATERAL DE DETALHE */}
      <AnimatePresence>
        {selectedEntry && (
          <FinanceDetailDrawer
            key={selectedEntry.id}
            entry={selectedEntry}
            allFinances={state.finances}
            onClose={() => setSelectedEntryId(null)}
            onSelectEntry={(id) => setSelectedEntryId(id)}
          />
        )}
      </AnimatePresence>

      {/* MODAL ASSINAR CONTRATO (ZERO SELECT NATIVO) */}
      {isContractModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1115]/50 backdrop-blur-xs p-4"
          onClick={() => setIsContractModalOpen(false)}
        >
          <form
            onSubmit={handleSignContract}
            onClick={(e) => e.stopPropagation()}
            className="eagle-modal w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                Assinar contrato
              </h2>
              <button
                type="button"
                onClick={() => setIsContractModalOpen(false)}
                className="eagle-btn-secondary w-8 h-8 rounded-full inline-flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[12px] font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60 mb-1.5">
                  Cliente
                </label>
                <CustomSelect
                  value={ctrClientId}
                  onChange={setCtrClientId}
                  options={externalClientOptions}
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60 mb-1.5">
                  Título
                </label>
                <input
                  type="text"
                  required
                  value={ctrTitulo}
                  onChange={(e) => setCtrTitulo(e.target.value)}
                  className="eagle-input w-full h-9.5 px-3 text-[13.5px]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60 mb-1.5">
                    Valor (R$)
                  </label>
                  <input
                    type="text"
                    required
                    value={ctrValorReais}
                    onChange={(e) => setCtrValorReais(e.target.value)}
                    className="eagle-input w-full h-9.5 px-3 text-[13px] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60 mb-1.5">
                    Parcelas
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={ctrParcelas}
                    onChange={(e) =>
                      setCtrParcelas(Math.max(1, Math.min(12, Number(e.target.value) || 1)))
                    }
                    className="eagle-input w-full h-9.5 px-3 text-[13px] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60 mb-1.5">
                    Imposto (%)
                  </label>
                  <input
                    type="text"
                    value={ctrAliquotaPct}
                    onChange={(e) => setCtrAliquotaPct(e.target.value)}
                    className="eagle-input w-full h-9.5 px-3 text-[13px] tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60 mb-1.5">
                    1º vencimento
                  </label>
                  <input
                    type="date"
                    value={ctrPrimeiroVenc}
                    onChange={(e) => setCtrPrimeiroVenc(e.target.value)}
                    className="eagle-input w-full h-9.5 px-3 text-[13px] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60 mb-1.5">
                    Asaas
                  </label>
                  <SegmentedChoice
                    value={ctrBillingType}
                    onChange={setCtrBillingType}
                    options={[
                      { value: 'BOLETO', label: 'Boleto' },
                      { value: 'PIX', label: 'Pix' },
                      { value: 'CREDIT_CARD', label: 'Cartão' },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[12px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55 tabular-nums">
                {(() => {
                  const n = parseFloat(ctrValorReais.replace(/\./g, '').replace(',', '.'));
                  if (Number.isNaN(n) || n <= 0) return '—';
                  return `${ctrParcelas}× de ${formatBRL(Math.round((n * 100) / ctrParcelas))}`;
                })()}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setIsContractModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Gerar faturas</span>
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* MODAL NOVO LANÇAMENTO (ZERO SELECT NATIVO) */}
      {isNewModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1115]/50 backdrop-blur-xs p-4"
          onClick={() => setIsNewModalOpen(false)}
        >
          <form
            onSubmit={handleCreateEntry}
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
                className="eagle-btn-secondary w-8 h-8 rounded-full inline-flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[12px] font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60 mb-1.5">
                  Descrição
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Licença mensal ou aditivo"
                  className="eagle-input w-full h-9.5 px-3 text-[13.5px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60 mb-1.5">
                    Tipo
                  </label>
                  <SegmentedChoice
                    value={tipo}
                    onChange={setTipo}
                    options={[
                      { value: 'receber', label: 'Entrada' },
                      { value: 'pagar', label: 'Saída' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60 mb-1.5">
                    Situação
                  </label>
                  <SegmentedChoice
                    value={status}
                    onChange={setStatus}
                    options={[
                      { value: 'pendente', label: 'Aberto' },
                      { value: 'liquidado', label: 'Pago' },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60 mb-1.5">
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
                  <label className="block text-[12px] font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60 mb-1.5">
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
                  <label className="block text-[12px] font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60 mb-1.5">
                    Cliente
                  </label>
                  <CustomSelect
                    value={clienteId}
                    onChange={setClienteId}
                    options={clientOptions}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60 mb-1.5">
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

              {tipo === 'pagar' && (
                <div className="flex flex-wrap gap-4 pt-1">
                  <label className="flex items-center gap-2 text-[12.5px] text-[#0f1115]/78 dark:text-[#f2f4f7]/78 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recorrente}
                      onChange={(e) => setRecorrente(e.target.checked)}
                      className="w-4 h-4 accent-[#163744] dark:accent-[#9fdce6]"
                    />
                    <span>Recorrente mensal</span>
                  </label>
                  <label className="flex items-center gap-2 text-[12.5px] text-[#0f1115]/78 dark:text-[#f2f4f7]/78 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCustoFixo}
                      onChange={(e) => setIsCustoFixo(e.target.checked)}
                      className="w-4 h-4 accent-[#163744] dark:accent-[#9fdce6]"
                    />
                    <span>Custo fixo</span>
                  </label>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsNewModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary">
                Registrar
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
