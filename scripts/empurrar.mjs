#!/usr/bin/env node
// Empurra UM workflow do repositório para o n8n.
// Uso:  node scripts/empurrar.mjs workflows/nome.ID.json [--publicar]
//
// Só escreve nodes/connections/settings/name. Não activa nem desactiva nada —
// isso fica a teu cargo no n8n, de propósito.
//
// ATENÇÃO: neste n8n, empurrar para um workflow ACTIVO publica logo — a versão
// em produção muda no momento (confirmado a 25/09/2026). Por isso, com o
// workflow activo, o script recusa a menos que passes --publicar: pôr código em
// produção tem de ser uma decisão explícita, não um efeito secundário.

import { readFileSync } from 'node:fs';

const URL_BASE = process.env.N8N_URL;
const CHAVE = process.env.N8N_API_KEY;
const ficheiro = process.argv.slice(2).find(a => !a.startsWith('--'));
const publicar = process.argv.includes('--publicar');
if (!URL_BASE || !CHAVE || !ficheiro) {
  console.error('Uso: N8N_URL=… N8N_API_KEY=… node scripts/empurrar.mjs workflows/ficheiro.json [--publicar]');
  process.exit(1);
}

const w = JSON.parse(readFileSync(ficheiro, 'utf8'));
if (!w.id) { console.error('O ficheiro não tem id.'); process.exit(1); }

const api = async (metodo, corpo) => {
  const r = await fetch(`${URL_BASE}/api/v1/workflows/${w.id}`, {
    method: metodo,
    headers: { 'X-N8N-API-KEY': CHAVE, 'content-type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (!r.ok) {
    console.error(`falhou (${metodo}): HTTP ${r.status}`, (await r.text()).slice(0, 400));
    process.exit(1);
  }
  return r.json();
};

const antes = await api('GET');
if (antes.active && !publicar) {
  console.error(`"${antes.name}" está ACTIVO: empurrar publica logo, a versão em produção muda já.`);
  console.error('Se é isso que queres, repete com --publicar. Nada foi alterado.');
  process.exit(2);
}

const depois = await api('PUT', {
  name: w.name,
  nodes: w.nodes,
  connections: w.connections,
  settings: w.settings ?? {},
});

console.log(`empurrado  ${w.name}  (${w.nodes.length} nós)`);
if (depois.active && depois.activeVersionId === depois.versionId) {
  console.log('EM PRODUÇÃO: a versão publicada é esta.');
} else if (depois.active) {
  console.log('Ficou em rascunho — a versão publicada ainda é a anterior. Publica no n8n.');
} else {
  console.log('Workflow inactivo: nada corre em produção até alguém o activar no n8n.');
}
