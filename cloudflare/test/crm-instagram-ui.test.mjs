import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

async function render(contact, via = 'pessoal', {copyFails = false} = {}) {
  const nodes = new Map(['#crm-list', '#crm-due', '#crm-via', '#today-sub', '#today-list'].map(k => [k, {}]));
  const handlers = {};
  const copied = [];
  vm.runInNewContext(fs.readFileSync(new URL('../../public/crm.js', import.meta.url), 'utf8'), {
    document: { readyState: 'loading', querySelector: k => nodes.get(k), addEventListener: (k, fn) => { handlers[k] = fn; } },
    fetch: async path => ({ ok: true, status: 200, json: async () => path.endsWith('/settings') ? {settings: { via }} : {contacts:[contact],due:[contact],counts:{},today:'2026-10-20',total:1} }),
    navigator: { clipboard: {writeText: async text => { if (copyFails) throw new Error('clipboard denied'); copied.push(text); }} },
    URLSearchParams, console, setTimeout, clearTimeout
  });
  await handlers.DOMContentLoaded();
  return {nodes, handlers, copied};
}
const base = {id:'test', name:'Empresa teste', stage:'chamar', phone:'5511999999999', nextFollowAt:'2026-10-20', message:'Olá, empresa!'};
test('CRM opens company Instagram regardless of saved WhatsApp mode and copies text without sending', async () => {
  for (const via of ['pessoal','flow']) {
    const {nodes,handlers,copied} = await render({...base, instagram:'@empresa.teste'},via);
    const html = nodes.get('#crm-list').innerHTML;
    assert.match(html, /href="https:\/\/ig.me\/m\/empresa.teste"/);
    assert.doesNotMatch(html, /wa.me|data-send=|data-wa=/);
    assert.doesNotMatch(nodes.get('#today-list').innerHTML, /wa.me/);
    assert.match(nodes.get('#today-sub').textContent, /Instagram/);
    const button = {dataset:{copyMessage:'test'}, matches: s => s.split(',').includes('[data-copy-message]'), closest: () => null};
    await handlers.click({target:{closest:()=>button}});
    assert.deepEqual(copied, ['Olá, empresa!']);
  }
});
test('missing or unsafe profile never falls back to WhatsApp or invents a profile', async () => {
  for (const instagram of ['', 'https://evil.example/empresa', 'https://instagram.com/p/123', 'javascript:alert(1)']) {
    const {nodes} = await render({...base,instagram});
    assert.match(nodes.get('#crm-list').innerHTML, /Instagram não cadastrado/);
    assert.doesNotMatch(nodes.get('#crm-list').innerHTML, /href=/);
  }
});
test('saved Instagram profile URL opens canonical company profile', async () => {
  const {nodes} = await render({...base,instagram:'https://instagram.com/empresa.teste/?hl=pt'});
  assert.match(nodes.get('#crm-list').innerHTML, /href="https:\/\/ig.me\/m\/empresa.teste"/);
});


test('Direct click copies editable niche message and leaves native link navigation enabled', async () => {
  const {nodes,handlers,copied} = await render({...base,instagram:'empresa.teste',instagramMessage:'Mensagem específica para farmácia'});
  assert.match(nodes.get('#crm-list').innerHTML, /Mensagem específica para farmácia/);
  assert.match(nodes.get('#crm-list').innerHTML, /Copiar mensagem e abrir Direct/);
  const status = {hidden:true};
  const card = {querySelector: s => s === '[data-dm-message]' ? {value:'Texto revisado para a farmácia'} : status};
  const anchor = {dataset:{openDm:'test'}, closest: () => card, matches: s => s.split(',').includes('[data-open-dm]')};
  await handlers.click({target:{closest:()=>anchor},preventDefault:()=>assert.fail('must not suppress native Direct navigation')});
  assert.deepEqual(copied,['Texto revisado para a farmácia']);
  assert.equal(status.hidden,false);
  assert.match(status.textContent,/Ctrl \+ V/);
});
test('clipboard denial keeps Direct usable and offers manual copy without claiming success', async () => {
  const {handlers,copied} = await render({...base,instagram:'empresa.teste',instagramMessage:'Farmácia'}, 'pessoal', {copyFails:true});
  const status = {hidden:true};
  const anchor = {dataset:{openDm:'test'}, closest:()=>({querySelector:s=>s==='[data-dm-message]'?{value:'Farmácia'}:status}),matches:s=>s.split(',').includes('[data-open-dm]')};
  await handlers.click({target:{closest:()=>anchor},preventDefault:()=>assert.fail('must keep navigation')});
  assert.equal(copied.length,0);
  assert.equal(status.hidden,false);
  assert.match(status.textContent,/copie o texto manualmente/);
  assert.doesNotMatch(status.textContent,/Mensagem copiada/);
});
