import { useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  Copy,
  Download,
  FileImage,
  FolderArchive,
  Grid3X3,
  Layers,
  Plus,
} from 'lucide-react';
import artefatoIdentidadeImg from '../assets/images/artefato_identidade_marca_1794626655297.jpg';
import artefatoPalcoImg from '../assets/images/artefato_palco_evento_1794626654699.jpg';
import portalAuroraImg from '../assets/images/portal_aurora_social_1794982123672.jpg';
import portalCongesaImg from '../assets/images/portal_congesa_keyvisual_1794982122700.jpg';
import portalVeredaImg from '../assets/images/portal_vereda_site_1794982123776.jpg';
import { Badge, Button } from '../components/DesignSystem';
import { EmptyState, SegmentedControl } from '../components/SharedUI';
import { BentoCard } from '../components/VisualWidgets';
import {
  BrandAssetFile,
  BrandLogoItem,
  PortalBrandKit,
  PortalClientProfile,
} from '../types/portal';

interface PortalBrandViewProps {
  client: PortalClientProfile;
  brandKit?: PortalBrandKit;
  copiedHex: string | null;
  onCopyHex: (hex: string) => void;
  onOpenAddAsset: () => void;
  onDownloadAsset: (filename: string, content: string, toastText: string) => void;
}

const CLIENT_HERO_IMAGES: Record<string, string> = {
  'cli-congesa': portalCongesaImg,
  'cli-aurora': portalAuroraImg,
  'cli-vereda': artefatoPalcoImg,
};

const ASSET_THUMBNAILS: Record<string, string> = {
  'ba-c1': artefatoIdentidadeImg,
  'ba-c2': portalCongesaImg,
  'ba-a1': artefatoIdentidadeImg,
  'ba-a2': portalAuroraImg,
  'ba-v1': portalVeredaImg,
  'ba-v2': artefatoPalcoImg,
};

function hexToRgbString(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '—';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function getFontSpecimenStyle(fontName: string): {
  fontFamily: string;
  tracking: string;
} {
  const lower = fontName.toLowerCase();
  if (
    lower.includes('cormorant') ||
    lower.includes('garamond') ||
    lower.includes('serif')
  ) {
    return {
      fontFamily: 'Georgia, "Times New Roman", serif',
      tracking: '-0.02em',
    };
  }
  if (lower.includes('tight')) {
    return {
      fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
      tracking: '-0.035em',
    };
  }
  return {
    fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
    tracking: '-0.015em',
  };
}

function ClientVectorLogotype({
  clientId,
  logo,
}: {
  clientId: string;
  logo: BrandLogoItem;
}) {
  const ink = logo.corPrincipal;

  if (clientId === 'cli-congesa') {
    const isSeal = logo.monograma === 'MIRANTE';
    return (
      <div className="flex items-center gap-3.5 select-none">
        <svg width="38" height="38" viewBox="0 0 44 44" aria-hidden="true">
          {isSeal ? (
            <>
              <rect
                x="4"
                y="4"
                width="36"
                height="36"
                rx="10"
                fill="none"
                stroke={ink}
                strokeWidth="2.2"
              />
              <path
                d="M12 31V18L22 11L32 18V31"
                fill="none"
                stroke={ink}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line x1="22" y1="11" x2="22" y2="31" stroke={ink} strokeWidth="1.8" />
            </>
          ) : (
            <>
              <path
                d="M6 34V14C6 9.58 9.58 6 14 6H30"
                fill="none"
                stroke={ink}
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <path
                d="M14 34V18C14 14.69 16.69 12 20 12H36V34"
                fill="none"
                stroke={ink}
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <circle cx="25" cy="24" r="3.2" fill={ink} />
            </>
          )}
        </svg>
        <div className="leading-none">
          <div
            style={{ color: ink }}
            className="text-[17px] font-semibold tracking-[0.22em]"
          >
            {logo.monograma}
          </div>
          <div
            style={{ color: ink, opacity: 0.58 }}
            className="text-[9px] font-medium tracking-[0.28em] mt-1.5"
          >
            {isSeal ? 'RESIDENCIAL' : 'INCORPORADORA'}
          </div>
        </div>
      </div>
    );
  }

  if (clientId === 'cli-aurora') {
    const isMonogram = logo.monograma === 'GA';
    return (
      <div className="flex items-center gap-3.5 select-none">
        <svg width="38" height="38" viewBox="0 0 44 44" aria-hidden="true">
          <path
            d="M8 34V22C8 14.27 14.27 8 22 8C29.73 8 36 14.27 36 22V34"
            fill="none"
            stroke={ink}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="22" cy="21" r="5" fill={ink} opacity="0.88" />
          <line x1="6" y1="34" x2="38" y2="34" stroke={ink} strokeWidth="1.8" />
        </svg>
        {!isMonogram ? (
          <div className="leading-none">
            <div
              style={{
                color: ink,
                fontFamily: 'Georgia, "Times New Roman", serif',
              }}
              className="text-[21px] tracking-[0.18em]"
            >
              AURORA
            </div>
            <div
              style={{ color: ink, opacity: 0.58 }}
              className="text-[8.5px] font-medium tracking-[0.3em] mt-1"
            >
              HOSPITALIDADE
            </div>
          </div>
        ) : (
          <div
            style={{
              color: ink,
              fontFamily: 'Georgia, "Times New Roman", serif',
            }}
            className="text-[20px] tracking-[0.14em]"
          >
            G · A
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3.5 select-none">
      <svg width="38" height="38" viewBox="0 0 44 44" aria-hidden="true">
        <circle cx="15" cy="15" r="7" fill="none" stroke={ink} strokeWidth="2.3" />
        <circle cx="29" cy="15" r="7" fill="none" stroke={ink} strokeWidth="2.3" />
        <path
          d="M10 34L22 20L34 34"
          fill="none"
          stroke={ink}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="leading-none">
        <div
          style={{ color: ink }}
          className="text-[17px] font-bold tracking-[0.16em]"
        >
          VEREDA
        </div>
        <div
          style={{ color: ink, opacity: 0.58 }}
          className="text-[9px] font-medium tracking-[0.26em] mt-1"
        >
          FÓRUM · 2026
        </div>
      </div>
    </div>
  );
}

export function PortalBrandView({
  client,
  brandKit,
  copiedHex,
  onCopyHex,
  onOpenAddAsset,
  onDownloadAsset,
}: PortalBrandViewProps) {
  const [showConstructionGrid, setShowConstructionGrid] = useState(true);
  const [assetFilter, setAssetFilter] = useState<
    'Todos' | BrandAssetFile['categoria']
  >('Todos');

  const heroImage = CLIENT_HERO_IMAGES[client.id] ?? artefatoIdentidadeImg;

  const filteredFiles = useMemo(() => {
    if (!brandKit) return [];
    if (assetFilter === 'Todos') return brandKit.arquivos;
    return brandKit.arquivos.filter((f) => f.categoria === assetFilter);
  }, [brandKit, assetFilter]);

  if (!brandKit) {
    return <EmptyState title="Central da marca em preparação." />;
  }

  const primaryLogo = brandKit.logos[0];

  return (
    <div className="max-w-[1380px] mx-auto space-y-5">
      {/* 1. CABEÇALHO UNIFICADO DA MARCA (BRAND BOOK AO VIVO) */}
      <BentoCard className="relative overflow-hidden min-h-[210px] flex flex-col justify-between">
        <img
          src={heroImage}
          alt={client.nome}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover scale-[1.02]"
        />
        <div
          className="absolute inset-0 bg-[#0f1115]/34 dark:bg-[#0b0e14]/56"
          aria-hidden="true"
        />

        <div className="relative z-10 px-5 pt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md backdrop-saturate-150 bg-white/75 dark:bg-[#141922]/75 border border-white/70 dark:border-white/15 text-[11.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
            <span>Identidade oficial</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#163744] dark:text-[#9fdce6]">
              {client.segmento}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="backdrop-blur-md bg-white/88! dark:bg-[#141922]/88!"
              onClick={() =>
                onDownloadAsset(
                  `${client.iniciais}_Brand_Kit_EAGLE.zip`,
                  `Kit Completo da Marca ${client.nome}\nLogos: ${brandKit.logos.length}\nCores: ${brandKit.cores.map((c) => c.hex).join(', ')}`,
                  `Baixando Brand Kit completo de ${client.nome}.`
                )
              }
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>Baixar Kit Completo</span>
            </Button>

            <Button variant="primary" size="sm" onClick={onOpenAddAsset}>
              <Plus className="w-3.5 h-3.5" />
              <span>Guardar material</span>
            </Button>
          </div>
        </div>

        <div className="relative z-10 p-4 sm:p-5 mt-6">
          <div className="rounded-[18px] backdrop-blur-xl backdrop-saturate-150 bg-white/68 dark:bg-[#141922]/74 border border-white/80 dark:border-white/18 p-4 sm:p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.88),0_18px_40px_rgba(15,17,21,0.18)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
              {primaryLogo && (
                <div className="px-4 py-2.5 rounded-[13px] bg-white/90 dark:bg-[#0f1115]/85 border border-[#0f1115]/8 dark:border-white/12 shrink-0 flex items-center justify-center">
                  <ClientVectorLogotype
                    clientId={client.id}
                    logo={{ ...primaryLogo, corPrincipal: client.corMarca }}
                  />
                </div>
              )}

              <div className="min-w-0">
                <div className="text-[11.5px] font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60">
                  {client.cidade} · Parceiros desde {client.desdeAno}
                </div>
                <h2 className="text-[20px] font-semibold tracking-[-0.025em] text-[#0f1115] dark:text-[#f2f4f7] truncate mt-0.5">
                  {client.nome}
                </h2>
                <p className="text-[13px] text-[#0f1115]/75 dark:text-[#f2f4f7]/75 mt-0.5">
                  {brandKit.tagline}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {brandKit.cores.map((cor) => (
                <button
                  key={cor.hex}
                  type="button"
                  onClick={() => onCopyHex(cor.hex)}
                  title={`Copiar ${cor.nome} (${cor.hex})`}
                  className="h-8.5 pl-2 pr-2.5 rounded-[10px] bg-white/82 dark:bg-[#0f1115]/75 border border-white/80 dark:border-white/14 hover:scale-[1.03] transition-transform inline-flex items-center gap-2 cursor-pointer"
                >
                  <span
                    style={{ backgroundColor: cor.hex }}
                    className="w-4.5 h-4.5 rounded-[5px] border border-[#0f1115]/15 shrink-0"
                  />
                  <span className="text-[11.5px] font-mono font-medium text-[#0f1115] dark:text-[#f2f4f7]">
                    {copiedHex === cor.hex ? 'Copiado' : cor.hex}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </BentoCard>

      {/* 2. LOGOTIPOS OFICIAIS (NO MESMO BRAND BOOK, COM GRADE DE PROPORÇÃO) */}
      <BentoCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-[#0f1115]/8 dark:border-[#f2f4f7]/8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
              Logotipos e assinaturas
            </h3>
            <p className="text-[12px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 mt-0.5">
              Versões oficiais vetoriais prontas para aplicação digital ou impressa
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowConstructionGrid((g) => !g)}
            className={`h-8 px-3 rounded-[10px] text-[12px] font-medium inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
              showConstructionGrid
                ? 'bg-[#163744] text-white border-[#163744] dark:bg-[#9fdce6] dark:text-[#0f1115] dark:border-[#9fdce6]'
                : 'bg-[#f2f4f7] dark:bg-[#1b2029] text-[#0f1115]/70 dark:text-[#f2f4f7]/70 border-[#0f1115]/8 dark:border-white/10'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span>Grade de proporção</span>
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {brandKit.logos.map((logo) => {
            const isDarkStage = logo.fundo === 'escuro';
            return (
              <div
                key={logo.id}
                className="rounded-[16px] border border-[#0f1115]/8 dark:border-white/10 bg-[#f8fafc] dark:bg-[#10141b] overflow-hidden flex flex-col justify-between"
              >
                <div
                  className={`relative h-[132px] flex items-center justify-center overflow-hidden border-b border-[#0f1115]/8 dark:border-white/8 ${
                    isDarkStage ? 'bg-[#0f1115]' : 'bg-[#f4f6f9]'
                  }`}
                >
                  {showConstructionGrid && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0"
                      style={{
                        backgroundImage: isDarkStage
                          ? 'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)'
                          : 'linear-gradient(to right, rgba(22,55,68,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(22,55,68,0.06) 1px, transparent 1px)',
                        backgroundSize: '16px 16px',
                      }}
                    />
                  )}
                  <div className="relative z-10">
                    <ClientVectorLogotype clientId={client.id} logo={logo} />
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                      {logo.nome}
                    </div>
                    <div className="text-[11.5px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55 truncate mt-0.5">
                      {logo.variante} · {logo.formato}
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() =>
                      onDownloadAsset(
                        `${logo.monograma.toLowerCase()}_${logo.id}.svg`,
                        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 80"><text x="20" y="50" font-family="sans-serif" font-weight="600" font-size="28" letter-spacing="4" fill="${logo.corPrincipal}">${logo.monograma}</text></svg>`,
                        `Vetor "${logo.nome}" baixado em SVG.`
                      )
                    }
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>SVG</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </BentoCard>

      {/* 3. PALETA DE CORES & SISTEMA TIPOGRÁFICO LADO A LADO */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        {/* Esquerda: Paleta oficial de cores */}
        <BentoCard className="xl:col-span-7 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-[#0f1115]/8 dark:border-[#f2f4f7]/8 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                Paleta cromática
              </h3>
              <p className="text-[12px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 mt-0.5">
                Clique em qualquer cor para copiar o código HEX
              </p>
            </div>
            <span className="text-[11.5px] font-medium tabular-nums text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
              {brandKit.cores.length} cores
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#0f1115]/8 dark:border-[#f2f4f7]/8 text-[11.5px] font-medium text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                  <th className="py-3 pl-5 pr-4 font-medium">Amostra</th>
                  <th className="py-3 px-4 font-medium">Cor & Uso</th>
                  <th className="py-3 px-4 font-medium">HEX</th>
                  <th className="py-3 px-4 font-medium">RGB</th>
                  <th className="py-3 pl-4 pr-5 font-medium text-right">Copiar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0f1115]/6 dark:divide-[#f2f4f7]/6 text-[13.5px]">
                {brandKit.cores.map((cor) => {
                  const copied = copiedHex === cor.hex;
                  return (
                    <tr
                      key={cor.hex}
                      onClick={() => onCopyHex(cor.hex)}
                      className="hover:bg-[#f6f8fa] dark:hover:bg-[#191d26] transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 pl-5 pr-4">
                        <span
                          style={{ backgroundColor: cor.hex }}
                          className="block w-12 h-8 rounded-[8px] border border-[#0f1115]/12 shadow-2xs"
                        />
                      </td>
                      <td className="py-3.5 px-4 min-w-[180px]">
                        <div className="font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                          {cor.nome}
                        </div>
                        <div className="text-[11.5px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                          {cor.uso}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[12.5px] text-[#0f1115] dark:text-[#f2f4f7] whitespace-nowrap">
                        {cor.hex}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[12px] tabular-nums text-[#0f1115]/55 dark:text-[#f2f4f7]/55 whitespace-nowrap">
                        {hexToRgbString(cor.hex)}
                      </td>
                      <td className="py-3.5 pl-4 pr-5 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#163744] dark:text-[#9fdce6]">
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#15803d] dark:text-[#4ade80]" />
                              <span className="text-[#166534] dark:text-[#4ade80]">
                                Copiado
                              </span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar</span>
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </BentoCard>

        {/* Direita: Sistema tipográfico */}
        <BentoCard className="xl:col-span-5 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-[#0f1115]/8 dark:border-[#f2f4f7]/8 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                Sistema tipográfico
              </h3>
              <p className="text-[12px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 mt-0.5">
                Famílias oficiais e hierarquia de leitura
              </p>
            </div>
            <span className="text-[11.5px] font-medium tabular-nums text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
              {brandKit.fontes.length}{' '}
              {brandKit.fontes.length === 1 ? 'família' : 'famílias'}
            </span>
          </div>

          <div className="divide-y divide-[#0f1115]/6 dark:divide-[#f2f4f7]/6 flex-1">
            {brandKit.fontes.map((fonte) => {
              const spec = getFontSpecimenStyle(fonte.nome);
              return (
                <div
                  key={fonte.nome}
                  className="p-5 flex items-center justify-between gap-4 hover:bg-[#f6f8fa]/70 dark:hover:bg-[#191d26]/70 transition-colors"
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-baseline gap-3">
                      <span
                        style={{
                          fontFamily: spec.fontFamily,
                          letterSpacing: spec.tracking,
                        }}
                        className="text-[28px] font-semibold leading-none text-[#0f1115] dark:text-[#f2f4f7]"
                      >
                        Aa Bb
                      </span>
                      <span className="text-[15px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                        {fonte.nome}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-[#0f1115]/60 dark:text-[#f2f4f7]/60">
                      {fonte.papel}
                    </p>
                    <Badge variant="neutral" size="xs">
                      {fonte.peso}
                    </Badge>
                  </div>

                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() =>
                      onDownloadAsset(
                        `${fonte.nome.replace(/\s+/g, '_')}_Spec.txt`,
                        `Família tipográfica: ${fonte.nome}\nUso: ${fonte.papel}\nPesos: ${fonte.peso}`,
                        `Especificação de "${fonte.nome}" baixada.`
                      )
                    }
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Spec</span>
                  </Button>
                </div>
              );
            })}
          </div>
        </BentoCard>
      </div>

      {/* 4. MANUAIS, FOTOS & TEMPLATES */}
      <BentoCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-[#0f1115]/8 dark:border-[#f2f4f7]/8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
              Manuais, fotos e templates
            </h3>
            <p className="text-[12px] text-[#0f1115]/50 dark:text-[#f2f4f7]/50 mt-0.5">
              Acervo centralizado para sua equipe e fornecedores
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <SegmentedControl
              layoutId="brand-assets-filter"
              ariaLabel="Filtrar arquivos da marca"
              value={assetFilter}
              onChange={setAssetFilter}
              options={[
                { id: 'Todos', label: 'Todos' },
                { id: 'Manual', label: 'Manuais' },
                { id: 'Fotos', label: 'Fotos' },
                { id: 'Templates', label: 'Templates' },
              ]}
            />

            <Button variant="secondary" size="sm" onClick={onOpenAddAsset}>
              <Plus className="w-3.5 h-3.5" />
              <span>Guardar arquivo</span>
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#0f1115]/8 dark:border-[#f2f4f7]/8 text-[11.5px] font-medium text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                <th className="py-3.5 pl-5 pr-4 font-medium">Material</th>
                <th className="py-3.5 px-4 font-medium">Categoria</th>
                <th className="py-3.5 px-4 font-medium">Formato</th>
                <th className="py-3.5 px-4 font-medium">Tamanho</th>
                <th className="py-3.5 px-4 font-medium">Atualizado em</th>
                <th className="py-3.5 pl-4 pr-5 font-medium text-right">
                  Download
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0f1115]/6 dark:divide-[#f2f4f7]/6 text-[13.5px]">
              {filteredFiles.map((arq) => {
                const thumb = ASSET_THUMBNAILS[arq.id];
                const Icon =
                  arq.categoria === 'Manual'
                    ? BookOpen
                    : arq.categoria === 'Fotos'
                      ? FileImage
                      : Layers;

                return (
                  <tr
                    key={arq.id}
                    className="hover:bg-[#f6f8fa] dark:hover:bg-[#191d26] transition-colors"
                  >
                    <td className="py-3.5 pl-5 pr-4 min-w-[260px]">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-9 rounded-[8px] overflow-hidden bg-[#ebeff3] dark:bg-[#10141b] flex items-center justify-center shrink-0">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={arq.titulo}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Icon className="w-4 h-4 text-[#163744] dark:text-[#9fdce6]" />
                          )}
                        </div>
                        <span className="font-semibold text-[#0f1115] dark:text-[#f2f4f7]">
                          {arq.titulo}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-[12.5px] text-[#0f1115]/68 dark:text-[#f2f4f7]/68">
                      {arq.categoria}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge variant="neutral" size="xs">
                        {arq.formato}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap tabular-nums text-[12.5px] text-[#0f1115]/60 dark:text-[#f2f4f7]/60">
                      {arq.tamanho}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap tabular-nums text-[12.5px] text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
                      {arq.atualizadoEm}
                    </td>
                    <td className="py-3.5 pl-4 pr-5 text-right whitespace-nowrap">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() =>
                          onDownloadAsset(
                            `${arq.titulo.replace(/\s+/g, '_')}.${arq.formato.toLowerCase()}`,
                            `Ativo de Marca: ${arq.titulo}`,
                            `Baixando ${arq.titulo}`
                          )
                        }
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
    </div>
  );
}
