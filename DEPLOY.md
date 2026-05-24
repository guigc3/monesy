# Guia de Deploy — Monesy em Produção

> **Stack:** Flask + MySQL + Vue 3 (Vite SPA)  
> **Recomendado:** Hostinger VPS (Ubuntu 22.04) com Gunicorn + Nginx  
> **Alternativas:** Railway · Render · Fly.io

---

## Índice

1. [Antes de fazer deploy](#1-antes-de-fazer-deploy)
2. [Opção A — Hostinger VPS *(recomendado)*](#2-opção-a--hostinger-vps)
3. [Opção B — Railway](#3-opção-b--railway)
4. [Opção C — Render](#4-opção-c--render)
5. [Variáveis de ambiente](#5-variáveis-de-ambiente)
6. [Pós-deploy: primeiro uso](#6-pós-deploy-primeiro-uso)
7. [Atualizações (rollout)](#7-atualizações-rollout)
8. [Resolução de problemas](#8-resolução-de-problemas)

---

## 1. Antes de fazer deploy

### 1.1 Build do frontend Vue

Sempre execute o build antes de enviar os arquivos ao servidor.

```bash
# Na raiz do projeto, na máquina local
cd frontend
npm install          # instala dependências (apenas se ainda não instalou)
npm run build        # gera frontend/dist/
cd ..
```

Após o build, confirme que `frontend/dist/index.html` existe.

### 1.2 Variáveis de ambiente

Crie o arquivo `.env` na raiz do projeto (nunca comite no git):

```dotenv
# Backend de armazenamento
STORAGE_BACKEND=mysql

# MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=monesy
MYSQL_PASSWORD=SenhaSuperSecreta
MYSQL_DATABASE=monesy

# JWT — gere com: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET_KEY=troque-por-uma-string-aleatoria-longa

# Flask
FLASK_ENV=production
SECRET_KEY=outra-string-aleatoria
```

### 1.3 Dependências Python

```bash
pip install -r requirements.txt
```

Se não houver `requirements.txt`, instale manualmente:

```bash
pip install flask flask-cors pymysql cryptography python-dotenv pyjwt bcrypt gunicorn openpyxl
```

---

## 2. Opção A — Hostinger VPS

**Plano mínimo:** KVM 1 (1 vCPU, 4 GB RAM, 50 GB SSD) — suficiente para uso pessoal/familiar.  
**Sistema operacional:** Ubuntu 22.04 LTS.

---

### 2.1 Acesso inicial ao VPS

```bash
# Da máquina local
ssh root@IP_DO_SEU_VPS
```

### 2.2 Preparar o servidor

```bash
# Atualizar pacotes
apt update && apt upgrade -y

# Instalar dependências do sistema
apt install -y python3 python3-pip python3-venv git nginx mysql-server certbot python3-certbot-nginx curl

# Criar usuário não-root para a aplicação
adduser monesy --disabled-password --gecos ""
usermod -aG www-data monesy
```

### 2.3 Instalar Node.js (somente se precisar buildar no servidor)

```bash
# Instala Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

> **Dica:** Buildar localmente e enviar `frontend/dist/` já compilado é mais rápido. O Node no servidor é necessário apenas se quiser buildar lá.

### 2.4 Clonar o projeto

```bash
su - monesy
git clone https://github.com/SEU_USUARIO/monesy.git /home/monesy/monesy
cd /home/monesy/monesy
```

Ou, se não usar Git, copie via `scp` ou SFTP:

```bash
# Da máquina local (inclui o dist já compilado)
scp -r ./monesy root@IP_DO_SEU_VPS:/home/monesy/monesy
```

### 2.5 Configurar ambiente Python

```bash
# Como usuário monesy
cd /home/monesy/monesy

python3 -m venv .venv
source .venv/bin/activate

pip install --upgrade pip
pip install flask flask-cors pymysql cryptography python-dotenv pyjwt bcrypt gunicorn openpyxl
```

### 2.6 Criar o arquivo `.env`

```bash
nano /home/monesy/monesy/.env
```

Cole as variáveis da [seção 5](#5-variáveis-de-ambiente), ajustando com suas credenciais reais.

### 2.7 Configurar MySQL

```bash
# Acesse o MySQL como root
mysql -u root -p

-- Dentro do MySQL:
CREATE DATABASE monesy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'monesy'@'localhost' IDENTIFIED BY 'SenhaSuperSecreta';
GRANT ALL PRIVILEGES ON monesy.* TO 'monesy'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Aplique o schema:

```bash
mysql -u monesy -p monesy < /home/monesy/monesy/mysql_schema.sql
```

### 2.8 Testar a aplicação antes do Nginx

```bash
cd /home/monesy/monesy
source .venv/bin/activate

# Teste rápido — deve mostrar "Running on http://0.0.0.0:5001"
gunicorn --bind 0.0.0.0:5001 --workers 2 app:app
# Ctrl+C para parar
```

### 2.9 Criar serviço systemd

```bash
# Saia do usuário monesy e volte como root
exit

nano /etc/systemd/system/monesy.service
```

Conteúdo do arquivo:

```ini
[Unit]
Description=Monesy — Flask App
After=network.target mysql.service

[Service]
User=monesy
Group=www-data
WorkingDirectory=/home/monesy/monesy
EnvironmentFile=/home/monesy/monesy/.env
ExecStart=/home/monesy/monesy/.venv/bin/gunicorn \
    --workers 2 \
    --bind unix:/run/monesy.sock \
    --access-logfile /var/log/monesy/access.log \
    --error-logfile /var/log/monesy/error.log \
    --timeout 60 \
    app:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# Criar pasta de logs
mkdir -p /var/log/monesy
chown monesy:www-data /var/log/monesy

# Ativar e iniciar o serviço
systemctl daemon-reload
systemctl enable monesy
systemctl start monesy
systemctl status monesy   # deve mostrar "active (running)"
```

### 2.10 Configurar Nginx

```bash
nano /etc/nginx/sites-available/monesy
```

Conteúdo (sem SSL por enquanto — será atualizado pelo Certbot na próxima etapa):

```nginx
server {
    listen 80;
    server_name seudominio.com.br www.seudominio.com.br;

    # Aumentar limite para import de Excel
    client_max_body_size 10M;

    # Cabeçalhos de segurança
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://unix:/run/monesy.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # Cache para assets estáticos do Vue (hash no nome = imutáveis)
    location ~* \.(js|css|woff2?|ttf|eot|svg|png|ico|webp)$ {
        proxy_pass http://unix:/run/monesy.sock;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_pragma;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Ativar o site e remover o default
ln -s /etc/nginx/sites-available/monesy /etc/nginx/sites-enabled/monesy
rm -f /etc/nginx/sites-enabled/default

# Testar configuração
nginx -t

# Reiniciar Nginx
systemctl restart nginx
```

### 2.11 SSL com Let's Encrypt (HTTPS)

> Pré-requisito: o domínio já deve apontar para o IP do VPS (registro A no painel DNS da Hostinger).

```bash
certbot --nginx -d seudominio.com.br -d www.seudominio.com.br
```

Siga as instruções. O Certbot atualiza automaticamente o `nginx.conf` com as diretivas SSL e configura renovação automática.

Verifique:

```bash
certbot renew --dry-run   # simula renovação
```

### 2.12 Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

### 2.13 Verificação final

```bash
curl https://seudominio.com.br/api/config
# Deve retornar: {"backend": "mysql"}

curl https://seudominio.com.br/
# Deve retornar HTML do index.html do Vue

curl https://seudominio.com.br/gastos
# Deve retornar HTML (SPA fallback funcionando)
```

---

## 3. Opção B — Railway

Railway é uma plataforma PaaS que dispensa configuração de servidor. Ideal para deploy rápido sem gerenciar VPS.

**Custo:** ~5 USD/mês (plano Hobby) + MySQL separado.

### 3.1 Pré-requisitos

- Conta em [railway.app](https://railway.app)
- Projeto no GitHub (Railway faz deploy via push)
- [Railway CLI](https://docs.railway.app/develop/cli): `npm install -g @railway/cli`

### 3.2 Preparar o projeto para Railway

Crie o arquivo `Procfile` na raiz:

```
web: gunicorn --workers 2 --bind 0.0.0.0:$PORT app:app
```

Crie ou atualize `requirements.txt`:

```bash
pip freeze > requirements.txt
```

Garanta que `runtime.txt` especifica o Python:

```
python-3.12.0
```

O `frontend/dist/` já deve estar commitado no repositório (ou buildado durante o deploy via `nixpacks.toml`).

**Opção: buildar o frontend no Railway**

Crie `nixpacks.toml` na raiz:

```toml
[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["pip install -r requirements.txt", "cd frontend && npm install"]

[phases.build]
cmds = ["cd frontend && npm run build"]

[start]
cmd = "gunicorn --workers 2 --bind 0.0.0.0:$PORT app:app"
```

### 3.3 Criar banco MySQL no Railway

1. No painel Railway, clique **+ New** → **Database** → **MySQL**
2. Após criado, vá em **Connect** e anote as variáveis: `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQLDATABASE`
3. Aplique o schema pelo cliente MySQL (DBeaver, TablePlus ou Railway Shell)

### 3.4 Deploy

```bash
# Login
railway login

# Dentro da pasta do projeto
railway init       # vincula ao projeto Railway
railway up         # faz deploy

# Ou configure auto-deploy via GitHub:
# Painel → Settings → Source → Connect GitHub Repo
```

### 3.5 Configurar variáveis de ambiente no Railway

No painel Railway → seu serviço → **Variables**, adicione:

```
STORAGE_BACKEND=mysql
MYSQL_HOST=containers-us-west-xxx.railway.app
MYSQL_PORT=6543
MYSQL_USER=root
MYSQL_PASSWORD=...
MYSQL_DATABASE=railway
JWT_SECRET_KEY=...
SECRET_KEY=...
FLASK_ENV=production
```

### 3.6 Domínio personalizado

Painel Railway → seu serviço → **Settings** → **Domains** → **Add Custom Domain**.  
Configure o CNAME no DNS da Hostinger apontando para `xxx.up.railway.app`.

---

## 4. Opção C — Render

Render oferece tier gratuito (com spin-down após inatividade) e planos pagos sem cold start.

**Custo:** Free (com limitações) ou $7/mês (Individual).

### 4.1 Preparar

Mesmo `Procfile` e `requirements.txt` da Opção B.

Para buildar o frontend automaticamente, crie `render.yaml` na raiz:

```yaml
services:
  - type: web
    name: monesy
    env: python
    buildCommand: "pip install -r requirements.txt && cd frontend && npm install && npm run build"
    startCommand: "gunicorn --workers 2 --bind 0.0.0.0:$PORT app:app"
    envVars:
      - key: STORAGE_BACKEND
        value: mysql
      - key: MYSQL_HOST
        sync: false
      - key: MYSQL_PASSWORD
        sync: false
      - key: JWT_SECRET_KEY
        generateValue: true
      - key: SECRET_KEY
        generateValue: true
      - key: FLASK_ENV
        value: production

databases:
  - name: monesy-mysql
    databaseName: monesy
    user: monesy
```

### 4.2 Deploy

1. Acesse [render.com](https://render.com) → **New Web Service**
2. Conecte seu repositório GitHub
3. Selecione `render.yaml` ou configure manualmente
4. Adicione as variáveis de ambiente no painel
5. Clique em **Deploy**

### 4.3 Banco de dados

O Render oferece PostgreSQL nativo, mas o Monesy usa MySQL. Use um serviço externo compatível:

- **PlanetScale** (MySQL-compatível, free tier) → `mysql+pymysql://` 
- **Railway MySQL** (ver seção 3.3) como banco standalone
- **Aiven for MySQL** (free tier)

---

## 5. Variáveis de ambiente

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `STORAGE_BACKEND` | Sim | `mysql`, `supabase` ou `json` |
| `MYSQL_HOST` | Se MySQL | Host do banco |
| `MYSQL_PORT` | Se MySQL | Padrão: `3306` |
| `MYSQL_USER` | Se MySQL | Usuário do banco |
| `MYSQL_PASSWORD` | Se MySQL | Senha do banco |
| `MYSQL_DATABASE` | Se MySQL | Nome do banco |
| `JWT_SECRET_KEY` | Se MySQL | Chave para assinar tokens JWT |
| `SECRET_KEY` | Sim | Chave de sessão Flask |
| `FLASK_ENV` | Sim | `production` (desativa debug) |
| `SUPABASE_URL` | Se Supabase | URL do projeto Supabase |
| `SUPABASE_KEY` | Se Supabase | Chave de serviço (service_role) |
| `SUPABASE_ANON_KEY` | Se Supabase | Chave pública anon |

**Gerar chaves seguras:**

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

## 6. Pós-deploy: primeiro uso

### 6.1 Criar o primeiro usuário (modo MySQL)

Via API (curl ou Postman):

```bash
curl -X POST https://seudominio.com.br/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "voce@email.com", "password": "suaSenha123"}'
```

Ou diretamente pela tela de login na interface — clique em **"Criar conta"**.

### 6.2 Verificar saúde da aplicação

```bash
# Backend rodando?
curl https://seudominio.com.br/api/config

# Anos disponíveis? (requer token)
TOKEN=$(curl -s -X POST https://seudominio.com.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"voce@email.com","password":"suaSenha123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

curl -H "Authorization: Bearer $TOKEN" https://seudominio.com.br/api/anos
```

### 6.3 Importar dados existentes (opcional)

Se estiver migrando do modo JSON:

```bash
# Copie o data/gastos.json para o servidor e use o script de migração, se disponível
# Ou importe via Excel: na interface, use o botão "Importar Excel" no header
```

---

## 7. Atualizações (rollout)

### VPS (Hostinger)

```bash
# No servidor, como usuário monesy
cd /home/monesy/monesy

# Atualizar código
git pull origin main

# Rebuild do frontend (se houve mudanças no Vue)
source .venv/bin/activate
cd frontend && npm install && npm run build && cd ..

# Reiniciar o serviço
sudo systemctl restart monesy

# Verificar
sudo systemctl status monesy
sudo journalctl -u monesy -f   # acompanhar logs em tempo real
```

### Railway / Render

```bash
git push origin main
# O deploy é automático via webhook do GitHub
```

---

## 8. Resolução de problemas

### App não inicia no VPS

```bash
# Ver logs do Gunicorn
sudo journalctl -u monesy -n 50 --no-pager

# Testar manualmente
cd /home/monesy/monesy
source .venv/bin/activate
python3 app.py   # rodar diretamente para ver erros
```

### Erro 502 Bad Gateway no Nginx

```bash
# Verificar se o socket existe
ls -la /run/monesy.sock

# Verificar logs do Nginx
sudo tail -f /var/log/nginx/error.log

# Verificar se o serviço está rodando
sudo systemctl status monesy
```

### Erro de conexão MySQL

```bash
# Testar conexão
mysql -u monesy -p -h localhost monesy
# Se falhar: verificar MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD

# Ver erros da app
sudo journalctl -u monesy | grep -i mysql
```

### SPA: reload em /gastos retorna 404

Verifique se o errorhandler 404 está ativo no `app.py`:

```python
@app.errorhandler(404)
def spa_fallback(e):
    ...
```

E se o `static_folder` aponta corretamente para `frontend/dist/`:

```bash
python3 -c "from app import app; print(app.static_folder)"
# Deve imprimir: /home/monesy/monesy/frontend/dist
```

### Frontend não atualiza após deploy

```bash
# O Vite gera hashes nos nomes dos arquivos — limpe o cache do browser
# Ctrl+Shift+R (hard reload)

# No servidor, confirme que o build foi feito APÓS as mudanças
ls -la frontend/dist/assets/
```

### Certificado SSL expirado

```bash
sudo certbot renew
sudo systemctl restart nginx
```

---

## Resumo rápido — Checklist de deploy

- [ ] `cd frontend && npm run build` — frontend compilado
- [ ] `.env` configurado com variáveis reais de produção
- [ ] Schema MySQL aplicado (`mysql_schema.sql`)
- [ ] Gunicorn testado localmente (`gunicorn app:app`)
- [ ] Serviço systemd ativo (`systemctl status monesy`)
- [ ] Nginx configurado e testado (`nginx -t`)
- [ ] HTTPS ativo (`certbot --nginx`)
- [ ] Firewall habilitado (`ufw status`)
- [ ] Primeiro usuário criado via `/api/auth/register`
- [ ] Acesso ao app verificado em `https://seudominio.com.br`
