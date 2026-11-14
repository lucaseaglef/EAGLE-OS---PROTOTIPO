export type NavSection =
  | 'painel'
  | 'tarefas'
  | 'decisoes'
  | 'projetos'
  | 'clientes'
  | 'financeiro'
  | 'agentes'
  | 'equipe'
  | 'rotinas'
  | 'metas'
  | 'habilidades';

export type ThemePreference = 'system' | 'light' | 'dark';

export type TaskStatus =
  | 'a_fazer'
  | 'em_andamento'
  | 'em_revisao'
  | 'bloqueada'
  | 'concluida'
  | 'cancelada';

export type AgentOperationalStatus = 'trabalhando' | 'parado' | 'problema';

export type MemberKind = 'pessoa' | 'agente';

export interface Member {
  id: string;
  nome: string;
  cargo: string;
  tipo: MemberKind;
  iniciais: string;
  avatarUrl?: string;
  email?: string;
  acesso?: 'Administrador' | 'Direção' | 'Operação' | 'Convidado';
  estadoOperacional?: AgentOperationalStatus;
  observacaoEstado?: string;
  tarefaAtualId?: string;
  habilidadesIds?: string[];
  convitePendente?: boolean;
}

export interface Subtask {
  id: string;
  titulo: string;
  concluida: boolean;
  estado?: TaskStatus;
  responsavelId?: string;
}

export type ArtifactType = 'imagem' | 'documento' | 'codigo' | 'apresentacao';

export interface Artifact {
  id: string;
  titulo: string;
  tipo: ArtifactType;
  versao: string;
  formato: string;
  tamanho: string;
  autorId: string;
  criadoEm: string;
  previewUrl?: string;
  resumoConteudo?: string;
  aprovado?: boolean;
}

export type MessageReaction = 'gostei' | 'nao_gostei' | null;

export interface TaskMessage {
  id: string;
  remetenteId: string;
  texto: string;
  horario: string;
  tipo?: 'mensagem' | 'sistema';
  artefatoId?: string;
  decisaoId?: string;
  reacao?: MessageReaction;
  modeloIA?: string;
  anexosNomes?: string[];
  opcoesResposta?: string[];
  opcaoEscolhida?: string;
  resumoRodada?: string;
}

export interface TaskExecution {
  id: string;
  numero: number;
  agenteId: string;
  modeloIA: string;
  estado: 'executando' | 'concluida' | 'interrompida' | 'travada';
  inicio: string;
  fim?: string;
  resumo: string;
  etapas: string[];
  artefatosIds?: string[];
}

export interface QueuedMessage {
  id: string;
  texto: string;
  destinatarioId: string;
  modeloIA: string;
  anexosNomes?: string[];
  criadoEm: string;
}

export interface Task {
  id: string;
  codigo: string;
  titulo: string;
  briefing: string;
  criadoPorId: string;
  projetoId: string;
  responsavelId: string;
  revisorId: string;
  aprovadorId: string;
  observadoresIds: string[];
  vigilanteId?: string;
  etiquetas: string[];
  tarefaPaiId?: string | null;
  bloqueadaPorIds: string[];
  bloqueiaIds: string[];
  pastaArquivos: string;
  modeloPreferido: string;
  execucaoAtiva: boolean;
  execucoes: TaskExecution[];
  filaMensagens: QueuedMessage[];
  estado: TaskStatus;
  prazo: string; // YYYY-MM-DD
  criadaEm: string;
  iniciadaEm?: string;
  concluidaEm?: string;
  subtarefas: Subtask[];
  mensagens: TaskMessage[];
  artefatos: Artifact[];
  atualizadaEm: string;
}

export type DecisionStatus = 'pendente' | 'aprovada' | 'ajuste' | 'recusada';

export interface Decision {
  id: string;
  titulo: string;
  pergunta: string;
  contexto: string;
  solicitanteId: string;
  tarefaId: string;
  projetoId: string;
  acaoPrimaria: string;
  acaoSecundaria: string;
  status: DecisionStatus;
  criadoEm: string;
  respostaLucas?: string;
  artefatoId?: string;
}

export type ProjectStatus = 'ativo' | 'em_pausa' | 'concluido';

export interface ProjectSettings {
  disciplina: string;
  ritmoRevisao: string;
  aprovacaoDiretaLucas: boolean;
  repositorio?: string;
}

export interface Project {
  id: string;
  nome: string;
  clienteId: string;
  estado: ProjectStatus;
  prazoEntrega: string;
  liderId: string;
  descricao: string;
  configuracoes: ProjectSettings;
}

export interface Client {
  id: string;
  nome: string;
  segmento: string;
  contatoPrincipal: string;
  isInterno: boolean;
  status: 'ativo' | 'inativo';
}

export type FinanceType = 'receber' | 'pagar';
export type FinanceStatus = 'pendente' | 'liquidado';

export interface FinanceEntry {
  id: string;
  descricao: string;
  tipo: FinanceType;
  status: FinanceStatus;
  valorCentavos: number;
  vencimento: string; // YYYY-MM-DD
  clienteId: string;
  categoria: string;
}

export interface Routine {
  id: string;
  titulo: string;
  frequencia: string;
  proximoDisparo: string;
  responsavelId: string;
  projetoId: string;
  ativa: boolean;
  ultimaExecucao?: string;
}

export interface Goal {
  id: string;
  titulo: string;
  prazo: string;
  progresso: number;
  responsavelId: string;
  paiId: string | null;
  status: 'no_prazo' | 'atencao' | 'concluida';
}

export interface Skill {
  id: string;
  nome: string;
  categoria: string;
  resumo: string;
  passos: string[];
  agentesIds: string[];
  usosRecentes: number;
}
