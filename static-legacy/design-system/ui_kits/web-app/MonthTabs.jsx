// MonthTabs — 12 segmented month buttons with "revisado" checkbox below.

const MonthTabs = ({ mes, revisados, onMes, onRevisar }) => (
  <nav className="month-tabs" aria-label="Meses">
    {MESES.map((label, i) => {
      const idx = i + 1;
      const isActive = mes === idx;
      const isRevisado = revisados.includes(idx);
      return (
        <div key={label} className={'month-tab-cell ' + (isRevisado ? 'revisado' : '')}>
          <button
            type="button"
            className={'month-tab ' + (isActive ? 'active' : '')}
            onClick={() => onMes(idx)}
          >{label}</button>
          <input
            type="checkbox"
            className="month-revisado-cb"
            checked={isRevisado}
            onChange={() => onRevisar(idx)}
            title="Marcar mês como revisado"
          />
        </div>
      );
    })}
  </nav>
);

Object.assign(window, { MonthTabs });
