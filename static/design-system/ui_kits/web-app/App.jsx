// App — main shell. Drives the click-thru prototype:
//   AuthScreen → Dashboard (Gastos) → toggle pago/investido → open modal → save (toast)
//   Tabs switch to Assinaturas, Features.

const App = () => {
  const [authed, setAuthed]   = React.useState(false);
  const [view, setView]       = React.useState('gastos');
  const [ano, setAno]         = React.useState(2026);
  const [mes, setMes]         = React.useState(5);
  const [revisados, setRevisados] = React.useState([1, 2, 3, 4]);
  const [dark, setDark]       = React.useState(false);

  const [receitas, setReceitas]   = React.useState(SAMPLE_RECEITAS);
  const [despesas, setDespesas]   = React.useState(SAMPLE_DESPESAS);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalTipo, setModalTipo] = React.useState('despesa');
  const [toast, setToast]         = React.useState(null);

  // Toggle data-theme on root so colors_and_type.css dark vars kick in
  React.useEffect(() => {
    if (dark) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }, [dark]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const handleToggle = (id, tipo) => {
    if (tipo === 'despesa') {
      setDespesas((prev) => prev.map((d) => d.id === id ? { ...d, pago: !d.pago } : d));
      showToast('Lançamento atualizado.');
    } else {
      setReceitas((prev) => prev.map((d) => d.id === id ? { ...d, investido: !d.investido } : d));
      showToast('Lançamento atualizado.');
    }
  };

  const handleRevisar = (idx) => {
    setRevisados((prev) => prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx]);
  };

  const handleAdd = (tipo) => {
    setModalTipo(tipo);
    setModalOpen(true);
  };

  const handleSave = (data) => {
    if (!data.descricao || !data.valor) { setModalOpen(false); return; }
    const newItem = {
      id: 'n' + Date.now(),
      secao: data.secao || (data.tipo === 'receita' ? 'Extras' : 'Despesas fixas'),
      descricao: data.descricao,
      valor: data.valor,
      tags: data.tags || [],
      pago: false,
      investido: false,
    };
    if (data.tipo === 'receita') setReceitas([...receitas, newItem]);
    else setDespesas([...despesas, newItem]);
    setModalOpen(false);
    showToast('✓ Lançamento salvo.');
  };

  // Totals
  const totals = React.useMemo(() => {
    const entrada     = receitas.reduce((a, b) => a + b.valor, 0);
    const investido   = receitas.filter((r) => r.investido).reduce((a, b) => a + b.valor, 0);
    const saida       = despesas.reduce((a, b) => a + b.valor, 0);
    const saidaPaga   = despesas.filter((d) => d.pago).reduce((a, b) => a + b.valor, 0);
    return {
      entrada, saida,
      caixa: entrada - investido - saidaPaga,
      pendente: saida - saidaPaga,
      orcamento: entrada - saida,
    };
  }, [receitas, despesas]);

  if (!authed) {
    return <AuthScreen onLogin={() => setAuthed(true)} />;
  }

  return (
    <>
      <Header
        view={view}
        ano={ano} onAno={setAno}
        onNew={() => handleAdd(view === 'assinaturas' ? 'assinatura' : 'despesa')}
        onTheme={() => setDark(!dark)}
        dark={dark}
      />
      <AppTabs view={view} onView={setView} />

      {view === 'gastos' && (
        <main className="container">
          <MonthTabs mes={mes} revisados={revisados} onMes={setMes} onRevisar={handleRevisar} />
          <SummaryCards totals={totals} />
          <AnnualChart
            data={SAMPLE_ANNUAL}
            highlights={SAMPLE_HIGHLIGHTS}
            subtitle={<>2026 · líquido <strong>R$ {fmtNum(totals.orcamento)}</strong></>}
          />
          <div className="grid-main">
            <LancamentosPanel tipo="receita" items={receitas} onAdd={handleAdd} onToggle={handleToggle} />
            <LancamentosPanel tipo="despesa" items={despesas} onAdd={handleAdd} onToggle={handleToggle} />
          </div>
        </main>
      )}

      {view === 'assinaturas' && <AssinaturasView items={SAMPLE_ASSINATURAS} />}
      {view === 'features'    && <FeaturesView    items={SAMPLE_FEATURES} />}

      <NovoLancamentoModal
        open={modalOpen}
        initialTipo={modalTipo === 'assinatura' ? 'despesa' : modalTipo}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      {toast && <div className="toast">{toast}</div>}
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
