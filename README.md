# CAV — repositório

O CAV vive em três sítios. Este repositório junta os dois que são código e
precisam de histórico. O Airtable fica de fora — é interface, não código.

```
workflows/   os workflows do n8n, um JSON por workflow
prompts/     o prompt da Secretária e o que mais for enviado ao modelo
terminal/    a app que os comerciais usam
scripts/     puxar do n8n, empurrar para o n8n
```

## Porquê

Editar workflows dentro do browser não deixa rasto: não há diff, não há
histórico, e uma alteração que não chega ao servidor não se distingue de uma
que chegou. Em ficheiro, `git diff` responde a isso numa linha e `git revert`
desfaz.

O prompt da Secretária merece o mesmo cuidado por outra razão: são ~57 mil
tokens enviados em **cada** chamada, e 94% deles são cobrados a preço de cache.
Mexer no topo do ficheiro parte a cache e multiplica o custo por cinco, sem
aviso nenhum. Uma alteração dessas tem de ser visível num diff.

## Arranque

```bash
node scripts/explodir.mjs ~/Downloads/cav-workflows-AAAA-MM-DD.json
git init && git add -A && git commit -m "estado inicial, exportado do n8n"
```

## Dia a dia

```bash
export N8N_URL=https://o-teu-n8n
export N8N_API_KEY=...          # Definições → n8n API → criar chave

node scripts/puxar.mjs                              # n8n  → ficheiros
node scripts/empurrar.mjs workflows/<ficheiro>.json # ficheiro → n8n
node scripts/empurrar.mjs workflows/<ficheiro>.json --publicar  # workflow activo
```

Fluxo saudável: `puxar` antes de mexer (para apanhar o que foi alterado no
browser), editar o ficheiro, `git diff` para ver o que muda, `empurrar`.

## Regras que valem a pena manter

- **Nunca commitar chaves.** Os JSON dos workflows referem credenciais por id e
  nome, não trazem segredos. A `N8N_API_KEY` vive no ambiente, nunca aqui.
- **`empurrar` não activa nem desactiva** workflows, de propósito. Ligar e
  desligar continua a ser uma decisão humana, feita no n8n.
- **Empurrar para um workflow activo publica logo.** Neste n8n não fica em
  rascunho: a versão em produção muda no momento. Por isso o `empurrar`
  recusa workflows activos sem `--publicar` — a flag é a decisão de publicar.
- **Puxar antes de empurrar.** Se alguém mexeu no browser entretanto, empurrar
  por cima apaga esse trabalho.

## Notas do terreno

- O `Guardar Interpretação` corre também no caminho do atalho e reescreve no
  Airtable uma interpretação que já lá estava — ~0,5 s por confirmação, a
  deitar fora.
- O plano gratuito do Gemini dá 20 chamadas por dia. Com 6 comerciais isso não
  chega; a conta do plano pago está em `prompts/` quando lá for posta.
