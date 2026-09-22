#!/usr/bin/env node
// Cria UM workflow novo no n8n, a partir de um nome e (opcionalmente) nós/ligações
// já prontos num ficheiro local. Escreve o resultado (com o id que o n8n atribuiu)
// em workflows/ e actualiza o INDICE.json — o mesmo formato que puxar.mjs/explodir.mjs
// já usam, para que o resto da toolchain (empurrar.mjs) funcione sem alterações.
//
// Uso:  node scripts/criar.mjs "Nome do Workflow" [ficheiro-com-{nodes,connections}.json]
//
// Cria sempre inactivo. Não activa nem publica nada — isso fica a teu cargo no n8n,
// de propósito, tal como o resto desta toolchain.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const URL_BASE = process.env.N8N_URL;
const CHAVE = process.env.N8N_API_KEY;
const nome = process.argv[2];
const ficheiroBase = process.argv[3];
if (!URL_BASE || !CHAVE || !nome) {
  console.error('Uso: N8N_URL=… N8N_API_KEY=… node scripts/criar.mjs "Nome do Workflow" [ficheiro-base.json]');
  process.exit(1);
}

let nodes = [];
let connections = {};
if (ficheiroBase) {
  const base = JSON.parse(readFileSync(ficheiroBase, 'utf8'));
  nodes = base.nodes ?? [];
  connections = base.connections ?? {};
}

const r = await fetch(`${URL_BASE}/api/v1/workflows`, {
  method: 'POST',
  headers: { 'X-N8N-API-KEY': CHAVE, 'content-type': 'application/json' },
  body: JSON.stringify({ name: nome, nodes, connections, settings: { executionOrder: 'v1' } }),
});

if (!r.ok) {
  console.error(`falhou: HTTP ${r.status}`, (await r.text()).slice(0, 400));
  process.exit(1);
}
const w = await r.json();

const slug = (s) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

mkdirSync('workflows', { recursive: true });
const ficheiroNovo = join('workflows', `${slug(w.name)}.${w.id}.json`);
const corpo = {
  id: w.id, name: w.name, active: w.active ?? false,
  settings: w.settings ?? {}, nodes: w.nodes ?? [], connections: w.connections ?? {},
};
writeFileSync(ficheiroNovo, JSON.stringify(corpo, null, 2) + '\n');

const indicePath = 'workflows/INDICE.json';
let indice = [];
try { indice = JSON.parse(readFileSync(indicePath, 'utf8')); } catch (e) {}
indice.push({ ficheiro: `${slug(w.name)}.${w.id}.json`, id: w.id, nome: w.name, activo: w.active ?? false, nos: (w.nodes ?? []).length });
writeFileSync(indicePath, JSON.stringify(indice, null, 2) + '\n');

console.log(`criado  ${w.name}  (id ${w.id})`);
console.log(`ficheiro: ${ficheiroNovo}`);
console.log('Inactivo por omissão — activa e publica no n8n quando fizer sentido.');
