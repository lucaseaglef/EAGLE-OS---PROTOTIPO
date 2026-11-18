import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Check,
  CheckCircle2,
  Film,
  MapPin,
  MessageSquarePlus,
  Pause,
  Play,
  RotateCcw,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { ActionIconButton, Badge, Button } from '../components/DesignSystem';
import { PiecePin, PortalPiece, PortalRole, PortalUser } from '../types/portal';

const STATUS_META: Record<
  PortalPiece['status'],
  { label: string; variant: 'warning' | 'petroleo' | 'success' }
> = {
  aguardando_aprovacao: { label: 'Aguardando aprovação', variant: 'warning' },
  ajustes_solicitados: { label: 'Ajustes solicitados', variant: 'petroleo' },
  aprovada: { label: 'Aprovada', variant: 'success' },
};

const VIDEO_MARKERS = [
  { sec: 3, pct: 12.5, label: '00:03 · Abertura' },
  { sec: 8, pct: 33.3, label: '00:08 · Legenda' },
  { sec: 16, pct: 66.6, label: '00:16 · Oferta' },
];

export function ProofingModal({
  piece,
  projectName,
  user,
  role,
  onClose,
  onAddPin,
  onToggleResolvePin,
  onUpdateStatus,
}: {
  piece: PortalPiece;
  projectName: string;
  user: PortalUser;
  role: PortalRole;
  onClose: () => void;
  onAddPin: (pieceId: string, pin: Omit<PiecePin, 'id' | 'numero'>) => void;
  onToggleResolvePin: (pieceId: string, pinId: string) => void;
  onUpdateStatus: (pieceId: string, status: PortalPiece['status']) => void;
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [selectedPinId, setSelectedPinId] = useState<string | null>(
    piece.pins[0]?.id ?? null
  );
  const [draftCoords, setDraftCoords] = useState<{ xPct: number; yPct: number } | null>(null);
  const [draftText, setDraftText] = useState('');
  const [pinMode, setPinMode] = useState(true);

  // Estado simples de player para peças de vídeo
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoSec, setVideoSec] = useState(8);
  const totalVideoSec = 24;

  // Confirmação visual rápida ao pedir ajuste sem pino novo
  const [adjustPromptOpen, setAdjustPromptOpen] = useState(false);
  const [adjustNote, setAdjustNote] = useState('');

  useEffect(() => {
    if (!isPlaying || !piece.isVideo) return;
    const timer = window.setInterval(() => {
      setVideoSec((prev) => (prev >= totalVideoSec ? 0 : prev + 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPlaying, piece.isVideo]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pinMode || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;
    const xPct = Math.max(4, Math.min(96, Math.round(rawX * 10) / 10));
    const yPct = Math.max(5, Math.min(95, Math.round(rawY * 10) / 10));

    setDraftCoords({ xPct, yPct });
    setSelectedPinId(null);
    setAdjustPromptOpen(false);
    window.setTimeout(() => {
      commentInputRef.current?.focus();
    }, 40);
  };

  const handleSubmitDraftPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleaned = draftText.trim();
    if (!cleaned || !draftCoords) return;

    const timePrefix = piece.isVideo
      ? `[00:${String(videoSec).padStart(2, '0')}] `
      : '';

    onAddPin(piece.id, {
      xPct: draftCoords.xPct,
      yPct: draftCoords.yPct,
      autorNome: user.nome,
      autorPapel: role === 'responsavel' ? 'Responsável' : 'Solicitante',
      texto: `${timePrefix}${cleaned}`,
      horario: 'Agora',
      resolvido: false,
    });

    setDraftCoords(null);
    setDraftText('');
  };

  const handleRequestAdjustments = () => {
    if (piece.pins.length === 0 && !draftText.trim() && !adjustNote.trim()) {
      setAdjustPromptOpen(true);
      return;
    }

    if (draftCoords && draftText.trim()) {
      handleSubmitDraftPin();
    } else if (adjustNote.trim()) {
      onAddPin(piece.id, {
        xPct: 50,
        yPct: 50,
        autorNome: user.nome,
        autorPapel: 'Responsável',
        texto: adjustNote.trim(),
        horario: 'Agora',
        resolvido: false,
      });
      setAdjustNote('');
      setAdjustPromptOpen(false);
    }

    onUpdateStatus(piece.id, 'ajustes_solicitados');
  };

  const statusMeta = STATUS_META[piece.status];
  const formatSec = (s: number) => `00:${String(s).padStart(2, '0')}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-[#0f1115]/78 backdrop-blur-xs md:p-5"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.99 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full h-[94dvh] md:h-[88vh] md:max-w-[1180px] bg-white dark:bg-[#15181f] border border-[#0f1115]/10 dark:border-white/12 rounded-t-[22px] md:rounded-[22px] shadow-[0_28px_72px_-16px_rgba(0,0,0,0.52)] flex flex-col overflow-hidden"
      >
        {/* Cabeçalho compacto */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3.5 border-b border-[#0f1115]/8 dark:border-white/10 bg-white dark:bg-[#15181f] shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11.5px] font-medium text-[#163744] dark:text-[#9fdce6] truncate max-w-[240px]">
                {projectName}
              </span>
              <span className="text-[#0f1115]/25 dark:text-white/25">·</span>
              <Badge variant={statusMeta.variant} size="xs">
                {statusMeta.label}
              </Badge>
            </div>
            <h2 className="text-[16px] md:text-[18px] font-semibold tracking-[-0.02em] text-[#0f1115] dark:text-[#f2f4f7] truncate mt-0.5">
              {piece.titulo}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setPinMode((p) => !p)}
              className={`hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-[12.5px] font-medium border transition-colors cursor-pointer ${
                pinMode
                  ? 'bg-[#163744] text-white border-[#163744] dark:bg-[#9fdce6] dark:text-[#0f1115] dark:border-[#9fdce6]'
                  : 'bg-[#f2f4f7] dark:bg-[#1e242e] text-[#0f1115]/75 dark:text-white/75 border-[#0f1115]/10 dark:border-white/10'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{pinMode ? 'Clique na peça para marcar' : 'Ativar marcação'}</span>
            </button>

            <ActionIconButton
              variant="neutral"
              onClick={onClose}
              aria-label="Fechar revisão"
            >
              <X className="w-4 h-4" />
            </ActionIconButton>
          </div>
        </div>

        {/* Corpo dividido: Palco visual à esquerda + Comentários e Decisão à direita */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
          {/* Palco da Peça */}
          <div className="md:flex-1 bg-[#e6e9ed] dark:bg-[#0b0e13] p-3.5 sm:p-5 flex flex-col items-center justify-center relative md:overflow-y-auto shrink-0 md:shrink">
            {/* Dica móvel direta */}
            <div className="w-full max-w-[740px] flex items-center justify-between gap-2 mb-2.5 text-[11.5px] text-[#0f1115]/60 dark:text-[#f2f4f7]/60">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-[#163744] dark:text-[#9fdce6]" />
                Toque ou clique em qualquer ponto da arte para comentar
              </span>
              <span className="tabular-nums hidden sm:inline">
                {piece.versao} · {piece.formato}
                {piece.dimensaoOuDuracao ? ` · ${piece.dimensaoOuDuracao}` : ''}
              </span>
            </div>

            {/* Canvas interativo */}
            <div
              ref={stageRef}
              onClick={handleStageClick}
              className={`relative w-full max-w-[740px] rounded-[14px] overflow-hidden border border-[#0f1115]/12 dark:border-white/14 bg-[#0f1115] shadow-[0_12px_32px_rgba(15,17,21,0.16)] select-none ${
                pinMode ? 'cursor-crosshair' : 'cursor-default'
              }`}
            >
              {piece.previewUrl ? (
                <img
                  src={piece.previewUrl}
                  alt={piece.titulo}
                  draggable={false}
                  className="w-full max-h-[42vh] md:max-h-[60vh] object-cover block"
                />
              ) : (
                <div className="h-[280px] flex items-center justify-center text-white/60 text-[13px]">
                  Prévia da peça
                </div>
              )}

              {/* Badge discreto se vídeo */}
              {piece.isVideo && (
                <div className="pointer-events-none absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-[#0f1115]/82 text-white text-[11px] font-medium border border-white/15 tabular-nums">
                  <Film className="w-3 h-3 text-[#9fdce6]" />
                  <span>Vídeo · {formatSec(videoSec)}</span>
                </div>
              )}

              {/* Pinos existentes numerados */}
              {piece.pins.map((pin) => {
                const isSelected = selectedPinId === pin.id;
                return (
                  <button
                    key={pin.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDraftCoords(null);
                      setSelectedPinId(pin.id);
                    }}
                    style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%` }}
                    title={`#${pin.numero} — ${pin.autorNome}: ${pin.texto}`}
                    aria-label={`Comentário ${pin.numero} de ${pin.autorNome}`}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 md:w-7 md:h-7 rounded-full text-[12px] font-bold tabular-nums flex items-center justify-center transition-transform cursor-pointer border-2 shadow-[0_4px_12px_rgba(15,17,21,0.38)] ${
                      pin.resolvido
                        ? 'bg-[#15803d] text-white border-white/90'
                        : isSelected
                          ? 'bg-[#9fdce6] text-[#0f1115] border-[#0f1115] scale-115 z-20'
                          : 'bg-[#163744] text-white border-white hover:scale-110 z-10'
                    }`}
                  >
                    {pin.resolvido ? <Check className="w-3.5 h-3.5" /> : pin.numero}
                  </button>
                );
              })}

              {/* Pino rascunho ativo */}
              {draftCoords && (
                <div
                  style={{ left: `${draftCoords.xPct}%`, top: `${draftCoords.yPct}%` }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#b45309] text-white border-2 border-white shadow-[0_4px_14px_rgba(15,17,21,0.45)] flex items-center justify-center text-[12px] font-bold z-30"
                >
                  +
                </div>
              )}
            </div>

            {/* Barra de player para vídeo */}
            {piece.isVideo && (
              <div className="w-full max-w-[740px] mt-3 rounded-[12px] bg-[#0f1115] text-[#f2f4f7] border border-white/12 px-3.5 py-2.5 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsPlaying((p) => !p)}
                      aria-label={isPlaying ? 'Pausar vídeo' : 'Reproduzir vídeo'}
                      className="w-9 h-9 rounded-[9px] bg-[#9fdce6] text-[#0f1115] inline-flex items-center justify-center cursor-pointer shrink-0"
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5" />
                      )}
                    </button>
                    <div className="text-[12px] tabular-nums">
                      <span className="font-semibold text-white">{formatSec(videoSec)}</span>
                      <span className="text-white/45"> / {formatSec(totalVideoSec)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {VIDEO_MARKERS.map((mk) => (
                      <button
                        key={mk.sec}
                        type="button"
                        onClick={() => {
                          setIsPlaying(false);
                          setVideoSec(mk.sec);
                        }}
                        className={`px-2 py-1 rounded-[7px] text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                          videoSec === mk.sec
                            ? 'bg-[#9fdce6]/20 text-[#9fdce6] border border-[#9fdce6]/35'
                            : 'bg-white/6 text-white/65 hover:text-white border border-white/8'
                        }`}
                      >
                        {mk.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timeline clicável */}
                <div
                  className="relative h-2 rounded-full bg-white/12 cursor-pointer overflow-hidden"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    setVideoSec(Math.round(pct * totalVideoSec));
                  }}
                >
                  <div
                    className="h-full bg-[#9fdce6] transition-all duration-150"
                    style={{ width: `${(videoSec / totalVideoSec) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Coluna Direita: Contexto, Comentários nos pontos e Botões de decisão */}
          <div className="w-full md:w-[390px] border-t md:border-t-0 md:border-l border-[#0f1115]/8 dark:border-white/10 bg-white dark:bg-[#15181f] flex flex-col min-h-0 shrink-0">
            {/* Descrição da peça */}
            <div className="px-4 md:px-5 py-3.5 border-b border-[#0f1115]/6 dark:border-white/8">
              <p className="text-[12.5px] leading-relaxed text-[#0f1115]/72 dark:text-[#f2f4f7]/72">
                {piece.descricao}
              </p>
              <p className="text-[11px] text-[#0f1115]/45 dark:text-[#f2f4f7]/45 mt-1.5 tabular-nums">
                Enviada em {piece.enviadaEm} · {piece.pins.length}{' '}
                {piece.pins.length === 1 ? 'comentário marcado' : 'comentários marcados'}
              </p>
            </div>

            {/* Caixa de novo pino quando o cliente clicou na imagem */}
            {draftCoords && (
              <form
                onSubmit={handleSubmitDraftPin}
                className="m-3.5 mb-0 p-3.5 rounded-[14px] bg-[#f2f4f7] dark:bg-[#1b2029] border border-[#163744]/25 dark:border-[#9fdce6]/30 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#163744] dark:text-[#9fdce6]">
                    <MapPin className="w-3.5 h-3.5" />
                    Novo ponto ({Math.round(draftCoords.xPct)}%, {Math.round(draftCoords.yPct)}%)
                    {piece.isVideo ? ` · ${formatSec(videoSec)}` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftCoords(null);
                      setDraftText('');
                    }}
                    aria-label="Cancelar ponto"
                    className="w-7 h-7 rounded-[7px] inline-flex items-center justify-center text-[#0f1115]/45 hover:text-[#0f1115] dark:text-white/45 dark:hover:text-white cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <textarea
                  ref={commentInputRef}
                  rows={2}
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  placeholder="Escreva o que ajustar ou confirmar neste ponto..."
                  className="eagle-input w-full p-2.5 text-[13px] resize-none"
                />

                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setDraftCoords(null);
                      setDraftText('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    variant="primary"
                    disabled={!draftText.trim()}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Fixar comentário</span>
                  </Button>
                </div>
              </form>
            )}

            {/* Lista de pinos e comentários */}
            <div className="flex-1 md:overflow-y-auto p-3.5 md:p-4 space-y-2.5">
              {piece.pins.length === 0 && !draftCoords ? (
                <div className="rounded-[14px] border border-dashed border-[#0f1115]/14 dark:border-white/14 p-5 text-center">
                  <MessageSquarePlus className="w-5 h-5 mx-auto text-[#163744]/55 dark:text-[#9fdce6]/55 mb-2" />
                  <p className="text-[13px] font-medium text-[#0f1115]/78 dark:text-[#f2f4f7]/78">
                    Nenhum ajuste marcado ainda
                  </p>
                  <p className="text-[12px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 mt-1">
                    Se quiser comentar algo específico, toque diretamente na imagem ao lado.
                  </p>
                </div>
              ) : (
                piece.pins.map((pin) => {
                  const selected = selectedPinId === pin.id;
                  return (
                    <div
                      key={pin.id}
                      onClick={() => setSelectedPinId(pin.id)}
                      className={`rounded-[13px] p-3 border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[#f2f4f7] dark:bg-[#1c222c] border-[#163744]/30 dark:border-[#9fdce6]/35'
                          : 'bg-white dark:bg-[#15181f] border-[#0f1115]/8 dark:border-white/8 hover:border-[#0f1115]/18 dark:hover:border-white/18'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-full text-[11px] font-bold tabular-nums inline-flex items-center justify-center shrink-0 ${
                              pin.resolvido
                                ? 'bg-[#15803d]/15 text-[#166534] dark:bg-[#4ade80]/15 dark:text-[#4ade80]'
                                : 'bg-[#163744] text-white dark:bg-[#9fdce6] dark:text-[#0f1115]'
                            }`}
                          >
                            {pin.resolvido ? <Check className="w-3 h-3" /> : pin.numero}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[12.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                              {pin.autorNome}
                            </p>
                            <p className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 truncate">
                              {pin.autorPapel} · {pin.horario}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleResolvePin(piece.id, pin.id);
                          }}
                          className={`px-2 py-1 rounded-[7px] text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
                            pin.resolvido
                              ? 'bg-[#15803d]/12 text-[#166534] dark:text-[#4ade80]'
                              : 'bg-[#0f1115]/5 dark:bg-white/6 text-[#0f1115]/60 dark:text-white/60 hover:text-[#0f1115] dark:hover:text-white'
                          }`}
                        >
                          {pin.resolvido ? 'Resolvido' : 'Resolver'}
                        </button>
                      </div>

                      <p
                        className={`text-[13px] leading-relaxed mt-2 ${
                          pin.resolvido
                            ? 'line-through text-[#0f1115]/42 dark:text-[#f2f4f7]/42'
                            : 'text-[#0f1115]/84 dark:text-[#f2f4f7]/84'
                        }`}
                      >
                        {pin.texto}
                      </p>
                    </div>
                  );
                })
              )}

              {/* Prompt rápido se clicar em "Pedir ajustes" sem comentário */}
              {adjustPromptOpen && (
                <div className="p-3 rounded-[13px] bg-[#b45309]/8 dark:bg-[#fbbf24]/10 border border-[#b45309]/25 dark:border-[#fbbf24]/25 space-y-2">
                  <p className="text-[12px] font-semibold text-[#92400e] dark:text-[#fbbf24]">
                    O que você gostaria que a equipe ajustasse?
                  </p>
                  <textarea
                    rows={2}
                    value={adjustNote}
                    onChange={(e) => setAdjustNote(e.target.value)}
                    placeholder="Ex: Clarear o título ou marcar um ponto na imagem..."
                    className="eagle-input w-full p-2.5 text-[12.5px] resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => setAdjustPromptOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="xs"
                      variant="primary"
                      disabled={!adjustNote.trim()}
                      onClick={handleRequestAdjustments}
                    >
                      Enviar ajuste
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé fixo de decisão (botões confortáveis para o polegar no celular) */}
            <div className="p-3.5 md:p-4 border-t border-[#0f1115]/8 dark:border-white/10 bg-[#f2f4f7]/70 dark:bg-[#11141a] shrink-0">
              {role === 'responsavel' ? (
                <div className="flex flex-col gap-2">
                  {piece.status === 'aprovada' ? (
                    <div className="flex items-center justify-between gap-2 rounded-[12px] bg-[#15803d]/12 dark:bg-[#4ade80]/15 border border-[#15803d]/20 px-3.5 py-2.5">
                      <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#166534] dark:text-[#4ade80]">
                        <CheckCircle2 className="w-4 h-4" />
                        Peça aprovada para produção
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(piece.id, 'aguardando_aprovacao')}
                        className="text-[12px] font-medium text-[#0f1115]/60 dark:text-white/60 hover:underline cursor-pointer"
                      >
                        Reabrir
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={handleRequestAdjustments}
                        className="min-h-[44px] px-3 rounded-[11px] bg-white dark:bg-[#1c222c] border border-[#0f1115]/14 dark:border-white/14 text-[13px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] hover:bg-[#e6e9ed] dark:hover:bg-[#252c38] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Pedir ajustes</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(piece.id, 'aprovada')}
                        className="min-h-[44px] px-3 rounded-[11px] bg-[#163744] hover:bg-[#1d4757] dark:bg-[#9fdce6] dark:hover:bg-[#b6e6ee] text-white dark:text-[#0f1115] text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Check className="w-4 h-4" />
                        <span>Aprovar peça</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 text-[12px] text-[#0f1115]/65 dark:text-[#f2f4f7]/65">
                  <span>
                    Você pode marcar pontos e comentar livremente. A aprovação final fica com o Responsável.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
