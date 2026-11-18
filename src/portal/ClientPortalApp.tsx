import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  FileCheck2,
  FileText,
  Film,
  Folder,
  FolderKanban,
  Home,
  Inbox,
  MapPin,
  Maximize2,
  MessageSquare,
  Monitor,
  Moon,
  MoreHorizontal,
  PackageCheck,
  Palette,
  Paperclip,
  Plus,
  RotateCcw,
  ScrollText,
  Send,
  Sun,
  UserCheck,
  Wallet,
  X,
} from 'lucide-react';
import { BrandMark, EagleEmblem } from '../components/BrandMark';
import {
  Badge,
  Button,
  CustomSelect,
  FolderTabs,
} from '../components/DesignSystem';
import {
  EmptyState,
  MemberAvatar,
  PageHeader,
  SegmentedControl,
  StatusIndicator,
} from '../components/SharedUI';
import {
  BentoCard,
  HatchedActivityBars,
  MicroRing,
  ProportionBar,
  SplineTrendChart,
} from '../components/VisualWidgets';
import { useEagle } from '../context/EagleContext';
import { INITIAL_PORTAL_DATA } from '../data/portalSeedData';
import { ThemePreference } from '../types/eagle';
import {
  BrandAssetFile,
  PiecePin,
  PortalDataset,
  PortalInvoice,
  PortalPiece,
  PortalProposalContract,
  PortalRequest,
  PortalRole,
  PortalSection,
} from '../types/portal';
import { formatFullDate, TODAY_ISO } from '../utils/formatters';
import { PortalBrandView } from './PortalBrandView';
import { ContractFilter, PortalContractsView } from './PortalContractsView';
import { FinanceFilter, PortalFinanceView } from './PortalFinanceView';
import { PortalHomeView } from './PortalHomeView';
import {
  AddBrandAssetModal,
  NewRequestModal,
  PayInvoiceModal,
  SignContractModal,
} from './PortalModals';
import { PortalProposalsView, ProposalFilter } from './PortalProposalsView';
import { ProofingModal } from './ProofingModal';

const PORTAL_STORAGE_KEY = 'eagle-portal-state-v4';

const ROLE_LABELS: Record<PortalRole, string> = {
  responsavel: 'Responsável',
  solicitante: 'Solicitante',
  financeiro: 'Financeiro',
};

const ROLE_DESCRIPTIONS: Record<PortalRole, string> = {
  responsavel: 'Vê tudo, aprova peças e assina contratos',
  solicitante: 'Acompanha projetos e faz pedidos (sem valores)',
  financeiro: 'Vê faturas, notas fiscais e contratos',
};

interface PortalNavItem {
  id: PortalSection;
  label: string;
  shortLabel: string;
  group: 'Acompanhar' | 'Acervo & Canal' | 'Conta';
  icon: React.ComponentType<{ className?: string }>;
}

const ALL_NAV_ITEMS: PortalNavItem[] = [
  { id: 'inicio', label: 'Início', shortLabel: 'Início', group: 'Acompanhar', icon: Home },
  { id: 'projetos', label: 'Projetos', shortLabel: 'Projetos', group: 'Acompanhar', icon: FolderKanban },
  { id: 'aprovacoes', label: 'Aprovações', shortLabel: 'Aprovar', group: 'Acompanhar', icon: CheckCircle2 },
  { id: 'pedidos', label: 'Pedidos', shortLabel: 'Pedidos', group: 'Acompanhar', icon: Inbox },
  { id: 'entregas', label: 'Entregas', shortLabel: 'Entregas', group: 'Acervo & Canal', icon: PackageCheck },
  { id: 'marca', label: 'Marca', shortLabel: 'Marca', group: 'Acervo & Canal', icon: Palette },
  { id: 'conversas', label: 'Conversas', shortLabel: 'Chat', group: 'Acervo & Canal', icon: MessageSquare },
  { id: 'resultados', label: 'Resultados', shortLabel: 'Dados', group: 'Conta', icon: BarChart3 },
  { id: 'propostas', label: 'Propostas', shortLabel: 'Propostas', group: 'Conta', icon: ScrollText },
  { id: 'contratos', label: 'Contratos', shortLabel: 'Contratos', group: 'Conta', icon: FileCheck2 },
  { id: 'financeiro', label: 'Financeiro', shortLabel: 'Financeiro', group: 'Conta', icon: Wallet },
];

function getAllowedSections(role: PortalRole): PortalSection[] {
  if (role === 'financeiro') return ['inicio', 'contratos', 'financeiro'];
  if (role === 'solicitante') {
    return [
      'inicio',
      'projetos',
      'aprovacoes',
      'pedidos',
      'entregas',
      'marca',
      'conversas',
      'resultados',
    ];
  }
  return [
    'inicio',
    'projetos',
    'aprovacoes',
    'pedidos',
    'entregas',
    'marca',
    'conversas',
    'resultados',
    'propostas',
    'contratos',
    'financeiro',
  ];
}

function triggerSimulatedDownload(filename: string, contentText: string) {
  try {
    const blob = new Blob([contentText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    // Fallback silencioso
  }
}

function loadInitialPortalData(): PortalDataset {
  try {
    const raw = localStorage.getItem(PORTAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PortalDataset;
      if (parsed?.clients?.length && parsed?.projects?.length) {
        return parsed;
      }
    }
  } catch {
    // Ignora storage inválido
  }
  return INITIAL_PORTAL_DATA;
}

export function ClientPortalApp({
  onBackToStudio,
}: {
  onBackToStudio: () => void;
}) {
  const { getMember, themePreference, setThemePreference } = useEagle();

  const [dataset, setDataset] = useState<PortalDataset>(loadInitialPortalData);
  const [activeClientId, setActiveClientId] = useState<string>('cli-congesa');
  const [activeRole, setActiveRole] = useState<PortalRole>('responsavel');
  const [activeSection, setActiveSection] = useState<PortalSection>('inicio');
  const [search, setSearch] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Toast discreto
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(null), 2800);
  };

  useEffect(() => {
    try {
      localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(dataset));
    } catch {
      // Ignora
    }
  }, [dataset]);

  const allowedSections = useMemo(() => getAllowedSections(activeRole), [activeRole]);

  useEffect(() => {
    if (!allowedSections.includes(activeSection)) {
      setActiveSection('inicio');
    }
  }, [allowedSections, activeSection]);

  // Modais e seleções
  const [proofingPieceId, setProofingPieceId] = useState<string | null>(null);
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [newRequestProjectId, setNewRequestProjectId] = useState<string | undefined>(undefined);
  const [signingContract, setSigningContract] = useState<PortalProposalContract | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<PortalInvoice | null>(null);
  const [addAssetOpen, setAddAssetOpen] = useState(false);

  // Sub-estados das telas
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectFolderTab, setProjectFolderTab] = useState<'etapas' | 'pecas' | 'entregas'>('etapas');
  const [approvalFilter, setApprovalFilter] = useState<
    'todas' | 'aguardando_aprovacao' | 'ajustes_solicitados' | 'aprovada'
  >('todas');
  const [approvalProjectFilter, setApprovalProjectFilter] = useState<string>('todos');
  const [deliverableCategory, setDeliverableCategory] = useState<
    'Todas' | 'Identidade' | 'Posts & Vídeo' | 'Site & Tech' | 'Materiais'
  >('Todas');
  const [financeFilter, setFinanceFilter] = useState<FinanceFilter>('todas');
  const [proposalFilter, setProposalFilter] = useState<ProposalFilter>('todas');
  const [contractFilter, setContractFilter] = useState<ContractFilter>('todos');
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  // Conversas estado
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState('');

  // Switcher & Mobile "Mais"
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!switcherOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [switcherOpen]);

  // Dados filtrados pelo cliente ativo
  const activeClient = useMemo(
    () => dataset.clients.find((c) => c.id === activeClientId) ?? dataset.clients[0],
    [dataset.clients, activeClientId]
  );

  const activeUser = useMemo(
    () =>
      dataset.users.find(
        (u) => u.clientId === activeClient.id && u.papel === activeRole
      ) ?? dataset.users.find((u) => u.clientId === activeClient.id)!,
    [dataset.users, activeClient.id, activeRole]
  );

  const clientProjects = useMemo(
    () => dataset.projects.filter((p) => p.clientId === activeClient.id),
    [dataset.projects, activeClient.id]
  );

  const clientPieces = useMemo(
    () => dataset.pieces.filter((p) => p.clientId === activeClient.id),
    [dataset.pieces, activeClient.id]
  );

  const clientDeliverables = useMemo(
    () => dataset.deliverables.filter((d) => d.clientId === activeClient.id),
    [dataset.deliverables, activeClient.id]
  );

  const clientRequests = useMemo(
    () => dataset.requests.filter((r) => r.clientId === activeClient.id),
    [dataset.requests, activeClient.id]
  );

  const clientBrandKit = useMemo(
    () => dataset.brandKits.find((b) => b.clientId === activeClient.id),
    [dataset.brandKits, activeClient.id]
  );

  const clientConversations = useMemo(
    () => dataset.conversations.filter((c) => c.clientId === activeClient.id),
    [dataset.conversations, activeClient.id]
  );

  const clientContracts = useMemo(
    () => dataset.contracts.filter((c) => c.clientId === activeClient.id),
    [dataset.contracts, activeClient.id]
  );

  const clientProposals = useMemo(
    () => clientContracts.filter((c) => c.tipo === 'Proposta'),
    [clientContracts]
  );

  const clientFormalContracts = useMemo(
    () => clientContracts.filter((c) => c.tipo === 'Contrato'),
    [clientContracts]
  );

  const clientInvoices = useMemo(() => {
    const list = dataset.invoices.filter((i) => i.clientId === activeClient.id);
    const order: Record<PortalInvoice['status'], number> = {
      vencida: 0,
      em_aberto: 1,
      paga: 2,
    };
    return [...list].sort((a, b) => order[a.status] - order[b.status]);
  }, [dataset.invoices, activeClient.id]);

  const clientResults = useMemo(
    () => dataset.results.find((r) => r.clientId === activeClient.id),
    [dataset.results, activeClient.id]
  );

  useEffect(() => {
    setSelectedConvId(clientConversations[0]?.id ?? null);
    setMobileThreadOpen(false);
    setApprovalProjectFilter('todos');
    setSelectedProjectId(null);
    setSearch('');
  }, [activeClient.id]);

  const activeConversation =
    clientConversations.find((c) => c.id === selectedConvId) ??
    clientConversations[0] ??
    null;

  const activeProject =
    clientProjects.find((p) => p.id === selectedProjectId) ?? null;

  const pendingApprovalsCount = clientPieces.filter(
    (p) => p.status === 'aguardando_aprovacao'
  ).length;
  const unreadChatsCount = clientConversations.reduce(
    (acc, c) => acc + c.naoLidas,
    0
  );
  const pendingProposalsCount = clientProposals.filter(
    (p) => p.status === 'aguardando_assinatura'
  ).length;
  const pendingContractsCount = clientFormalContracts.filter(
    (c) => c.status === 'aguardando_assinatura'
  ).length;
  const openInvoicesCount = clientInvoices.filter(
    (i) => i.status !== 'paga'
  ).length;

  const proofingPiece = useMemo(
    () => clientPieces.find((p) => p.id === proofingPieceId) ?? null,
    [clientPieces, proofingPieceId]
  );

  // Handlers de mutação
  const handleAddPin = (
    pieceId: string,
    pin: Omit<PiecePin, 'id' | 'numero'>
  ) => {
    setDataset((prev) => ({
      ...prev,
      pieces: prev.pieces.map((p) => {
        if (p.id !== pieceId) return p;
        const nextNum =
          p.pins.reduce((max, item) => Math.max(max, item.numero), 0) + 1;
        return {
          ...p,
          pins: [
            ...p.pins,
            { ...pin, id: `pin-${Date.now()}`, numero: nextNum },
          ],
        };
      }),
    }));
    showToast('Comentário fixado na peça.');
  };

  const handleToggleResolvePin = (pieceId: string, pinId: string) => {
    setDataset((prev) => ({
      ...prev,
      pieces: prev.pieces.map((p) =>
        p.id === pieceId
          ? {
              ...p,
              pins: p.pins.map((pin) =>
                pin.id === pinId ? { ...pin, resolvido: !pin.resolvido } : pin
              ),
            }
          : p
      ),
    }));
  };

  const handleUpdatePieceStatus = (
    pieceId: string,
    status: PortalPiece['status']
  ) => {
    setDataset((prev) => ({
      ...prev,
      pieces: prev.pieces.map((p) =>
        p.id === pieceId ? { ...p, status } : p
      ),
    }));
    showToast(
      status === 'aprovada'
        ? 'Peça aprovada! Nossa equipe já foi avisada.'
        : status === 'ajustes_solicitados'
          ? 'Pedido de ajuste enviado para a equipe.'
          : 'Peça reaberta para revisão.'
    );
  };

  const handleCreateRequest = (
    req: Omit<PortalRequest, 'id' | 'criadoEm' | 'status'>
  ) => {
    const created: PortalRequest = {
      ...req,
      id: `req-${Date.now()}`,
      criadoEm: 'Agora',
      status: 'em_analise',
    };
    setDataset((prev) => ({
      ...prev,
      requests: [created, ...prev.requests],
    }));
    showToast('Pedido registrado! A equipe EAGLE já recebeu.');
  };

  const handleSignContract = (contractId: string, signerName: string) => {
    setDataset((prev) => ({
      ...prev,
      contracts: prev.contracts.map((c) =>
        c.id === contractId
          ? {
              ...c,
              status: 'assinado',
              assinadoPor: signerName,
              assinadoEm: formatFullDate(TODAY_ISO),
              autenticidadeHash:
                c.autenticidadeHash ??
                `#EAG-26-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
            }
          : c
      ),
    }));
    showToast('Documento assinado e confirmado com sucesso.');
  };

  const handlePayInvoice = (invoiceId: string) => {
    setDataset((prev) => ({
      ...prev,
      invoices: prev.invoices.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const num = Math.floor(420 + Math.random() * 80);
        return {
          ...inv,
          status: 'paga',
          pagoEm: TODAY_ISO,
          notaFiscalNumero: inv.notaFiscalNumero ?? `NFS-e 2026/0${num}`,
          notaFiscalArquivo:
            inv.notaFiscalArquivo ?? `NFSe_${activeClient.iniciais}_0${num}.pdf`,
        };
      }),
    }));
    showToast('Pagamento confirmado! Sua nota fiscal já está disponível.');
  };

  const handleAddBrandAsset = (
    asset: Omit<BrandAssetFile, 'id' | 'atualizadoEm'>
  ) => {
    setDataset((prev) => ({
      ...prev,
      brandKits: prev.brandKits.map((bk) =>
        bk.clientId === activeClient.id
          ? {
              ...bk,
              arquivos: [
                { ...asset, id: `ba-${Date.now()}`, atualizadoEm: 'Nov 2026' },
                ...bk.arquivos,
              ],
            }
          : bk
      ),
    }));
    showToast('Material salvo na pasta da marca.');
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatDraft.trim() || !activeConversation) return;
    const text = chatDraft.trim();
    setDataset((prev) => ({
      ...prev,
      conversations: prev.conversations.map((conv) =>
        conv.id === activeConversation.id
          ? {
              ...conv,
              naoLidas: 0,
              mensagens: [
                ...conv.mensagens,
                {
                  id: `msg-${Date.now()}`,
                  remetenteNome: activeUser.nome,
                  remetenteCargo: `${activeClient.nome} · ${ROLE_LABELS[activeRole]}`,
                  isEagle: false,
                  texto: text,
                  horario: 'Agora',
                },
              ],
            }
          : conv
      ),
    }));
    setChatDraft('');
  };

  const handleSelectConversation = (convId: string) => {
    setSelectedConvId(convId);
    setMobileThreadOpen(true);
    setDataset((prev) => ({
      ...prev,
      conversations: prev.conversations.map((c) =>
        c.id === convId ? { ...c, naoLidas: 0 } : c
      ),
    }));
  };

  const handleCopyHex = (hex: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(hex).catch(() => {});
    }
    setCopiedHex(hex);
    showToast(`Cor ${hex} copiada!`);
    window.setTimeout(() => setCopiedHex(null), 1600);
  };

  const handleResetDemo = () => {
    setDataset(INITIAL_PORTAL_DATA);
    try {
      localStorage.removeItem(PORTAL_STORAGE_KEY);
    } catch {
      // Ignora
    }
    setSwitcherOpen(false);
    showToast('Dados de demonstração restaurados.');
  };

  const cycleTheme = () => {
    const next: Record<ThemePreference, ThemePreference> = {
      system: 'light',
      light: 'dark',
      dark: 'system',
    };
    setThemePreference(next[themePreference]);
  };

  const visibleNavItems = useMemo(
    () => ALL_NAV_ITEMS.filter((item) => allowedSections.includes(item.id)),
    [allowedSections]
  );

  const navGroups = useMemo(() => {
    const order: PortalNavItem['group'][] = ['Acompanhar', 'Acervo & Canal', 'Conta'];
    return order
      .map((title) => ({
        title,
        items: visibleNavItems.filter((i) => i.group === title),
      }))
      .filter((g) => g.items.length > 0);
  }, [visibleNavItems]);

  const mobilePrimaryTabs = useMemo(() => {
    if (visibleNavItems.length <= 5) return visibleNavItems;
    return visibleNavItems.slice(0, 4);
  }, [visibleNavItems]);

  const mobileOverflowTabs = useMemo(() => {
    if (visibleNavItems.length <= 5) return [];
    return visibleNavItems.slice(4);
  }, [visibleNavItems]);

  const getBadgeForNav = (id: PortalSection): number | undefined => {
    if (id === 'aprovacoes' && pendingApprovalsCount > 0) return pendingApprovalsCount;
    if (id === 'conversas' && unreadChatsCount > 0) return unreadChatsCount;
    if (id === 'propostas' && pendingProposalsCount > 0) return pendingProposalsCount;
    if (id === 'contratos' && pendingContractsCount > 0) return pendingContractsCount;
    if (id === 'financeiro' && openInvoicesCount > 0) return openInvoicesCount;
    return undefined;
  };

  const navigateTo = (section: PortalSection) => {
    setActiveSection(section);
    setSelectedProjectId(null);
    setSearch('');
    setMobileMenuOpen(false);
    setMobileMoreOpen(false);
  };

  /* ======================================================================== */
  /* ELEMENTO DO SWITCHER DE DEMONSTRAÇÃO (CLIENTE + PAPEL)                   */
  /* ======================================================================== */
  const demoSwitcherSlot = (
    <div ref={switcherRef} className="relative">
      <button
        type="button"
        onClick={() => setSwitcherOpen((o) => !o)}
        className="eagle-btn-secondary h-9 px-2.5 sm:px-3 text-[12.5px] font-medium inline-flex items-center gap-2 cursor-pointer"
      >
        <UserCheck className="w-3.5 h-3.5 text-[#163744] dark:text-[#9fdce6] shrink-0" />
        <span className="hidden sm:inline truncate max-w-[200px]">
          {activeClient.nome} · <strong>{ROLE_LABELS[activeRole]}</strong>
        </span>
        <span className="sm:hidden font-semibold">{ROLE_LABELS[activeRole]}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#0f1115]/48 transition-transform ${
            switcherOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {switcherOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-[calc(100%+8px)] w-[304px] sm:w-[330px] z-50 rounded-[16px] bg-white dark:bg-[#181c24] border border-[#0f1115]/12 dark:border-white/14 shadow-[0_20px_48px_-12px_rgba(15,17,21,0.28)] p-4 space-y-4"
          >
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-[#0f1115]/50 dark:text-white/50 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Cliente visualizado
              </span>
              <div className="space-y-1">
                {dataset.clients.map((cli) => {
                  const selected = cli.id === activeClientId;
                  return (
                    <button
                      key={cli.id}
                      type="button"
                      onClick={() => setActiveClientId(cli.id)}
                      className={`w-full px-2.5 py-2 rounded-[10px] text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[#163744]/10 dark:bg-[#9fdce6]/15 text-[#163744] dark:text-[#9fdce6] font-semibold'
                          : 'hover:bg-[#f2f4f7] dark:hover:bg-white/5 text-[#0f1115] dark:text-[#f2f4f7]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          style={{ backgroundColor: cli.corMarca }}
                          className="w-6 h-6 rounded-[7px] text-white text-[10px] font-bold inline-flex items-center justify-center shrink-0"
                        >
                          {cli.iniciais}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[12.5px] truncate">{cli.nome}</p>
                          <p className="text-[10.5px] opacity-60 truncate">
                            {cli.segmento}
                          </p>
                        </div>
                      </div>
                      {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-[#0f1115]/8 dark:border-white/10 space-y-1.5">
              <span className="text-[11px] font-semibold text-[#0f1115]/50 dark:text-white/50 block">
                Papel de quem entrou
              </span>
              <div className="space-y-1">
                {(['responsavel', 'solicitante', 'financeiro'] as PortalRole[]).map(
                  (role) => {
                    const selected = activeRole === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setActiveRole(role)}
                        className={`w-full px-2.5 py-2 rounded-[10px] text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          selected
                            ? 'bg-[#163744] text-white dark:bg-[#9fdce6] dark:text-[#0f1115]'
                            : 'bg-[#f2f4f7]/65 dark:bg-white/5 text-[#0f1115] dark:text-[#f2f4f7] hover:bg-[#ebeff3]'
                        }`}
                      >
                        <div>
                          <p className="text-[12.5px] font-semibold">
                            {ROLE_LABELS[role]}
                          </p>
                          <p
                            className={`text-[10.5px] ${
                              selected
                                ? 'opacity-85'
                                : 'text-[#0f1115]/55 dark:text-white/55'
                            }`}
                          >
                            {ROLE_DESCRIPTIONS[role]}
                          </p>
                        </div>
                        {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-[#0f1115]/8 dark:border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetDemo}
                className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#0f1115]/60 dark:text-white/60 hover:text-[#0f1115] dark:hover:text-white cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurar exemplo</span>
              </button>

              <button
                type="button"
                onClick={() => setSwitcherOpen(false)}
                className="text-[12px] font-semibold text-[#163744] dark:text-[#9fdce6] cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  /* ======================================================================== */
  /* INÍCIO — RENDERIZADO VIA PortalHomeView (BENTO + GLASSMORPHISM PAINEL)   */
  /* ======================================================================== */

  /* ======================================================================== */
  /* PROJETOS (PORTFÓLIO BENTO + ESTÚDIO DO PROJETO COM FOLDERTABS)           */
  /* ======================================================================== */
  const renderProjects = () => {
    if (activeProject) {
      const lead = getMember(activeProject.liderEagleId);
      const projPieces = clientPieces.filter((pc) => pc.projectId === activeProject.id);
      const projDeliverables = clientDeliverables.filter(
        (dl) => dl.projectId === activeProject.id
      );
      const projConv = clientConversations.find(
        (cv) => cv.projectId === activeProject.id
      );

      return (
        <div className="max-w-[1380px] mx-auto space-y-5">
          {/* Barra superior de retorno + troca rápida de projeto */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedProjectId(null)}
                className="eagle-btn-secondary h-9 px-3 text-[13px] font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Todos os projetos</span>
              </button>

              <div className="w-64 sm:w-80">
                <CustomSelect
                  value={activeProject.id}
                  onChange={(id) => {
                    setSelectedProjectId(id);
                    setProjectFolderTab('etapas');
                  }}
                  options={clientProjects.map((p) => ({ value: p.id, label: p.nome }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {projConv && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    handleSelectConversation(projConv.id);
                    setActiveSection('conversas');
                  }}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Conversar</span>
                </Button>
              )}
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setNewRequestProjectId(activeProject.id);
                  setNewRequestOpen(true);
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Pedir algo aqui</span>
              </Button>
            </div>
          </div>

          {/* Cabeçalho aberto estilo ClientsView / ProjectsView */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-1">
            <div className="flex items-center gap-4 min-w-0">
              <MicroRing
                value={activeProject.progressoPct}
                size={56}
                strokeWidth={4.5}
                label={`${activeProject.progressoPct}%`}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="petroleo" size="xs">
                    {activeProject.categoria}
                  </Badge>
                  <span className="text-[12px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                    {activeProject.faseAtual} · Previsão: {activeProject.previsaoEntrega}
                  </span>
                </div>
                <h2 className="text-[22px] sm:text-[24px] font-semibold tracking-[-0.025em] text-[#0f1115] dark:text-[#f2f4f7] truncate mt-1">
                  {activeProject.nome}
                </h2>
                <p className="text-[13px] text-[#0f1115]/65 dark:text-[#f2f4f7]/65 mt-0.5">
                  {activeProject.ultimoUpdate}
                </p>
              </div>
            </div>

            <div className="rounded-full bg-white dark:bg-[#15181f] border border-[#0f1115]/8 dark:border-white/10 pl-1.5 pr-3.5 py-1 flex items-center gap-2.5 shadow-xs">
              <MemberAvatar member={lead} size="sm" />
              <div className="leading-tight">
                <div className="text-[10px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                  Líder na EAGLE
                </div>
                <div className="text-[12px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                  {lead?.nome ?? 'Equipe EAGLE'}
                </div>
              </div>
            </div>
          </div>

          {/* FolderTabs conectadas à folha branca */}
          <div>
            <FolderTabs
              layoutId="portal-project-tabs"
              value={projectFolderTab}
              onChange={setProjectFolderTab}
              items={[
                { id: 'etapas', label: 'Etapas do projeto', count: activeProject.etapas.length },
                { id: 'pecas', label: 'Peças em revisão', count: projPieces.length },
                { id: 'entregas', label: 'Entregas finais', count: projDeliverables.length },
              ]}
            />

            <div className="rounded-b-[22px] rounded-tr-[22px] bg-white dark:bg-[#15181f] border border-[#0f1115]/8 dark:border-white/10 shadow-[0_6px_24px_rgba(15,17,21,0.04)] overflow-hidden">
              {projectFolderTab === 'etapas' && (
                <div className="divide-y divide-[#0f1115]/6 dark:divide-white/8">
                  {activeProject.etapas.map((st, idx) => {
                    const done = st.status === 'concluida';
                    const now = st.status === 'em_andamento';
                    return (
                      <div
                        key={st.id}
                        className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3.5">
                          <span
                            className={`w-7 h-7 rounded-full text-[12px] font-semibold tabular-nums flex items-center justify-center shrink-0 mt-0.5 ${
                              done
                                ? 'bg-[#163744] text-white dark:bg-[#9fdce6] dark:text-[#0f1115]'
                                : now
                                  ? 'bg-[#b45309]/14 text-[#92400e] dark:bg-[#fbbf24]/20 dark:text-[#fbbf24]'
                                  : 'bg-[#ebeff3] dark:bg-[#1b2029] text-[#0f1115]/48 dark:text-[#f2f4f7]/48'
                            }`}
                          >
                            {done ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                          </span>
                          <div>
                            <div className="text-[14.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                              {st.nome}
                            </div>
                            <p className="text-[12.5px] text-[#0f1115]/62 dark:text-[#f2f4f7]/62 mt-0.5">
                              {st.resumo}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 pl-10 sm:pl-0">
                          <StatusIndicator
                            label={done ? 'Concluída' : now ? 'Em andamento' : 'Próxima'}
                            dotClass={
                              done
                                ? 'bg-[#15803d] dark:bg-[#4ade80]'
                                : now
                                  ? 'bg-[#b45309] dark:bg-[#fbbf24]'
                                  : 'bg-[#9ca3af]'
                            }
                            textClass={
                              done
                                ? 'text-[#166534] dark:text-[#4ade80]'
                                : now
                                  ? 'text-[#92400e] dark:text-[#fbbf24]'
                                  : 'text-[#0f1115]/50 dark:text-[#f2f4f7]/50'
                            }
                            live={now}
                          />
                          {st.dataLabel && (
                            <span className="text-[12px] text-[#0f1115]/45 dark:text-[#f2f4f7]/45 tabular-nums">
                              {st.dataLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {projectFolderTab === 'pecas' && (
                <div className="divide-y divide-[#0f1115]/6 dark:divide-white/8">
                  {projPieces.length === 0 ? (
                    <div className="p-8 text-center text-[13px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                      Nenhuma peça em revisão neste projeto no momento.
                    </div>
                  ) : (
                    projPieces.map((pc) => (
                      <button
                        key={pc.id}
                        type="button"
                        onClick={() => setProofingPieceId(pc.id)}
                        className="w-full px-5 py-3.5 flex items-center justify-between gap-4 text-left hover:bg-[#f6f8fa] dark:hover:bg-[#1a202b] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-16 h-12 rounded-[9px] overflow-hidden bg-[#ebeff3] dark:bg-[#10141b] shrink-0">
                            {pc.previewUrl && (
                              <img
                                src={pc.previewUrl}
                                alt={pc.titulo}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[14px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                              {pc.titulo}
                            </div>
                            <div className="text-[12px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 tabular-nums mt-0.5">
                              {pc.versao} · {pc.formato} · {pc.pins.length} comentários
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <Badge
                            variant={
                              pc.status === 'aprovada'
                                ? 'success'
                                : pc.status === 'ajustes_solicitados'
                                  ? 'petroleo'
                                  : 'warning'
                            }
                            size="xs"
                          >
                            {pc.status === 'aprovada'
                              ? 'Aprovada'
                              : pc.status === 'ajustes_solicitados'
                                ? 'Ajustes'
                                : 'Aguardando'}
                          </Badge>
                          <ArrowUpRight className="w-4 h-4 text-[#0f1115]/35" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {projectFolderTab === 'entregas' && (
                <div className="divide-y divide-[#0f1115]/6 dark:divide-white/8">
                  {projDeliverables.length === 0 ? (
                    <div className="p-8 text-center text-[13px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                      Os arquivos finais aprovados aparecerão aqui.
                    </div>
                  ) : (
                    projDeliverables.map((dlv) => (
                      <div
                        key={dlv.id}
                        className="px-5 py-3.5 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <div className="text-[14px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                            {dlv.titulo}
                          </div>
                          <div className="text-[12px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 tabular-nums mt-0.5">
                            {dlv.versao} · {dlv.formato} · {dlv.tamanho} · {dlv.entregueEm}
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            triggerSimulatedDownload(
                              dlv.arquivoNome,
                              `EAGLE Digital House · ${dlv.titulo}`
                            );
                            showToast(`Baixando ${dlv.arquivoNome}`);
                          }}
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar</span>
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Galeria de Projetos igual ProjectsView.tsx
    const filteredProjects = clientProjects.filter(
      (p) =>
        !search.trim() ||
        p.nome.toLowerCase().includes(search.toLowerCase()) ||
        p.categoria.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className="max-w-[1380px] mx-auto space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map((proj) => {
            const lead = getMember(proj.liderEagleId);
            const cover = clientPieces.find(
              (pc) => pc.projectId === proj.id && pc.previewUrl
            )?.previewUrl;
            const doneStages = proj.etapas.filter((s) => s.status === 'concluida').length;
            const activeStages = proj.etapas.filter((s) => s.status === 'em_andamento').length;
            const nextStages = Math.max(0, proj.etapas.length - doneStages - activeStages);

            return (
              <BentoCard
                key={proj.id}
                onClick={() => {
                  setSelectedProjectId(proj.id);
                  setProjectFolderTab('etapas');
                }}
                className="overflow-hidden flex flex-col justify-between group"
              >
                {/* Capa + pill vidro fosco exatamente como ProjectsView */}
                <div className="relative h-[138px] overflow-hidden bg-[#ebeff3] dark:bg-[#10141b]">
                  {cover ? (
                    <>
                      <img
                        src={cover}
                        alt={proj.nome}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-[#0f1115]/45 via-transparent to-[#0f1115]/15"
                        aria-hidden="true"
                      />
                    </>
                  ) : (
                    <div className="w-full h-full bg-[#e7eff2] dark:bg-[#141922] flex items-center px-5">
                      <span className="text-[28px] font-semibold tracking-[-0.04em] text-[#163744]/22 dark:text-[#9fdce6]/20">
                        {activeClient.iniciais}
                      </span>
                    </div>
                  )}

                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] backdrop-blur-md backdrop-saturate-150 bg-white/68 dark:bg-[#141922]/70 border border-white/75 dark:border-white/15 text-[11px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                      <Folder className="w-3 h-3 text-[#163744] dark:text-[#9fdce6] shrink-0" />
                      <span>{proj.categoria}</span>
                    </span>

                    <span className="w-8 h-8 rounded-full backdrop-blur-md backdrop-saturate-150 bg-white/72 dark:bg-[#141922]/70 border border-white/75 dark:border-white/15 text-[#0f1115]/80 dark:text-[#f2f4f7]/85 flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105">
                      <ArrowUpRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>

                {/* Corpo do card */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <StatusIndicator
                          label={proj.faseAtual}
                          dotClass={
                            proj.progressoPct === 100
                              ? 'bg-[#15803d] dark:bg-[#4ade80]'
                              : proj.esperandoCliente
                                ? 'bg-[#b45309] dark:bg-[#fbbf24]'
                                : 'bg-[#163744] dark:bg-[#9fdce6]'
                          }
                          textClass={
                            proj.progressoPct === 100
                              ? 'text-[#166534] dark:text-[#4ade80]'
                              : proj.esperandoCliente
                                ? 'text-[#92400e] dark:text-[#fbbf24]'
                                : 'text-[#163744] dark:text-[#9fdce6]'
                          }
                          live={proj.progressoPct < 100}
                        />
                        <h3 className="text-[15.5px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7] leading-snug group-hover:text-[#163744] dark:group-hover:text-[#9fdce6] transition-colors">
                          {proj.nome}
                        </h3>
                      </div>

                      <MicroRing
                        value={proj.progressoPct}
                        size={40}
                        strokeWidth={3.5}
                        label={`${proj.progressoPct}%`}
                      />
                    </div>

                    <p className="text-[12.5px] text-[#0f1115]/58 dark:text-[#f2f4f7]/58 leading-relaxed line-clamp-2">
                      {proj.ultimoUpdate}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <ProportionBar
                      heightClass="h-1.5"
                      segments={[
                        { key: 'done', value: doneStages, colorClass: 'bg-[#15803d] dark:bg-[#4ade80]' },
                        { key: 'now', value: activeStages, colorClass: 'bg-[#163744] dark:bg-[#9fdce6]' },
                        { key: 'next', value: nextStages, colorClass: 'bg-[#dfe5ec] dark:bg-[#232934]' },
                      ]}
                    />

                    <div className="pt-3 border-t border-[#0f1115]/6 dark:border-white/8 flex items-center justify-between gap-2 text-[11.5px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <MemberAvatar member={lead} size="xs" />
                        <span className="text-[#0f1115]/58 dark:text-[#f2f4f7]/58 truncate">
                          {lead?.nome.split(' ')[0]}
                        </span>
                      </div>
                      <span className="font-medium text-[#163744] dark:text-[#9fdce6] tabular-nums shrink-0">
                        {proj.previsaoEntrega}
                      </span>
                    </div>
                  </div>
                </div>
              </BentoCard>
            );
          })}
        </div>
      </div>
    );
  };

  /* ======================================================================== */
  /* APROVAÇÕES (ESPELHADO EM DECISIONSVIEW.TSX)                              */
  /* ======================================================================== */
  const renderApprovals = () => {
    const filtered = clientPieces.filter((pc) => {
      if (approvalFilter !== 'todas' && pc.status !== approvalFilter) return false;
      if (approvalProjectFilter !== 'todos' && pc.projectId !== approvalProjectFilter)
        return false;
      if (
        search.trim() &&
        !pc.titulo.toLowerCase().includes(search.toLowerCase()) &&
        !pc.descricao.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });

    return (
      <div className="max-w-[1380px] mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-[#0f1115]/58 dark:text-[#f2f4f7]/58">
            Clique em qualquer peça para marcar pontos direto na arte, acompanhar ajustes ou aprovar.
          </p>
          <div className="w-full sm:w-64">
            <CustomSelect
              value={approvalProjectFilter}
              onChange={setApprovalProjectFilter}
              options={[
                { value: 'todos', label: 'Todos os projetos' },
                ...clientProjects.map((p) => ({ value: p.id, label: p.nome })),
              ]}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="Nenhuma peça encontrada com esse filtro." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filtered.map((piece) => {
              const proj = clientProjects.find((p) => p.id === piece.projectId);
              const lead = proj ? getMember(proj.liderEagleId) : undefined;
              const isPending = piece.status === 'aguardando_aprovacao';
              const isAdjust = piece.status === 'ajustes_solicitados';

              return (
                <BentoCard key={piece.id} className="w-full flex flex-col overflow-hidden">
                  {/* Cabeçalho igual DecisionsView */}
                  <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MemberAvatar member={lead} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#0f1115] dark:text-[#f2f4f7] truncate">
                          <span>{lead?.nome ?? 'Equipe EAGLE'}</span>
                          <span className="text-[#0f1115]/35 dark:text-white/35">·</span>
                          <span className="text-[#163744] dark:text-[#9fdce6] truncate">
                            {proj?.nome}
                          </span>
                        </div>
                        <div className="text-[11.5px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 tabular-nums">
                          {piece.categoria} · {piece.enviadaEm}
                        </div>
                      </div>
                    </div>

                    <StatusIndicator
                      label={
                        isPending
                          ? 'Aguardando aprovação'
                          : isAdjust
                            ? 'Ajustes solicitados'
                            : 'Aprovada'
                      }
                      dotClass={
                        isPending
                          ? 'bg-[#b45309] dark:bg-[#fbbf24]'
                          : isAdjust
                            ? 'bg-[#163744] dark:bg-[#9fdce6]'
                            : 'bg-[#15803d] dark:bg-[#4ade80]'
                      }
                      textClass={
                        isPending
                          ? 'text-[#92400e] dark:text-[#fbbf24]'
                          : isAdjust
                            ? 'text-[#163744] dark:text-[#9fdce6]'
                            : 'text-[#166534] dark:text-[#4ade80]'
                      }
                    />
                  </div>

                  {/* Prévia em destaque igual DecisionsView */}
                  <div className="px-5">
                    <button
                      type="button"
                      onClick={() => setProofingPieceId(piece.id)}
                      className="relative w-full h-48 rounded-[12px] overflow-hidden bg-[#ebeff3] dark:bg-[#10141b] group cursor-pointer block text-left"
                    >
                      {piece.previewUrl && (
                        <img
                          src={piece.previewUrl}
                          alt={piece.titulo}
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 via-black/35 to-transparent flex items-end justify-between p-3.5">
                        <div className="min-w-0">
                          <div className="text-[12.5px] font-medium text-white truncate flex items-center gap-1.5">
                            {piece.isVideo && <Film className="w-3.5 h-3.5 text-[#9fdce6]" />}
                            <span>{piece.versao} · {piece.formato}</span>
                          </div>
                          <div className="text-[11px] text-white/75 tabular-nums">
                            {piece.dimensaoOuDuracao ?? ''}
                            {piece.pins.length > 0
                              ? ` · ${piece.pins.length} pontos marcados`
                              : ''}
                          </div>
                        </div>
                        <span className="w-7.5 h-7.5 rounded-[8px] bg-white/18 backdrop-blur-xs text-white inline-flex items-center justify-center shrink-0">
                          <Maximize2 className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </button>
                  </div>

                  <div className="px-5 pt-3.5 pb-4 flex-1 space-y-1">
                    <h3 className="text-[15.5px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7] leading-snug">
                      {piece.titulo}
                    </h3>
                    <p className="text-[12.5px] text-[#0f1115]/58 dark:text-[#f2f4f7]/58 line-clamp-2 leading-relaxed">
                      {piece.descricao}
                    </p>
                  </div>

                  {/* Barra inferior limpa igual DecisionsView */}
                  <div className="px-5 py-3 border-t border-[#0f1115]/7 dark:border-white/8 bg-[#f2f4f7]/45 dark:bg-[#11141a] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {activeRole === 'responsavel' && piece.status !== 'aprovada' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleUpdatePieceStatus(piece.id, 'aprovada')}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Aprovar</span>
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setProofingPieceId(piece.id)}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>
                          {piece.pins.length > 0
                            ? `Abrir peça (${piece.pins.length})`
                            : 'Marcar / revisar'}
                        </span>
                      </Button>
                    </div>
                  </div>
                </BentoCard>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  /* ======================================================================== */
  /* ENTREGAS — TABELA ARQUITETÔNICA DE ARQUIVOS FINAIS                       */
  /* ======================================================================== */
  const renderDeliverables = () => {
    const filtered = clientDeliverables.filter((dlv) => {
      if (deliverableCategory !== 'Todas' && dlv.categoria !== deliverableCategory)
        return false;
      if (
        search.trim() &&
        !dlv.titulo.toLowerCase().includes(search.toLowerCase()) &&
        !dlv.arquivoNome.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });

    return (
      <div className="max-w-[1380px] mx-auto space-y-4">
        {filtered.length === 0 ? (
          <EmptyState title="Nenhuma entrega encontrada nessa categoria." />
        ) : (
          <BentoCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#0f1115]/8 dark:border-[#f2f4f7]/8 text-[11.5px] font-medium text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                    <th className="py-3.5 pl-5 pr-4 font-medium">Arquivo</th>
                    <th className="py-3.5 px-4 font-medium">Projeto</th>
                    <th className="py-3.5 px-4 font-medium">Categoria</th>
                    <th className="py-3.5 px-4 font-medium">Versão</th>
                    <th className="py-3.5 px-4 font-medium">Tamanho</th>
                    <th className="py-3.5 px-4 font-medium">Entrega</th>
                    <th className="py-3.5 pl-4 pr-5 font-medium text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0f1115]/6 dark:divide-[#f2f4f7]/6 text-[13.5px]">
                  {filtered.map((dlv) => {
                    const proj = clientProjects.find((p) => p.id === dlv.projectId);
                    return (
                      <tr
                        key={dlv.id}
                        className="hover:bg-[#f6f8fa] dark:hover:bg-[#191d26] transition-colors"
                      >
                        <td className="py-3.5 pl-5 pr-4 min-w-[260px]">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-9 rounded-[8px] overflow-hidden bg-[#ebeff3] dark:bg-[#10141b] shrink-0 flex items-center justify-center">
                              {dlv.previewUrl ? (
                                <img
                                  src={dlv.previewUrl}
                                  alt={dlv.titulo}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <FileText className="w-4 h-4 text-[#163744] dark:text-[#9fdce6]" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                                {dlv.titulo}
                              </div>
                              <div className="text-[11.5px] font-mono text-[#0f1115]/48 dark:text-[#f2f4f7]/48 truncate">
                                {dlv.arquivoNome}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-[12.5px] text-[#0f1115]/68 dark:text-[#f2f4f7]/68 min-w-[160px]">
                          {proj?.nome ?? '—'}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Badge variant="petroleo" size="xs">
                            {dlv.categoria}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap tabular-nums text-[12.5px] text-[#0f1115]/68 dark:text-[#f2f4f7]/68">
                          {dlv.versao} · {dlv.formato}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap tabular-nums text-[12.5px] text-[#0f1115]/58 dark:text-[#f2f4f7]/58">
                          {dlv.tamanho}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap tabular-nums text-[12.5px] text-[#0f1115]/58 dark:text-[#f2f4f7]/58">
                          {dlv.entregueEm}
                        </td>

                        <td className="py-3.5 pl-4 pr-5 text-right whitespace-nowrap">
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => {
                              triggerSimulatedDownload(
                                dlv.arquivoNome,
                                `EAGLE Digital House · ${dlv.titulo} (${dlv.versao})`
                              );
                              showToast(`Baixando ${dlv.arquivoNome}`);
                            }}
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Baixar</span>
                          </Button>
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
  };

  /* ======================================================================== */
  /* PEDIDOS — TABELA DE SOLICITAÇÕES COM BRIEFING EXPANSÍVEL                 */
  /* ======================================================================== */
  const renderRequests = () => {
    const stepMeta: Record<
      PortalRequest['status'],
      { label: string; dotClass: string; textClass: string }
    > = {
      em_analise: {
        label: 'Em análise',
        dotClass: 'bg-[#b45309] dark:bg-[#fbbf24]',
        textClass: 'text-[#92400e] dark:text-[#fbbf24]',
      },
      em_producao: {
        label: 'Em criação',
        dotClass: 'bg-[#163744] dark:bg-[#9fdce6]',
        textClass: 'text-[#163744] dark:text-[#9fdce6]',
      },
      pronto_revisao: {
        label: 'Pronto para revisar',
        dotClass: 'bg-[#15803d] dark:bg-[#4ade80]',
        textClass: 'text-[#166534] dark:text-[#4ade80]',
      },
    };

    const filtered = clientRequests.filter(
      (r) =>
        !search.trim() ||
        r.titulo.toLowerCase().includes(search.toLowerCase()) ||
        r.briefing.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className="max-w-[1380px] mx-auto">
        {filtered.length === 0 ? (
          <EmptyState
            title="Nenhum pedido aberto ainda."
            actionLabel="Fazer primeiro pedido"
            onAction={() => setNewRequestOpen(true)}
          />
        ) : (
          <BentoCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#0f1115]/8 dark:border-[#f2f4f7]/8 text-[11.5px] font-medium text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                    <th className="py-3.5 pl-5 pr-4 font-medium">Pedido</th>
                    <th className="py-3.5 px-4 font-medium">Tipo</th>
                    <th className="py-3.5 px-4 font-medium">Projeto</th>
                    <th className="py-3.5 px-4 font-medium">Solicitante</th>
                    <th className="py-3.5 px-4 font-medium">Prazo</th>
                    <th className="py-3.5 pl-4 pr-5 font-medium text-right">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0f1115]/6 dark:divide-[#f2f4f7]/6 text-[13.5px]">
                  {filtered.map((req) => {
                    const proj = clientProjects.find((p) => p.id === req.projectId);
                    const meta = stepMeta[req.status];
                    const isOpen = expandedRequestId === req.id;

                    return (
                      <Fragment key={req.id}>
                        <tr
                          onClick={() =>
                            setExpandedRequestId((prev) =>
                              prev === req.id ? null : req.id
                            )
                          }
                          className="group hover:bg-[#f6f8fa] dark:hover:bg-[#191d26] transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 pl-5 pr-4 min-w-[260px]">
                            <div className="flex items-center gap-2 font-semibold text-[#0f1115] dark:text-[#f2f4f7] group-hover:text-[#163744] dark:group-hover:text-[#9fdce6] transition-colors">
                              <span>{req.titulo}</span>
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-[#0f1115]/40 dark:text-white/40 shrink-0 transition-transform duration-200 ${
                                  isOpen ? 'rotate-180' : ''
                                }`}
                              />
                            </div>
                            <div className="text-[12px] text-[#0f1115]/54 dark:text-[#f2f4f7]/54 line-clamp-1 mt-0.5">
                              {req.briefing}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <Badge variant="petroleo" size="xs">
                              {req.tipo}
                            </Badge>
                          </td>

                          <td className="py-3.5 px-4 text-[12.5px] text-[#0f1115]/68 dark:text-[#f2f4f7]/68 min-w-[150px]">
                            {proj?.nome ?? 'Geral'}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap text-[12.5px] text-[#0f1115]/68 dark:text-[#f2f4f7]/68">
                            <div>{req.solicitanteNome}</div>
                            <div className="text-[11px] text-[#0f1115]/45 dark:text-[#f2f4f7]/45 tabular-nums">
                              {req.criadoEm}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap tabular-nums text-[12.5px] text-[#0f1115]/68 dark:text-[#f2f4f7]/68">
                            {req.prazoDesejado}
                          </td>

                          <td className="py-3.5 pl-4 pr-5 whitespace-nowrap text-right">
                            <div className="inline-flex justify-end">
                              <StatusIndicator
                                label={meta.label}
                                dotClass={meta.dotClass}
                                textClass={meta.textClass}
                                live={req.status === 'em_producao'}
                              />
                            </div>
                          </td>
                        </tr>

                        {isOpen && (
                          <tr className="bg-[#f8fafc] dark:bg-[#10141b]">
                            <td colSpan={6} className="px-5 py-3.5">
                              <div className="text-[11px] font-semibold text-[#0f1115]/48 dark:text-[#f2f4f7]/48 mb-1">
                                Briefing completo
                              </div>
                              <p className="text-[13px] text-[#0f1115]/78 dark:text-[#f2f4f7]/78 leading-relaxed max-w-3xl">
                                {req.briefing}
                              </p>
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
  };


  /* ======================================================================== */
  /* CONVERSAS — RAIL ESCURO NOITE ESQUERDO (IGUAL CLIENTSVIEW) + CHAT        */
  /* ======================================================================== */
  const renderConversations = () => {
    if (clientConversations.length === 0) {
      return <EmptyState title="Nenhuma conversa iniciada ainda." />;
    }

    const activeConvProject = clientProjects.find(
      (p) => p.id === activeConversation?.projectId
    );
    const activeConvLead = activeConversation
      ? getMember(activeConversation.responsavelEagleId)
      : undefined;

    return (
      <div className="max-w-[1380px] mx-auto flex flex-col lg:flex-row gap-4 h-full min-h-[520px]">
        {/* Coluna esquerda escura estilo ClientsView */}
        <aside
          className={`w-full lg:w-[296px] shrink-0 rounded-[22px] bg-[#0f1115] dark:bg-[#0b0d11] text-[#f2f4f7] p-3.5 space-y-2.5 border border-[#0f1115]/10 dark:border-white/10 shadow-[0_18px_40px_rgba(15,17,21,0.12)] ${
            mobileThreadOpen ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="px-1 pb-1 flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-[#f2f4f7]/90">
              Canais por projeto ({clientConversations.length})
            </span>
          </div>

          <div className="space-y-2">
            {clientConversations.map((conv) => {
              const proj = clientProjects.find((p) => p.id === conv.projectId);
              const lead = getMember(conv.responsavelEagleId);
              const lastMsg = conv.mensagens[conv.mensagens.length - 1];
              const isSelected = conv.id === activeConversation?.id;

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`w-full rounded-[16px] p-3 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#9fdce6] text-[#0f1115] shadow-[0_8px_20px_rgba(159,220,230,0.22)]'
                      : 'bg-[#171b22] hover:bg-[#1e242e] text-[#f2f4f7] border border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MemberAvatar member={lead} size="xs" />
                      <span className="text-[13px] font-semibold truncate">
                        {proj?.nome ?? 'Atendimento geral'}
                      </span>
                    </div>
                    {conv.naoLidas > 0 && (
                      <span
                        className={`px-1.5 py-0.5 rounded-[6px] text-[10px] font-bold tabular-nums shrink-0 ${
                          isSelected
                            ? 'bg-[#163744] text-white'
                            : 'bg-[#9fdce6] text-[#0f1115]'
                        }`}
                      >
                        {conv.naoLidas}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-[11.5px] truncate mt-1.5 ${
                      isSelected ? 'text-[#0f1115]/70' : 'text-[#f2f4f7]/55'
                    }`}
                  >
                    {lastMsg?.remetenteNome}: {lastMsg?.texto}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Thread ativa em folha branca */}
        <div
          className={`flex-1 min-w-0 rounded-[22px] bg-white dark:bg-[#15181f] border border-[#0f1115]/8 dark:border-white/10 shadow-[0_6px_24px_rgba(15,17,21,0.04)] flex flex-col justify-between overflow-hidden ${
            mobileThreadOpen ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {activeConversation && (
            <>
              <div className="px-5 py-3.5 border-b border-[#0f1115]/8 dark:border-white/8 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobileThreadOpen(false)}
                    aria-label="Voltar para canais"
                    className="lg:hidden eagle-btn-secondary w-9 h-9 inline-flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <MemberAvatar member={activeConvLead} size="sm" />
                  <div className="min-w-0">
                    <h3 className="text-[14.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                      {activeConvProject?.nome}
                    </h3>
                    <p className="text-[11.5px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 truncate">
                      Com {activeConvLead?.nome ?? 'Equipe EAGLE'} · {activeConvLead?.cargo}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-5 space-y-3 overflow-y-auto max-h-[460px]">
                {activeConversation.mensagens.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.isEagle ? 'items-start' : 'items-end'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[74%] rounded-[14px] px-4 py-3 border ${
                        msg.isEagle
                          ? 'bg-[#f6f8fa] dark:bg-[#10141b] border-[#0f1115]/8 dark:border-white/8 text-[#0f1115] dark:text-[#f2f4f7]'
                          : 'bg-[#163744] dark:bg-[#9fdce6] border-transparent text-white dark:text-[#0f1115]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span
                          className={`text-[11.5px] font-semibold ${
                            msg.isEagle
                              ? 'text-[#163744] dark:text-[#9fdce6]'
                              : 'text-white/85 dark:text-[#0f1115]/80'
                          }`}
                        >
                          {msg.remetenteNome} · {msg.remetenteCargo}
                        </span>
                        <span
                          className={`text-[10.5px] tabular-nums ${
                            msg.isEagle
                              ? 'text-[#0f1115]/45 dark:text-white/45'
                              : 'text-white/65 dark:text-[#0f1115]/60'
                          }`}
                        >
                          {msg.horario}
                        </span>
                      </div>
                      <p className="text-[13.5px] leading-relaxed">{msg.texto}</p>

                      {msg.anexoNome && (
                        <button
                          type="button"
                          onClick={() => {
                            triggerSimulatedDownload(
                              msg.anexoNome!,
                              `Anexo da conversa: ${msg.anexoNome}`
                            );
                            showToast(`Baixando ${msg.anexoNome}`);
                          }}
                          className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11.5px] font-medium cursor-pointer ${
                            msg.isEagle
                              ? 'bg-white dark:bg-[#15181f] border border-[#0f1115]/10 text-[#0f1115] dark:text-[#f2f4f7]'
                              : 'bg-white/15 text-white'
                          }`}
                        >
                          <Paperclip className="w-3 h-3" />
                          <span>{msg.anexoNome}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <form
                onSubmit={handleSendChatMessage}
                className="p-3.5 border-t border-[#0f1115]/8 dark:border-white/8 bg-[#f2f4f7]/45 dark:bg-[#11141a] flex items-center gap-2.5"
              >
                <input
                  type="text"
                  value={chatDraft}
                  onChange={(e) => setChatDraft(e.target.value)}
                  placeholder={`Escrever mensagem sobre ${activeConvProject?.nome ?? 'este projeto'}...`}
                  className="eagle-input flex-1 h-10 px-3.5 text-[13.5px]"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={!chatDraft.trim()}
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Enviar</span>
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  };

  /* ======================================================================== */
  /* RESULTADOS — HATCHEDACTIVITYBARS + SPLINETRENDCHART DO EAGLE OS          */
  /* ======================================================================== */
  const renderResults = () => {
    if (!clientResults || !clientResults.temDados) {
      return (
        <div className="max-w-3xl mx-auto pt-4">
          <EmptyState
            title={
              clientResults?.mensagemSemDados ??
              'Os indicadores de alcance e engajamento aparecerão aqui assim que a campanha entrar no ar.'
            }
          />
        </div>
      );
    }

    const barData = clientResults.serieSemanal.map((s, idx, arr) => ({
      key: s.semana,
      label: s.semana,
      value: s.alcance,
      highlight: idx === arr.length - 1,
      callout:
        idx === arr.length - 1
          ? `${Math.round(s.alcance / 1000)}k`
          : undefined,
    }));

    return (
      <div className="max-w-[1380px] mx-auto space-y-5">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Bloco esquerdo: KPIs em uma folha única + barras hachuradas */}
          <BentoCard className="xl:col-span-6 p-5 flex flex-col justify-between gap-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                  Alcance semanal
                </h2>
                <p className="text-[12px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 mt-0.5">
                  {clientResults.periodoLabel}
                </p>
              </div>
              <Badge variant="success" size="sm">
                {clientResults.kpis[0]?.variacao}
              </Badge>
            </div>

            <HatchedActivityBars data={barData} />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#0f1115]/8 dark:border-white/8">
              {clientResults.kpis.map((kpi) => (
                <div key={kpi.label}>
                  <div className="text-[11px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 truncate">
                    {kpi.label}
                  </div>
                  <div className="mt-1 text-[17px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                    {kpi.valor}
                  </div>
                </div>
              ))}
            </div>
          </BentoCard>

          {/* Bloco direito: Tendência de engajamento + peças em destaque */}
          <BentoCard className="xl:col-span-6 p-5 flex flex-col justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                Interações e peças de maior retorno
              </h2>
              <p className="text-[12px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 mt-0.5">
                Evolução de engajamento por semana
              </p>
            </div>

            <SplineTrendChart
              labels={clientResults.serieSemanal.map((s) => s.semana)}
              values={clientResults.serieSemanal.map((s) => s.engajamento)}
              peakIndex={clientResults.serieSemanal.length - 1}
              peakCallout={
                clientResults.serieSemanal[
                  clientResults.serieSemanal.length - 1
                ]?.engajamento.toLocaleString('pt-BR') ?? ''
              }
            />

            <div className="divide-y divide-[#0f1115]/6 dark:divide-white/8 border-t border-[#0f1115]/8 dark:border-white/8">
              {clientResults.destaques.map((item) => (
                <div
                  key={item.titulo}
                  className="py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                      {item.titulo}
                    </div>
                    <div className="text-[11.5px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50">
                      {item.canal}
                    </div>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    <div className="text-[13px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                      {item.alcance}
                    </div>
                    <div className="text-[11px] font-medium text-[#166534] dark:text-[#4ade80]">
                      {item.taxaEngajamento} engaj.
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </BentoCard>
        </div>
      </div>
    );
  };

  /* ======================================================================== */
  /* CONFIGURAÇÃO DO PAGEHEADER NATIVO POR SEÇÃO                              */
  /* ======================================================================== */
  const currentNavMeta = ALL_NAV_ITEMS.find((i) => i.id === activeSection);
  const pageTitle = currentNavMeta?.label ?? 'Portal do Cliente';

  const headerFilters = (
    <div className="flex flex-wrap items-center gap-2">
      {activeSection === 'aprovacoes' && (
        <SegmentedControl
          layoutId="portal-approvals-filter"
          ariaLabel="Filtrar peças"
          value={approvalFilter}
          onChange={setApprovalFilter}
          options={[
            { id: 'todas', label: 'Todas' },
            { id: 'aguardando_aprovacao', label: `Aguardando (${pendingApprovalsCount})` },
            { id: 'ajustes_solicitados', label: 'Ajustes' },
            { id: 'aprovada', label: 'Aprovadas' },
          ]}
        />
      )}

      {activeSection === 'entregas' && (
        <SegmentedControl
          layoutId="portal-deliverables-filter"
          ariaLabel="Categoria de entregas"
          value={deliverableCategory}
          onChange={setDeliverableCategory}
          options={[
            { id: 'Todas', label: 'Todas' },
            { id: 'Identidade', label: 'Identidade' },
            { id: 'Posts & Vídeo', label: 'Posts & Vídeo' },
            { id: 'Site & Tech', label: 'Site & Tech' },
            { id: 'Materiais', label: 'Materiais' },
          ]}
        />
      )}

      {activeSection === 'propostas' && (
        <SegmentedControl
          layoutId="portal-proposals-filter"
          ariaLabel="Filtrar propostas"
          value={proposalFilter}
          onChange={setProposalFilter}
          options={[
            { id: 'todas', label: 'Todas' },
            { id: 'pendentes', label: `Aguardando (${pendingProposalsCount})` },
            { id: 'aprovadas', label: 'Aprovadas' },
          ]}
        />
      )}

      {activeSection === 'contratos' && (
        <SegmentedControl
          layoutId="portal-contracts-filter"
          ariaLabel="Filtrar contratos"
          value={contractFilter}
          onChange={setContractFilter}
          options={[
            { id: 'todos', label: 'Todos' },
            { id: 'pendentes', label: `Aguardando (${pendingContractsCount})` },
            { id: 'assinados', label: 'Assinados' },
          ]}
        />
      )}

      {activeSection === 'financeiro' && (
        <SegmentedControl
          layoutId="portal-finance-filter"
          ariaLabel="Filtrar faturas"
          value={financeFilter}
          onChange={setFinanceFilter}
          options={[
            { id: 'todas', label: 'Todas' },
            { id: 'abertas', label: `Em aberto (${openInvoicesCount})` },
            { id: 'pagas', label: 'Pagas & Notas' },
          ]}
        />
      )}

      {demoSwitcherSlot}
    </div>
  );

  const showSearchInHeader =
    activeSection === 'projetos' ||
    activeSection === 'aprovacoes' ||
    activeSection === 'entregas' ||
    activeSection === 'pedidos';

  const primaryHeaderAction =
    activeRole !== 'financeiro' &&
    (activeSection === 'inicio' ||
      activeSection === 'pedidos' ||
      activeSection === 'projetos')
      ? {
          label: 'Novo pedido',
          onClick: () => {
            setNewRequestProjectId(activeProject?.id ?? clientProjects[0]?.id);
            setNewRequestOpen(true);
          },
        }
      : undefined;

  const renderContextSheet = (isMobile = false) => (
    <aside
      className={`h-full flex flex-col select-none overflow-hidden ${
        isMobile
          ? 'w-[272px] bg-white dark:bg-[#15181f] border-r border-[#0f1115]/10 dark:border-white/10'
          : 'w-[228px] eagle-sheet'
      }`}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#0f1115]/6 dark:border-white/6">
        <button
          type="button"
          onClick={() => navigateTo('inicio')}
          className="text-left focus:outline-none cursor-pointer flex items-center gap-2"
        >
          <BrandMark />
        </button>
        {isMobile ? (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fechar menu"
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#0f1115]/60 dark:text-[#f2f4f7]/60 hover:bg-[#0f1115]/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <Badge variant="petroleo" size="xs">
            Cliente
          </Badge>
        )}
      </div>

      {/* Cartão compacto da conta */}
      <div className="px-3 pt-3 pb-1">
        <div className="rounded-[11px] bg-[#f2f4f7] dark:bg-[#1b2029] border border-[#0f1115]/6 dark:border-white/8 px-2.5 py-2 flex items-center gap-2.5">
          <span
            style={{ backgroundColor: activeClient.corMarca }}
            className="w-7 h-7 rounded-[8px] text-white text-[10.5px] font-bold flex items-center justify-center shrink-0"
          >
            {activeClient.iniciais}
          </span>
          <div className="min-w-0">
            <div className="text-[12.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
              {activeClient.nome}
            </div>
            <div className="text-[10.5px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 truncate">
              {activeUser.nome} · {ROLE_LABELS[activeRole]}
            </div>
          </div>
        </div>
      </div>

      {/* Grupos de navegação idênticos ao Sidebar do Eagle OS */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-2.5 space-y-4">
        {navGroups.map((group) => (
          <div key={group.title}>
            <div className="px-2.5 pb-1 text-[11px] font-medium text-[#0f1115]/42 dark:text-[#f2f4f7]/42">
              {group.title}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                const badgeCount = getBadgeForNav(item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => navigateTo(item.id)}
                      className={`relative w-full flex items-center justify-between gap-2 px-2.5 h-8 rounded-[9px] text-[13px] transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'text-[#163744] dark:text-[#9fdce6] font-semibold'
                          : 'text-[#0f1115]/72 dark:text-[#f2f4f7]/72 hover:text-[#0f1115] dark:hover:text-[#f2f4f7] hover:bg-[#0f1115]/4 dark:hover:bg-[#f2f4f7]/5'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId={isMobile ? 'portal-pill-mob' : 'portal-pill-desk'}
                          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                          className="absolute inset-0 rounded-[9px] bg-[#ebeff3] dark:bg-[#1e2530] border border-[#0f1115]/7 dark:border-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                          aria-hidden="true"
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-3.5 h-3.5 shrink-0 ${
                            active
                              ? 'text-[#163744] dark:text-[#9fdce6]'
                              : 'text-[#0f1115]/45 dark:text-[#f2f4f7]/45'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {badgeCount !== undefined && (
                        <span className="relative z-10 text-[11px] font-semibold tabular-nums text-[#b45309] dark:text-[#fbbf24]">
                          {badgeCount}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Rodapé igual Sidebar */}
      <div className="p-3 border-t border-[#0f1115]/6 dark:border-white/6 space-y-2.5 bg-[#f2f4f7]/45 dark:bg-[#11141a]">
        <button
          type="button"
          onClick={onBackToStudio}
          className="eagle-btn-secondary w-full h-8.5 px-2.5 text-[12px] font-semibold flex items-center justify-between gap-2 cursor-pointer"
        >
          <span className="inline-flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5 text-[#163744] dark:text-[#9fdce6]" />
            <span>Voltar ao Eagle OS</span>
          </span>
          <span className="text-[10.5px] opacity-55">Studio</span>
        </button>

        <div
          className="eagle-segmented grid grid-cols-3 gap-0.5 w-full"
          role="group"
          aria-label="Tema da interface"
        >
          {(
            [
              { id: 'light', label: 'Claro', icon: Sun },
              { id: 'system', label: 'Auto', icon: Monitor },
              { id: 'dark', label: 'Escuro', icon: Moon },
            ] as {
              id: ThemePreference;
              label: string;
              icon: React.ComponentType<{ className?: string }>;
            }[]
          ).map((opt) => {
            const Icon = opt.icon;
            const active = themePreference === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setThemePreference(opt.id)}
                className={`relative h-6.5 rounded-[7px] text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                  active
                    ? 'text-[#0f1115] dark:text-[#f2f4f7]'
                    : 'text-[#0f1115]/55 dark:text-[#f2f4f7]/55 hover:text-[#0f1115] dark:hover:text-[#f2f4f7]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId={isMobile ? 'portal-theme-mob' : 'portal-theme-desk'}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 rounded-[7px] bg-white dark:bg-[#252c38] border border-[#0f1115]/8 dark:border-white/10 shadow-2xs"
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-1">
                  <Icon className="w-3 h-3" />
                  <span>{opt.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );

  return (
    <div className="eagle-desk h-screen w-screen overflow-hidden flex p-2 sm:p-3 gap-3 text-[#0f1115] dark:text-[#f2f4f7]">
      {/* SIDEBAR ARQUITETÔNICO IDÊNTICO AO EAGLE OS (TRILHO PETRÓLEO + FOLHA CONTEXTUAL) */}
      <div className="hidden lg:flex h-full gap-3 shrink-0">
        <div className="w-[58px] h-full rounded-[20px] bg-[#163744] dark:bg-[#111c23] border border-[#163744]/20 dark:border-[#9fdce6]/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_24px_-6px_rgba(15,17,21,0.22)] flex flex-col items-center justify-between py-3.5 shrink-0">
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => navigateTo('inicio')}
              title="Portal do Cliente · EAGLE"
              className="cursor-pointer transition-transform active:scale-95"
            >
              <EagleEmblem className="w-9 h-9 bg-[#0f2933] dark:bg-[#163744] border border-white/15" />
            </button>

            <div className="w-6 h-px bg-white/12" aria-hidden="true" />

            <div className="flex flex-col items-center gap-1 overflow-y-auto no-scrollbar">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                const badgeCount = getBadgeForNav(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(item.id)}
                    title={item.label}
                    aria-label={item.label}
                    className={`relative w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                      active
                        ? 'bg-[#f2f4f7] text-[#163744] dark:bg-[#9fdce6] dark:text-[#0f1115] shadow-xs'
                        : 'text-[#f2f4f7]/65 hover:text-[#f2f4f7] hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {badgeCount !== undefined && !active && (
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#fbbf24]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onBackToStudio}
              title="Voltar ao Eagle OS"
              aria-label="Voltar ao Eagle OS"
              className="w-9.5 h-9.5 rounded-[11px] flex items-center justify-center text-[#9fdce6] bg-white/10 hover:bg-white/18 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={cycleTheme}
              title="Alternar tema"
              aria-label="Alternar tema"
              className="w-9.5 h-9.5 rounded-[11px] flex items-center justify-center text-[#f2f4f7]/65 hover:text-[#f2f4f7] hover:bg-white/10 transition-colors cursor-pointer"
            >
              {themePreference === 'light' ? (
                <Sun className="w-4 h-4" />
              ) : themePreference === 'dark' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Monitor className="w-4 h-4" />
              )}
            </button>

            <div
              title={`${activeUser.nome} · ${ROLE_LABELS[activeRole]}`}
              className="w-9 h-9 rounded-full bg-[#0f2933] border border-white/20 text-white text-[11.5px] font-semibold flex items-center justify-center"
            >
              {activeUser.iniciais}
            </div>
          </div>
        </div>

        {renderContextSheet(false)}
      </div>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-[#0f1115]/55 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 h-full">{renderContextSheet(true)}</div>
        </div>
      )}

      {/* FOLHA PRINCIPAL ELEVADA IDÊNTICA AO EAGLE OS */}
      <main className="flex-1 min-w-0 h-full flex flex-col eagle-sheet-canvas overflow-hidden">
        <PageHeader
          title={pageTitle}
          searchValue={showSearchInHeader ? search : undefined}
          onSearchChange={showSearchInHeader ? setSearch : undefined}
          searchPlaceholder="Buscar..."
          filters={headerFilters}
          primaryAction={primaryHeaderAction}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-7 pb-24 lg:pb-7">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${activeClient.id}-${activeRole}-${activeSection}-${selectedProjectId ?? 'list'}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeSection === 'inicio' && (
                <PortalHomeView
                  client={activeClient}
                  user={activeUser}
                  role={activeRole}
                  projects={clientProjects}
                  pieces={clientPieces}
                  deliverables={clientDeliverables}
                  requests={clientRequests}
                  conversations={clientConversations}
                  contracts={clientContracts}
                  invoices={clientInvoices}
                  results={clientResults}
                  getMember={getMember}
                  onNavigate={navigateTo}
                  onOpenProject={(projectId) => {
                    setSelectedProjectId(projectId);
                    setProjectFolderTab('etapas');
                    setActiveSection('projetos');
                  }}
                  onOpenProofing={(pieceId) => setProofingPieceId(pieceId)}
                  onQuickApprovePiece={(pieceId) =>
                    handleUpdatePieceStatus(pieceId, 'aprovada')
                  }
                  onOpenNewRequest={(projectId) => {
                    setNewRequestProjectId(projectId);
                    setNewRequestOpen(true);
                  }}
                  onOpenContract={(ctr) => setSigningContract(ctr)}
                  onOpenInvoice={(inv) => setPayingInvoice(inv)}
                  onOpenConversation={(convId) => {
                    handleSelectConversation(convId);
                    setActiveSection('conversas');
                  }}
                  onDownloadDeliverable={(dlv) => {
                    triggerSimulatedDownload(
                      dlv.arquivoNome,
                      `EAGLE Digital House · ${dlv.titulo}`
                    );
                    showToast(`Baixando ${dlv.arquivoNome}`);
                  }}
                />
              )}
              {activeSection === 'projetos' && renderProjects()}
              {activeSection === 'aprovacoes' && renderApprovals()}
              {activeSection === 'entregas' && renderDeliverables()}
              {activeSection === 'pedidos' && renderRequests()}
              {activeSection === 'marca' && (
                <PortalBrandView
                  client={activeClient}
                  brandKit={clientBrandKit}
                  copiedHex={copiedHex}
                  onCopyHex={handleCopyHex}
                  onOpenAddAsset={() => setAddAssetOpen(true)}
                  onDownloadAsset={(filename, content, toastText) => {
                    triggerSimulatedDownload(filename, content);
                    showToast(toastText);
                  }}
                />
              )}
              {activeSection === 'conversas' && renderConversations()}
              {activeSection === 'resultados' && renderResults()}
              {activeSection === 'propostas' && (
                <PortalProposalsView
                  client={activeClient}
                  proposals={clientProposals}
                  filter={proposalFilter}
                  onReviewAndApprove={(prop) => setSigningContract(prop)}
                  onDownloadProposal={(prop) => {
                    triggerSimulatedDownload(
                      `Proposta_${prop.id}.pdf`,
                      `${prop.titulo}\nCliente: ${activeClient.nome}\nEscopo: ${prop.escopoResumo}\nCondição: ${prop.condicaoPagamento}`
                    );
                    showToast(`Baixando ${prop.titulo}`);
                  }}
                />
              )}
              {activeSection === 'contratos' && (
                <PortalContractsView
                  client={activeClient}
                  user={activeUser}
                  role={activeRole}
                  contracts={clientFormalContracts}
                  invoices={clientInvoices}
                  filter={contractFilter}
                  onSignContract={handleSignContract}
                  onDownloadContract={(ctr) => {
                    triggerSimulatedDownload(
                      `${ctr.codigo ?? `Contrato_${ctr.id}`}.pdf`,
                      `${ctr.titulo}\nCliente: ${activeClient.nome}\nEscopo: ${ctr.escopoResumo}\nCondição: ${ctr.condicaoPagamento}`
                    );
                    showToast(`Baixando ${ctr.titulo}`);
                  }}
                />
              )}
              {activeSection === 'financeiro' && (
                <PortalFinanceView
                  client={activeClient}
                  invoices={clientInvoices}
                  filter={financeFilter}
                  onPayInvoice={(inv) => setPayingInvoice(inv)}
                  onDownloadNfse={(inv) => {
                    if (!inv.notaFiscalArquivo) return;
                    triggerSimulatedDownload(
                      inv.notaFiscalArquivo,
                      `${inv.notaFiscalNumero} - ${activeClient.nome}`
                    );
                    showToast(`Baixando ${inv.notaFiscalArquivo}`);
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* BARRA INFERIOR MOBILE (Polegar, >= 44px de alvo) */}
      <nav
        aria-label="Menu rápido no celular"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#15181f]/95 backdrop-blur-md border-t border-[#0f1115]/10 dark:border-white/10 px-2 py-1.5 flex items-center justify-around"
      >
        {mobilePrimaryTabs.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          const badgeCount = getBadgeForNav(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigateTo(item.id)}
              className={`relative min-h-[44px] min-w-[56px] px-2 rounded-[10px] flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                active
                  ? 'text-[#163744] dark:text-[#9fdce6] font-semibold'
                  : 'text-[#0f1115]/58 dark:text-[#f2f4f7]/58'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              <span className="text-[10.5px] leading-none">{item.shortLabel}</span>
              {badgeCount !== undefined && (
                <span className="absolute top-1 right-2.5 w-4 h-4 rounded-full bg-[#163744] text-white dark:bg-[#9fdce6] dark:text-[#0f1115] text-[9.5px] font-bold flex items-center justify-center tabular-nums">
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}

        {mobileOverflowTabs.length > 0 && (
          <button
            type="button"
            onClick={() => setMobileMoreOpen((o) => !o)}
            className={`min-h-[44px] min-w-[56px] px-2 rounded-[10px] flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              mobileOverflowTabs.some((t) => t.id === activeSection) || mobileMoreOpen
                ? 'text-[#163744] dark:text-[#9fdce6] font-semibold'
                : 'text-[#0f1115]/58 dark:text-[#f2f4f7]/58'
            }`}
          >
            <MoreHorizontal className="w-4.5 h-4.5" />
            <span className="text-[10.5px] leading-none">Mais</span>
          </button>
        )}
      </nav>

      {/* SHEET MOBILE PARA OPÇÕES RESTANTES */}
      <AnimatePresence>
        {mobileMoreOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-[#0f1115]/55 flex items-end"
            onClick={() => setMobileMoreOpen(false)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-white dark:bg-[#15181f] rounded-t-[20px] border-t border-[#0f1115]/10 dark:border-white/12 p-4 pb-6 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                  Mais áreas do Portal
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMoreOpen(false)}
                  aria-label="Fechar"
                  className="w-8 h-8 rounded-[9px] eagle-btn-secondary inline-flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {mobileOverflowTabs.map((item) => {
                  const Icon = item.icon;
                  const active = activeSection === item.id;
                  const badgeCount = getBadgeForNav(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigateTo(item.id)}
                      className={`min-h-[48px] px-3.5 rounded-[12px] border flex items-center justify-between gap-2 text-[13px] font-medium cursor-pointer ${
                        active
                          ? 'bg-[#163744] text-white border-[#163744] dark:bg-[#9fdce6] dark:text-[#0f1115]'
                          : 'bg-[#f2f4f7] dark:bg-[#1b2029] border-[#0f1115]/8 dark:border-white/10 text-[#0f1115] dark:text-[#f2f4f7]'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2 truncate">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {badgeCount !== undefined && (
                        <span className="px-1.5 py-0.5 rounded-[6px] bg-white/20 text-[10.5px] font-bold tabular-nums">
                          {badgeCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAIS INTERATIVOS */}
      <AnimatePresence>
        {proofingPiece && (
          <ProofingModal
            piece={proofingPiece}
            projectName={
              clientProjects.find((p) => p.id === proofingPiece.projectId)?.nome ??
              activeClient.nome
            }
            user={activeUser}
            role={activeRole}
            onClose={() => setProofingPieceId(null)}
            onAddPin={handleAddPin}
            onToggleResolvePin={handleToggleResolvePin}
            onUpdateStatus={handleUpdatePieceStatus}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {newRequestOpen && (
          <NewRequestModal
            projects={clientProjects}
            user={activeUser}
            clientName={activeClient.nome}
            getMember={getMember}
            defaultProjectId={newRequestProjectId}
            onClose={() => setNewRequestOpen(false)}
            onCreate={handleCreateRequest}
          />
        )}
      </AnimatePresence>

      {signingContract && activeRole !== 'solicitante' && (
        <SignContractModal
          contract={signingContract}
          user={activeUser}
          onClose={() => setSigningContract(null)}
          onSign={handleSignContract}
        />
      )}

      {payingInvoice && activeRole !== 'solicitante' && (
        <PayInvoiceModal
          invoice={payingInvoice}
          onClose={() => setPayingInvoice(null)}
          onConfirmPayment={handlePayInvoice}
        />
      )}

      {addAssetOpen && (
        <AddBrandAssetModal
          onClose={() => setAddAssetOpen(false)}
          onAdd={handleAddBrandAsset}
        />
      )}

      {/* TOAST DE CONFIRMAÇÃO */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.16 }}
            className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 px-4 py-2.5 rounded-[12px] bg-[#0f1115] dark:bg-[#f2f4f7] text-[#f2f4f7] dark:text-[#0f1115] text-[13px] font-medium shadow-[0_12px_32px_rgba(0,0,0,0.28)] flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-[#9fdce6] dark:text-[#163744] shrink-0" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
