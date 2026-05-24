// Mock data + helpers shared across the kit
// Numbers chosen to look realistic in BRL (vírgula decimal).

const fmtBRL = (v) => {
  const s = (Math.abs(v)).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (v < 0 ? '−' : '') + 'R$ ' + s;
};

const fmtNum = (v) => {
  return v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const MONESY_MARK = (fill1, fill2) => (
  <svg viewBox="0 0 100 100" width="28" height="28">
    <rect x="14" y="22" width="16" height="56" rx="6" fill={fill1}/>
    <rect x="70" y="22" width="16" height="56" rx="6" fill={fill1}/>
    <path d="M 30 70 L 50 38 L 70 70 L 62 70 L 50 52 L 38 70 Z" fill={fill2}/>
  </svg>
);

// Realistic month
const SAMPLE_RECEITAS = [
  { id: 'r1', secao: 'Salário', descricao: 'Salário CLT',          valor: 4800.00, investido: false, tags: ['fixo'] },
  { id: 'r2', secao: 'Salário', descricao: 'Vale-refeição',         valor:  640.00, investido: false, tags: ['fixo','benefício'] },
  { id: 'r3', secao: 'Extras',  descricao: 'Freela · landing page', valor:  400.00, investido: true,  tags: ['extra'] },
];

const SAMPLE_DESPESAS = [
  { id: 'd1', secao: 'Despesas fixas',  descricao: 'Aluguel',           valor: 1450.00, pago: true,  tags: ['moradia','fixo'] },
  { id: 'd2', secao: 'Despesas fixas',  descricao: 'Condomínio',        valor:  420.00, pago: true,  tags: ['moradia'] },
  { id: 'd3', secao: 'Despesas fixas',  descricao: 'Internet',          valor:  120.00, pago: false, tags: ['fixo'] },
  { id: 'd4', secao: 'Mercado',         descricao: 'Feira semanal',     valor:   89.40, pago: true,  tags: ['mercado'] },
  { id: 'd5', secao: 'Mercado',         descricao: 'Supermercado · 18', valor:  312.85, pago: false, tags: ['mercado'] },
  { id: 'd6', secao: 'Lazer',           descricao: 'Cinema · Bom Retiro',valor:  68.00, pago: true,  tags: ['lazer'] },
  { id: 'd7', secao: 'Lazer',           descricao: 'Pedal · jantar',    valor:  142.00, pago: false, tags: ['lazer'] },
  { id: 'd8', secao: 'Saúde',           descricao: 'Plano · Bradesco',  valor:  389.00, pago: true,  tags: ['saúde','fixo'] },
];

const SAMPLE_ASSINATURAS = [
  { id: 'a1', descricao: 'Spotify Família', cartao: 'Nubank', valor: 27.90, inicio: '2024-03-15', fim: null,         ativa: true },
  { id: 'a2', descricao: 'Netflix · Padrão', cartao: 'Nubank', valor: 44.90, inicio: '2023-11-01', fim: null,         ativa: true },
  { id: 'a3', descricao: 'iCloud 200GB',    cartao: 'Itaú',   valor: 14.90, inicio: '2025-01-10', fim: null,         ativa: true },
  { id: 'a4', descricao: 'Adobe CC',        cartao: 'Itaú',   valor: 92.50, inicio: '2024-08-22', fim: '2026-04-22', ativa: false },
  { id: 'a5', descricao: 'Notion AI',       cartao: 'Nubank', valor: 49.00, inicio: '2025-09-04', fim: null,         ativa: true },
];

const SAMPLE_FEATURES = [
  { id: 'f025', titulo: 'Integração com Supabase (legado)',     ts: '23/05/2026 18:45', descricao: 'Substituída pelo backend MySQL em produção; mantida apenas como camada de compatibilidade.' },
  { id: 'f024', titulo: 'Toasts de feedback',                   ts: '22/05/2026 11:02', descricao: 'Mensagens leves de sucesso e erro nas ações do app.' },
  { id: 'f023', titulo: 'Navegação entre abas',                 ts: '21/05/2026 17:30', descricao: 'Header e botões contextuais trocam conforme aba ativa (gastos / assinaturas / features).' },
  { id: 'f022', titulo: 'Seções dinâmicas e tags',              ts: '20/05/2026 09:14', descricao: 'Criação de nova seção dentro do modal, chips de tags com sugestões e normalização.' },
  { id: 'f017', titulo: 'Atualização ao vivo do caixa',         ts: '17/05/2026 15:48', descricao: 'refreshCaixaFromState atualiza cards de resumo sem recarregar o mês.' },
];

const SAMPLE_HIGHLIGHTS = [
  { label: 'Melhor mês', value: 'Jul · R$ 3.420' },
  { label: 'Pior mês',  value: 'Fev · R$ −180'   },
  { label: 'Saída média', value: 'R$ 2.910' },
];

// Annual chart: 12 months of entrada / saida / liquido
const SAMPLE_ANNUAL = [
  { mes:'Jan', entrada:5400, saida:3120, liquido:2280 },
  { mes:'Fev', entrada:5400, saida:5580, liquido:-180 },
  { mes:'Mar', entrada:5600, saida:2980, liquido:2620 },
  { mes:'Abr', entrada:5400, saida:3210, liquido:2190 },
  { mes:'Mai', entrada:5840, saida:3215, liquido:2625 },
  { mes:'Jun', entrada:6100, saida:3400, liquido:2700 },
  { mes:'Jul', entrada:6300, saida:2880, liquido:3420 },
  { mes:'Ago', entrada:5400, saida:3120, liquido:2280 },
  { mes:'Set', entrada:5400, saida:3000, liquido:2400 },
  { mes:'Out', entrada:5400, saida:3340, liquido:2060 },
  { mes:'Nov', entrada:5400, saida:3210, liquido:2190 },
  { mes:'Dez', entrada:5400, saida:4120, liquido:1280 },
];

Object.assign(window, {
  fmtBRL, fmtNum, MESES, MONESY_MARK,
  SAMPLE_RECEITAS, SAMPLE_DESPESAS, SAMPLE_ASSINATURAS, SAMPLE_FEATURES,
  SAMPLE_HIGHLIGHTS, SAMPLE_ANNUAL,
});
