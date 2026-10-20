import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

async function render(contact, via = 'pessoal') {
  const nodes = new Map(['#crm-list', '#crm-due', '#crm-via', '#today-sub', '#today-list'].map(k => [k, {}]));
  const handlers = {};
  const copied = [];
  vm.runInNewContext(fs.readFileSync(new URL('../../public/crm.js', import.meta.url), 'utf8'), {
    document: { readyState: 'loading', querySelector: k => nodes.get(k), addEventListener: (k, fn) => { handlers[k] = fn; } },
    fetch: async path => ({ ok: true, status: 200, json: async () => path.endsWith('/settings') ? {settings: { via }} : {contacts:[contact],due:[contact],counts:{},today:'2026-10-20',total:1} }),
    navigator: { clipboard: {writeText: async text => copied.push(text)} },
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
    assert.match(html, /href="https:\/\/www.instagram.com\/empresa.teste\/"/);
    assert.doesNotMatch(html, /wa.me|data-send=|data-wa=/);
    assert.doesNotMatch(nodes.get('#today-list').innerHTML, /wa.me/);
    assert.match(nodes.get('#today-sub').textContent, /Instagram/);
    const button = {dataset:{copyMessage:'test'}, matches: s => s === '[data-copy-message]'};
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
  assert.match(nodes.get('#crm-list').innerHTML, /https:\/\/www.instagram.com\/empresa.teste\//);
});
