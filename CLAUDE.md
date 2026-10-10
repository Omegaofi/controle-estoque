# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Este repositório tem duas partes independentes: (1) um sistema de controle de estoque em Java e
(2) um kit de motion design / edição de vídeo para o Claude. Responda ao usuário em português do Brasil.

## Pedidos de motion / vídeo (criar ou editar)

Sempre que o usuário pedir para **criar, editar, animar ou revisar um vídeo/motion**, siga esta configuração:

1. **Atue como o agente Motion** — `.claude/agents/motion.md`. Converse antes de produzir: briefing curto
   (plataforma, objetivo, tom, material), 2–3 direções criativas com uma recomendação, storyboard com
   timecode para peças maiores; depois explique as escolhas e peça feedback objetivo.
2. **Carregue as skills do projeto** antes de executar:
   - `motion-design` — regras de timing, easing, tipografia, safe areas, ritmo de corte e checklist de QA. Sempre.
   - `remotion-motion` — criar animação/motion graphics em código (Remotion, React/TS).
   - `ffmpeg-edit` — montar, cortar, cor, áudio (−14 LUFS), legendas, reframe 9:16 e presets de export.
3. **Escolha a rota de produção:**
   - **Conector Motion** (`mcp__Motion__create_video` / `create_followup`) → vídeo completo a partir de
     briefing, URL ou documento (lançamento, anúncio, explicativo, demo). Passe um brief, não um roteiro
     plano a plano. Consome créditos: confirme com o usuário antes de cada `create_video` e nunca compre
     créditos/planos nem ative recarga automática sem pedido explícito.
   - **Skills (Remotion + FFmpeg)** → material bruto do usuário, precisão de frame, componentes próprios,
     finalização e exportação.
4. **Fluxo e QA** — siga `motion-editor/PLANO.md` (briefing → roteiro/storyboard → design system do vídeo →
   produção → finalização → QA → export) e passe todo resultado pelo checklist da seção 5 do plano antes de
   entregar. Revise visualmente com uma contact sheet (comando na skill `motion-design`).
5. Conectores de apoio: **Motion Creative Analytics** (performance de anúncios Meta; chame `get_auth_context`
   e depois `get_creative_insights` com `insightType=SPEND` primeiro), **Canva** (assets, remover fundo,
   brand kit), **Spotify** (referências de trilha).

Ambiente: `ffmpeg` 6.1, Node 22 e Python 3 já disponíveis. Projeto Remotion ainda não foi criado — o plano
prevê `motion-editor/remotion/` (`npx create-video@latest`) e scripts em `motion-editor/scripts/`.
Arquivos de trabalho temporários (renders de teste, frames) vão para o scratchpad, não para o repositório.

## Sistema de controle de estoque (Java)

Projeto Maven em `Documents/NetBeansProjects/controle-estoque/` (rodar comandos a partir dessa pasta):

```bash
mvn clean compile          # compilar (maven.compiler.release=25 → requer JDK 25)
mvn exec:java              # executar o menu de console (mainClass definido no pom)
```

Não há testes nem script SQL versionado. Requer MySQL local com o banco `estoque_db`; credenciais fixas
em `util/ConnectionFactory.java` (`root`, sem senha, `localhost:3306`).

Arquitetura (pacote `br.com.joao_pedro.controle.estoque`): `ControleEstoque` é um menu `Scanner` em loop que
chama os DAOs diretamente; `dao/ProdutoDao` e `dao/MovimentacaoDAO` fazem JDBC puro (cada método abre a própria
conexão via `ConnectionFactory`, `PreparedStatement`, e trata `SQLException` imprimindo o erro); `model/` tem POJOs.
Tabelas inferidas das queries: `produtos` (`id`, `codigo`, `nome`, `quantidade`, `preco`, `categoria`,
`estoque_minimo`) e `movimentacoes` (`produto_id`, `tipo`, `quantidade`, `motivo`, `data_mov`).
Estoque baixo = `quantidade < estoque_minimo`. Uma entrada/saída faz duas operações separadas
(`ProdutoDao.atualizarQuantidade` + `MovimentacaoDAO.registrar`), sem transação. Atenção:
`atualizarQuantidade` grava um valor absoluto (`SET quantidade = ?`), mas o menu passa a variação
(`qtd` / `-qtd`), e a saída ainda não valida estoque suficiente.
O diretório `target/` está versionado por engano — não edite arquivos ali.
