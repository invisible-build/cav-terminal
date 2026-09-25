# Configurar — passo a passo

Oito passos. Vinte minutos, a maior parte à espera de downloads.
Onde os comandos diferem, tens uma caixa para macOS e outra para Windows.

---

## 1. Instalar o Claude Code

**macOS** (Terminal):

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

**Windows** (PowerShell — o prompt começa por `PS C:\`):

```powershell
irm https://claude.ai/install.ps1 | iex
```

No Windows, instala também o [Git for Windows](https://git-scm.com/downloads/win).
Sem ele o Claude Code usa PowerShell em vez de bash, e metade dos comandos
deste ficheiro deixam de servir.

Confirma:

```
claude --version
```

Deve imprimir um número de versão. Se disser "command not found", fecha e
reabre o terminal primeiro — o instalador mexe no PATH.

---

## 2. Entrar na conta

```
claude
```

Abre o browser e entra com a **mesma conta** que usas aqui. Precisa de plano
Pro, Max ou Team — o gratuito não dá acesso ao Claude Code.

Escreve `/exit` para sair da sessão. Voltamos lá no passo 7.

---

## 3. Instalar o Node

Os três scripts precisam de Node 20 ou superior.

```
node --version
```

Se não tiveres, ou for antigo: [nodejs.org/en/download](https://nodejs.org/en/download).

---

## 4. Criar a pasta

**macOS:**

```bash
mkdir -p ~/Projetos && cd ~/Projetos
```

**Windows:**

```powershell
mkdir $HOME\Projetos; cd $HOME\Projetos
```

Descompacta aí o `cav-repo.tar.gz` que te mandei, e entra:

```
cd cav-repo
```

---

## 5. Explodir o export em ficheiros

Aponta para o JSON que ficou no teu Downloads:

**macOS:**

```bash
node scripts/explodir.mjs ~/Downloads/cav-workflows-2026-09-19.json
```

**Windows:**

```powershell
node scripts/explodir.mjs $HOME\Downloads\cav-workflows-2026-09-19.json
```

Deve listar 12 workflows. Confere que lá está o
`cav-workflow-a-inbound-...bSTGP7PErDam8WPE.json` com 32 nós.

---

## 6. Primeiro commit

```
git init
git add -A
git commit -m "estado inicial, exportado do n8n a 19/09/2026"
```

A partir daqui tens rede de segurança: `git diff` mostra o que mudou,
`git revert` desfaz.

Repositório remoto (opcional, mas recomendado — é a tua cópia de segurança).
Cria um repositório **privado** no GitHub e liga:

```
git remote add origin https://github.com/invisible-build/cav.git
git push -u origin main
```

Privado, não público: os JSON trazem ids de tabelas do Airtable e a estrutura
toda do sistema.

---

## 7. A chave da API do n8n

No n8n: **Definições → n8n API → Create an API key**. Copia a chave.

Guarda-a no ambiente, **nunca num ficheiro do repositório**:

**macOS** (acrescenta ao `~/.zshrc`):

```bash
export N8N_URL=https://olivedrab-cat-986392.hostingersite.com
export N8N_API_KEY=cola-aqui-a-chave
```

Depois `source ~/.zshrc`.

**Windows** (PowerShell, permanente):

```powershell
setx N8N_URL "https://olivedrab-cat-986392.hostingersite.com"
setx N8N_API_KEY "cola-aqui-a-chave"
```

Fecha e reabre o terminal para as variáveis pegarem.

Testa:

```
node scripts/puxar.mjs
```

Deve imprimir "puxado …" doze vezes. Depois `git status` — se não houver
alterações, o repositório está igual ao n8n, e está tudo certo.

---

## 8. Arrancar o Claude Code no projeto

Dentro da pasta `cav-repo`:

```
claude
```

Ele lê o `CLAUDE.md` sozinho — leva já o contexto todo: quotas, o atalho das
confirmações, o aviso da cache, o que está por fazer.

Experimenta pedir-lhe: *"mostra-me o que o nó Confirmação por botão? faz"*.
Se responder a partir do ficheiro, está tudo ligado.

---

## O ciclo, daqui para a frente

```
node scripts/puxar.mjs          # apanhar o que foi mexido no browser
git diff                        # ver se alguém mexeu
<editar o ficheiro>
node scripts/empurrar.mjs workflows/<ficheiro>.json --publicar
git commit -am "o que mudou e porquê"
```

Num workflow activo, empurrar publica logo — a versão em produção muda no
momento, não fica em rascunho. Por isso o `empurrar` pede `--publicar`:
sem a flag, recusa e não altera nada. De propósito.

---

## Se correr mal

- **`claude: command not found`** — fecha e reabre o terminal.
- **`puxar.mjs` dá 401** — a chave está errada ou não foi lida. `echo $N8N_API_KEY`
  (macOS) ou `echo $env:N8N_API_KEY` (PowerShell) para confirmar.
- **`empurrar.mjs` dá 400** — o JSON ficou inválido. `git checkout <ficheiro>`
  devolve-o ao último estado bom.
- **Empurraste por engano** — o histórico de versões do n8n tem as anteriores;
  despublicas para trás por lá.
