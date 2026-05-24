// LancamentosPanel — Receitas or Despesas panel, grouped by seção.
// Renders the secao-title with paid/invested badge totals, and the row table.

const LancamentoTable = ({ items, tipo, onToggle }) => (
  <div className="table-wrap">
    <table>
      <thead>
        <tr>
          <th className="col-check"></th>
          <th>Descrição</th>
          <th>Tags</th>
          <th className="col-valor">Valor</th>
          <th className="col-acoes">Ações</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it) => {
          const checked = tipo === 'despesa' ? it.pago : it.investido;
          const rowClass =
            tipo === 'despesa' && it.pago ? 'row-pago' :
            tipo === 'receita' && it.investido ? 'row-investido' : '';
          return (
            <tr key={it.id} className={rowClass}>
              <td className="col-check">
                <input
                  type="checkbox"
                  className="check-pago"
                  checked={checked}
                  onChange={() => onToggle(it.id, tipo)}
                  title={tipo === 'despesa' ? 'Marcar como pago' : 'Marcar como investido'}
                />
              </td>
              <td>
                <div style={{ fontWeight: 500 }}>{it.descricao}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                  última alteração · 12/03 às 14:22
                </div>
              </td>
              <td>
                <div className="tag-list">
                  {it.tags.map((t) => <span key={t} className="tag-chip">{t}</span>)}
                </div>
              </td>
              <td className="col-valor">{fmtBRL(it.valor)}</td>
              <td className="col-acoes">
                <button className="btn-icon" title="Histórico">📋</button>
                <button className="btn-icon" title="Editar">✏️</button>
                <button className="btn-icon" title="Excluir">🗑</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const LancamentosPanel = ({ tipo, items, onAdd, onToggle }) => {
  const eyebrow = tipo === 'receita' ? 'Entradas' : 'Saídas';
  const title   = tipo === 'receita' ? 'Receitas' : 'Despesas';

  const total = tipo === 'despesa'
    ? items.filter((i) => i.pago).reduce((a, b) => a + b.valor, 0)
    : items.filter((i) => i.investido).reduce((a, b) => a + b.valor, 0);
  const badgeLabel = tipo === 'despesa' ? `Pago R$ ${fmtNum(total)}` : `Investido R$ ${fmtNum(total)}`;
  const badgeClass = tipo === 'despesa' ? 'secao-pago-badge' : 'secao-invest-badge';

  // Group by seção, preserving discovery order
  const groups = {};
  for (const it of items) (groups[it.secao] ||= []).push(it);

  return (
    <section className="panel">
      <div className="panel-header">
        <div className="panel-header-title">
          <div>
            <span className="panel-eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
          </div>
          {total > 0 && <span className={badgeClass}>{badgeLabel}</span>}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => onAdd(tipo)}>+ Adicionar</button>
      </div>
      {Object.entries(groups).map(([secao, rows]) => {
        const totalSecao = tipo === 'despesa'
          ? rows.filter((r) => r.pago).reduce((a, b) => a + b.valor, 0)
          : rows.filter((r) => r.investido).reduce((a, b) => a + b.valor, 0);
        return (
          <div key={secao}>
            <div className="secao-title">
              <span>{secao}</span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {totalSecao > 0 && (
                  <span className={badgeClass}>
                    {tipo === 'despesa' ? 'Pago' : 'Inv.'} R$ {fmtNum(totalSecao)}
                  </span>
                )}
                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--gray)' }}>
                  R$ {fmtNum(rows.reduce((a, b) => a + b.valor, 0))}
                </span>
              </div>
            </div>
            <LancamentoTable items={rows} tipo={tipo} onToggle={onToggle} />
          </div>
        );
      })}
    </section>
  );
};

Object.assign(window, { LancamentosPanel });
