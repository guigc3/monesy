// SummaryCards — 5 stat cards (Entrada, Saída, Caixa, A pagar, Orçamento)

const SummaryCards = ({ totals }) => {
  const items = [
    { cls: 'card-entrada',  label: 'Entrada',          value: totals.entrada,   hint: null },
    { cls: 'card-saida',    label: 'Saída total',      value: totals.saida,     hint: null },
    { cls: 'card-caixa',    label: 'Caixa disponível', value: totals.caixa,
      hint: 'Receitas em caixa − investido − despesas pagas' },
    { cls: 'card-pendente', label: 'A pagar',          value: totals.pendente,  hint: null },
    { cls: 'card-orcamento',label: 'Orçamento',        value: totals.orcamento, hint: 'Entrada − saída total' },
  ];
  return (
    <section className="summary-cards">
      {items.map((it) => (
        <article key={it.label} className={'card ' + it.cls}>
          <span className="card-label">{it.label}</span>
          {it.hint && <span className="card-hint">{it.hint}</span>}
          <strong className="card-value">{fmtBRL(it.value)}</strong>
        </article>
      ))}
    </section>
  );
};

Object.assign(window, { SummaryCards });
