-- ============================================================
-- Schema MySQL 5.6 — Monesy
-- Compatível com MySQL 5.6.5+  (utf8mb4, InnoDB, múltiplos DATETIME)
--
-- Executar:
--   mysql -h HOST -u USER -p DATABASE < mysql_schema.sql
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Usuários (autenticação própria — JWT gerado pelo Flask)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id`            CHAR(36)     NOT NULL,
    `email`         VARCHAR(191) NOT NULL,   -- 191*4=764 <= 767 bytes (limite MySQL 5.6 utf8mb4)
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Anos cadastrados
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `anos_cadastrados` (
    `id`         INT         NOT NULL AUTO_INCREMENT,
    `user_id`    CHAR(36)    NOT NULL,
    `ano`        INT         NOT NULL,
    `created_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_anos_user_ano` (`user_id`, `ano`),
    CONSTRAINT `fk_anos_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Seções
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `secoes` (
    `id`         INT          NOT NULL AUTO_INCREMENT,
    `user_id`    CHAR(36)     NOT NULL,
    `tipo`       VARCHAR(20)  NOT NULL COMMENT 'receita | despesa',
    `nome`       VARCHAR(120) NOT NULL,   -- (36+20+120)*4=704 <= 767 bytes (limite MySQL 5.6)
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_secoes_user_tipo_nome` (`user_id`, `tipo`, `nome`),
    CONSTRAINT `fk_secoes_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Lançamentos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `lancamentos` (
    `id`               CHAR(36)      NOT NULL,
    `user_id`          CHAR(36)      NOT NULL,
    `ano`              INT           NOT NULL,
    `mes`              TINYINT       NOT NULL,
    `tipo`             VARCHAR(20)   NOT NULL COMMENT 'receita | despesa',
    `descricao`        VARCHAR(500)  NOT NULL,
    `secao`            VARCHAR(255)  NOT NULL DEFAULT 'Geral',
    `valor`            DECIMAL(12,2) NOT NULL,
    `observacao`       TEXT,
    `tags`             TEXT               COMMENT 'JSON array: ["tag1","tag2"]',
    `pago`             TINYINT(1)    NOT NULL DEFAULT 0,
    `investido`        TINYINT(1)    NOT NULL DEFAULT 0,
    `criado_em`        DATETIME,
    `excluido_em`      DATETIME,
    `ultima_alteracao` DATETIME,
    PRIMARY KEY (`id`),
    KEY `idx_lanc_user_ano_mes` (`user_id`, `ano`, `mes`),
    KEY `idx_lanc_excluido`     (`excluido_em`),
    CONSTRAINT `fk_lanc_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Histórico de lançamentos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `lancamento_historico` (
    `id`            INT         NOT NULL AUTO_INCREMENT,
    `lancamento_id` CHAR(36)    NOT NULL,
    `user_id`       CHAR(36)    NOT NULL,
    `acao`          VARCHAR(50) NOT NULL,
    `antes`         TEXT             COMMENT 'JSON object',
    `depois`        TEXT             COMMENT 'JSON object',
    `ts`            DATETIME,
    PRIMARY KEY (`id`),
    KEY `idx_lhist_lancamento` (`lancamento_id`),
    KEY `idx_lhist_user`       (`user_id`),
    CONSTRAINT `fk_lhist_lanc`
        FOREIGN KEY (`lancamento_id`) REFERENCES `lancamentos` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_lhist_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Meses revisados
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `meses_revisados` (
    `id`          INT      NOT NULL AUTO_INCREMENT,
    `user_id`     CHAR(36) NOT NULL,
    `ano`         INT      NOT NULL,
    `mes`         TINYINT  NOT NULL,
    `revisado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_meses_user_ano_mes` (`user_id`, `ano`, `mes`),
    CONSTRAINT `fk_mrev_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Assinaturas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `assinaturas` (
    `id`               CHAR(36)      NOT NULL,
    `user_id`          CHAR(36)      NOT NULL,
    `descricao`        VARCHAR(500)  NOT NULL,
    `data_inicio`      DATE,
    `data_fim`         DATE,
    `valor_mensal`     DECIMAL(12,2) NOT NULL,
    `cartao`           VARCHAR(255)  NOT NULL DEFAULT '',
    `criado_em`        DATETIME,
    `ultima_alteracao` DATETIME,
    PRIMARY KEY (`id`),
    KEY `idx_assin_user` (`user_id`),
    CONSTRAINT `fk_assin_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Histórico de assinaturas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `assinatura_historico` (
    `id`            INT         NOT NULL AUTO_INCREMENT,
    `assinatura_id` CHAR(36)    NOT NULL,
    `user_id`       CHAR(36)    NOT NULL,
    `acao`          VARCHAR(50) NOT NULL,
    `antes`         TEXT             COMMENT 'JSON object',
    `depois`        TEXT             COMMENT 'JSON object',
    `ts`            DATETIME,
    PRIMARY KEY (`id`),
    KEY `idx_ahist_assinatura` (`assinatura_id`),
    CONSTRAINT `fk_ahist_assin`
        FOREIGN KEY (`assinatura_id`) REFERENCES `assinaturas` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ahist_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Features (changelog global — sem vínculo a usuário)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `features` (
    `id`              VARCHAR(36)  NOT NULL,
    `titulo`          VARCHAR(500) NOT NULL,
    `descricao`       TEXT,
    `implementado_em` DATETIME     NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------
-- Dados: 25 features implementadas
-- ------------------------------------------------------------
INSERT IGNORE INTO `features` (`id`, `titulo`, `descricao`, `implementado_em`) VALUES
('f001-crud-mensal',         'CRUD de receitas e despesas mensais',         'Lançamentos por ano/mês com descrição, valor, seções, tags e observações.',                                                                                          '2026-05-23 00:00:00'),
('f002-caixa-orcamento',     'Caixa disponível e orçamento',                'Cards de entrada, saída total, caixa, a pagar e orçamento do mês.',                                                                                                     '2026-05-23 00:00:00'),
('f003-pago-investido',      'Despesas pagas e receitas investidas',        'Checkboxes que afetam o caixa disponível e o visual das linhas.',                                                                                                        '2026-05-23 00:00:00'),
('f004-grafico-anual',       'Gráfico de visão anual',                      'Chart.js com entrada, saída e saldo líquido por mês do ano selecionado.',                                                                                               '2026-05-23 00:00:00'),
('f005-modo-escuro',         'Modo escuro',                                 'Alternância de tema com preferência em localStorage e suporte no gráfico.',                                                                                             '2026-05-23 00:00:00'),
('f006-historico-lanc',      'Histórico de alterações por lançamento',      'Log de criado, editado, pago, investido, excluído e restaurado com modal.',                                                                                             '2026-05-23 00:00:00'),
('f007-lixeira',             'Lixeira de lançamentos',                      'Exclusão reversível com restauração, exclusão permanente e esvaziar lixeira.',                                                                                          '2026-05-23 00:00:00'),
('f008-meses-revisados',     'Meses revisados',                             'Marcação de meses conferidos na barra de abas mensais.',                                                                                                                 '2026-05-23 00:00:00'),
('f009-excel',               'Importação e modelo Excel',                   'Download de template e importação de lançamentos via planilha na interface.',                                                                                           '2026-05-23 00:00:00'),
('f010-aba-assinaturas',     'Aba Assinaturas',                             'CRUD de custos recorrentes no cartão, filtro por cartão, resumo e histórico.',                                                                                          '2026-05-23 00:00:00'),
('f011-icones-acoes',        'Ícones padronizados nas ações',               'Histórico, editar e excluir com os mesmos ícones em Gastos e Assinaturas.',                                                                                             '2026-05-23 00:00:00'),
('f012-modais-centro',       'Modais centralizados',                        'Formulários e diálogos exibidos no centro da tela.',                                                                                                                     '2026-05-23 00:00:00'),
('f013-aba-features',        'Aba Features implementadas',                  'Lista cronológica das funcionalidades entregues com data e hora.',                                                                                                       '2026-05-23 00:00:00'),
('f014-limpar-mes',          'Limpar mês',                                  'Move todos os lançamentos do ano/mês atual para a lixeira em lote.',                                                                                                    '2026-05-23 00:00:00'),
('f015-ultima-alteracao-linha','Última alteração na linha',                 'Data e hora da última mudança exibidas em cada lançamento da tabela.',                                                                                                  '2026-05-23 00:00:00'),
('f016-badges-secao',        'Badges de total pago e investido',            'Totais por seção e badges consolidados nos painéis de Receitas e Despesas.',                                                                                            '2026-05-23 00:00:00'),
('f017-caixa-ao-vivo',       'Atualização ao vivo do caixa',                'Cards de resumo atualizados ao marcar pago ou investido sem recarregar a página.',                                                                                      '2026-05-23 00:00:00'),
('f018-destaques-grafico',   'Destaques do gráfico anual',                  'Melhor mês, pior mês e saída média acima do gráfico de visão anual.',                                                                                                   '2026-05-23 00:00:00'),
('f019-gestao-anos',         'Gestão de anos',                              'Criar e excluir anos com modais de confirmação e impacto na API.',                                                                                                       '2026-05-23 00:00:00'),
('f020-import-excel-cli',    'Script import_excel.py',                      'Importação CLI de planilha legada com variáveis PLANILHA_GASTOS e PLANILHA_ANO.',                                                                                       '2026-05-23 00:00:00'),
('f021-repo-proprio',        'Repositório Monesy',                          'Projeto separado com API Flask, frontend estático e persistência JSON.',                                                                                                 '2026-05-23 00:00:00'),
('f022-secoes-tags',         'Seções dinâmicas e tags',                     'Criar seções no modal, chips de tags com sugestões e listagem via API.',                                                                                                 '2026-05-23 00:00:00'),
('f023-navegacao-abas',      'Navegação entre abas do app',                 'Gastos mensais, Assinaturas e Features com header e conteúdo contextuais.',                                                                                             '2026-05-23 00:00:00'),
('f024-toasts',              'Toasts de feedback',                          'Notificações de sucesso e erro para ações do usuário.',                                                                                                                   '2026-05-23 00:00:00'),
('f025-mysql',               'Migração para MySQL 5.6 (UOL Host)',          'Troca do Supabase por MySQL 5.6 gerenciado, com autenticação JWT própria e repositório MySQLRepository.',                                                               '2026-05-24 00:00:00');
