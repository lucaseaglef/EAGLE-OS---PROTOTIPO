import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  ArrowUpRight,
  Check,
  Maximize2,
  SlidersHorizontal,
} from 'lucide-react';
import {
  MemberAvatar,
  PageHeader,
  StatusIndicator,
} from '../components/SharedUI';
import {
  ActivityBarDatum,
  BentoCard,
  HatchedActivityBars,
  HatchedComparisonChart,
  SplineTrendChart,
  StudioSculptureGraphic,
} from '../components/VisualWidgets';
import { useEagle } from '../context/EagleContext';
import {
  AGENT_STATUS_META,
  formatBRL,
  formatShortDate,
  TASK_STATUS_META,
} from '../utils/formatters';

const WEEK_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function DashboardView({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const {
    state,
    setActiveSection,
    setSelectedTaskId,
    setPreviewArtifact,
    resolveDecision,
    getMember,
    getProject,
    getTask,
  } = useEagle();

  const [search, setSearch] = useState('');
  const [activityScope, setActivityScope] = useState<'todas' | 'agentes'>('todas');
  const [flowMode, setFlowMode] = useState<'caixa' | 'entregas'>('caixa');
  const [spendWindow, setSpendWindow] = useState<'semana' | 'mes'>('semana');

  const metrics = useMemo(() => {
    const agentIds = new Set(
      state.members.filter((m) => m.tipo === 'agente').map((m) => m.id)
    );

    const emAndamento = state.tasks.filter(
      (t) => t.estado === 'em_andamento' || t.estado === 'em_revisao'
    ).length;
    const bloqueadas = state.tasks.filter((t) => t.estado === 'bloqueada').length;
    const concluidas = state.tasks.filter((t) => t.estado === 'concluida').length;
    const totalTarefas = state.tasks.length;
    const tarefasComAgente = state.tasks.filter((t) =>
      agentIds.has(t.responsavelId)
    ).length;
    const tarefasEquipeHumana = Math.max(0, totalTarefas - tarefasComAgente);
    const pctAgente = Math.round(
      (tarefasComAgente / Math.max(1, totalTarefas)) * 100
    );
    const pctHumana = Math.max(0, 100 - pctAgente);

    const decisoes = state.decisions.filter((d) => d.status === 'pendente');

    const agents = state.members.filter((m) => m.tipo === 'agente');
    const agentsWorking = agents.filter(
      (a) => a.estadoOperacional === 'trabalhando'
    ).length;
    const agentsIssue = agents.filter((a) => a.estadoOperacional === 'problema').length;

    let recebido = 0;
    let aReceber = 0;
    let pago = 0;
    let aPagar = 0;
    for (const f of state.finances) {
      if (f.tipo === 'receber' && f.status === 'liquidado') recebido += f.valorCentavos;
      if (f.tipo === 'receber' && f.status === 'pendente') aReceber += f.valorCentavos;
      if (f.tipo === 'pagar' && f.status === 'liquidado') pago += f.valorCentavos;
      if (f.tipo === 'pagar' && f.status === 'pendente') aPagar += f.valorCentavos;
    }

    const totalCarteira = Math.max(1, recebido + aReceber);
    const pctRecebido = Math.round((recebido / totalCarteira) * 100);
    const pctAReceber = Math.max(0, 100 - pctRecebido);

    const totalArtefatos = state.tasks.reduce(
      (sum, t) => sum + t.artefatos.length,
      0
    );
    const totalMensagens = state.tasks.reduce(
      (sum, t) => sum + t.mensagens.length,
      0
    );

    return {
      emAndamento,
      bloqueadas,
      concluidas,
      totalTarefas,
      tarefasComAgente,
      tarefasEquipeHumana,
      pctAgente,
      pctHumana,
      decisoesCount: decisoes.length,
      agentsTotal: agents.length,
      agentsWorking,
      agentsIssue,
      recebido,
      aReceber,
      totalCarteira: recebido + aReceber,
      pctRecebido,
      pctAReceber,
      pago,
      aPagar,
      saidas: pago + aPagar,
      saldoProjetado: recebido + aReceber - (pago + aPagar),
      totalArtefatos,
      totalMensagens,
    };
  }, [state]);

  const weeklyBars: ActivityBarDatum[] = useMemo(() => {
    const baseAll = [4, 6, 5, 7, Math.max(8, metrics.emAndamento + 5), 6, 4];
    const baseAgents = [2, 4, 3, 5, Math.max(6, metrics.agentsWorking + 3), 4, 3];
    const values = activityScope === 'todas' ? baseAll : baseAgents;

    return WEEK_LABELS.map((label, idx) => ({
      key: label,
      label,
      value: values[idx],
      highlight: idx === 4,
      callout: idx === 4 ? `${values[idx]} hoje` : undefined,
    }));
  }, [activityScope, metrics.emAndamento, metrics.agentsWorking]);

  const weeklyActivityTotal = useMemo(
    () => weeklyBars.reduce((sum, item) => sum + item.value, 0),
    [weeklyBars]
  );

  const comparisonSeries = useMemo(() => {
    if (flowMode === 'caixa') {
      const k = Math.max(1, Math.round(metrics.totalCarteira / 100000));
      return {
        headline: formatBRL(metrics.totalCarteira),
        subtitle: 'Receita prevista do ciclo',
        currentLabel: 'Atual',
        previousLabel: 'Anterior',
        calloutLabel: '+24%',
        current: [18, 22, 26, 25, 34, 36, 42].map((v) => v * k),
        previous: [14, 15, 19, 18, 23, 25, 29].map((v) => v * k),
      };
    }

    const base = Math.max(1, metrics.totalArtefatos);
    return {
      headline: `${metrics.totalArtefatos} entregas`,
      subtitle: `${metrics.concluidas} tarefas finalizadas`,
      currentLabel: 'Ciclo atual',
      previousLabel: 'Ciclo anterior',
      calloutLabel: '+31%',
      current: [6, 9, 11, 13, 17, 19, 22].map((v) => v + base),
      previous: [4, 6, 7, 9, 11, 12, 14].map((v) => v + Math.floor(base * 0.6)),
    };
  }, [flowMode, metrics.totalCarteira, metrics.totalArtefatos, metrics.concluidas]);

  const spendSeries = useMemo(() => {
    if (spendWindow === 'semana') {
      return {
        headline: formatBRL(metrics.aPagar),
        subline: `Pago: ${formatBRL(metrics.pago)}`,
        values: [14, 22, 18, 34, 24, 30, 38],
        peakIndex: 3,
        peakCallout: `${metrics.decisoesCount} pendências`,
      };
    }
    return {
      headline: formatBRL(metrics.saidas),
      subline: `Em aberto: ${formatBRL(metrics.aPagar)}`,
      values: [19, 25, 29, 41, 33, 39, 46],
      peakIndex: 3,
      peakCallout: formatBRL(metrics.aPagar),
    };
  }, [spendWindow, metrics.aPagar, metrics.pago, metrics.saidas, metrics.decisoesCount]);

  const activeAgents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.members.filter(
      (m) =>
        m.tipo === 'agente' &&
        (!q ||
          m.nome.toLowerCase().includes(q) ||
          m.cargo.toLowerCase().includes(q))
    );
  }, [state.members, search]);

  const pendingDecisions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.decisions
      .filter(
        (d) =>
          d.status === 'pendente' &&
          (!q ||
            d.titulo.toLowerCase().includes(q) ||
            d.pergunta.toLowerCase().includes(q))
      )
      .slice(0, 3);
  }, [state.decisions, search]);

  const upcomingTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...state.tasks]
      .filter(
        (t) =>
          t.estado !== 'concluida' &&
          t.estado !== 'cancelada' &&
          (!q || t.titulo.toLowerCase().includes(q) || t.codigo.toLowerCase().includes(q))
      )
      .sort((a, b) => a.prazo.localeCompare(b.prazo))
      .slice(0, 5);
  }, [state.tasks, search]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader
        title="Painel"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filtrar estúdio..."
        primaryAction={{
          label: 'Abrir tarefas',
          onClick: () => setActiveSection('tarefas'),
        }}
        onOpenMobileMenu={onOpenMobileMenu}
      />

      <div className="flex-1 overflow-y-auto p-5 lg:p-7">
        <div className="max-w-[1380px] mx-auto space-y-5">
          {/* FAIXA 1: BENTO ASSIMÉTRICO DE ASSINATURA (5 BLOCOS) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
            {/* COLUNA ESQUERDA: CARD-HERÓI ALTO COM ESCULTURA + OVERLAY DE VIDRO + COLUNAS VERTICAIS */}
            <BentoCard className="xl:col-span-4 p-5 flex flex-col justify-between gap-4 relative overflow-hidden">
              {/* Cabeçalho */}
              <div className="flex items-center justify-between gap-3 relative z-10">
                <div>
                  <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                    Pulso do estúdio
                  </h2>
                  <p className="text-[12px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                    {metrics.agentsIssue > 0
                      ? `${metrics.agentsIssue} agente precisa de atenção`
                      : 'Operação híbrida em ritmo ativo'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSection('agentes')}
                  title="Ver agentes"
                  className="w-8 h-8 rounded-full border border-[#0f1115]/8 dark:border-[#f2f4f7]/10 bg-[#f2f4f7]/80 dark:bg-[#1b2029] hover:bg-[#e6e9ed] dark:hover:bg-[#252c39] text-[#0f1115]/70 dark:text-[#f2f4f7]/75 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>

              {/* Zona escultórica + Painel em glassmorfismo real sobreposto */}
              <div className="relative pt-1">
                <div className="h-[154px] flex justify-end items-start -mr-2">
                  <div className="w-full max-w-[270px] h-[188px] -mt-4">
                    <StudioSculptureGraphic />
                  </div>
                </div>

                <div className="relative z-10 -mt-[88px] rounded-[18px] overflow-hidden backdrop-blur-xl backdrop-saturate-150 bg-white/46 dark:bg-[#141922]/52 border border-white/80 dark:border-white/15 p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_14px_34px_rgba(22,55,68,0.10)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_16px_36px_rgba(0,0,0,0.44)]">
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/55 via-white/12 to-transparent dark:from-white/10 dark:via-white/3 dark:to-transparent"
                    aria-hidden="true"
                  />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-[9px] bg-white/75 dark:bg-white/10 border border-white/80 dark:border-white/15 text-[#163744] dark:text-[#9fdce6] flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(22,55,68,0.06)]">
                          <Activity className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[12.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                            Produção ao vivo
                          </div>
                          <div className="text-[11px] text-[#0f1115]/58 dark:text-[#f2f4f7]/58 truncate">
                            {metrics.totalMensagens} trocas no estúdio
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveSection('tarefas')}
                        title="Abrir tarefas"
                        className="w-7 h-7 rounded-full border border-white/80 dark:border-white/15 bg-white/70 dark:bg-white/10 hover:bg-white/95 dark:hover:bg-white/20 text-[#0f1115]/75 dark:text-[#f2f4f7]/80 flex items-center justify-center transition-colors cursor-pointer shrink-0 backdrop-blur-md"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-3.5 grid grid-cols-2 gap-3 pt-2.5 border-t border-[#0f1115]/8 dark:border-white/10">
                      <div>
                        <div className="text-[26px] font-semibold tracking-[-0.03em] tabular-nums text-[#0f1115] dark:text-[#f2f4f7] leading-none">
                          {metrics.emAndamento}
                          <span className="ml-1 text-[12px] font-normal text-[#0f1115]/58 dark:text-[#f2f4f7]/58">
                            ativas
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[26px] font-semibold tracking-[-0.03em] tabular-nums text-[#163744] dark:text-[#9fdce6] leading-none">
                          {metrics.agentsWorking}/{metrics.agentsTotal}
                          <span className="ml-1 text-[12px] font-normal text-[#0f1115]/58 dark:text-[#f2f4f7]/58">
                            IA
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Base: duas colunas verticais comparativas luminosas */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveSection('agentes')}
                  className="rounded-[16px] bg-[#f2f4f7]/80 dark:bg-[#10141b] p-1.5 h-[146px] flex flex-col justify-between text-left group cursor-pointer hover:ring-1 hover:ring-[#163744]/20 dark:hover:ring-[#9fdce6]/25 transition-all"
                >
                  <div className="px-2 pt-1.5 flex items-baseline justify-between gap-1">
                    <span className="text-[12.5px] font-semibold tabular-nums text-[#163744] dark:text-[#9fdce6]">
                      {metrics.pctAgente}%
                    </span>
                    <span className="text-[10.5px] text-[#0f1115]/45 dark:text-[#f2f4f7]/45">
                      fração IA
                    </span>
                  </div>
                  <div
                    className="w-full rounded-[12px] bg-[#9fdce6] text-[#0f1115] px-3 py-2.5 flex flex-col justify-between transition-all duration-300"
                    style={{ height: `${Math.max(54, Math.min(76, metrics.pctAgente))}%` }}
                  >
                    <div className="text-[18px] font-semibold tracking-[-0.02em] tabular-nums leading-none">
                      {metrics.tarefasComAgente}
                    </div>
                    <div className="text-[11px] font-medium text-[#0f1115]/75">
                      Com agentes IA
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('equipe')}
                  className="rounded-[16px] bg-[#f2f4f7]/80 dark:bg-[#10141b] p-1.5 h-[146px] flex flex-col justify-between text-left group cursor-pointer hover:ring-1 hover:ring-[#163744]/20 dark:hover:ring-[#9fdce6]/25 transition-all"
                >
                  <div className="px-2 pt-1.5 flex items-baseline justify-between gap-1">
                    <span className="text-[12.5px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                      {metrics.pctHumana}%
                    </span>
                    <span className="text-[10.5px] text-[#0f1115]/45 dark:text-[#f2f4f7]/45">
                      direção
                    </span>
                  </div>
                  <div
                    className="w-full rounded-[12px] bg-[#163744] text-white dark:bg-[#234f60] px-3 py-2.5 flex flex-col justify-between transition-all duration-300"
                    style={{ height: `${Math.max(46, Math.min(72, metrics.pctHumana + 18))}%` }}
                  >
                    <div className="text-[18px] font-semibold tracking-[-0.02em] tabular-nums leading-none">
                      {metrics.tarefasEquipeHumana}
                    </div>
                    <div className="text-[11px] font-medium text-white/78">
                      Equipe humana
                    </div>
                  </div>
                </button>
              </div>
            </BentoCard>

            {/* COLUNA DIREITA: GRADE 2x2 ASSIMÉTRICA (5/7 E 7/5) */}
            <div className="xl:col-span-8 flex flex-col gap-4">
              {/* LINHA SUPERIOR */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Atividade da semana (5/12) */}
                <BentoCard className="md:col-span-5 p-5 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                        Atividade
                      </h2>
                      <p className="mt-1 text-[12px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                        {activityScope === 'todas'
                          ? 'Entregas na semana'
                          : 'Rodadas de IA na semana'}
                      </p>
                      <div className="mt-1 text-[30px] font-semibold tracking-[-0.03em] tabular-nums text-[#0f1115] dark:text-[#f2f4f7] leading-none">
                        {weeklyActivityTotal}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setActivityScope((prev) =>
                            prev === 'todas' ? 'agentes' : 'todas'
                          )
                        }
                        title={
                          activityScope === 'todas'
                            ? 'Filtrar só agentes de IA'
                            : 'Mostrar toda a produção'
                        }
                        className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                          activityScope === 'agentes'
                            ? 'bg-[#163744] text-white border-[#163744] dark:bg-[#9fdce6] dark:text-[#0f1115] dark:border-[#9fdce6]'
                            : 'border-[#0f1115]/8 dark:border-[#f2f4f7]/10 bg-[#f2f4f7]/80 dark:bg-[#1b2029] text-[#0f1115]/70 dark:text-[#f2f4f7]/75 hover:bg-[#e6e9ed] dark:hover:bg-[#252c39]'
                        }`}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSection('tarefas')}
                        title="Abrir tarefas"
                        className="w-8 h-8 rounded-full border border-[#0f1115]/8 dark:border-[#f2f4f7]/10 bg-[#f2f4f7]/80 dark:bg-[#1b2029] hover:bg-[#e6e9ed] dark:hover:bg-[#252c39] text-[#0f1115]/70 dark:text-[#f2f4f7]/75 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <HatchedActivityBars
                    data={weeklyBars}
                    onSelectBar={() => setActiveSection('tarefas')}
                  />
                </BentoCard>

                {/* Fluxo comparativo do estúdio (7/12) */}
                <BentoCard className="md:col-span-7 p-5 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                        Comparativo do estúdio
                      </h2>
                      <p className="mt-1 text-[12px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                        {comparisonSeries.subtitle}
                      </p>
                      <div className="mt-1 text-[28px] font-semibold tracking-[-0.03em] tabular-nums text-[#0f1115] dark:text-[#f2f4f7] leading-none truncate">
                        {comparisonSeries.headline}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setFlowMode((prev) =>
                            prev === 'caixa' ? 'entregas' : 'caixa'
                          )
                        }
                        title={
                          flowMode === 'caixa'
                            ? 'Alternar para ritmo de entregas'
                            : 'Alternar para comparativo financeiro'
                        }
                        className={`h-8 px-3 rounded-full border text-[11.5px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                          flowMode === 'entregas'
                            ? 'bg-[#163744] text-white border-[#163744] dark:bg-[#9fdce6] dark:text-[#0f1115] dark:border-[#9fdce6]'
                            : 'border-[#0f1115]/8 dark:border-[#f2f4f7]/10 bg-[#f2f4f7]/80 dark:bg-[#1b2029] text-[#0f1115]/75 dark:text-[#f2f4f7]/80 hover:bg-[#e6e9ed] dark:hover:bg-[#252c39]'
                        }`}
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        <span>{flowMode === 'caixa' ? 'Caixa' : 'Entregas'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setActiveSection(
                            flowMode === 'caixa' ? 'financeiro' : 'projetos'
                          )
                        }
                        title={
                          flowMode === 'caixa'
                            ? 'Abrir financeiro'
                            : 'Abrir projetos'
                        }
                        className="w-8 h-8 rounded-full border border-[#0f1115]/8 dark:border-[#f2f4f7]/10 bg-[#f2f4f7]/80 dark:bg-[#1b2029] hover:bg-[#e6e9ed] dark:hover:bg-[#252c39] text-[#0f1115]/70 dark:text-[#f2f4f7]/75 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <HatchedComparisonChart
                      labels={WEEK_LABELS}
                      currentSeries={comparisonSeries.current}
                      previousSeries={comparisonSeries.previous}
                      currentLabel={comparisonSeries.currentLabel}
                      previousLabel={comparisonSeries.previousLabel}
                      calloutLabel={comparisonSeries.calloutLabel}
                      calloutIndex={4}
                    />
                  </div>
                </BentoCard>
              </div>

              {/* LINHA INFERIOR */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1">
                {/* Saídas e pendências (7/12) */}
                <BentoCard className="md:col-span-7 p-5 flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                        Saídas e pendências
                      </h2>
                      <p className="mt-0.5 text-[12px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                        {spendWindow === 'semana'
                          ? 'Compromissos em aberto'
                          : 'Total comprometido no ciclo'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setSpendWindow((prev) =>
                            prev === 'semana' ? 'mes' : 'semana'
                          )
                        }
                        title={
                          spendWindow === 'semana'
                            ? 'Ver ciclo completo'
                            : 'Ver apenas em aberto'
                        }
                        className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                          spendWindow === 'mes'
                            ? 'bg-[#163744] text-white border-[#163744] dark:bg-[#9fdce6] dark:text-[#0f1115] dark:border-[#9fdce6]'
                            : 'border-[#0f1115]/8 dark:border-[#f2f4f7]/10 bg-[#f2f4f7]/80 dark:bg-[#1b2029] text-[#0f1115]/70 dark:text-[#f2f4f7]/75 hover:bg-[#e6e9ed] dark:hover:bg-[#252c39]'
                        }`}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSection('decisoes')}
                        title="Abrir fila de decisões"
                        className="w-8 h-8 rounded-full border border-[#0f1115]/8 dark:border-[#f2f4f7]/10 bg-[#f2f4f7]/80 dark:bg-[#1b2029] hover:bg-[#e6e9ed] dark:hover:bg-[#252c39] text-[#0f1115]/70 dark:text-[#f2f4f7]/75 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                    <div className="sm:col-span-5 flex flex-col justify-between gap-3">
                      <div>
                        <div className="text-[26px] font-semibold tracking-[-0.03em] tabular-nums text-[#0f1115] dark:text-[#f2f4f7] leading-none">
                          {spendSeries.headline}
                        </div>
                        <div className="mt-1 text-[11.5px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 tabular-nums">
                          {spendSeries.subline}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveSection('decisoes')}
                          className="w-full rounded-[10px] bg-[#f2f4f7]/85 dark:bg-[#10141b] hover:bg-[#e6e9ed] dark:hover:bg-[#1a202b] px-3 py-1.5 flex items-center gap-2 text-left transition-colors cursor-pointer"
                        >
                          <span className="text-[13px] font-semibold tabular-nums text-[#163744] dark:text-[#9fdce6]">
                            {metrics.decisoesCount}
                          </span>
                          <span className="text-[11.5px] text-[#0f1115]/68 dark:text-[#f2f4f7]/68">
                            Decisões
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveSection('tarefas')}
                          className="w-full rounded-[10px] bg-[#f2f4f7]/85 dark:bg-[#10141b] hover:bg-[#e6e9ed] dark:hover:bg-[#1a202b] px-3 py-1.5 flex items-center gap-2 text-left transition-colors cursor-pointer"
                        >
                          <span className="text-[13px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                            {metrics.bloqueadas}
                          </span>
                          <span className="text-[11.5px] text-[#0f1115]/68 dark:text-[#f2f4f7]/68">
                            Travadas
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="sm:col-span-7">
                      <SplineTrendChart
                        labels={WEEK_LABELS}
                        values={spendSeries.values}
                        peakIndex={spendSeries.peakIndex}
                        peakCallout={spendSeries.peakCallout}
                      />
                    </div>
                  </div>
                </BentoCard>

                {/* Carteira e recebíveis (5/12) */}
                <BentoCard className="md:col-span-5 p-5 flex flex-col justify-between gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                        Carteira e recebíveis
                      </h2>
                      <p className="mt-1 text-[12px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48">
                        Saldo projetado: {formatBRL(metrics.saldoProjetado)}
                      </p>
                      <div className="mt-1 text-[27px] font-semibold tracking-[-0.03em] tabular-nums text-[#0f1115] dark:text-[#f2f4f7] leading-none">
                        {formatBRL(metrics.totalCarteira)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveSection('financeiro')}
                      title="Abrir financeiro"
                      className="w-8 h-8 rounded-full border border-[#0f1115]/8 dark:border-[#f2f4f7]/10 bg-[#f2f4f7]/80 dark:bg-[#1b2029] hover:bg-[#e6e9ed] dark:hover:bg-[#252c39] text-[#0f1115]/70 dark:text-[#f2f4f7]/75 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Duas barras horizontais largas estilo Virtual Cards */}
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() => setActiveSection('financeiro')}
                      className="w-full flex items-center gap-3 group cursor-pointer text-left"
                    >
                      <span className="w-16 text-[12px] text-[#0f1115]/60 dark:text-[#f2f4f7]/60 shrink-0">
                        Recebido
                      </span>
                      <div className="flex-1 h-9 rounded-[11px] bg-[#f2f4f7] dark:bg-[#10141b] overflow-hidden relative flex items-center">
                        <div
                          className="h-full rounded-[11px] bg-[#9fdce6] transition-all duration-300"
                          style={{ width: `${Math.max(24, metrics.pctRecebido)}%` }}
                        />
                        <span className="absolute left-3 text-[12.5px] font-semibold tabular-nums text-[#0f1115]">
                          {metrics.pctRecebido}%
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveSection('financeiro')}
                      className="w-full flex items-center gap-3 group cursor-pointer text-left"
                    >
                      <span className="w-16 text-[12px] text-[#0f1115]/60 dark:text-[#f2f4f7]/60 shrink-0">
                        A receber
                      </span>
                      <div className="flex-1 h-9 rounded-[11px] bg-[#f2f4f7] dark:bg-[#10141b] overflow-hidden relative flex items-center">
                        <div
                          className="h-full rounded-[11px] bg-[#dfe5ec] dark:bg-[#232b38] transition-all duration-300"
                          style={{ width: `${Math.max(24, metrics.pctAReceber)}%` }}
                        />
                        <span className="absolute left-3 text-[12.5px] font-semibold tabular-nums text-[#0f1115] dark:text-[#f2f4f7]">
                          {metrics.pctAReceber}%
                        </span>
                      </div>
                    </button>
                  </div>
                </BentoCard>
              </div>
            </div>
          </div>

          {/* FAIXA 2: APROVAÇÕES DIRETAS + TIME DE IA AO VIVO */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <BentoCard className="xl:col-span-7 p-5 flex flex-col">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                    Aprovações na sua mesa
                  </h2>
                  <span className="text-[12px] font-medium text-[#0f1115]/45 dark:text-[#f2f4f7]/45 tabular-nums">
                    {metrics.decisoesCount}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('decisoes')}
                  title="Abrir caixa de decisões"
                  className="w-8 h-8 rounded-full border border-[#0f1115]/8 dark:border-[#f2f4f7]/10 bg-[#f2f4f7]/80 dark:bg-[#1b2029] hover:bg-[#e6e9ed] dark:hover:bg-[#252c39] text-[#0f1115]/70 dark:text-[#f2f4f7]/75 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>

              {pendingDecisions.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-[13.5px] font-medium text-[#0f1115]/60 dark:text-[#f2f4f7]/60">
                    Nenhuma decisão pendente no momento.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <AnimatePresence initial={false}>
                    {pendingDecisions.map((dec) => {
                      const requester = getMember(dec.solicitanteId);
                      const project = getProject(dec.projetoId);
                      const task = getTask(dec.tarefaId);
                      const artifact = dec.artefatoId
                        ? task?.artefatos.find((a) => a.id === dec.artefatoId)
                        : undefined;

                      return (
                        <motion.div
                          key={dec.id}
                          layout
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                          className="rounded-[14px] bg-[#f2f4f7]/75 dark:bg-[#10141b] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            {artifact?.previewUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewArtifact({ artifact, taskId: task?.id })
                                }
                                title="Ampliar entrega"
                                className="relative w-16 h-12 rounded-[10px] overflow-hidden shrink-0 group cursor-pointer bg-[#e6e9ed] dark:bg-[#1e2530]"
                              >
                                <img
                                  src={artifact.previewUrl}
                                  alt={artifact.titulo}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                                />
                                <span className="absolute inset-0 bg-[#0f1115]/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </span>
                              </button>
                            ) : (
                              <MemberAvatar member={requester} size="md" showOperationalRing />
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="text-[13.5px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                                {dec.titulo}
                              </div>
                              <div className="mt-0.5 text-[12px] text-[#0f1115]/52 dark:text-[#f2f4f7]/52 flex items-center gap-1.5 truncate">
                                <span>{requester?.nome}</span>
                                <span aria-hidden="true">·</span>
                                <span className="text-[#163744] dark:text-[#9fdce6] font-medium truncate">
                                  {project?.nome}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="tabular-nums shrink-0">{dec.criadoEm}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => resolveDecision(dec.id, 'aprovada')}
                              className="eagle-btn-primary h-8 px-3 text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{dec.acaoPrimaria}</span>
                            </button>
                            {task && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTaskId(task.id);
                                  setActiveSection('tarefas');
                                }}
                                className="eagle-btn-secondary h-8 px-2.5 text-[12px] font-medium cursor-pointer whitespace-nowrap"
                              >
                                {task.codigo}
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </BentoCard>

            <BentoCard className="xl:col-span-5 p-5 flex flex-col">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                  Time de IA agora
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveSection('agentes')}
                  title="Gerenciar agentes"
                  className="w-8 h-8 rounded-full border border-[#0f1115]/8 dark:border-[#f2f4f7]/10 bg-[#f2f4f7]/80 dark:bg-[#1b2029] hover:bg-[#e6e9ed] dark:hover:bg-[#252c39] text-[#0f1115]/70 dark:text-[#f2f4f7]/75 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeAgents.map((ag) => {
                  const st = AGENT_STATUS_META[ag.estadoOperacional ?? 'parado'];
                  const currentTask = ag.tarefaAtualId
                    ? getTask(ag.tarefaAtualId)
                    : undefined;
                  const totalSub = currentTask?.subtarefas.length ?? 0;
                  const doneSub =
                    currentTask?.subtarefas.filter((s) => s.concluida).length ?? 0;

                  return (
                    <button
                      key={ag.id}
                      type="button"
                      onClick={() => {
                        if (currentTask) {
                          setSelectedTaskId(currentTask.id);
                          setActiveSection('tarefas');
                        } else {
                          setActiveSection('agentes');
                        }
                      }}
                      className="rounded-[14px] bg-[#f2f4f7]/75 dark:bg-[#10141b] hover:bg-[#ebeff3] dark:hover:bg-[#1b2029] p-3 text-left transition-colors cursor-pointer flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MemberAvatar member={ag} size="sm" showOperationalRing />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-semibold text-[#0f1115] dark:text-[#f2f4f7] truncate">
                            {ag.nome}
                          </div>
                          <div className="text-[11px] text-[#0f1115]/48 dark:text-[#f2f4f7]/48 truncate">
                            {ag.cargo}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <StatusIndicator
                          label={st.label}
                          dotClass={st.dotClass}
                          textClass={st.textClass}
                          live={ag.estadoOperacional === 'trabalhando'}
                        />
                        {currentTask && (
                          <span className="text-[11px] font-medium text-[#163744] dark:text-[#9fdce6] tabular-nums">
                            {currentTask.codigo}
                          </span>
                        )}
                      </div>

                      {totalSub > 0 && (
                        <div className="h-1 w-full rounded-full bg-[#e6e9ed] dark:bg-[#232934] overflow-hidden">
                          <div
                            className="h-full bg-[#163744] dark:bg-[#9fdce6] rounded-full transition-all duration-300"
                            style={{ width: `${Math.round((doneSub / totalSub) * 100)}%` }}
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </BentoCard>
          </div>

          {/* FAIXA 3: RADAR DE ENTREGAS POR PRAZO */}
          <BentoCard className="p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#0f1115] dark:text-[#f2f4f7]">
                Próximas entregas
              </h2>
              <button
                type="button"
                onClick={() => setActiveSection('tarefas')}
                title="Ver todas as tarefas"
                className="w-8 h-8 rounded-full border border-[#0f1115]/8 dark:border-[#f2f4f7]/10 bg-[#f2f4f7]/80 dark:bg-[#1b2029] hover:bg-[#e6e9ed] dark:hover:bg-[#252c39] text-[#0f1115]/70 dark:text-[#f2f4f7]/75 flex items-center justify-center transition-colors cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {upcomingTasks.map((t) => {
                const member = getMember(t.responsavelId);
                const meta = TASK_STATUS_META[t.estado];

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTaskId(t.id);
                      setActiveSection('tarefas');
                    }}
                    className="rounded-[14px] bg-[#f2f4f7]/75 dark:bg-[#10141b] hover:bg-[#ebeff3] dark:hover:bg-[#1b2029] p-3.5 text-left transition-colors cursor-pointer flex flex-col justify-between gap-3 group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold text-[#163744] dark:text-[#9fdce6] tabular-nums">
                        {formatShortDate(t.prazo)}
                      </span>
                      <StatusIndicator
                        label={meta.label}
                        dotClass={meta.dotClass}
                        textClass={meta.textClass}
                        live={t.estado === 'em_andamento'}
                      />
                    </div>

                    <div className="text-[13px] font-medium text-[#0f1115] dark:text-[#f2f4f7] leading-snug line-clamp-2 group-hover:text-[#163744] dark:group-hover:text-[#9fdce6] transition-colors">
                      {t.titulo}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MemberAvatar member={member} size="xs" />
                        <span className="text-[11.5px] text-[#0f1115]/58 dark:text-[#f2f4f7]/58 truncate">
                          {member?.nome.split(' ')[0]}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#0f1115]/40 dark:text-[#f2f4f7]/40 tabular-nums shrink-0">
                        {t.codigo}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </BentoCard>
        </div>
      </div>
    </div>
  );
}
