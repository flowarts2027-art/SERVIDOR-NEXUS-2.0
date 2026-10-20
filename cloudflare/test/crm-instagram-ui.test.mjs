import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

async function render(contact, via = 'pessoal', {copyFails = false, storage = new Map()} = {}) {
  const nodes = new Map(['#crm-list', '#crm-due', '#crm-via', '#today-sub', '#today-list'].map(k => [k, {}]));
  const handlers = {};
  const copied = [];
  const requests = [];
  vm.runInNewContext(fs.readFileSync(new URL('../../public/crm.js', import.meta.url), 'utf8'), {
    document: { readyState: 'loading', querySelector: k => nodes.get(k), addEventListener: (k, fn) => { handlers[k] = fn; } },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)) },
    fetch: async (path, options = {}) => {
      requests.push({path, options});
      return { ok: true, status: 200, json: async () => path.endsWith('/settings') ? {settings: { via }} : {contacts:[contact],due:[contact],counts:{},today:'2026-10-20',total:1} };
    },
    navigator: { clipboard: {writeText: async text => { if (copyFails) throw new Error('clipboard denied'); copied.push(text); }} },
    URLSearchParams, console, setTimeout, clearTimeout
  });
  await handlers.DOMContentLoaded();
  return {nodes, handlers, copied, requests, storage};
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

async function chooseChannel(handlers, channel) {
  const button = {dataset:{channel}, matches: selector => selector.split(',').includes('[data-channel]')};
  await handlers.click({target:{closest:()=>button}});
}
function whatsappUrl(html) {
  const href = html.match(/href="(https:\/\/wa\.me\/[^\"]+)"/)?.[1];
  assert.ok(href, 'manual WhatsApp link must be rendered');
  return new URL(href.replace(/&amp;/g, '&'));
}

test('manual channel selector opens WhatsApp with the prepared niche message and persists choice without sending', async () => {
  const contact = {...base, instagram:'empresa.teste', niche:'hotel', name:'Hotel & Pousada Exemplo', instagramMessage:'Oi, equipe do Hotel & Pousada Exemplo!\nUma proposta para hotéis: acomodações e hospedagem.'};
  const {nodes, handlers, requests, storage} = await render(contact, 'flow');
  assert.match(nodes.get('#crm-via').innerHTML, /Instagram/);
  assert.match(nodes.get('#crm-via').innerHTML, /WhatsApp/);
  await chooseChannel(handlers, 'whatsapp');
  const html = nodes.get('#crm-list').innerHTML;
  const url = whatsappUrl(html);
  assert.equal(url.pathname, '/5511999999999');
  assert.equal(url.searchParams.get('text'), contact.instagramMessage);
  assert.doesNotMatch(html, /ig\.me|data-send=|Enviar pela Flow/);
  assert.equal(requests.some(({options}) => options.method === 'POST'), false, 'choosing a channel never sends or changes server data');
  const reloaded = await render(contact, 'pessoal', {storage});
  assert.equal(whatsappUrl(reloaded.nodes.get('#crm-list').innerHTML).searchParams.get('text'), contact.instagramMessage);
  await chooseChannel(reloaded.handlers, 'instagram');
  assert.match(reloaded.nodes.get('#crm-list').innerHTML, /ig\.me\/m\/empresa.teste/);
  assert.doesNotMatch(reloaded.nodes.get('#crm-list').innerHTML, /wa\.me/);
});

test('WhatsApp click updates link with reviewed text without copying or sending through an API', async () => {
  const {nodes, handlers, copied, requests} = await render({...base, instagram:'empresa.teste', instagramMessage:'Mensagem para pet shop'});
  await chooseChannel(handlers, 'whatsapp');
  const reviewed = 'Olá, Pet & Cia!\nTexto revisado: ração, banho e tosa?';
  const anchor = {
    dataset:{openWa:'test'}, href:'',
    matches: selector => selector.split(',').includes('[data-open-wa]'),
    closest: () => ({querySelector: selector => selector === '[data-dm-message]' ? {value:reviewed} : null})
  };
  await handlers.click({target:{closest:()=>anchor}, preventDefault:()=>assert.fail('manual WhatsApp link keeps browser navigation')});
  const url = new URL(anchor.href);
  assert.equal(url.pathname, '/5511999999999');
  assert.equal(url.searchParams.get('text'), reviewed);
  assert.deepEqual(copied, []);
  assert.equal(requests.some(({options}) => options.method === 'POST'), false);
});

test('WhatsApp choice without a valid phone never invents a number or falls back to Instagram', async () => {
  for (const phone of ['', '123', 'javascript:alert(1)']) {
    const {nodes, handlers} = await render({...base, phone, instagram:'empresa.teste'});
    await chooseChannel(handlers, 'whatsapp');
    const html = nodes.get('#crm-list').innerHTML;
    assert.doesNotMatch(html, /href=|ig\.me|wa\.me/);
    assert.match(html, /WhatsApp|número|telefone/);
  }
});

test('reviewed message survives switching channels and updates WhatsApp destination immediately', async () => {
  const {nodes, handlers} = await render({...base, instagram:'empresa.teste', instagramMessage:'Proposta para hotéis'});
  const link = {href:''};
  const reviewed = 'Olá, Hotel Exemplo! Posso mostrar um modelo de hospedagem?';
  handlers.input({target:{
    dataset:{dmMessage:'test'}, value:reviewed,
    matches: selector=>selector==='[data-dm-message]',
    closest: ()=>({querySelector:()=>link})
  }});
  assert.equal(new URL(link.href).searchParams.get('text'), reviewed);
  await chooseChannel(handlers, 'whatsapp');
  assert.equal(whatsappUrl(nodes.get('#crm-list').innerHTML).searchParams.get('text'), reviewed);
  await chooseChannel(handlers, 'instagram');
  assert.match(nodes.get('#crm-list').innerHTML, /Olá, Hotel Exemplo! Posso mostrar um modelo de hospedagem\?/);
});

test('unrecognized persisted channel safely defaults to Instagram', async () => {
  const storage = new Map([['nexus-crm-contact-channel', 'flow']]);
  const {nodes} = await render({...base, instagram:'empresa.teste'}, 'flow', {storage});
  assert.match(nodes.get('#crm-list').innerHTML, /ig\.me\/m\/empresa.teste/);
  assert.doesNotMatch(nodes.get('#crm-list').innerHTML, /wa\.me|data-send=/);
});
