# CorpFlow — Sistema de Gestão de Colaboradores

Sistema web profissional + PWA para gestão de funcionários, absenteísmo e horas extras.

---

## Stack

| Camada       | Tecnologia                        |
|--------------|-----------------------------------|
| Framework    | Next.js 14 (App Router)           |
| Linguagem    | TypeScript                        |
| Estilização  | Tailwind CSS + CSS Variables      |
| Backend/Auth | Supabase (PostgreSQL + Auth)      |
| Tempo real   | Supabase Realtime (WebSocket)     |
| Gráficos     | Recharts                          |
| Exportação   | xlsx + jsPDF + jspdf-autotable    |
| PWA          | next-pwa                          |

---

## Estrutura de pastas

```
corpflow/
├── app/
│   ├── layout.tsx           # Root layout + StoreProvider
│   ├── page.tsx             # Redirect → /login
│   ├── login/page.tsx       # Tela de login
│   ├── dashboard/page.tsx   # Dashboard com gráficos
│   ├── employees/page.tsx   # CRUD de funcionários
│   ├── absences/page.tsx    # Registro de absenteísmo
│   ├── overtime/page.tsx    # Wizard de escalas
│   ├── reports/page.tsx     # Exportação Excel/PDF
│   └── audit/page.tsx       # Log de auditoria
├── components/
│   ├── AppShell.tsx         # Layout com sidebar
│   ├── Sidebar.tsx          # Navegação lateral
│   ├── Modal.tsx            # Modal reutilizável
│   ├── Btn.tsx              # Botão com variantes
│   ├── StatCard.tsx         # Card de indicador
│   └── Notifications.tsx    # Toast notifications
├── lib/
│   ├── supabase.ts          # Cliente Supabase + queries
│   ├── store.tsx            # Estado global (Context)
│   ├── mockData.ts          # Dados demo (sem Supabase)
│   └── export.ts            # Export Excel/PDF
├── types/index.ts           # TypeScript types
├── styles/globals.css       # CSS global + variáveis
├── public/
│   ├── manifest.json        # PWA manifest
│   └── icons/               # Ícones PWA (adicione os .png)
├── supabase-schema.sql      # Schema SQL completo
├── .env.local               # Variáveis de ambiente
└── next.config.js           # Config Next.js + PWA
```

---

## Como rodar

### 1. Instale as dependências

```bash
npm install
```

### 2. Configure o Supabase (opcional para produção)

Edite `.env.local` com os dados do seu projeto em [supabase.com](https://supabase.com):

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

Execute o `supabase-schema.sql` no SQL Editor do Supabase para criar as tabelas.

> **Sem Supabase:** o sistema funciona em modo demo com dados mockados em `lib/mockData.ts`.

### 3. Adicione os ícones PWA

Coloque dois arquivos em `public/icons/`:
- `icon-192.png` (192×192 px)
- `icon-512.png` (512×512 px)

### 4. Rode em desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000

**Login demo:** `admin@corpflow.com` / `admin123`

### 5. Build para produção

```bash
npm run build
npm start
```

---

## Funcionalidades

### Dashboard
- Indicadores em tempo real: funcionários ativos, ausências, atestados, horas extras
- Gráficos de absenteísmo (7 dias) e hora extra por funcionário
- Tabela de escalas do dia

### Funcionários
- CRUD completo (criar, editar, ativar/desativar)
- Filtros por empresa, status e busca por nome/matrícula

### Absenteísmo
- Registro de faltas, atestados e justificadas
- Filtros por período e tipo
- Contadores automáticos

### Hora Extra — wizard 4 etapas
1. Dados gerais (data, tipo, horário padrão)
2. Seleção de funcionários (busca dinâmica, multi-select)
3. Ajuste individual de horários
4. Confirmação e geração da escala

### Relatórios
- Exportação Excel (.xlsx) e PDF para: funcionários, absenteísmo, horas extras e consolidado

### Auditoria
- Log de todas as ações com filtros por tipo e busca

---

## Integrar Supabase Realtime

No `lib/supabase.ts`, após autenticar, adicione:

```ts
supabase
  .channel('db-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, (payload) => {
    // Atualizar estado global
  })
  .subscribe();
```

---

## Customização

| O que mudar          | Onde                    |
|----------------------|-------------------------|
| Cores / tema         | `styles/globals.css`    |
| Empresas disponíveis | `app/employees/page.tsx`|
| Horários padrão      | `app/overtime/page.tsx` |
| Dados de demo        | `lib/mockData.ts`       |
| Credenciais demo     | `app/login/page.tsx`    |

---

## PWA

Após o build (`npm run build`), o next-pwa gera automaticamente o `service-worker.js`. O app pode ser instalado via "Adicionar à tela inicial" no Chrome/Safari mobile.
