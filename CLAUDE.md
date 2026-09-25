# CAV — contexto para o Claude Code

Lê isto antes de mexeres em seja o que for.

## O que é o CAV

Um comercial fala ou escreve no Terminal → o n8n transcreve → o Gemini
interpreta contra o prompt da Secretária → devolve um cartão de confirmação →
quando o comercial confirma, o Committer escreve no Airtable.

Três peças:

| peça | onde vive | neste repositório |
|---|---|---|
| workflows | n8n (Hostinger) | `workflows/` |
| prompt da Secretária | dentro de um workflow do n8n | `prompts/` |
| Terminal | GitHub Pages, servido a partir deste repositório | `index.html` |
| dados | Airtable `appIdD2RG5S0lWvfV` | fora daqui, de propósito |

O Terminal e o CAV costumavam viver em repositórios separados; desde
19/09/2026 partilham um único repositório (o Terminal é a face interactiva,
o resto do repositório é a estrutura por trás). O histórico de ambos foi
fundido, sem ficheiros em comum entre os dois lados.

Workflows principais: `bSTGP7PErDam8WPE` (Inbound), `7DoKXQGDJH4yivLK`
(Committer), `FjelO9bMQh1Mr21I` (prompt estático).

## Regras de trabalho

- **Puxar antes de mexer.** Se alguém editou no browser, empurrar por cima
  apaga esse trabalho sem aviso.
- **Empurrar para um workflow activo = publicar.** Neste n8n, o PUT da API
  muda logo a versão em produção; não fica em rascunho (confirmado a
  25/09/2026, comparando `versionId` com `activeVersionId`). Por isso o
  `empurrar.mjs` recusa workflows activos, a menos que se passe `--publicar`.
  Publicar é uma decisão humana: só usar `--publicar` quando o César o pedir
  para aquela alteração. Workflows inactivos empurram-se sem flag.
- **Não activar nem desactivar workflows a partir daqui.**
- **Não apagar registos do Airtable.** Apagar é sempre do lado do César.
- **A chave da API do n8n vive no ambiente**, nunca no repositório.

## O que custa dinheiro, e porquê

Cada chamada ao Gemini envia ~57 mil tokens, dos quais ~54 mil vêm de cache
implícita e custam dez vezes menos. Isso põe a chamada a $0,0086. **Sem cache
são $0,045** — cinco vezes mais.

A cache implícita só funciona quando o **início do prompt é idêntico** entre
chamadas. Logo: alterações ao topo de `prompts/secretaria.md` mudam o custo de
todo o sistema. Acrescentar no fim é barato; mexer no princípio não é. Quem
mexer no topo tem de dizer porquê no commit.

## Quotas (situação em Setembro de 2026)

Plano gratuito do Gemini, projecto Google `CAV-1`: **20 pedidos por dia**, 5 por
minuto, 250 mil tokens por minuto. Vinte por dia não chega para a equipa — a 16
de Setembro o sistema bateu na parede às 18:14, à 24.ª chamada.

Alvo declarado: 6 comerciais, 30 chamadas/dia. Isso obriga a plano pago.
A conta: ~$0,0086 × chamadas × 22 dias. Os preços **duplicam a 1 de Janeiro de
2027**.

Quando o Gemini devolve 429, o Inbound cai no nó `Responder (falha IA)` e o
Terminal mostra um aviso em vez de falhar em silêncio. **Atenção:** por causa
do `continueErrorOutput`, essas execuções aparecem como *success* no n8n. Para
encontrar falhas, procura as que acabam em `Responder (falha IA)`, não as que
estão marcadas como erro.

## O atalho das confirmações

Quando o comercial carrega em "Sim, é isso", não há nada para interpretar: a
interpretação já veio no pedido. O nó `Confirmação por botão?` (a seguir ao
`Montar Payload`) desvia esses casos directamente para o `Parse Interpretação`,
que tem no topo um bloco que devolve a mesma forma de sempre sem chamar a IA.

Corta metade das chamadas. A condição só desvia se as âncoras estiverem
resolvidas — se a pergunta era aberta ("qual das Marias?"), segue para a IA,
que é o que evita comprometer com um "sim" sem sentido.

Para confirmar que está a funcionar: numa confirmação, a execução **não** deve
ter o nó `Chamar Secretária (Gemini)`.

## Por fazer

- O `Guardar Interpretação` corre também no caminho do atalho e reescreve no
  Airtable algo que já lá estava — ~0,5 s deitados fora por confirmação.
- Há eventos parados em `recebido` de execuções que falharam; falta uma rotina
  que os reprocesse.
- Uma confirmação pode ter disparado duas execuções (890 e 893, a 15/09).
  Por perceber se é do Terminal.
