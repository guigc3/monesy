// Modal — lançamento dialog. Cosmetic; on save just closes.

const NovoLancamentoModal = ({ open, onClose, onSave, initialTipo = 'despesa' }) => {
  const [tipo, setTipo] = React.useState(initialTipo);
  const [descricao, setDescricao] = React.useState('');
  const [secao, setSecao] = React.useState('');
  const [valor, setValor] = React.useState('');
  const [tags, setTags] = React.useState([]);
  const [tagDraft, setTagDraft] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setTipo(initialTipo);
      setDescricao(''); setSecao(''); setValor('');
      setTags([]); setTagDraft('');
    }
  }, [open, initialTipo]);

  if (!open) return null;

  const secoesReceita = ['Salário', 'Extras', 'Investimentos'];
  const secoesDespesa = ['Despesas fixas', 'Mercado', 'Lazer', 'Saúde', 'Transporte'];
  const secoes = tipo === 'receita' ? secoesReceita : secoesDespesa;

  const addTag = () => {
    const t = tagDraft.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagDraft('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Novo lançamento</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Fechar" style={{ fontSize: 22 }}>×</button>
        </div>
        <div className="modal-body">
          <label>
            Tipo
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </select>
          </label>
          <label>
            Descrição
            <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)}
                   placeholder="Ex.: Salário, Condomínio" autoFocus />
          </label>
          <label>
            Seção
            <select value={secao} onChange={(e) => setSecao(e.target.value)}>
              <option value="">— escolha —</option>
              {secoes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label>
            Valor (R$)
            <input type="number" value={valor} onChange={(e) => setValor(e.target.value)}
                   placeholder="0,00" step="0.01" />
          </label>
          <label>
            Tags
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
              border: '1px solid var(--line)', borderRadius: 10,
              padding: '6px 10px', background: 'var(--cream)',
              minHeight: 44,
            }}>
              {tags.map((t) => (
                <span key={t} className="tag-chip">
                  {t}{' '}
                  <span style={{ color: 'var(--text-faint)', cursor: 'pointer', marginLeft: 4 }}
                        onClick={() => setTags(tags.filter((x) => x !== t))}>×</span>
                </span>
              ))}
              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
                placeholder="Digite e pressione Enter"
                style={{ flex: 1, minWidth: 120, border: 'none', outline: 'none', padding: '4px 2px', background: 'transparent', fontSize: 14, color: 'var(--ink)' }}
              />
            </div>
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onSave({ tipo, descricao, secao, valor: Number(valor) || 0, tags })}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { NovoLancamentoModal });
