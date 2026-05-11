# CoopFleet

Sistema web administrativo para gerenciamento de cooperativa de veículos.

## O que está incluído

- Login com sessão segura por cookie httpOnly.
- Dashboard com indicadores, gráficos financeiros, peças mais usadas e alertas.
- Cadastro de veículos.
- Controle de manutenção com peças, quantidades, custo unitário e total.
- Controle de óleo e combustível.
- Controle financeiro com entradas, saídas, lucro/prejuízo e despesas por veículo.
- Estoque de peças, fornecedores, notificações, backup e busca inteligente.
- Relatórios mensais/anuais com filtros por veículo/data e exportação PDF/Excel.
- Prisma com PostgreSQL e seed de demonstração.

## Como rodar

1. Instale as dependências:

```bash
npm install
```

2. Crie `.env` a partir de `.env.example` e configure `DATABASE_URL`.

3. Gere e aplique o banco:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

4. Rode o sistema:

```bash
npm run dev
```

Acesso inicial:

- Usuário: `admin@coopfleet.com`
- Senha: `admin123`

Sem `.env`, a interface usa um arquivo local persistente em `data/coopfleet-store.json`.
As alterações continuam salvas mesmo reiniciando o servidor. Para produção, use PostgreSQL.
