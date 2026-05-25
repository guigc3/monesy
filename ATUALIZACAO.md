# Guia de Atualização — Monesy em Produção

> Fluxo testado e validado para o VPS Hostinger (Ubuntu 22.04).  
> **Regra de ouro:** build local no Windows → enviar `dist/` via SCP → corrigir permissões → reiniciar.

---

## Por que buildar localmente?

O VPS usa uma versão antiga do Node.js que é incompatível com o Vite 5.  
A solução é **sempre buildar na máquina Windows** e enviar apenas a pasta `dist/` pronta para o servidor.  
O VPS só precisa do Python/Flask para rodar — não precisa de Node.js.

---

## Passo a passo completo

### 1. Atualizar o código local

No terminal Windows (cmd ou PowerShell), na pasta do projeto:

```cmd
cd "C:\Users\Guilherme\OneDrive\Documentos\Projeto CheckList\monesy"
git pull origin main
```

---

### 2. Buildar o frontend

```cmd
cd "C:\Users\Guilherme\OneDrive\Documentos\Projeto CheckList\monesy\frontend"
npm run build
```

Confirme que o build foi gerado:

```cmd
dir "C:\Users\Guilherme\OneDrive\Documentos\Projeto CheckList\monesy\frontend\dist\index.html"
```

Deve exibir o arquivo sem erro.

---

### 3. Enviar o `dist/` para o VPS via SCP

> ⚠️ **Use `\dist\.` com ponto no final.** Isso copia o *conteúdo* da pasta, evitando criar `dist/dist/` no servidor.

Abra o **PowerShell** e execute:

```powershell
scp -r "C:\Users\Guilherme\OneDrive\Documentos\Projeto CheckList\monesy\frontend\dist\." root@IP_DO_VPS:/home/monesy/monesy/frontend/dist/
```

---

### 4. Corrigir permissões no VPS

> ⚠️ **Este passo é obrigatório após cada SCP.**  
> O SCP enviado como `root` cria os arquivos com dono `root`, impedindo que o Flask (que roda como usuário `monesy`) leia os arquivos. Isso causa o erro `{"error":"Not found"}` no site.

No terminal SSH do VPS:

```bash
sudo chown -R monesy:monesy /home/monesy/monesy/frontend/dist
sudo chmod -R 755 /home/monesy/monesy/frontend/dist
```

Confirme que ficou correto:

```bash
ls -la /home/monesy/monesy/frontend/dist/
```

A saída deve mostrar `monesy monesy` como dono — **não** `root root`:

```
drwxr-xr-x  4 monesy monesy  4096 ...  assets/
drwxr-xr-x  5 monesy monesy  4096 ...  design-system/
-rw-r--r--  1 monesy monesy   986 ...  index.html
```

---

### 5. Reiniciar o serviço Flask

```bash
sudo systemctl restart monesy
```

Verifique se está rodando:

```bash
sudo systemctl status monesy
```

Deve aparecer **`active (running)`** em verde.

---

### 6. Testar

Acesse **https://monesy.com.br** e pressione **Ctrl + Shift + R** (hard refresh) para limpar o cache do navegador.

---

## Quando há novas features na tela de histórico

Se o deploy incluiu novas features, elas precisam ser inseridas na tabela MySQL.  
Execute no VPS após o passo 1:

```bash
cd /home/monesy/monesy
source .venv/bin/activate
python scripts/inserir_features.py
```

---

## Quando só o backend mudou (sem alterações no frontend)

Se apenas arquivos Python foram alterados (`app.py`, `db/`, etc.), não é necessário refazer o build. Basta:

```bash
# No VPS
cd /home/monesy/monesy
git pull origin main
source .venv/bin/activate
pip install -r requirements.txt   # só se requirements.txt mudou
sudo systemctl restart monesy
```

---

## Checklist rápido

```
[ ] git pull origin main                        (Windows — atualiza código local)
[ ] npm run build                               (Windows — gera frontend/dist/)
[ ] scp .../dist/. root@IP:/...dist/            (PowerShell — envia para o VPS)
[ ] chown -R monesy:monesy .../dist             (VPS — corrige dono dos arquivos)
[ ] chmod -R 755 .../dist                       (VPS — corrige permissões de leitura)
[ ] systemctl restart monesy                    (VPS — reinicia o serviço)
[ ] python scripts/inserir_features.py          (VPS — só se houver novas features)
[ ] Ctrl+Shift+R no navegador                   (limpa cache do browser)
```

---

## Erros comuns e soluções

| Erro | Causa | Solução |
|---|---|---|
| `{"error":"Not found"}` no site | `dist/` com dono `root` — Flask não consegue ler os arquivos | `sudo chown -R monesy:monesy .../dist` → reiniciar |
| Site com versão antiga após deploy | Cache do navegador | Ctrl+Shift+R (hard refresh) |
| `dist/dist/` criado no servidor | SCP sem `\.` no final do caminho | `mv dist/dist/* dist/ && rm -rf dist/dist` → corrigir permissões → reiniciar |
| `SyntaxError: Unexpected reserved word` ao tentar buildar no VPS | Node.js desatualizado no servidor | Buildar localmente no Windows e enviar via SCP |
| `ssh: Could not resolve hostname` no SCP | Caminho Windows mal formatado | Usar PowerShell com aspas duplas e `\.` no final |
| Features não aparecem na tela | Tabela MySQL não atualizada | `python scripts/inserir_features.py` no VPS |
| 502 Bad Gateway | Serviço parado ou travado | `sudo systemctl restart monesy` → verificar `journalctl -u monesy -n 30` |

---

## Diagnóstico rápido

```bash
# Ver logs do serviço
sudo journalctl -u monesy -n 30 --no-pager

# Verificar estrutura e permissões do dist
ls -la /home/monesy/monesy/frontend/dist/

# Testar se o Flask responde
curl -s http://localhost:5001/api/config
```

---

## Referências

- Guia completo de primeiro deploy: [`DEPLOY.md`](DEPLOY.md)
- Script de features MySQL: [`scripts/inserir_features.py`](scripts/inserir_features.py)
