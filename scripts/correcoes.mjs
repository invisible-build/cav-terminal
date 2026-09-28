#!/usr/bin/env node
// Lê as correcções dos comerciais (eventos rejeitados no cartão de confirmação)
// para a revisão periódica do prompt da Secretária — ver "Aprender com as
// correcções" no CLAUDE.md.
//
// Uso:  node scripts/correcoes.mjs [--desde=AAAA-MM-DD] [--json]
// Precisa de AIRTABLE_TOKEN no ambiente: token SÓ DE LEITURA (data.records:read),
// limitado à base do CAV. Nunca no repositório.
//
// O relatório tem transcrições com dados de clientes: vai para .correcoes/,
// que o git ignora. Nada disto se copia tal e qual para o prompt.

import { writeFileSync, mkdirSync } from 'node:fs';

const TOKEN = process.env.AIRTABLE_TOKEN;
const BASE = 'appIdD2RG5S0lWvfV';
const desde = (process.argv.find(a => a.startsWith('--desde=')) || '').slice(8) || null;
const emJson = process.argv.includes('--json');
if (!TOKEN) {
  console.error('Define AIRTABLE_TOKEN no ambiente (token só de leitura da base do CAV).');
  process.exit(1);
}
if (desde && !/^\d{4}-\d{2}-\d{2}$/.test(desde)) { console.error('--desde tem de ser AAAA-MM-DD'); process.exit(1); }

const formula = desde
  ? `AND({Estado}='rejeitado', IS_AFTER(CREATED_TIME(), '${desde}'))`
  : `{Estado}='rejeitado'`;

let registos = [], offset;
do {
  const q = new URLSearchParams({ filterByFormula: formula, pageSize: '100' });
  if (offset) q.set('offset', offset);
  const r = await fetch(`https://api.airtable.com/v0/${BASE}/Eventos?${q}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!r.ok) { console.error(`Airtable → HTTP ${r.status}`, (await r.text()).slice(0, 300)); process.exit(1); }
  const j = await r.json();
  registos.push(...j.records);
  offset = j.offset;
} while (offset);

// A interpretacao foi guardada como texto JSON pelo "Guardar Interpretação" do Inbound.
const lerInterp = raw => { try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { return null; } };
const eventosDe = i => Array.isArray(i) ? i : (i && Array.isArray(i.eventos) ? i.eventos : []);

const linhas = registos
  .map(r => {
    const f = r.fields || {};
    const interp = lerInterp(f.interpretacao);
    return {
      ref: f.Ref || r.id,
      data: r.createdTime,
      comercial: Array.isArray(f.Comerciais) ? f.Comerciais[0] : null,
      transcricao: f.Transcricao || '',
      correcao: f.correcao_comercial || '',
      eventos: eventosDe(interp).map(e => ({
        tipo: e.tipo,
        ancora: e.ancora ? (e.ancora.nome_exibicao || e.ancora.nome_dito || e.ancora.estado) : null,
        ancora_estado: e.ancora ? e.ancora.estado : null,
        dados: Object.fromEntries(Object.entries(e.dados || {}).filter(([, v]) => v !== null && v !== '' && !(Array.isArray(v) && !v.length))),
        confirmacao: e.confirmacao_humana || null,
      })),
    };
  })
  .sort((a, b) => a.data.localeCompare(b.data));

mkdirSync('.correcoes', { recursive: true });
const hoje = new Date().toISOString().slice(0, 10);
const destino = `.correcoes/${hoje}.${emJson ? 'json' : 'md'}`;

if (emJson) {
  writeFileSync(destino, JSON.stringify(linhas, null, 2) + '\n');
} else {
  const md = [`# Correcções dos comerciais${desde ? ` desde ${desde}` : ''}`, '', `${linhas.length} eventos rejeitados.`, ''];
  for (const l of linhas) {
    md.push(`## ${l.data.slice(0, 16).replace('T', ' ')} · ${l.ref} · comercial ${l.comercial || '?'}`, '');
    md.push(`**Disse:** ${l.transcricao || '—'}`, '');
    md.push(`**Corrigiu:** ${l.correcao || '_(sem explicação)_'}`, '');
    md.push('**A Secretária tinha percebido:**');
    if (!l.eventos.length) md.push('- _(interpretação vazia ou ilegível)_');
    for (const e of l.eventos) {
      md.push(`- \`${e.tipo}\` · lead: ${e.ancora || '—'} (${e.ancora_estado || '—'}) · ${JSON.stringify(e.dados)}`);
      if (e.confirmacao) md.push(`  - perguntou: "${e.confirmacao}"`);
    }
    md.push('');
  }
  writeFileSync(destino, md.join('\n'));
}
console.log(`${linhas.length} correcções → ${destino}`);
