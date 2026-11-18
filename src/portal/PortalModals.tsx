import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  FileCheck2,
  FileText,
  Film,
  FolderKanban,
  Globe,
  Megaphone,
  Palette,
  Paperclip,
  Plus,
  QrCode,
  Receipt,
  Send,
  ShieldCheck,
  Smartphone,
  Upload,
  X,
} from 'lucide-react';
import {
  ActionIconButton,
  Badge,
  Button,
  CustomSelect,
  SegmentedChoice,
} from '../components/DesignSystem';
import { MemberAvatar } from '../components/SharedUI';
import { Member } from '../types/eagle';
import {
  BrandAssetFile,
  PortalInvoice,
  PortalProject,
  PortalProposalContract,
  PortalRequest,
  PortalUser,
} from '../types/portal';
import { formatBRL, formatFullDate } from '../utils/formatters';

/* ========================================================================== */
/* MODAL: NOVO PEDIDO PARA A EQUIPE EAGLE (COMPOSITOR INTERATIVO)             */
/* ========================================================================== */

interface RequestTypeSpec {
  tipo: PortalRequest['tipo'];
  shortLabel: string;
  slaHint: string;
  icon: React.ComponentType<{ className?: string }>;
  presets: Array<{ titulo: string; briefing: string }>;
}

const REQUEST_TYPE_SPECS: RequestTypeSpec[] = [
  {
    tipo: 'Peça para redes',
    shortLabel: 'Redes Sociais',
    slaHint: '~48h úteis',
    icon: Smartphone,
    presets: [
      {
        titulo: 'Carrossel informativo para Instagram',
        briefing:
          'Sequência de 5 a 7 telas para feed 4:5 destacando o diferencial principal e chamada final para conversa.',
      },
      {
        titulo: 'Kit de 4 stories para fim de semana',
        briefing:
          'Stories verticais 9:16 com espaço reservado para figurinha de link e horário de atendimento.',
      },
    ],
  },
  {
    tipo: 'Material gráfico',
    shortLabel: 'Impresso & PDF',
    slaHint: '~3 dias úteis',
    icon: Palette,
    presets: [
      {
        titulo: 'Lâmina comercial em PDF',
        briefing:
          'Apresentação objetiva de 2 páginas para envio por WhatsApp e impressão leve pelo time comercial.',
      },
      {
        titulo: 'Sinalização ou peça para estande',
        briefing:
          'Arte final em alta resolução com sangria e fechamento padrão para gráfica.',
      },
    ],
  },
  {
    tipo: 'Ajuste no site',
    shortLabel: 'Site & Tech',
    slaHint: '~48h úteis',
    icon: Globe,
    presets: [
      {
        titulo: 'Atualização de seção na página',
        briefing:
          'Ajustar textos, imagens ou ordem de blocos mantendo o visual e a responsividade no celular.',
      },
      {
        titulo: 'Novo botão ou formulário de contato',
        briefing:
          'Incluir ponto de captura conectado ao WhatsApp ou CRM da equipe.',
      },
    ],
  },
  {
    tipo: 'Vídeo / Motion',
    shortLabel: 'Vídeo & Reels',
    slaHint: '~4 dias úteis',
    icon: Film,
    presets: [
      {
        titulo: 'Corte vertical Reels / Shorts (9:16)',
        briefing:
          'Edição dinâmica de até 30 segundos com legendas limpas e trilha alinhada à identidade da marca.',
      },
      {
        titulo: 'Vinheta animada de abertura',
        briefing:
          'Animação de 8 a 10 segundos com logo e assinatura institucional.',
      },
    ],
  },
  {
    tipo: 'Nova campanha',
    shortLabel: 'Campanha',
    slaHint: '~5 dias úteis',
    icon: Megaphone,
    presets: [
      {
        titulo: 'Pacote de campanha sazonal',
        briefing:
          'Desdobramento completo de conceito visual para feed, stories, anúncios pagos e e-mail.',
      },
      {
        titulo: 'Lançamento de novo produto ou ação',
        briefing:
          'Enxoval inicial de divulgação com foco em alcance, clareza da oferta e conversão.',
      },
    ],
  },
];

const DEADLINE_CHIPS = [
  { value: '22 Nov 2026', label: 'Esta semana', sub: '22 Nov' },
  { value: '28 Nov 2026', label: 'Próx. semana', sub: '28 Nov' },
  { value: '05 Dez 2026', label: 'Início de Dez', sub: '05 Dez' },
  { value: 'A combinar', label: 'Flexível', sub: 'Sem urgência' },
];

const CHANNEL_TAGS = [
  'Instagram / Reels',
  'Site / Landing',
  'WhatsApp Comercial',
  'Mídia Paga',
  'Impresso / Evento',
];

export function NewRequestModal({
  projects,
  user,
  clientName,
  getMember,
  defaultProjectId,
  onClose,
  onCreate,
}: {
  projects: PortalProject[];
  user: PortalUser;
  clientName?: string;
  getMember?: (id: string) => Member | undefined;
  defaultProjectId?: string;
  onClose: () => void;
  onCreate: (req: Omit<PortalRequest, 'id' | 'criadoEm' | 'status'>) => void;
}) {
  const [projectId, setProjectId] = useState<string>(
    defaultProjectId ?? projects[0]?.id ?? 'avulso'
  );
  const [tipo, setTipo] = useState<PortalRequest['tipo']>('Peça para redes');
  const [titulo, setTitulo] = useState('');
  const [prazoDesejado, setPrazoDesejado] = useState('28 Nov 2026');
  const [briefing, setBriefing] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([
    'Instagram / Reels',
  ]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [submittedTitle, setSubmittedTitle] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const currentTypeSpec = useMemo(
    () =>
      REQUEST_TYPE_SPECS.find((s) => s.tipo === tipo) ?? REQUEST_TYPE_SPECS[0],
    [tipo]
  );

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId]
  );

  const projectLead = useMemo(
    () =>
      selectedProject && getMember
        ? getMember(selectedProject.liderEagleId)
        : undefined,
    [selectedProject, getMember]
  );

  const completionPct = useMemo(() => {
    let score = 25; // Formato + prazo pré-selecionados
    if (projectId) score += 15;
    if (titulo.trim().length >= 4) score += 30;
    if (briefing.trim().length >= 12) score += 30;
    return Math.min(100, score);
  }, [projectId, titulo, briefing]);

  const isReady = titulo.trim().length > 0 && briefing.trim().length > 0;

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    );
  };

  const addAttachmentNames = (names: string[]) => {
    setAttachments((prev) => {
      const merged = [...prev];
      for (const n of names) {
        if (n && !merged.includes(n)) merged.push(n);
      }
      return merged;
    });
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    addAttachmentNames(Array.from(files).map((f) => f.name));
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      addAttachmentNames(Array.from(files).map((f) => f.name));
    }
  };

  const applyPreset = (preset: { titulo: string; briefing: string }) => {
    setTitulo(preset.titulo);
    setBriefing(preset.briefing);
  };

  const handleResetForAnother = () => {
    setTitulo('');
    setBriefing('');
    setAttachments([]);
    setSubmittedTitle(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReady) return;

    const extras: string[] = [];
    if (selectedChannels.length > 0) {
      extras.push(`Canais: ${selectedChannels.join(', ')}`);
    }
    if (attachments.length > 0) {
      extras.push(`Anexos: ${attachments.join(', ')}`);
    }

    const cleanTitle = titulo.trim();
    onCreate({
      clientId: user.clientId,
      projectId: projectId === 'avulso' ? undefined : projectId,
      tipo,
      titulo: cleanTitle,
      briefing:
        briefing.trim() +
        (extras.length > 0 ? ` (${extras.join(' · ')})` : ''),
      prazoDesejado: prazoDesejado.trim() || 'A combinar',
      solicitanteNome: user.nome,
    });
    setSubmittedTitle(cleanTitle);
  };

  const ActiveTypeIcon = currentTypeSpec.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0f1115]/64 backdrop-blur-[5px] sm:p-4"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Novo pedido para a equipe"
        initial={{ opacity: 0, y: 16, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.985 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="eagle-modal w-full sm:max-w-[920px] max-h-[92dvh] flex flex-col overflow-hidden rounded-t-[24px] sm:rounded-[22px] shadow-[0_28px_72px_rgba(15,17,21,0.34)]"
      >
        {/* TOPO COM BARRA DE PROGRESSO DO BRIEFING */}
        <div className="px-5 sm:px-6 pt-4 pb-3.5 border-b border-[#0f1115]/8 dark:border-white/10 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-[11px] bg-[#163744] text-white dark:bg-[#9fdce6] dark:text-[#0f1115] flex items-center justify-center shrink-0">
                <ActiveTypeIcon className="w-4.5 h-4.5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-[#0f1115] dark:text-[#f2f4f7] truncate">
                  Novo pedido para a equipe
                </h2>
                <p className="text-[12px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 truncate">
                  {clientName ? `${clientName} · ` : ''}
                  {user.nome} · vai direto para a fila do estúdio
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {!submittedTitle && (
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full bg-[#e6e9ed] dark:bg-[#222834] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#163744] dark:bg-[#9fdce6] transition-all duration-300"
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                  <span className="text-[11.5px] font-semibold tabular-nums text-[#0f1115]/58 dark:text-[#f2f4f7]/58">
                    {completionPct}%
                  </span>
                </div>
              )}

              <ActionIconButton
                variant="neutral"
                onClick={onClose}
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </ActionIconButton>
            </div>
          </div>
        </div>

        {/* CONTEÚDO: CONFIRMAÇÃO OU COMPOSITOR EM 2 COLUNAS */}
        <AnimatePresence mode="wait" initial={false}>
          {submittedTitle ? (
            <motion.div
              key="request-submitted"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="p-8 sm:p-12 flex flex-col items-center text-center space-y-5 overflow-y-auto"
            >
              <div className="w-14 h-14 rounded-full bg-[#15803d]/12 dark:bg-[#4ade80]/15 text-[#166534] dark:text-[#4ade80] flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div className="space-y-1.5 max-w-md">
                <Badge variant="success" size="sm">
                  Recebido pela EAGLE
                </Badge>
                <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-[#0f1115] dark:text-[#f2f4f7] pt-1">
                  {submittedTitle}
                </h3>
                <p className="text-[13.5px] text-[#0f1115]/60 dark:text-[#f2f4f7]/60 leading-relaxed">
                  Seu pedido entrou na fila de{' '}
                  <strong className="font-medium text-[#0f1115] dark:text-[#f2f4f7]">
                    {selectedProject?.nome ?? 'demandas da conta'}
                  </strong>{' '}
                  com previsão desejada para{' '}
                  <strong className="font-medium text-[#0f1115] dark:text-[#f2f4f7]">
                    {prazoDesejado}
                  </strong>
                  .
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handleResetForAnother}
                >
                  <Plus className="w-4 h-4" />
                  <span>Fazer outro pedido</span>
                </Button>
                <Button variant="primary" size="lg" onClick={onClose}>
                  <span>Ver meus pedidos</span>
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.form
              key="request-composer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="flex-1 min-h-0 flex flex-col"
            >
              <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 lg:grid-cols-12">
                {/* COLUNA ESQUERDA: COMPOSIÇÃO INTERATIVA (7 COLS) */}
                <div className="lg:col-span-7 p-5 sm:p-6 space-y-5">
                  {/* 1. TIPO VISUAL */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <label className="text-[12px] font-semibold text-[#0f1115]/78 dark:text-[#f2f4f7]/78">
                        1. O que você precisa?
                      </label>
                      <span className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 tabular-nums">
                        Tempo médio: {currentTypeSpec.slaHint}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {REQUEST_TYPE_SPECS.map((spec) => {
                        const Icon = spec.icon;
                        const active = tipo === spec.tipo;
                        return (
                          <button
                            key={spec.tipo}
                            type="button"
                            onClick={() => setTipo(spec.tipo)}
                            className={`relative p-2.5 rounded-[12px] border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 min-h-[76px] ${
                              active
                                ? 'border-[#163744] dark:border-[#9fdce6] bg-[#163744]/[0.06] dark:bg-[#9fdce6]/[0.12] text-[#0f1115] dark:text-[#f2f4f7]'
                                : 'border-[#0f1115]/8 dark:border-white/10 bg-[#f2f4f7]/55 dark:bg-[#191e28]/70 text-[#0f1115]/70 dark:text-[#f2f4f7]/70 hover:border-[#0f1115]/20 dark:hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`w-6.5 h-6.5 rounded-[7px] flex items-center justify-center ${
                                  active
                                    ? 'bg-[#163744] text-white dark:bg-[#9fdce6] dark:text-[#0f1115]'
                                    : 'bg-white dark:bg-[#10141b] text-[#0f1115]/60 dark:text-white/60'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                              </span>
                              {active && (
                                <Check className="w-3.5 h-3.5 text-[#163744] dark:text-[#9fdce6]" />
                              )}
                            </div>
                            <span className="text-[11.5px] font-semibold leading-tight">
                              {spec.shortLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ATALHOS DE MODELO PARA PREENCHIMENTO RÁPIDO */}
                  <div className="rounded-[13px] bg-[#f2f4f7]/70 dark:bg-[#10141b] border border-[#0f1115]/6 dark:border-white/8 p-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11.5px] font-medium text-[#0f1115]/58 dark:text-[#f2f4f7]/58">
                      Modelos prontos de {currentTypeSpec.shortLabel}:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {currentTypeSpec.presets.map((preset) => (
                        <button
                          key={preset.titulo}
                          type="button"
                          onClick={() => applyPreset(preset)}
                          className="h-7 px-2.5 rounded-[8px] bg-white dark:bg-[#191e28] border border-[#0f1115]/8 dark:border-white/10 hover:border-[#163744]/35 dark:hover:border-[#9fdce6]/35 text-[11.5px] font-medium text-[#163744] dark:text-[#9fdce6] transition-colors cursor-pointer"
                        >
                          + {preset.titulo}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. TÍTULO & BRIEFING */}
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-[12px] font-semibold text-[#0f1115]/78 dark:text-[#f2f4f7]/78 mb-1.5">
                        2. Dê um título e conte o objetivo
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        placeholder={`Ex: ${currentTypeSpec.presets[0].titulo}`}
                        className="eagle-input w-full h-10.5 px-3.5 text-[14px] font-medium"
                      />
                    </div>

                    <div>
                      <textarea
                        required
                        rows={3}
                        value={briefing}
                        onChange={(e) => setBriefing(e.target.value)}
                        placeholder="Descreva o que precisa sair, textos obrigatórios, medidas ou referências que você gostou..."
                        className="eagle-input w-full p-3.5 text-[13.5px] leading-relaxed resize-none"
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 mr-1">
                          Onde vai rodar:
                        </span>
                        {CHANNEL_TAGS.map((tag) => {
                          const on = selectedChannels.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleChannel(tag)}
                              className={`h-6.5 px-2.5 rounded-[7px] text-[11px] font-medium border transition-colors cursor-pointer ${
                                on
                                  ? 'bg-[#163744] text-white border-[#163744] dark:bg-[#9fdce6] dark:text-[#0f1115] dark:border-[#9fdce6]'
                                  : 'bg-white dark:bg-[#191e28] text-[#0f1115]/68 dark:text-[#f2f4f7]/68 border-[#0f1115]/8 dark:border-white/10 hover:border-[#0f1115]/20'
                              }`}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 3. PROJETO & PRAZO */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    <div className="sm:col-span-5">
                      <label className="block text-[12px] font-semibold text-[#0f1115]/78 dark:text-[#f2f4f7]/78 mb-1.5">
                        Projeto vinculado
                      </label>
                      <CustomSelect
                        value={projectId}
                        onChange={setProjectId}
                        options={[
                          ...projects.map((p) => ({
                            value: p.id,
                            label: p.nome,
                          })),
                          {
                            value: 'avulso',
                            label: 'Demanda avulsa / novo escopo',
                          },
                        ]}
                      />
                    </div>

                    <div className="sm:col-span-7">
                      <label className="block text-[12px] font-semibold text-[#0f1115]/78 dark:text-[#f2f4f7]/78 mb-1.5">
                        Para quando você precisa?
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {DEADLINE_CHIPS.map((d) => {
                          const active = prazoDesejado === d.value;
                          return (
                            <button
                              key={d.value}
                              type="button"
                              onClick={() => setPrazoDesejado(d.value)}
                              className={`px-2 py-1.5 rounded-[10px] border text-left transition-all cursor-pointer ${
                                active
                                  ? 'bg-[#163744] text-white border-[#163744] dark:bg-[#9fdce6] dark:text-[#0f1115] dark:border-[#9fdce6]'
                                  : 'bg-[#f2f4f7]/70 dark:bg-[#191e28] text-[#0f1115]/75 dark:text-[#f2f4f7]/75 border-[#0f1115]/8 dark:border-white/10 hover:border-[#0f1115]/20'
                              }`}
                            >
                              <div className="text-[11px] font-semibold truncate leading-tight">
                                {d.label}
                              </div>
                              <div
                                className={`text-[10px] tabular-nums ${
                                  active ? 'opacity-80' : 'opacity-55'
                                }`}
                              >
                                {d.sub}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 4. ANEXOS REAIS OU REFERÊNCIAS */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label className="text-[12px] font-semibold text-[#0f1115]/78 dark:text-[#f2f4f7]/78">
                        Referências ou arquivos (opcional)
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          addAttachmentNames(['Guia_Marca_Ref.pdf'])
                        }
                        className="text-[11.5px] font-medium text-[#163744] dark:text-[#9fdce6] hover:underline cursor-pointer"
                      >
                        + Anexar exemplo
                      </button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFilePick}
                    />

                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`rounded-[13px] border border-dashed px-4 py-3 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                        isDragging
                          ? 'border-[#163744] dark:border-[#9fdce6] bg-[#163744]/[0.06] dark:bg-[#9fdce6]/10'
                          : 'border-[#0f1115]/16 dark:border-white/16 bg-[#f2f4f7]/55 dark:bg-[#191e28]/60 hover:border-[#163744]/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Upload className="w-4 h-4 text-[#163744] dark:text-[#9fdce6] shrink-0" />
                        <span className="text-[12.5px] text-[#0f1115]/70 dark:text-[#f2f4f7]/70 truncate">
                          Arraste arquivos aqui ou clique para escolher do computador
                        </span>
                      </div>
                      <span className="text-[11.5px] font-semibold text-[#163744] dark:text-[#9fdce6] shrink-0">
                        Procurar
                      </span>
                    </div>

                    {attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {attachments.map((file) => (
                          <span
                            key={file}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-white dark:bg-[#191e28] border border-[#0f1115]/10 dark:border-white/12 text-[11.5px] text-[#0f1115] dark:text-[#f2f4f7]"
                          >
                            <Paperclip className="w-3 h-3 text-[#163744] dark:text-[#9fdce6]" />
                            <span className="truncate max-w-[180px]">{file}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAttachments((prev) =>
                                  prev.filter((item) => item !== file)
                                );
                              }}
                              aria-label={`Remover ${file}`}
                              className="text-[#0f1115]/45 hover:text-[#b91c1c] cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* COLUNA DIREITA: RESUMO AO VIVO DO PEDIDO (5 COLS) */}
                <div className="lg:col-span-5 bg-[#f2f4f7]/75 dark:bg-[#10141b] border-t lg:border-t-0 lg:border-l border-[#0f1115]/8 dark:border-white/8 p-5 sm:p-6 flex flex-col justify-between gap-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11.5px] font-semibold text-[#0f1115]/52 dark:text-[#f2f4f7]/52">
                        Prévia do card no estúdio
                      </span>
                      <Badge variant="petroleo" size="xs">
                        {tipo}
                      </Badge>
                    </div>

                    {/* Cartão-espelho em vidro / folha limpa */}
                    <div className="rounded-[18px] bg-white dark:bg-[#15181f] border border-[#0f1115]/8 dark:border-white/10 p-4.5 shadow-[0_8px_24px_rgba(15,17,21,0.05)] space-y-3.5">
                      <div className="flex items-center justify-between gap-2 text-[11.5px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                        <span className="inline-flex items-center gap-1.5 truncate">
                          <FolderKanban className="w-3.5 h-3.5 text-[#163744] dark:text-[#9fdce6] shrink-0" />
                          <span className="truncate">
                            {selectedProject?.nome ?? 'Demanda avulsa'}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1 tabular-nums shrink-0">
                          <Calendar className="w-3 h-3" />
                          <span>{prazoDesejado}</span>
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <h4
                          className={`text-[15.5px] font-semibold leading-snug ${
                            titulo.trim()
                              ? 'text-[#0f1115] dark:text-[#f2f4f7]'
                              : 'text-[#0f1115]/30 dark:text-[#f2f4f7]/30'
                          }`}
                        >
                          {titulo.trim() || 'O título do seu pedido aparece aqui...'}
                        </h4>
                        <p
                          className={`text-[12.5px] leading-relaxed line-clamp-4 ${
                            briefing.trim()
                              ? 'text-[#0f1115]/68 dark:text-[#f2f4f7]/68'
                              : 'text-[#0f1115]/30 dark:text-[#f2f4f7]/30'
                          }`}
                        >
                          {briefing.trim() ||
                            'Conforme você escreve o briefing ao lado, nossa equipe já recebe tudo organizado com formato, canais e prazo.'}
                        </p>
                      </div>

                      {selectedChannels.length > 0 && (
                        <div className="pt-2 border-t border-[#0f1115]/6 dark:border-white/8 flex flex-wrap gap-1.5">
                          {selectedChannels.map((ch) => (
                            <span
                              key={ch}
                              className="px-2 py-0.5 rounded-[6px] bg-[#f2f4f7] dark:bg-[#1b2029] text-[10.5px] font-medium text-[#0f1115]/70 dark:text-[#f2f4f7]/70"
                            >
                              {ch}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="pt-2.5 border-t border-[#0f1115]/6 dark:border-white/8 flex items-center justify-between gap-2 text-[11.5px]">
                        <span className="text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                          Por {user.nome}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[#163744] dark:text-[#9fdce6] font-medium tabular-nums">
                          <Clock className="w-3 h-3" />
                          <span>{currentTypeSpec.slaHint}</span>
                        </span>
                      </div>
                    </div>

                    {/* Quem atende na EAGLE */}
                    <div className="rounded-[14px] bg-white/80 dark:bg-[#15181f]/80 border border-[#0f1115]/7 dark:border-white/8 px-3.5 py-3 flex items-center gap-3">
                      <MemberAvatar
                        member={projectLead}
                        size="sm"
                        showOperationalRing
                      />
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                          {projectLead
                            ? `${projectLead.nome} acompanha este pedido`
                            : 'Triagem direta do estúdio EAGLE'}
                        </div>
                        <div className="text-[11px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 truncate">
                          {projectLead
                            ? `${projectLead.cargo} · resposta pelo Portal`
                            : 'Você acompanha cada etapa na aba Pedidos'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AÇÕES NO RODAPÉ DO RESUMO */}
                  <div className="pt-3 border-t border-[#0f1115]/8 dark:border-white/8 flex items-center justify-end gap-2.5">
                    <Button variant="secondary" size="lg" onClick={onClose}>
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={!isReady}
                    >
                      <Send className="w-4 h-4" />
                      <span>Enviar pedido</span>
                    </Button>
                  </div>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ========================================================================== */
/* MODAL: ACEITAR PROPOSTA & ASSINAR CONTRATO                                 */
/* ========================================================================== */

export function SignContractModal({
  contract,
  user,
  onClose,
  onSign,
}: {
  contract: PortalProposalContract;
  user: PortalUser;
  onClose: () => void;
  onSign: (contractId: string, signerName: string) => void;
}) {
  const [signerName, setSignerName] = useState(user.nome);
  const [agreed, setAgreed] = useState(true);
  const isSigned = contract.status === 'assinado';

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim() || !agreed || isSigned) return;
    onSign(contract.id, signerName.trim());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0f1115]/68 backdrop-blur-xs sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="eagle-modal w-full sm:max-w-[560px] max-h-[92dvh] flex flex-col overflow-hidden rounded-t-[22px] sm:rounded-[20px]"
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#0f1115]/8 dark:border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-[10px] bg-[#163744]/10 dark:bg-[#9fdce6]/15 text-[#163744] dark:text-[#9fdce6] flex items-center justify-center shrink-0">
              <FileCheck2 className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant={isSigned ? 'success' : 'warning'} size="xs">
                  {isSigned ? 'Assinado' : 'Aguardando assinatura'}
                </Badge>
                <span className="text-[11.5px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50">
                  {contract.tipo}
                </span>
              </div>
              <h2 className="text-[16px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate mt-0.5">
                {contract.titulo}
              </h2>
            </div>
          </div>

          <ActionIconButton variant="neutral" onClick={onClose} aria-label="Fechar">
            <X className="w-4 h-4" />
          </ActionIconButton>
        </div>

        <form onSubmit={handleConfirm} className="p-5 space-y-4 overflow-y-auto">
          <div className="rounded-[14px] bg-[#f2f4f7] dark:bg-[#1b2029] border border-[#0f1115]/8 dark:border-white/10 p-4 space-y-3">
            <p className="text-[13.5px] leading-relaxed text-[#0f1115]/82 dark:text-[#f2f4f7]/82">
              {contract.escopoResumo}
            </p>

            <div className="pt-2 border-t border-[#0f1115]/8 dark:border-white/10">
              <p className="text-[11.5px] font-semibold text-[#0f1115]/60 dark:text-[#f2f4f7]/60 mb-2">
                O que está incluído
              </p>
              <ul className="space-y-1.5">
                {contract.entregasIncluidas.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-[13px] text-[#0f1115]/84 dark:text-[#f2f4f7]/84"
                  >
                    <Check className="w-4 h-4 text-[#163744] dark:text-[#9fdce6] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-3 border-t border-[#0f1115]/8 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 block">
                  Investimento total
                </span>
                <span className="text-[18px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] tabular-nums">
                  {formatBRL(contract.valorCentavos)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 block">
                  Condição & Prazo
                </span>
                <span className="text-[12.5px] font-medium text-[#0f1115]/82 dark:text-[#f2f4f7]/82 block">
                  {contract.condicaoPagamento}
                </span>
                <span className="text-[11.5px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                  {contract.prazoEstimado}
                </span>
              </div>
            </div>
          </div>

          {isSigned ? (
            <div className="rounded-[13px] bg-[#15803d]/10 dark:bg-[#4ade80]/12 border border-[#15803d]/20 px-4 py-3 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#166534] dark:text-[#4ade80] shrink-0" />
              <div className="text-[13px]">
                <p className="font-semibold text-[#166534] dark:text-[#4ade80]">
                  Aceito e assinado digitalmente
                </p>
                <p className="text-[#0f1115]/68 dark:text-[#f2f4f7]/68 text-[12px]">
                  Por {contract.assinadoPor} em {contract.assinadoEm}.
                </p>
              </div>
            </div>
          ) : (
            <>
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
                  Confirmo o escopo, os prazos e as condições financeiras descritos acima para início imediato com a EAGLE Digital House.
                </span>
              </label>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <Button variant="secondary" size="lg" onClick={onClose}>
                  Voltar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={!signerName.trim() || !agreed}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Assinar e aprovar</span>
                </Button>
              </div>
            </>
          )}
        </form>
      </motion.div>
    </div>
  );
}

/* ========================================================================== */
/* MODAL: PAGAR FATURA (PIX / BOLETO / CARTÃO)                                */
/* ========================================================================== */

export function PayInvoiceModal({
  invoice,
  onClose,
  onConfirmPayment,
}: {
  invoice: PortalInvoice;
  onClose: () => void;
  onConfirmPayment: (invoiceId: string) => void;
}) {
  const [method, setMethod] = useState<'Pix' | 'Boleto' | 'Cartão'>(
    invoice.formaPreferida
  );
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0f1115]/68 backdrop-blur-xs sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="eagle-modal w-full sm:max-w-[480px] max-h-[92dvh] flex flex-col overflow-hidden rounded-t-[22px] sm:rounded-[20px]"
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#0f1115]/8 dark:border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-[10px] bg-[#163744]/10 dark:bg-[#9fdce6]/15 text-[#163744] dark:text-[#9fdce6] flex items-center justify-center shrink-0">
              <Receipt className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[16px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                Pagamento da fatura
              </h2>
              <p className="text-[12px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55 truncate">
                {invoice.descricao}
              </p>
            </div>
          </div>
          <ActionIconButton variant="neutral" onClick={onClose} aria-label="Fechar">
            <X className="w-4 h-4" />
          </ActionIconButton>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Resumo do valor */}
          <div className="rounded-[14px] bg-[#f2f4f7] dark:bg-[#1b2029] border border-[#0f1115]/8 dark:border-white/10 p-4 flex items-center justify-between gap-4">
            <div>
              <span className="text-[11.5px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55 block">
                Valor a pagar
              </span>
              <span className="text-[22px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] tabular-nums tracking-[-0.02em]">
                {formatBRL(invoice.valorCentavos)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11.5px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55 block">
                Vencimento
              </span>
              <span className="text-[13px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] tabular-nums">
                {formatFullDate(invoice.vencimento)}
              </span>
            </div>
          </div>

          {/* Escolha do meio */}
          <div>
            <label className="block text-[12px] font-medium text-[#0f1115]/70 dark:text-[#f2f4f7]/70 mb-1.5">
              Como prefere pagar?
            </label>
            <SegmentedChoice
              value={method}
              onChange={setMethod}
              options={[
                { value: 'Pix', label: 'Pix instantâneo' },
                { value: 'Boleto', label: 'Boleto bancário' },
                { value: 'Cartão', label: 'Cartão' },
              ]}
            />
          </div>

          {method === 'Pix' && (
            <div className="rounded-[14px] border border-[#0f1115]/10 dark:border-white/10 p-4 space-y-3 text-center">
              <div className="w-28 h-28 mx-auto rounded-[12px] bg-[#ffffff] border border-[#0f1115]/10 flex items-center justify-center text-[#0f1115]">
                <QrCode className="w-20 h-20 stroke-[1.5]" />
              </div>
              <p className="text-[12px] text-[#0f1115]/60 dark:text-[#f2f4f7]/60">
                Escaneie com o app do banco ou copie o código Pix abaixo.
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={invoice.codigoPix}
                  className="eagle-input flex-1 h-9.5 px-3 text-[12px] tabular-nums truncate"
                />
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => handleCopy(invoice.codigoPix)}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </Button>
              </div>
            </div>
          )}

          {method === 'Boleto' && (
            <div className="rounded-[14px] border border-[#0f1115]/10 dark:border-white/10 p-4 space-y-3">
              <div className="flex items-center gap-2 text-[13px] font-medium text-[#0f1115] dark:text-[#f2f4f7]">
                <FileText className="w-4 h-4 text-[#163744] dark:text-[#9fdce6]" />
                <span>Linha digitável do boleto</span>
              </div>
              <p className="text-[12.5px] font-mono bg-[#f2f4f7] dark:bg-[#1b2029] p-3 rounded-[10px] break-all tabular-nums text-[#0f1115]/85 dark:text-[#f2f4f7]/85">
                {invoice.linhaDigitavelBoleto}
              </p>
              <Button
                variant="secondary"
                size="md"
                className="w-full"
                onClick={() => handleCopy(invoice.linhaDigitavelBoleto)}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Linha digitável copiada' : 'Copiar linha digitável'}</span>
              </Button>
            </div>
          )}

          {method === 'Cartão' && (
            <div className="rounded-[14px] border border-[#0f1115]/10 dark:border-white/10 p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-[13px] font-medium text-[#0f1115] dark:text-[#f2f4f7]">
                <CreditCard className="w-4 h-4 text-[#163744] dark:text-[#9fdce6]" />
                <span>Pagamento corporativo em até 3x sem juros</span>
              </div>
              <p className="text-[12px] text-[#0f1115]/60 dark:text-[#f2f4f7]/60">
                A confirmação é imediata e a nota fiscal fica disponível logo após a compensação.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-1">
            <Button variant="secondary" size="lg" onClick={onClose}>
              Fechar
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                onConfirmPayment(invoice.id);
                onClose();
              }}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar pagamento</span>
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ========================================================================== */
/* MODAL: ADICIONAR MATERIAL À MARCA                                          */
/* ========================================================================== */

export function AddBrandAssetModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (asset: Omit<BrandAssetFile, 'id' | 'atualizadoEm'>) => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState<BrandAssetFile['categoria']>('Fotos');
  const [formato, setFormato] = useState('ZIP');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    onAdd({
      titulo: titulo.trim(),
      categoria,
      formato,
      tamanho: '24,5 MB',
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0f1115]/68 backdrop-blur-xs sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="eagle-modal w-full sm:max-w-[440px] rounded-t-[22px] sm:rounded-[20px] overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#0f1115]/8 dark:border-white/10">
          <h2 className="text-[16px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
            Guardar material da marca
          </h2>
          <ActionIconButton variant="neutral" onClick={onClose} aria-label="Fechar">
            <X className="w-4 h-4" />
          </ActionIconButton>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[#0f1115]/70 dark:text-[#f2f4f7]/70 mb-1.5">
              Nome do arquivo ou pasta
            </label>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Fotos novas da equipe (Novembro)"
              className="eagle-input w-full h-10 px-3 text-[13.5px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-[#0f1115]/70 dark:text-[#f2f4f7]/70 mb-1.5">
                Categoria
              </label>
              <CustomSelect
                value={categoria}
                onChange={setCategoria}
                options={[
                  { value: 'Fotos', label: 'Fotos' },
                  { value: 'Manual', label: 'Manual / Guia' },
                  { value: 'Templates', label: 'Templates' },
                ]}
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#0f1115]/70 dark:text-[#f2f4f7]/70 mb-1.5">
                Formato
              </label>
              <CustomSelect
                value={formato}
                onChange={setFormato}
                options={[
                  { value: 'ZIP', label: 'ZIP (Pacote)' },
                  { value: 'PDF', label: 'PDF' },
                  { value: 'FIG', label: 'Figma / FIG' },
                  { value: 'SVG', label: 'SVG / Vetor' },
                ]}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" size="lg" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="lg" disabled={!titulo.trim()}>
              <Upload className="w-4 h-4" />
              <span>Salvar na Marca</span>
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
