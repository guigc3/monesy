// AssinaturasView, FeaturesView — secondary tabs

const AssinaturasView = ({ items }) => {
  const ativas = items.filter((a) => a.ativa);
  const total = ativas.reduce((a, b) => a + b.valor, 0);
  return (
    <main className="container">
      <section className="summary-cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <article className="card card-orcamento">
          <span className="card-label">Total mensal (ativas)</span>
          <span className="card-hint">Sem data fim ou com fim futuro</span>
          <strong className="card-value">{fmtBRL(total)}</strong>
        </article>
        <article className="card card-saida">
          <span className="card-label">Cadastradas</span>
          <strong className="card-value" style={{ fontSize: 26 }}>{items.length}</strong>
        </article>
        <article className="card card-pendente">
          <span className="card-label">Ativas</span>
          <strong className="card-value" style={{ fontSize: 26 }}>{ativas.length}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div className="panel-header-title">
            <div>
              <span className="panel-eyebrow">Recorrentes</span>
              <h2>Assinaturas e recorrentes no cartão</h2>
            </div>
          </div>
          <label className="field-inline" style={{ color: 'var(--gray)' }}>
            Cartão
            <select style={{ background: 'var(--cream)', color: 'var(--ink)', border: '1px solid var(--line)' }}>
              <option>Todos</option><option>Nubank</option><option>Itaú</option>
            </select>
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Cartão</th>
                <th>Período</th>
                <th>Status</th>
                <th className="col-valor">Mensal</th>
                <th className="col-acoes">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} style={ a.ativa ? null : { opacity: 0.72 } }>
                  <td style={{ fontWeight: 500 }}>{a.descricao}</td>
                  <td><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{a.cartao}</span></td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                    {a.inicio} {a.fim ? '→ ' + a.fim : '→ —'}
                  </td>
                  <td>
                    {a.ativa
                      ? <span className="badge-ativa">Ativa</span>
                      : <span className="badge-encerrada">Encerrada</span>}
                  </td>
                  <td className="col-valor">{fmtBRL(a.valor)}</td>
                  <td className="col-acoes">
                    <button className="btn-icon" title="Histórico">📋</button>
                    <button className="btn-icon" title="Editar">✏️</button>
                    <button className="btn-icon" title="Excluir">🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};

const FeaturesView = ({ items }) => (
  <main className="container">
    <section className="panel">
      <div className="panel-header">
        <div className="panel-header-title">
          <div>
            <span className="panel-eyebrow">Produto</span>
            <h2>Features implementadas</h2>
          </div>
        </div>
        <span className="feature-count-badge">{items.length}</span>
      </div>
      <div style={{ padding: 18 }}>
        <div style={{
          font: 'inherit', fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace',
          textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--petrol)',
          marginBottom: 12,
        }}>Linha do tempo</div>
        <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((f) => (
            <li key={f.id} className="feature-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
                <h4 className="feature-title">{f.titulo}</h4>
                <span className="feature-ts">{f.ts}</span>
              </div>
              <p className="feature-desc">{f.descricao}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  </main>
);

Object.assign(window, { AssinaturasView, FeaturesView });
