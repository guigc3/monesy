# Atualizar produção após mudanças no GitHub

Guia para publicar alterações do **Flask** ou do **frontend Vue** no VPS (Hostinger).

Pré-requisito: deploy inicial concluído — ver [DEPLOY.md](DEPLOY.md).

---

## Fluxo resumido

```text
PC: git push origin main
        ↓
VPS: git pull → (pip install) → (npm run build) → systemctl restart monesy
        ↓
Testar: curl /api/config + site no navegador (Ctrl+Shift+R)
```

---

## 1. No seu computador (antes do servidor)

```bash
git add .
git commit -m "descrição da mudança"
git push origin main
```

---

## 2. No VPS — atualização completa

Conecte via SSH:

```bash
ssh root@SEU_IP_DO_VPS
```

Entre como usuário da aplicação:

```bash
sudo -u monesy -i
cd /home/monesy/monesy
```

### 2.1 Baixar código novo

```bash
git pull origin main
```

### 2.2 Dependências Python

Sempre após o pull (rápido se nada mudou):

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

### 2.3 Build do frontend Vue

Necessário se alterou anything em `frontend/` (componentes, CSS, rotas, etc.):

```bash
cd frontend
npm install
npm run build
cd ..
```

Confirme:

```bash
ls frontend/dist/index.html
```

### 2.4 Reiniciar a aplicação

Saia do usuário `monesy` se precisar de `sudo`:

```bash
exit
sudo systemctl restart monesy
sudo systemctl status monesy
```

Esperado: **`Active: active (running)`**.

### 2.5 Verificar

```bash
curl -s https://monesy.com.br/api/config
```

No navegador: `https://monesy.com.br` — use **Ctrl+Shift+R** (hard reload).

---

## 3. O que fazer conforme o tipo de mudança

| Você alterou | Passos no VPS |
|--------------|---------------|
| Só **backend** (`app.py`, `auth.py`, `db/`, etc.) | `git pull` → `pip install -r requirements.txt` → `systemctl restart monesy` |
| Só **frontend** (`frontend/src/`, assets, etc.) | `git pull` → `npm install && npm run build` em `frontend/` → `systemctl restart monesy` |
| **Backend + frontend** | Todos os passos da seção 2 |
| Só **`.env`** (senhas, MySQL, JWT) | Editar `/home/monesy/monesy/.env` no servidor → `systemctl restart monesy` |
| **`mysql_schema.sql`** (estrutura do banco) | Aplicar SQL no MySQL manualmente → depois `git pull` + restart |

> O arquivo `.env` **não** vem do GitHub (está no `.gitignore`). Edite-o direto no VPS.

---

## 4. Comandos em sequência (copiar e colar)

Como **root** ou com `sudo` onde indicado:

```bash
sudo -u monesy bash -lc '
  cd /home/monesy/monesy
  git pull origin main
  source .venv/bin/activate
  pip install -r requirements.txt
  cd frontend && npm install && npm run build && cd ..
'

sudo systemctl restart monesy
sudo systemctl status monesy --no-pager
curl -s https://monesy.com.br/api/config
```

Substitua `https://monesy.com.br` pelo seu domínio ou `http://SEU_IP` se ainda não tiver HTTPS.

---

## 5. Script opcional (`deploy.sh`)

No VPS, como usuário `monesy`:

```bash
nano /home/monesy/deploy.sh
```

Conteúdo:

```bash
#!/bin/bash
set -e
cd /home/monesy/monesy
git pull origin main
source .venv/bin/activate
pip install -r requirements.txt -q
cd frontend && npm install -q && npm run build && cd ..
sudo systemctl restart monesy
sleep 2
curl -s https://monesy.com.br/api/config
echo ""
echo "Deploy concluído."
```

Ativar:

```bash
chmod +x /home/monesy/deploy.sh
```

Uso (pedirá senha do sudo se `monesy` não tiver NOPASSWD):

```bash
./deploy.sh
```

---

## 6. Nginx e SSL

**Não** é necessário reiniciar o Nginx a cada deploy de código.

Reinicie só se alterou:

- `/etc/nginx/sites-available/monesy`
- certificados SSL
- domínio ou redirecionamentos

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 7. Se algo der errado

```bash
# Logs da aplicação
sudo journalctl -u monesy -n 50 --no-pager
sudo tail -30 /var/log/monesy/error.log

# App responde localmente?
curl -s http://127.0.0.1/api/config

# Socket do Gunicorn existe?
ls -la /run/monesy/monesy.sock
```

Problemas comuns após deploy:

| Sintoma | Causa provável | Ação |
|---------|----------------|------|
| Site antigo no navegador | Cache | Ctrl+Shift+R |
| 502 Bad Gateway | Serviço parado | `systemctl status monesy` |
| Página em branco | Build ausente | `cd frontend && npm run build` |
| Erro de import Python | Dependência nova | `pip install -r requirements.txt` |

Mais detalhes: seção **8** de [DEPLOY.md](DEPLOY.md).

---

## 8. Checklist rápido

- [ ] `git push` feito no GitHub
- [ ] `git pull` no VPS
- [ ] `pip install -r requirements.txt`
- [ ] `npm run build` (se mudou frontend)
- [ ] `systemctl restart monesy` → `active (running)`
- [ ] `curl .../api/config` OK
- [ ] Site testado no navegador
