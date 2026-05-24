// AuthScreen — login / signup overlay. Petrol-deep → ink gradient backdrop.

const AuthScreen = ({ onLogin }) => {
  const [mode, setMode] = React.useState('login');
  const [email, setEmail] = React.useState('camila@monesy.com.br');
  const [senha, setSenha] = React.useState('••••••••');

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <span className="logo-mark" aria-hidden="true">
          {MONESY_MARK('#00ACC1', '#D4AF37')}
        </span>
        <h2>{mode === 'login' ? 'Entrar' : 'Criar conta'}</h2>
        <p className="auth-subtitle">
          {mode === 'login' ? 'Acesse sua conta Monesy' : 'É de graça e leva 30 segundos'}
        </p>
        <form className="auth-form" onSubmit={(e) => { e.preventDefault(); onLogin({ email }); }}>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Senha
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </label>
          <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', padding: '12px 16px', fontSize: 14 }}>
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
        <p className="auth-switch">
          {mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Cadastre-se' : 'Entrar'}
          </button>
        </p>
      </div>
    </div>
  );
};

Object.assign(window, { AuthScreen });
