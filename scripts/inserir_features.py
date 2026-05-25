"""Insere (ou atualiza) as features implementadas na tabela MySQL."""
import sys
import os

# Carrega .env manualmente
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

import pymysql

FEATURES = [
    {
        "id": "feat-01",
        "titulo": "Metas por seção",
        "descricao": "Defina um orçamento por seção (ex.: Alimentação, Transporte). Uma barra de progresso colorida indica se você está dentro, próximo ou acima da meta. Verde = ok, amarelo = atenção, vermelho = estouro.",
        "implementado_em": "2026-05-10 10:00:00",
    },
    {
        "id": "feat-02",
        "titulo": "Lançamentos recorrentes automáticos",
        "descricao": "Crie templates mensais de lançamentos fixos (salário, aluguel, mensalidades). Com um clique, gere todos os recorrentes ativos no mês atual sem precisar digitar um por um.",
        "implementado_em": "2026-05-10 11:00:00",
    },
    {
        "id": "feat-03",
        "titulo": "Filtro por período na Visão Geral",
        "descricao": "Selecione um intervalo de meses (ex.: Jan–Jun) na aba Visão Geral e veja o saldo acumulado do período — entrada total, saída total e resultado líquido — calculado automaticamente a partir dos dados anuais.",
        "implementado_em": "2026-05-24 10:00:00",
    },
    {
        "id": "feat-04",
        "titulo": "Gráfico de pizza por seção",
        "descricao": "Visualize a distribuição percentual de despesas ou receitas por seção no mês atual. O gráfico donut interativo exibe rótulos, percentuais e valores ao passar o mouse. Alterne entre Despesas e Receitas com um clique.",
        "implementado_em": "2026-05-24 10:10:00",
    },
    {
        "id": "feat-05",
        "titulo": "Histórico de evolução de uma tag",
        "descricao": "Ao selecionar uma tag no filtro, um painel aparece automaticamente com um gráfico de barras mostrando a evolução mês a mês (receitas e despesas) dessa tag ao longo do ano atual.",
        "implementado_em": "2026-05-24 10:20:00",
    },
    {
        "id": "feat-06",
        "titulo": "Comparativo mês a mês",
        "descricao": "Os cards de resumo (Entrada, Saída, Caixa, Orçamento) exibem indicadores ▲▼ mostrando a variação absoluta em relação ao mês anterior, facilitando a identificação de tendências de gastos.",
        "implementado_em": "2026-05-24 10:30:00",
    },
    {
        "id": "feat-07",
        "titulo": "Duplicar mês para outro ano",
        "descricao": "Escolha qualquer combinação de ano e mês como origem ao copiar lançamentos. Antes, só era possível copiar do mês imediatamente anterior. Agora você pode replicar janeiro de 2025 em março de 2026, por exemplo.",
        "implementado_em": "2026-05-24 10:40:00",
    },
    {
        "id": "feat-08",
        "titulo": "Notas do mês",
        "descricao": "Adicione um texto livre a qualquer mês — observações sobre viagens, imprevistos, metas cumpridas ou qualquer contexto relevante. As notas são salvas por mês/ano e persistem entre sessões.",
        "implementado_em": "2026-05-24 10:50:00",
    },
    {
        "id": "feat-09",
        "titulo": "Atalhos de teclado",
        "descricao": "Navegue mais rápido com atalhos globais: N abre o modal de novo lançamento, / foca o filtro de tags. Os atalhos são ignorados quando você está digitando em um campo de texto.",
        "implementado_em": "2026-05-24 11:00:00",
    },
    {
        "id": "feat-10",
        "titulo": "Dark mode automático por horário",
        "descricao": "O botão de tema agora possui três modos: Automático (ativa dark entre 19h e 7h), Escuro (sempre dark) e Claro (sempre claro). O modo automático verifica o horário a cada minuto. A preferência é salva no navegador.",
        "implementado_em": "2026-05-24 11:10:00",
    },
]

def main():
    conn = pymysql.connect(
        host=os.environ["MYSQL_HOST"],
        port=int(os.environ.get("MYSQL_PORT", "3306")),
        user=os.environ.get("MYSQL_USER", "root"),
        password=os.environ.get("MYSQL_PASSWORD", ""),
        database=os.environ["MYSQL_DATABASE"],
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=10,
        autocommit=True,
    )
    print(f"Conectado a {os.environ['MYSQL_HOST']}/{os.environ['MYSQL_DATABASE']}")

    with conn.cursor() as cur:
        # Verifica colunas disponíveis na tabela
        cur.execute("DESCRIBE features")
        cols = {row["Field"] for row in cur.fetchall()}
        print(f"Colunas na tabela features: {cols}")

        inserted = 0
        updated = 0
        for f in FEATURES:
            # Monta INSERT ... ON DUPLICATE KEY UPDATE
            sql = """
                INSERT INTO features (id, titulo, descricao, implementado_em)
                VALUES (%(id)s, %(titulo)s, %(descricao)s, %(implementado_em)s)
                ON DUPLICATE KEY UPDATE
                    titulo = VALUES(titulo),
                    descricao = VALUES(descricao),
                    implementado_em = VALUES(implementado_em)
            """
            n = cur.execute(sql, f)
            if n == 1:
                inserted += 1
                print(f"  + Inserida: {f['titulo']}")
            elif n == 2:
                updated += 1
                print(f"  ~ Atualizada: {f['titulo']}")
            else:
                print(f"  = Sem mudança: {f['titulo']}")

    conn.close()
    print(f"\nConcluído: {inserted} inserida(s), {updated} atualizada(s).")

if __name__ == "__main__":
    main()
