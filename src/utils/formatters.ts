import {
  AgentOperationalStatus,
  DecisionStatus,
  ProjectStatus,
  TaskStatus,
} from '../types/eagle';

export function formatBRL(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavos / 100);
}

export function formatShortDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const [, month, day] = parts;
  const months = [
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
  const monthIdx = Math.max(0, Math.min(11, parseInt(month, 10) - 1));
  return `${day} ${months[monthIdx]}`;
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
