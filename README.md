# Nyvex Operation Center · protótipo navegável

Protótipo da nova interface do Nyvex Operation Center, construído tela a tela.

- **Stack:** React 18 + Vite + TypeScript, React Router (hash), CSS com tokens do DS Nyvex.
- **Tema:** dark é o primário; light é secundário (botão no menu ou `data-theme="light"`).
- **Publicação:** cada push na `main` publica no GitHub Pages pelo workflow `.github/workflows/deploy.yml`.

## Rodar local

```bash
npm install
npm run dev
```

## Estrutura

```
src/
  ds/            Design system: tokens.css, componentes (Icon, IconButton, NavItem, Badge, Avatar, Kbd, Tooltip) e ícones
  layout/        Casca do app: menu lateral, barra superior, paleta ⌘K, menu do usuário
  navigation.ts  Itens do menu = rotas do app
  pages/         Telas. Sem tela registrada, a rota usa a PlaceholderPage
```

## Adicionar uma tela

1. Crie `src/pages/MinhaTela.tsx` recebendo `{ screen }`.
2. Registre em `src/pages/index.tsx`, pelo id do item do menu (ex.: `alertas: AlertasPage`).

## Atalhos

- `⌘K` / `Ctrl K`: busca global (pessoas, placas, câmeras, locais, ocorrências, alertas, telas e ações), com filtros por tipo (`Tab`). Dados de exemplo em `src/search/data.ts`.
- `[`: recolher ou expandir o menu
- Menu fechado: passe o mouse no logo para ver o botão de expandir
