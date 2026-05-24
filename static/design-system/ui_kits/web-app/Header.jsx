// Header — petrol gradient with logo, year select, theme toggle, action buttons.
// Maps to monesy/static/index.html `<header class="header">` + `<nav class="app-tabs">`.

const Header = ({ view, ano, onAno, onNew, onTheme, dark }) => (
  <header className="header">
    <div className="header-left">
      <span className="logo-mark" aria-hidden="true">
        {MONESY_MARK('#F2F3F5', '#D4AF37')}
      </span>
      <div>
        <h1>Monesy</h1>
        <div className="subtitle">
          {view === 'gastos' && 'Receitas, despesas e saldo mensal'}
          {view === 'assinaturas' && 'Recorrentes no cartão de crédito'}
          {view === 'features' && 'Registro de funcionalidades entregues'}
        </div>
      </div>
    </div>
    <div className="header-actions">
      {view === 'gastos' && (
        <label className="field-inline">
          Ano
          <select value={ano} onChange={(e) => onAno(Number(e.target.value))}>
            <option>2024</option><option>2025</option><option>2026</option>
          </select>
        </label>
      )}
      <button className="btn-theme-toggle" onClick={onTheme} title="Alternar tema">
        {dark ? '☀' : '☾'}
      </button>
      <div className="header-buttons">
        {view === 'gastos' && (
          <>
            <button className="btn-ghost">⬇ Modelo</button>
            <button className="btn-ghost">⬆ Importar</button>
            <button className="btn-ghost">🗑 Lixeira</button>
            <button className="btn-primary-light" onClick={onNew}>+ Novo lançamento</button>
          </>
        )}
        {view === 'assinaturas' && (
          <button className="btn-primary-light" onClick={onNew}>+ Nova assinatura</button>
        )}
      </div>
    </div>
  </header>
);

const AppTabs = ({ view, onView }) => (
  <nav className="app-tabs">
    {[
      ['gastos','Gastos mensais'],
      ['assinaturas','Assinaturas'],
      ['features','Features'],
    ].map(([id,label]) => (
      <button
        key={id}
        className={'app-tab ' + (view === id ? 'active' : '')}
        onClick={() => onView(id)}
      >
        {label}
      </button>
    ))}
  </nav>
);

Object.assign(window, { Header, AppTabs });
