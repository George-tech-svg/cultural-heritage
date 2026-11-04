// Real shared UI and CSS, fictional content, intercepted APIs: no live writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3100';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const layoutOnly = process.argv.includes('--layout-only');
const playersOnly = process.argv.includes('--players-only');
const homeOnly = process.argv.includes('--home-only');
const mobileBundle = process.argv.includes('--mobile-preview');
const detailsOnly = process.argv.includes('--details-only');
const museumOnly = process.argv.includes('--museum-only');
const report = { mobilePreview: layoutOnly || process.argv.includes('--mobile-preview'), viewports: [], interactions: [], runtimeErrors: [], unexpectedApis: [], liveWrites: 0 };
const languages = [{ id: 1, code: 'luo', name: 'Luo', nativeName: 'Dholuo' }, { id: 2, code: 'eng', name: 'English', nativeName: 'English' }];
const modules = ['oral_histories', 'songs', 'folktales'].map(code => ({ code, baseName: code === 'songs' ? 'Traditional Songs' : code === 'folktales' ? 'Folktales' : 'Oral Histories', title: code, href: `/dashboard?module=${code}`, contributionHref: `/contribute/${code}` }));
const account = { id: 'layout-reader', name: 'Layout reader', email: 'reader@example.invalid', image: null, profileTypes: [], isSuperAdmin: false, isMasterSuperAdmin: false, languageRoles: [] };
const illustration = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600"><rect width="960" height="600" fill="#e0ebdf"/><circle cx="760" cy="130" r="70" fill="#f0c777"/><path d="M0 360Q250 160 500 360T960 260V600H0" fill="#5c8f7c"/><path d="M0 450Q400 340 960 490V600H0" fill="#184f4b"/><text x="50" y="550" fill="white" font-family="Arial" font-size="28">FICTIONAL MEDIA — LAYOUT CHECK</text></svg>');
let homeFixtureMode = 'normal';
let homeTranslated = false;
const homeQueries = [];
let videoBytes = '', videoPromise, saveCalls = 0, readingCalls = 0, paginateMode = false, pageCalls = 0;
const items = () => [
  { id: 'mixed', title: 'Wach mar oganda', englishTitle: 'Community voices', summary: 'Fictional layout sample: original media stays together, with the item description and actions beside it.', bodyText: 'meaning: Fictional full meaning.\n\ncounty: Fictional place.\n\nusage: Complete detail marker.', moduleCode: 'oral_histories', moduleName: 'Oral Histories', transcriptCount: 216, isProvisional: true, media: [{ id: 'image', type: 'image', url: base + '/api/media/image/file' }, { id: 'video', type: 'video', url: base + '/api/media/video/file', thumbnailUrl: base + '/api/media/image/file' }, { id: 'audio', type: 'audio', url: base + '/api/media/audio/file' }, { id: 'document', type: 'document', url: base + '/api/media/document/file' }] },
  { id: 'recording', title: 'Wende mag oganda', englishTitle: 'Community song', summary: 'Another fictional recording card, kept close to the previous item.', moduleCode: 'songs', moduleName: 'Traditional Songs', transcriptCount: 0, media: [{ id: 'audio2', type: 'audio', url: base + '/api/media/audio2/file' }] },
  { id: 'text', title: 'A long fictional title that stays readable when the navigation is expanded', summary: 'A text-only item should not reserve an empty media column.', moduleCode: 'oral_histories', moduleName: 'Oral Histories', media: [] },
];
const reading = id => ({ id, title: 'Fictional complete interview', sourceLanguageCode: 'luo', sourceLanguageName: 'Dholuo', sourceText: '', englishText: '', transcripts: Array.from({ length: 216 }, (_, i) => ({ id: `segment-${i + 1}`, text: `Conversation turn ${i + 1}. Fictional source text for a full-reader check.`, languageCode: 'luo', role: i % 2 ? 'Respondent' : 'Interviewer' })) });
const wav = Buffer.alloc(44 + 8000 * 2 * 8);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
async function main() {
  assert.ok(/^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(base), 'Use a local app');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'luo-media-layout-'));
  const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-background-timer-throttling','--disable-renderer-backgrounding', '--disable-gpu', '--no-first-run', '--autoplay-policy=no-user-gesture-required', '--remote-debugging-port=0', `--user-data-dir=${directory}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let socket;
  try {
    let port;
    for(let i=0;i<300;i++){try{const value=fs.readFileSync(path.join(directory,'DevToolsActivePort'),'utf8').split('\n')[0];if(/^\d+$/.test(value)){port=value;break;}}catch{}await delay(100);}
    assert.ok(port,'Audit browser starts');
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let sequence = 0, closing = false; const pending = new Map();
    const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; const timeout = setTimeout(() => { pending.delete(id); reject(new Error(method + ' timed out')); }, 120000); pending.set(id, message => { clearTimeout(timeout); message.error ? reject(new Error(message.error.message)) : resolve(message.result); }); socket.send(JSON.stringify({ id, method, params })); });
    socket.onclose=()=>{for(const resolve of pending.values())resolve({error:{message:'Browser closed'}});pending.clear();};
    const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
    const until = async (expression, label) => { const deadline = Date.now() + 90000; while (Date.now() < deadline) { if (await evaluate(expression)) return; await delay(200); } report.failureContext=await evaluate(`(()=>{const v=document.querySelector('video');return {hash:location.hash,count:document.querySelector('.social-media-count')?.textContent,video:v?{ready:v.readyState,network:v.networkState,error:v.error?.code,errorMessage:v.error?.message,source:!!v.currentSrc,bounds:JSON.stringify(v.getBoundingClientRect())}:null};})()`);report.fixtureVideoBytes=Buffer.from(videoBytes,'base64').length;throw new Error('Timed out: ' + label); };
    async function payload(url, method) {
      if (url.pathname === '/api/v1/bootstrap') report.apiOrigin = url.origin;
      if (url.pathname === '/api/v1/bootstrap') return { apiVersion: 1, app: { name: 'Luo Heritage', tagline: 'Heritage', version: 'audit', icon: '/icons/luo-heritage-512.png', manifest: '/application.webmanifest' }, selectedLanguage: languages[0], languages, modules, routes: {}, contentFilters: [], contentViews: [] };
      if (url.pathname === '/api/v1/library') {
        if (homeOnly) homeQueries.push(url.searchParams.get('q') || '');
        if (homeOnly && homeFixtureMode === 'invalid') return {};
        if (homeOnly && homeFixtureMode === 'empty') return {title:'Empty',baseName:'Empty',moduleCode:'discover',languageCode:'luo',languageName:'Dholuo',languageId:1,canContribute:false,items:[],limits:{records:12,dictionaryEntries:6}};
        if (!videoBytes && !homeOnly) { videoPromise ??= evaluate(`new Promise(resolve=>{const c=document.createElement('canvas');c.width=640;c.height=360;const ctx=c.getContext('2d');const paint=()=>{ctx.fillStyle='#164e49';ctx.fillRect(0,0,640,360);ctx.fillStyle='#f1d393';ctx.font='24px Arial';ctx.fillText('FICTIONAL VIDEO — LAYOUT CHECK',40,180);};paint();const stream=c.captureStream(5),r=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'}),chunks=[];r.ondataavailable=e=>chunks.push(e.data);r.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob(chunks,{type:'video/webm'}));};r.start();let paints=0;const timer=setInterval(()=>{paint();stream.getVideoTracks()[0].requestFrame?.();if(++paints===12){clearInterval(timer);r.stop();}},100);})`); videoBytes = await videoPromise; }
        const code = url.searchParams.get('module') || 'discover';
        if (paginateMode && url.searchParams.has('records')) pageCalls++;
        return { title: 'Community collection', baseName: 'Community collection', moduleCode: code, languageCode: 'luo', languageName: 'Dholuo', languageId: 1, canContribute: true, items: paginateMode && url.searchParams.has('records') ? [{...items()[1], id:'next-page', title:'Automatically loaded recording'}] : items(), categories: [...modules.map(m => ({ code: m.code, name: m.baseName })), ...Array.from({length: 18}, (_,i) => ({code:'sample_'+i,name:'Fictional category '+(i+1)}))], limits: { records: 12, dictionaryEntries: 6 }, continuation: { records: paginateMode && !url.searchParams.has('records') ? 'mixed' : null, dictionary: null } };
      }
      if (url.pathname === '/api/auth/session' && homeOnly) return null;
      if (url.pathname === '/api/auth/session') return { user: account, expires: new Date(Date.now() + 3600000).toISOString() };
      if (url.pathname === '/api/v1/account') return account;
      if (url.pathname === '/api/v1/account/conversations') return [];
      if (url.pathname === '/api/languages') return languages;
      if (url.pathname === '/api/interface-copy') return { catalog: homeTranslated ? {'Discover the collection':{english:'Discover the collection',local:'Community label fixture'}} : {} };
      if (url.pathname === '/api/v1/museum') return {tours:[]};
      if (url.pathname === '/api/branding' || url.pathname === '/api/v1/activity') return {};
      if (url.pathname === '/api/app-version') return { version: 'development' };
      if (url.pathname === '/api/v1/reading') { readingCalls++; return reading(url.searchParams.get('id')); }
      if (url.pathname === '/api/v1/saved' && method === 'POST') { saveCalls++; return {}; }
      report.unexpectedApis.push(url.pathname); return {};
    }
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (pending.has(message.id)) { const callback = pending.get(message.id); pending.delete(message.id); callback(message); }
      if (message.method === 'Runtime.exceptionThrown') report.runtimeErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      if (message.method === 'Runtime.consoleAPICalled' && message.params.args?.[0]?.value === 'LUO_UI_ERROR') report.runtimeErrors.push(message.params.args[1]?.value || 'Unknown window error');
      if (message.method === 'Fetch.requestPaused') void (async () => {
        const p = message.params, url = new URL(p.request.url);
        if (/^\/api\/media\/audio2?\/file$/.test(url.pathname)) return send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'audio/wav' }, { name: 'Accept-Ranges', value: 'bytes' }], body: wav.toString('base64') });
        if (url.pathname === '/api/media/video/file') return send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'video/webm' }], body: videoBytes });
        if (url.pathname === '/api/media/image/file') return send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'image/svg+xml' }], body: Buffer.from(decodeURIComponent(illustration.slice(illustration.indexOf(',') + 1))).toString('base64') });
        const data = await payload(url, p.request.method), raw = ['/api/auth/session', '/api/app-version'].includes(url.pathname);
        await send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Cache-Control', value: 'no-store' }, {name:'Access-Control-Allow-Origin',value:'*'}, {name:'Access-Control-Allow-Headers',value:'*'}, {name:'Access-Control-Allow-Methods',value:'GET,POST,OPTIONS'}], body: Buffer.from(JSON.stringify(raw ? data : { success: true, data })).toString('base64') });
      })().catch(error => { if (!closing && !/Invalid InterceptionId/.test(error.message)) report.runtimeErrors.push(error.message); });
    };
    await send('Runtime.enable'); await send('Page.enable'); await send('Fetch.enable', { patterns: [{ urlPattern: '*/api/*' }] });
    await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.addEventListener('error',event=>{if(event.message)console.error('LUO_UI_ERROR',event.message);});`});
    await send('Page.navigate', { url: base + (homeOnly ? mobileBundle ? '/application' : '/' : '/application#/dashboard') });
    if (homeOnly) {
      await until(`!!document.querySelector('.heritage-home h1')`, 'public heritage entry');
      await until(`document.querySelectorAll('.heritage-featured-card').length===1`, 'published featured item');
      for (const [width,height] of [[1440,1000],[1024,900],[768,900],[390,844],[320,700],[844,390]]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});
        await evaluate(`scrollTo(0,0);document.querySelector('.heritage-public-entry')?.scrollTo(0,0)`);await delay(150);
        const metrics=await evaluate(`(()=>{const h=document.querySelector('.heritage-home'),s=document.querySelector('.heritage-hero-search').getBoundingClientRect();return {width:innerWidth,page:document.documentElement.scrollWidth,home:h.scrollWidth,searchBottom:s.bottom,heading:document.querySelector('.heritage-home h1').textContent,background:getComputedStyle(h).backgroundColor};})()`);
        assert.ok(metrics.page<=width&&metrics.home<=width,'Homepage has no overflow at '+width);assert.equal(metrics.background,'rgb(248, 245, 237)');
        for (const [w,h] of [[360,960],[960,960],[1280,360]]) {
          assert.equal(await evaluate(`(async()=>{const image=document.querySelector('.heritage-card-image img');image.removeAttribute('srcset');image.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#d9b968"/></svg>');await image.decode();const r=image.getBoundingClientRect(),p=image.parentElement.getBoundingClientRect(),label=image.parentElement.querySelector('.heritage-card-category').getBoundingClientRect();return getComputedStyle(image).objectFit==='contain'&&r.width>0&&r.height>0&&r.left>=p.left-1&&r.right<=p.right+1&&r.top>=label.bottom-1&&r.bottom<=p.bottom+1;})()`),true,'Homepage keeps portrait, square and panoramic images fully inside their frame below the category at '+width);
        }
        if(width===390||width===320)assert.ok(metrics.searchBottom<height,'Search is visible on the first phone screen');
        await evaluate(`document.querySelector('button[aria-label="Open heritage navigation"]').click()`);
        await until(`!!document.querySelector('.heritage-mobile-nav')`, 'navigation opens');
        assert.equal(await evaluate(`(()=>{const p=document.querySelector('.heritage-mobile-nav'),r=p.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&p.querySelector('[data-app-install] button')?.textContent.includes('Install');})()`),true,'Navigation fits and install is available');
        await evaluate(`document.querySelector('button[aria-label="Close heritage navigation"]').click()`);
        await until(`!document.querySelector('.heritage-mobile-nav')`, 'navigation closes');
        if([1440,390,320].includes(width))fs.writeFileSync('docs/system-audit/screenshots/luo-redesign-home-'+(mobileBundle?'mobile':'web')+'-'+width+'.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
        report.viewports.push(metrics);
      }
      await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
      await evaluate(`document.querySelector('.heritage-featured-card').scrollIntoView({block:'center',behavior:'instant'});document.querySelector('.heritage-featured-card').click()`);
      await until(`!!document.querySelector('.library-content-dialog[open]')`, 'featured item details');
      assert.equal(await evaluate(`document.querySelector('.library-content-dialog').textContent.includes('Complete detail marker.')`),true,'Featured item opens the complete published record');
      await evaluate(`document.querySelector('button[aria-label="Close details"]').click()`);await until(`!document.querySelector('dialog')`, 'featured X returns home');
      await evaluate(`(()=>{const input=document.querySelector('.heritage-hero-search input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'nyatiti');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()`);await delay(100);
      await evaluate(`document.querySelector('.heritage-hero-search').requestSubmit()`);
      await until(`!!document.querySelector('.discovery-card')&&location.hash.includes('q=nyatiti')`, 'homepage search enters feed');
      assert.ok(homeQueries.includes('nyatiti'),'Search reaches the public API');
      assert.equal(await evaluate(`document.querySelector('.discovery-search input').value`),'nyatiti','Search text is retained');
      report.interactions.push('Public-first entry, honest published featured records, responsive menu with install and X, complete item details, and homepage search through to Discover');
      homeFixtureMode='empty';await send('Page.navigate',{url:base+(mobileBundle?'/application':'/')});
      await until(`!!document.querySelector('.heritage-collection-notice')`, 'honest empty collection');
      assert.equal(await evaluate(`document.querySelectorAll('.heritage-featured-card').length`),0);
      homeFixtureMode='invalid';await send('Page.reload');
      await until(`document.querySelector('.heritage-collection-notice')?.textContent.includes('could not load')`, 'collection error state');
      homeFixtureMode='normal';await evaluate(`document.querySelector('.heritage-collection-notice button').click()`);
      await until(`document.querySelectorAll('.heritage-featured-card').length===1`, 'collection retry recovers');
      report.interactions.push('Empty, malformed response and retry recovery never invent cultural records or archive counts');
      homeTranslated=true;await evaluate(`window.dispatchEvent(new Event('interface-copy-updated'))`);
      await until(`[...document.querySelectorAll('.heritage-home .interface-text-pair')].some(e=>e.textContent.includes('Community label fixture'))`, 'approved label translation refresh');
      assert.equal(await evaluate(`(()=>{const pair=[...document.querySelectorAll('.heritage-home .interface-text-pair')].find(e=>e.textContent.includes('Community label fixture'));return pair.querySelector('.interface-english')?.textContent==='Discover the collection'&&pair.querySelector('.interface-english')?.contentEditable==='false';})()`),true,'English stays visible and read-only under the approved community wording');
      report.interactions.push('Edited community labels refresh with their read-only English meaning underneath');
      assert.deepEqual(report.runtimeErrors,[]);assert.deepEqual(report.unexpectedApis,[]);report.completedAt=new Date().toISOString();closing=true;await send('Browser.close').catch(()=>{});return;
    }
    if(museumOnly){
      await evaluate(`location.hash='/museum'`);await until(`!!document.querySelector('.museum-exhibits button[aria-label^="Open "]')`,'museum collection');
      for(const [width,height] of [[1440,1000],[390,844],[320,700],[844,390]]){
        await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});
        await evaluate(`document.querySelector('main').scrollTo(0,0)`);await delay(200);
        assert.equal(await evaluate(`(()=>{const main=document.querySelector('main'),museum=document.querySelector('.virtual-museum');return document.documentElement.scrollWidth<=innerWidth&&main.scrollWidth<=main.clientWidth+1&&museum.scrollWidth<=museum.clientWidth+1;})()`),true,'Museum fits '+width+'x'+height);
        fs.writeFileSync('docs/system-audit/screenshots/owner-museum-'+width+'.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
        await evaluate(`document.querySelector('.museum-exhibits button[aria-label^="Open "]').click()`);await until(`!!document.querySelector('dialog .library-item-details')`,'museum detail');
        assert.equal(await evaluate(`(()=>{const d=document.querySelector('dialog'),media=d.querySelector('.public-media-gallery').getBoundingClientRect(),text=d.querySelector('.library-item-details').getBoundingClientRect();return text.top>=media.bottom-1&&d.scrollWidth<=d.clientWidth;})()`),true,'Museum media sits above its complete descriptions at '+width);
        await evaluate(`document.querySelector('dialog button[aria-label="Close details"]').click()`);await until(`!document.querySelector('dialog')`,'close exhibit');
        report.viewports.push({width,height,museumFits:true,stackedExhibitDetails:true});
      }
      report.interactions.push('Museum gallery and stacked complete exhibit details fit desktop, portrait phones and landscape; live tours remain honestly unconfigured');
      assert.deepEqual(report.runtimeErrors,[]);assert.deepEqual(report.unexpectedApis,[]);report.completedAt=new Date().toISOString();closing=true;await send('Browser.close').catch(()=>{});return;
    }
    await until('document.querySelectorAll(".discovery-card").length===2', 'discovery');
    assert.equal(readingCalls, 0, 'Browsing cards must not load every conversation');
    fs.mkdirSync('docs/system-audit/screenshots', { recursive: true });
    if (detailsOnly) {
      for (const [width,height] of [[390,844],[844,390],[1440,950]]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});
        await evaluate(`document.querySelector('.discovery-card').scrollIntoView({block:'start',behavior:'instant'})`);
        await evaluate(`document.querySelector('.discovery-card .social-card-actions button[aria-label="Explore this item"]').click()`);
        await until(`!!document.querySelector('dialog .public-transcript-reader')`, 'item details');
        await evaluate(`document.querySelector('dialog .public-transcript-reader').scrollIntoView({block:'center',behavior:'instant'})`);
        await until(`document.querySelectorAll('dialog .public-transcript-text > div').length===216`, 'complete transcript');
        await evaluate(`document.querySelector('dialog .public-transcript-reader').scrollIntoView({block:'center',behavior:'instant'})`);
        assert.equal(await evaluate(`(()=>{const d=document.querySelector('dialog'),r=d.getBoundingClientRect(),buttons=[...d.querySelectorAll('.item-dialog-navigation button')];return r.top>=0&&r.bottom<=innerHeight&&d.scrollWidth<=d.clientWidth&&buttons.every(b=>{const p=b.getBoundingClientRect();return p.top>=r.top&&p.bottom<=r.bottom&&document.elementFromPoint(p.left+p.width/2,p.top+p.height/2)?.closest('button')===b;});})()`),true,'Back and X stay visible and clickable after scrolling at '+width+'x'+height);
        assert.equal(await evaluate(`document.querySelector('dialog').textContent.includes('Complete detail marker.')`),true);
        if(width===390)fs.writeFileSync('docs/system-audit/screenshots/item-details-close-390.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
        await evaluate(`document.querySelector('.item-dialog-navigation button:first-child').click()`);
        await until(`!document.querySelector('dialog')`, 'Back closes item details');
        await evaluate(`document.querySelector('.discovery-card .social-card-actions button[aria-label="Explore this item"]').click()`);
        await until(`!!document.querySelector('dialog[open]')`, 'reopen item');
        await evaluate(`document.querySelector('dialog button[aria-label="Close details"]').click()`);
        await until(`!document.querySelector('dialog')`, 'X closes item details');
        report.viewports.push({width,height,stickyBackAndX:true,completeTranscript:true});
      }
      report.interactions.push('Item details preserve full descriptions and all 216 transcript turns; sticky Back/X close at phone, landscape and desktop sizes');
      assert.deepEqual(report.runtimeErrors,[]);assert.deepEqual(report.unexpectedApis,[]);report.completedAt=new Date().toISOString();closing=true;await send('Browser.close').catch(()=>{});return;
    }
    for (const [width, height] of (playersOnly?[]:[[1440,950], [1366,950], [1024,950], [768,950], [390,844], [320,568], [844,390]])) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 });
      for (const route of ['/dashboard', '/dashboard?module=oral_histories']) {
        await evaluate(`location.hash=${JSON.stringify(route)}`);
        const cardSelector = route.includes('?') ? '.library-feed-card' : '.discovery-card';
        await until(`document.querySelectorAll(${JSON.stringify(cardSelector)}).length===2`, route);
        const states = width >= 1024 ? ['collapsed', 'expanded'] : ['responsive'];
        for (const state of states) {
          if (state !== 'responsive') { const button = state === 'collapsed' ? 'Collapse sidebar' : 'Expand sidebar'; await evaluate(`document.querySelector('button[aria-label=${JSON.stringify(button)}]')?.click()`); }
          await delay(400); await evaluate('document.querySelector("main").scrollTop=0');
          if (!route.includes('?')) {
            await evaluate(`document.querySelector('.feed-explore-menu > button').click()`);
            await until(`!!document.querySelector('.feed-explore-dialog[open]')`, 'Explore opens');
            assert.equal(await evaluate(`(()=>{const d=document.querySelector('.feed-explore-dialog'),r=d.getBoundingClientRect();return d.matches(':modal')&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&d.scrollWidth<=d.clientWidth;})()`),true,'Explore fits fully in viewport, outside clipping containers');
            assert.equal(await evaluate(`document.querySelectorAll('.feed-explore-dialog nav[aria-label="Discover content areas"] button').length`),22,'Explore contains every collection');
            if (width === 390) fs.writeFileSync('docs/system-audit/screenshots/explore-menu-390.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
            await evaluate(`(()=>{const area=document.querySelector('.explore-dialog-content');area.scrollTop=area.scrollHeight;})()`);
            assert.equal(await evaluate(`(()=>{const a=document.querySelector('.feed-explore-dialog nav:last-child a:last-child'),r=a.getBoundingClientRect(),s=document.querySelector('.explore-dialog-content').getBoundingClientRect();return r.top>=s.top-1&&r.bottom<=s.bottom+1&&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('a')===a;})()`),true,'Last Explore option is reachable and clickable');
            assert.equal(await evaluate(`(()=>{const b=document.querySelector('[aria-label="Close Explore"]'),r=b.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('button')===b;})()`),true,'X stays visible while menu scrolls');
            await evaluate(`document.querySelector('[aria-label="Close Explore"]').click()`);
            await until(`!document.querySelector('.feed-explore-dialog')`, 'Explore closes using X');
            assert.equal(await evaluate(`document.activeElement===document.querySelector('.feed-explore-menu > button')`),true,'Closing returns focus to Explore');
            await evaluate(`document.querySelector('.feed-explore-menu > button').click()`);
            await until(`!!document.querySelector('.feed-explore-dialog[open]')`, 'Explore reopens');
            await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
            await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
            await until(`!document.querySelector('.feed-explore-dialog')`, 'Escape dismisses Explore');
          }
          const metrics = await evaluate(`(()=>{const main=document.querySelector('main'),card=document.querySelector(${JSON.stringify(cardSelector)}),media=card.querySelector('.immersive-media'),caption=card.querySelector('.social-card-caption'),actions=card.querySelector('.social-card-actions');const a=media.getBoundingClientRect(),b=caption.getBoundingClientRect(),c=card.getBoundingClientRect(),d=actions.getBoundingClientRect();return{viewport:innerWidth,page:document.documentElement.scrollWidth,content:main.scrollWidth,available:main.clientWidth,paneHeight:main.clientHeight-parseFloat(getComputedStyle(main).paddingBottom)-document.querySelector('.feed-search-bar').getBoundingClientRect().height,cardWidth:c.width,cardHeight:c.height,mediaWidth:a.width,mediaHeight:a.height,captionInside:b.left>=c.left&&b.right<=c.right&&b.top>=c.top&&b.bottom<=c.bottom,actionsInside:d.left>=c.left&&d.right<=c.right&&d.top>=c.top&&d.bottom<=c.bottom,audio:card.querySelectorAll('audio').length,video:card.querySelectorAll('video').length,images:card.querySelectorAll('.public-media-gallery img').length,players:card.querySelectorAll('audio,video').length};})()`);
          report.viewports.push({ route, width, height, state, ...metrics });
          assert.ok(metrics.page <= metrics.viewport + 1 && metrics.content <= metrics.available + 2, 'No overflow: ' + JSON.stringify(metrics));
          assert.equal(metrics.players, 2); assert.equal(metrics.images, 1);
          assert.ok(Math.abs(metrics.cardHeight-metrics.paneHeight)<=2, 'Card fills the reading pane: '+JSON.stringify(metrics));
          assert.ok(metrics.mediaWidth>0 && metrics.mediaWidth<=metrics.cardWidth+2 && metrics.mediaHeight>0 && metrics.mediaHeight<metrics.cardHeight,'Media fits the card beside or above its controls');
          for (const [imageWidth,imageHeight] of [[360,960],[960,960],[1280,360]]) {
            const fit = await evaluate(`(async()=>{const card=document.querySelector(${JSON.stringify(cardSelector)}),image=card.querySelector('.public-media-gallery img');image.removeAttribute('srcset');image.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="${imageWidth}" height="${imageHeight}"><rect width="100%" height="100%" fill="#d9b968"/><rect x="1" y="1" width="${imageWidth-2}" height="${imageHeight-2}" fill="none" stroke="red" stroke-width="2"/></svg>');await image.decode();const r=image.getBoundingClientRect(),frame=image.closest('.public-media-asset').getBoundingClientRect(),scale=Math.min(r.width/image.naturalWidth,r.height/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale,visible={left:r.left+(r.width-w)/2,right:r.left+(r.width+w)/2,top:r.top+(r.height-h)/2,bottom:r.top+(r.height+h)/2};return {fit:getComputedStyle(image).objectFit,width:w,height:h,inside:visible.left>=frame.left-1&&visible.right<=frame.right+1&&visible.top>=frame.top-1&&visible.bottom<=frame.bottom+1,clear:[...card.querySelectorAll('.social-card-caption,.social-card-actions,.social-media-paging')].every(control=>{const c=control.getBoundingClientRect();return visible.right<=c.left+1||visible.left>=c.right-1||visible.bottom<=c.top+1||visible.top>=c.bottom-1;})};})()`);
            assert.equal(fit.fit,'contain');assert.ok(fit.width>0&&fit.height>0&&fit.inside&&fit.clear,'Complete media edges stay inside the frame and clear of controls: '+JSON.stringify({width,height,imageWidth,imageHeight,...fit}));
          }
          assert.equal(metrics.captionInside,true); assert.equal(metrics.actionsInside,true);
          const dock = await evaluate(`(()=>{const dock=document.querySelector('.library-media-dock'),r=dock.getBoundingClientRect();return {position:getComputedStyle(dock).position,background:getComputedStyle(dock).backgroundColor,bottom:r.bottom,height:r.height,filters:dock.querySelectorAll('.media-filter-buttons button').length};})()`);
          assert.equal(await evaluate(`getComputedStyle(document.querySelector('.feed-search-bar input')).color`),'rgb(255, 255, 255)','Search text remains readable on its black field');
          assert.equal(dock.position,'fixed');assert.equal(dock.background,'rgb(8, 12, 11)');assert.ok(Math.abs(dock.bottom-height)<=1);assert.equal(dock.filters,5);
          assert.equal(await evaluate(`!!document.querySelector('select[aria-label="Community language"],select[aria-label="Choose community"],select[aria-label="Content language"]')`),false);

          const preview = cardSelector + ' .social-card-description';
          assert.equal(await evaluate(`(()=>{const caption=document.querySelector(${JSON.stringify(cardSelector)}).querySelector('.social-card-caption'),button=caption.querySelector('.social-description-toggle'),a=caption.getBoundingClientRect(),b=button.getBoundingClientRect();return b.top>=a.top-1&&b.bottom<=a.bottom+1;})()`),true,'Collapsed more control stays visible in the caption');

          assert.equal(await evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(preview + ' .social-description-text')})).webkitLineClamp`), width < 768 || height < 500 ? '1' : '2');
          await evaluate(`document.querySelector(${JSON.stringify(preview + ' button')}).click()`);
          assert.equal(await evaluate(`document.querySelector(${JSON.stringify(preview)}).dataset.expanded==='true'&&!document.querySelector('dialog')`), true, 'More expands inside the card');
          assert.equal(await evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(preview + ' button')})).textDecorationLine.includes('underline')`),true);
          await evaluate(`document.querySelector(${JSON.stringify(preview + ' button')}).click()`);
          assert.equal(await evaluate(`document.querySelector(${JSON.stringify(preview)}).dataset.expanded`),'false');
          assert.equal(await evaluate(`(()=>{const button=document.querySelector(${JSON.stringify(cardSelector)}).querySelector('button[aria-label="Next attachment"]');const r=button.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('button')===button;})()`),true,'Attachment navigation is not covered by action buttons');
          if ([1440,390,320].includes(width) && state !== 'expanded') { const shot = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`docs/system-audit/screenshots/social-${route.includes('?') ? 'collection' : 'discovery'}-${width}.png`, Buffer.from(shot.data, 'base64')); }
        }
      }
    }
    console.log('PASS '+report.viewports.length+' full-height layouts');
    await evaluate(`location.hash='/dashboard'`);
    await until(`!!document.querySelector('.feed-explore-menu > button')`, 'discovery navigation');
    await evaluate(`document.querySelector('.feed-explore-menu > button').click()`);
    await until(`!!document.querySelector('.feed-explore-dialog[open]')`, 'Explore link navigation');
    await evaluate(`document.querySelector('.feed-explore-dialog a[href="#/explore"]').click()`);
    await until(`!!document.querySelector('#explore-title')&&!document.querySelector('.feed-explore-dialog')`, 'Explore navigates and closes');
    await evaluate(`document.querySelector('.institution-masthead button[aria-label="Back"]').click()`);
    await until(`!!document.querySelector('.discovery-card')`, 'Header Back returns to previous screen');
    report.interactions.push('Explore all options, scrolling, X, Escape, focus return, navigation and header Back');
    for (const collectionCode of (playersOnly?[]:['dictionary','proverbs','riddles','oral_histories','folktales','songs','artifacts','heritage_sites'])) {
      await evaluate(`location.hash='/dashboard?module=${collectionCode}'`);await until(`document.querySelector('.collection-title-row a')?.getAttribute('href')==='#/contribute/${collectionCode}'`,'collection '+collectionCode);
      assert.equal(await evaluate(`document.querySelector('.collection-title-row a').getAttribute('href')`),'#/contribute/'+collectionCode);
      await evaluate(`document.querySelectorAll('.library-feed-card')[1].scrollIntoView({block:'start',behavior:'instant'})`);await delay(150);
      assert.equal(await evaluate(`(()=>{const a=document.querySelector('.feed-search-bar').getBoundingClientRect(),b=document.querySelector('main').getBoundingClientRect();return Math.abs(a.top-b.top)<=1;})()`),true,'Search stays pinned in '+collectionCode);
      await evaluate(`document.querySelector('.media-filter-buttons button[aria-label="Audio"]').click()`);await delay(100);
      assert.equal(await evaluate('document.querySelectorAll(".library-feed-card").length'),2);
      await evaluate(`document.querySelector('.media-filter-buttons button[aria-label="All"]').click()`);
    }
    if (!playersOnly) report.interactions.push('Fixed black filter dock, pinned search and direct contribution links work across all eight collections; public language selectors are absent');

    await evaluate(`location.hash='/dashboard'`);await until(`document.querySelectorAll('.discovery-card').length===2`,'media discovery');
    await evaluate(`document.querySelector('button[aria-label="Grid view"]').click()`);await until(`!!document.querySelector('.discovery-grid')&&!document.querySelector('.social-feed')`,'discovery grid');
    await evaluate(`document.querySelector('button[aria-label="Transcripts"]').click()`);await until(`!!document.querySelector('.discovery-grid button[aria-label^="Open A long fictional"]')`,'written reading cards');
    assert.equal(await evaluate(`!document.querySelector('.social-feed')&&!!document.querySelector('button[aria-label="Feed view"]')`),true,'Written items use the reading view with a working return to Feed');
    await evaluate(`document.querySelector('button[aria-label="Feed view"]').click()`);await until(`document.querySelectorAll('.discovery-card').length===2`,'return to media feed');
    assert.equal(await evaluate(`!document.querySelector('.social-feed .media-document')`),true,'Documents never become feed slides');
    const previousVisit=await evaluate(`localStorage.getItem('luo-discovery-visit')`);
    await evaluate(`document.querySelector('.masthead-museum').click()`);await until(`!!document.querySelector('.virtual-museum .museum-exhibits button[aria-label^="Open "]')`,'museum exhibits');
    assert.equal(await evaluate(`document.querySelector('.museum-live-tours').textContent.includes('when the museum team adds them')`),true,'No unconfigured live tours are invented');
    await evaluate(`document.querySelector('.museum-exhibits button[aria-label^="Open "]').click()`);await until(`!!document.querySelector('dialog .library-item-details')`,'museum item details');
    assert.equal(await evaluate(`(()=>{const d=document.querySelector('dialog'),m=d.querySelector('.public-media-gallery').getBoundingClientRect(),t=d.querySelector('.library-item-details').getBoundingClientRect();return t.top>=m.bottom-1;})()`),true,'Full item details place the media above the descriptions');
    await evaluate(`document.querySelector('dialog button[aria-label="Close details"]').click()`);await until(`!document.querySelector('dialog')`,'close museum exhibit');
    await evaluate(`location.hash='/dashboard'`);await until(`document.querySelectorAll('.discovery-card').length===2`,'return from museum');
    assert.notEqual(await evaluate(`localStorage.getItem('luo-discovery-visit')`),previousVisit,'Returning to discovery creates a fresh rotation');
    report.interactions.push('Discover Feed/Grid toggle, separate transcript reading, museum navigation/exhibits, honest empty live tours, stacked full details and a fresh visit rotation');
    if (layoutOnly) { assert.deepEqual(report.runtimeErrors,[]);assert.deepEqual(report.unexpectedApis,[]);report.completedAt=new Date().toISOString();closing=true;await send('Browser.close').catch(()=>{});return; }
    if (!playersOnly) report.interactions.push('Inline underlined more/less controls expand and restore one-line phone and two-line desktop previews across every tested layout');
    await send('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true});
    await evaluate('location.hash="/dashboard"'); await until('!!document.querySelector(".discovery-card")', 'return to discovery');
    await evaluate(`document.querySelector('.discovery-card').scrollIntoView({block:'start',behavior:'instant'})`);
    await until('document.querySelector(".public-media-gallery img").complete', 'media dimensions loaded');
    for (const shape of [{width:360,height:960},{width:1280,height:360}]) {
      const dimensions = await evaluate(`new Promise(resolve=>{const image=document.querySelector('.public-media-gallery img');image.removeAttribute('srcset');image.onload=()=>{const style=getComputedStyle(image);resolve({naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,fit:style.objectFit,background:style.backgroundColor,width:image.clientWidth,height:image.clientHeight,frameWidth:image.closest('.public-media-asset').clientWidth});};image.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="${shape.width}" height="${shape.height}"><rect width="100%" height="100%" fill="#d9b968"/><text x="8" y="28">FULL FRAME</text></svg>');})`);
      assert.equal(dimensions.fit,'contain'); assert.equal(dimensions.background,'rgb(0, 0, 0)');
      assert.equal(dimensions.naturalWidth,shape.width); assert.equal(dimensions.naturalHeight,shape.height);
      assert.ok(dimensions.width<=dimensions.frameWidth+1 && dimensions.height>0);
    }
    await evaluate(`document.querySelector('.discovery-card button[aria-label="Next attachment"]').click()`);
    await until('document.querySelector(".social-media-count").textContent==="2 / 3" && document.querySelector("video").readyState>=1','video attachment visible');
    const videoStyle=await evaluate(`({fit:getComputedStyle(document.querySelector('video')).objectFit,background:getComputedStyle(document.querySelector('video')).backgroundColor,controls:document.querySelector('video').controls})`);
    assert.deepEqual(videoStyle,{fit:'contain',background:'rgb(0, 0, 0)',controls:true});
    report.interactions.push('Portrait and panoramic images and video keep their full frames with black unused space');

    const itemDownload = await evaluate('document.querySelector(".discovery-card .public-item-download").href');
    assert.equal(new URL(itemDownload).origin, report.apiOrigin || base); assert.equal(new URL(itemDownload).searchParams.get('id'), 'mixed');
    if (mobileBundle) {
      await evaluate(`document.querySelector('.social-card-actions button[aria-label^="Save "]').click()`);
      await until(`!!document.querySelector('.discovery-save-prompt')`,'guest account prompt');
      assert.equal(new URL(await evaluate(`document.querySelector('.discovery-save-prompt a')?.href`),base).pathname,'/register');
      assert.equal(saveCalls,0);
      report.interactions.push('Guest save offers account registration without attempting a write');
    } else {
      await evaluate(`document.querySelector('.social-card-actions button[aria-label^="Save "]').click()`); await until(`!!document.querySelector('.social-card-actions button[aria-label^="Saved "]')`, 'saved feedback'); assert.equal(saveCalls, 1);
      report.interactions.push('Save uses one API request and confirms the saved state');
    }
    await evaluate('document.querySelector("video").play()');
    await evaluate(`document.querySelector('.discovery-card .social-card-actions button[aria-label="Explore this item"]').click()`);
    await until('!!document.querySelector("dialog .public-transcript-reader")','transcript reader available');
    await evaluate(`document.querySelector('dialog .public-transcript-reader').scrollIntoView({block:'center',behavior:'instant'})`);
    await until('document.querySelectorAll("dialog .public-transcript-text > div").length===216', 'all conversation turns');
    assert.equal(await evaluate('document.querySelector("dialog").textContent.includes("Conversation turn 216.")'), true);
    assert.equal(await evaluate(`(()=>{const b=document.querySelector('dialog button[aria-label="Close details"]'),r=b.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('button')===b;})()`),true,'Item details X remains visible after scrolling a full transcript');
    assert.equal(await evaluate('document.querySelector("dialog").textContent.includes("Complete detail marker.") && document.querySelector("dialog").textContent.includes("Fictional layout sample:")'),true,'Explore retains the full body and overview');
    assert.equal(await evaluate(`document.querySelectorAll('dialog nav[aria-label="More from this collection"] button').length`),1);
    assert.equal(await evaluate('document.querySelector("video").paused'),true,'Explore pauses background playback');
    const transcriptDownload = await evaluate('document.querySelector("dialog a[download^=transcript]").href');
    assert.match(decodeURIComponent(transcriptDownload), /Conversation turn 216\./);
    assert.equal(await evaluate('document.querySelector("dialog").scrollWidth<=document.querySelector("dialog").clientWidth'), true);
    await evaluate(`const s=document.querySelector('dialog select');s.value='eng';s.dispatchEvent(new Event('change',{bubbles:true}));`);
    await until(`document.querySelector('dialog').textContent.includes('An English transcript has not been uploaded')`, 'missing English wording');
    assert.equal(await evaluate('document.querySelector("dialog").textContent.includes("Conversation turn 216.")'), false);
    const shot = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync('docs/system-audit/screenshots/social-transcript-mobile.png', Buffer.from(shot.data, 'base64'));
    await evaluate(`document.querySelector('dialog button[aria-label="Close details"]').click()`); await until('!document.querySelector("dialog")', 'close item');
    await evaluate(`document.querySelector('.discovery-card .social-card-actions button[aria-label="Explore this item"]').click()`);
    await until('!!document.querySelector("dialog nav button")','related collection item');
    await evaluate('document.querySelector("dialog nav button").click()');
    await until('!!document.querySelector("dialog[open]") && document.querySelector("dialog").textContent.includes("A text-only item")','related details open');
    await evaluate(`document.querySelector('dialog button[aria-label="Close details"]').click()`); await until('!document.querySelector("dialog")','close related details');
    report.interactions.push('Explore preserves usage, meaning, place and overview; related collection buttons open complete details');
    report.interactions.push('Full 216-turn reader, complete text download, honest English fallback and dialog dismissal');
    await evaluate('document.querySelector("video").play()'); assert.equal(await evaluate('document.querySelector("video").paused'), false);
    await evaluate(`document.querySelector('.discovery-card button[aria-label="Next attachment"]').click()`);
    await until('document.querySelector(".social-media-count").textContent==="3 / 3"', 'audio attachment');
    assert.equal(await evaluate('document.querySelector("video").paused'),true);
    await evaluate(`document.querySelectorAll('audio')[0].play()`);
    await evaluate(`document.querySelectorAll('.discovery-card')[1].scrollIntoView({block:'start',behavior:'instant'})`);
    await until('document.querySelectorAll("audio")[0].paused', 'offscreen audio pauses');
    await evaluate(`document.querySelectorAll('audio')[1].play()`);
    assert.equal(await evaluate('document.querySelectorAll("audio")[1].paused'),false);
    await evaluate(`document.querySelectorAll('.discovery-card')[0].scrollIntoView({block:'start',behavior:'instant'})`);
    await until('document.querySelectorAll("audio")[1].paused', 'next card audio pauses');
    assert.equal(await evaluate('document.querySelector(".discovery-card .media-document")===null'),true,'Documents stay in the reading view and full details');
    await evaluate(`document.querySelector('.discovery-card button[aria-label="Hide details"]').click()`);
    await until('!document.querySelector(".discovery-card").querySelector(".social-card-caption")','details hide');
    await evaluate(`document.querySelector('.discovery-card button[aria-label="Show details"]').click()`);
    await until('!!document.querySelector(".discovery-card").querySelector(".social-card-caption")','details restore');
    report.interactions.push('Horizontal attachment paging preserves video/audio access and leaves documents in full details; sliding or scrolling away pauses playback; details toggle restores overlays');
    paginateMode = true;
    await evaluate('location.hash="/dashboard?module=songs"');await until('!!document.querySelector(".library-feed-card")','leave discovery before pagination check');
    await evaluate('location.hash="/dashboard"');await until('!!document.querySelector(".feed-load-more")','automatic pagination marker');
    await evaluate(`document.querySelectorAll('.discovery-card')[1].scrollIntoView({block:'end',behavior:'instant'})`);
    await until('document.querySelectorAll(".discovery-card").length===3','automatic next page');
    assert.equal(pageCalls,1);assert.equal(await evaluate('!!document.querySelector(".discovery-aside")'),false);
    report.interactions.push('Scrolling loads the next page once without a button click; curiosity links stay outside the feed');
    assert.deepEqual(report.unexpectedApis, []); assert.deepEqual(report.runtimeErrors, []);
    report.readingRequests = readingCalls; report.completedAt = new Date().toISOString();
    console.log(JSON.stringify({ checkedLayouts: report.viewports.length, interactions: report.interactions, runtimeErrors: report.runtimeErrors, liveWrites: 0 }));
    closing=true;await send('Browser.close').catch(() => {});
  } finally {
    fs.writeFileSync('docs/system-audit/'+(museumOnly?'owner-museum':homeOnly?(mobileBundle?'luo-home-mobile':'luo-home-web'):detailsOnly?'luo-details':layoutOnly?'luo-feed-mobile':playersOnly?'luo-players':'luo-feed-web')+'-2026-11-04.json', JSON.stringify(report, null, 2));
    socket?.close(); browser.kill();
  }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
