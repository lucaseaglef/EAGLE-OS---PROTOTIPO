export type PortalRole = 'responsavel' | 'solicitante' | 'financeiro';

export type PortalSection =
  | 'inicio'
  | 'projetos'
  | 'aprovacoes'
  | 'entregas'
  | 'pedidos'
  | 'marca'
  | 'conversas'
  | 'resultados'
  | 'propostas'
  | 'contratos'
  | 'financeiro';

export interface PortalUser {
  id: string;
  clientId: string;
  nome: string;
  cargo: string;
  email: string;
  iniciais: string;
  papel: PortalRole;
}

export interface PortalProjectStage {
  id: string;
  nome: string;
  status: 'concluida' | 'em_andamento' | 'proxima';
  resumo: string;
  dataLabel?: string;
}

export interface PortalProject {
  id: string;
  clientId: string;
  nome: string;
  categoria: 'Identidade' | 'Site & Tecnologia' | 'Campanha' | 'Experiência';
  faseAtual: string;
  progressoPct: number;
  previsaoEntrega: string;
  liderEagleId: string;
  ultimoUpdate: string;
  esperandoCliente?: string;
  etapas: PortalProjectStage[];
}

export interface PiecePin {
  id: string;
  numero: number;
  xPct: number;
  yPct: number;
  autorNome: string;
  autorPapel: string;
  texto: string;
  horario: string;
  resolvido?: boolean;
}

export interface PortalPiece {
  id: string;
  clientId: string;
  projectId: string;
  titulo: string;
  categoria: 'Identidade' | 'Post' | 'Vídeo' | 'Site' | 'Material';
  versao: string;
  status: 'aguardando_aprovacao' | 'ajustes_solicitados' | 'aprovada';
  enviadaEm: string;
  descricao: string;
  previewUrl?: string;
  formato: string;
  dimensaoOuDuracao?: string;
  isVideo?: boolean;
  pins: PiecePin[];
}

export interface PortalDeliverable {
  id: string;
  clientId: string;
  projectId: string;
  titulo: string;
  categoria: 'Identidade' | 'Posts & Vídeo' | 'Site & Tech' | 'Materiais';
  versao: string;
  formato: string;
  tamanho: string;
  entregueEm: string;
  arquivoNome: string;
  previewUrl?: string;
}

export interface PortalRequest {
  id: string;
  clientId: string;
  projectId?: string;
  tipo:
    | 'Peça para redes'
    | 'Material gráfico'
    | 'Ajuste no site'
    | 'Vídeo / Motion'
    | 'Nova campanha';
  titulo: string;
  briefing: string;
  prazoDesejado: string;
  solicitanteNome: string;
  criadoEm: string;
  status: 'em_analise' | 'em_producao' | 'pronto_revisao';
}

export interface BrandLogoItem {
  id: string;
  nome: string;
  variante: string;
  formato: string;
  fundo: 'claro' | 'escuro';
  monograma: string;
  corPrincipal: string;
}

export interface BrandColorItem {
  nome: string;
  hex: string;
  uso: string;
}

export interface BrandFontItem {
  nome: string;
  papel: string;
  peso: string;
}

export interface BrandAssetFile {
  id: string;
  titulo: string;
  categoria: 'Manual' | 'Fotos' | 'Templates';
  formato: string;
  tamanho: string;
  atualizadoEm: string;
}

export interface PortalBrandKit {
  clientId: string;
  tagline: string;
  logos: BrandLogoItem[];
  cores: BrandColorItem[];
  fontes: BrandFontItem[];
  arquivos: BrandAssetFile[];
}

export interface PortalThreadMessage {
  id: string;
  remetenteNome: string;
  remetenteCargo: string;
  isEagle: boolean;
  avatarMemberId?: string;
  texto: string;
  horario: string;
  anexoNome?: string;
}

export interface PortalConversation {
  id: string;
  clientId: string;
  projectId: string;
  responsavelEagleId: string;
  naoLidas: number;
  mensagens: PortalThreadMessage[];
}

export interface PortalProposalContract {
  id: string;
  clientId: string;
  titulo: string;
  tipo: 'Proposta' | 'Contrato';
  codigo?: string;
  modalidade?: 'Escopo fechado' | 'Retainer mensal' | 'Aditivo contratual';
  escopoResumo: string;
  entregasIncluidas: string[];
  clausulas?: Array<{ titulo: string; texto: string }>;
  valorCentavos: number;
  condicaoPagamento: string;
  prazoEstimado: string;
  status: 'aguardando_assinatura' | 'assinado';
  enviadoEm: string;
  assinadoPor?: string;
  assinadoEm?: string;
  autenticidadeHash?: string;
}

export interface PortalInvoice {
  id: string;
  clientId: string;
  descricao: string;
  competencia: string;
  vencimento: string; // YYYY-MM-DD
  valorCentavos: number;
  status: 'vencida' | 'em_aberto' | 'paga';
  formaPreferida: 'Pix' | 'Boleto' | 'Cartão';
  pagoEm?: string;
  notaFiscalNumero?: string;
  notaFiscalArquivo?: string;
  codigoPix: string;
  linhaDigitavelBoleto: string;
}

export interface PortalResults {
  clientId: string;
  periodoLabel: string;
  temDados: boolean;
  mensagemSemDados?: string;
  kpis: Array<{
    label: string;
    valor: string;
    variacao: string;
    positivo: boolean;
  }>;
  serieSemanal: Array<{
    semana: string;
    alcance: number;
    engajamento: number;
  }>;
  destaques: Array<{
    titulo: string;
    canal: string;
    alcance: string;
    taxaEngajamento: string;
  }>;
}

export interface PortalClientProfile {
  id: string;
  nome: string;
  segmento: string;
  cidade: string;
  desdeAno: number;
  iniciais: string;
  corMarca: string;
}

export interface PortalDataset {
  clients: PortalClientProfile[];
  users: PortalUser[];
  projects: PortalProject[];
  pieces: PortalPiece[];
  deliverables: PortalDeliverable[];
  requests: PortalRequest[];
  brandKits: PortalBrandKit[];
  conversations: PortalConversation[];
  contracts: PortalProposalContract[];
  invoices: PortalInvoice[];
  results: PortalResults[];
}
