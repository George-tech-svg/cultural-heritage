const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loader}=require('./load-ts.cjs');

test('returning visits start at different records and circular pagination visits every record once',async()=>{
 const {readLibraryPage,nextDiscoveryVisit}=loader()('src/lib/discovery-rotation.ts');
 let stored='7';const storage={getItem:()=>stored,setItem:(_,value)=>{stored=value;}};
 const seed=nextDiscoveryVisit(storage),next=nextDiscoveryVisit(storage);assert.equal(next,seed+1);
 const rows=Array.from({length:37},(_,i)=>({id:'record-'+i}));
 async function collect(rotation){let cursor;const ids=[];do{const page=await readLibraryPage({cursor,rotation,limit:12,count:async()=>rows.length,read:async({skip=0,take})=>rows.slice(skip,skip+take)});ids.push(...page.items.map(row=>row.id));cursor=page.continuation;}while(cursor);return ids;}
 const first=await collect(seed),second=await collect(next);
 assert.equal(first.length,37);assert.equal(new Set(first).size,37);assert.notEqual(first[0],second[0]);assert.deepEqual([...first].sort(),rows.map(row=>row.id).sort());
 for(const total of [0,1,2,12,13]){const page=await readLibraryPage({rotation:999,limit:12,count:async()=>total,read:async({skip=0,take})=>rows.slice(0,total).slice(skip,skip+take)});assert.equal(page.items.length,Math.min(total,12));assert.equal(new Set(page.items.map(row=>row.id)).size,page.items.length);}
});

test('rotation cursors reject invalid offsets and legacy search cursors retain their ordinary query',async()=>{
 const {readLibraryPage}=loader()('src/lib/discovery-rotation.ts');
 for(const cursor of ['v1-999-12-37','v1-3-100-37','not-a-rotation-cursor'])await assert.rejects(readLibraryPage({cursor,rotation:1,limit:12,count:async()=>37,read:()=>assert.fail('invalid cursor must not query records')}));
 let paging;await readLibraryPage({cursor:'record-2',limit:12,count:()=>assert.fail('ordinary search must not count'),read:async value=>{paging=value;return[];}});assert.deepEqual(paging,{cursor:{id:'record-2'},skip:1,take:12});
});

test('remembered browser sessions last 90 days and suspended accounts remain excluded',async()=>{
 let config;
 loader({'next-auth':value=>{config=value;return {auth:async()=>null};},'@auth/prisma-adapter':{PrismaAdapter:()=>({})},'next-auth/providers/credentials':value=>value,'next-auth/providers/google':value=>value,'@/lib/db':{prisma:{user:{findUnique:async()=>({status:'suspended'})}}}})('src/lib/auth.ts');
 assert.equal(config.session.maxAge,90*86400);assert.equal(config.jwt.maxAge,config.session.maxAge);
 assert.equal(await config.callbacks.jwt({token:{id:'reader'},user:null}),null);
});

test('returning authenticated homepage visits go directly to the correct account destination',async()=>{
 for(const [user,target] of [[{id:'reader'},'/dashboard'],[{id:'staff',isSuperAdmin:true},'/super-admin/dashboard']]){
  const load=loader({'@/lib/auth':{auth:async()=>({user})},'next/navigation':{redirect:path=>{throw Object.assign(new Error('redirect'),{path});}}});
  await assert.rejects(load('src/app/page.tsx').default(),error=>error.path===target);
 }
});

test('museum tours accept public HTTPS links and reject active URLs and incomplete entries',()=>{
 const {MuseumToursSchema,publishedMuseumTours}=loader()('src/lib/museum-tours.ts');
 const tour={title:'Approved collection tour',description:'A fixture, not a live tour.',url:'https://museum.example.invalid/tour'};
 assert.deepEqual(publishedMuseumTours(JSON.stringify([tour])),[tour]);
 for(const url of ['javascript:alert(1)','data:text/html,example','http://museum.example.invalid','https://user:pass@museum.example.invalid'])assert.equal(MuseumToursSchema.safeParse([{...tour,url}]).success,false);
 assert.deepEqual(publishedMuseumTours('broken'),[]);assert.equal(MuseumToursSchema.safeParse([{...tour,title:''}]).success,false);
});

test('the actual discovery projection rotates published media without re-sorting away the visit order',async()=>{
 const rows=Array.from({length:18},(_,index)=>({id:'record-'+index,title:'Artifact '+index,languageId:1,summary:null,data:{},createdAt:new Date(2026,0,index+1),module:{code:'artifacts',baseName:'Cultural Artifacts'},media:[{id:'image-'+index,type:'image'}],translations:[],_count:{transcripts:0},contributorId:'PRIVATE'}));
 const {getPublicLibrary}=loader({'@/lib/public-navigation':{getPublicModules:async()=>[{id:1,code:'artifacts',baseName:'Artifacts',_count:{fieldDefinitions:1}}]},'@/lib/db':{prisma:{language:{findUnique:async()=>({id:2})},culturalRecord:{count:async({where})=>{assert.match(JSON.stringify(where),/public_excerpt/);assert.match(JSON.stringify(where),/"image","video","audio"/);return rows.length;},findMany:async({skip=0,take})=>rows.slice(skip,skip+take)}}}})('src/lib/public-library.ts');
 const language={id:1,code:'luo',nativeName:'Dholuo'};
 const first=await getPublicLibrary(language,'discover',{visit:2,presentation:'feed'}),second=await getPublicLibrary(language,'discover',{visit:3,presentation:'feed'});
 assert.equal(first.items[0].id,'record-2');assert.equal(second.items[0].id,'record-3');assert.equal(JSON.stringify(first).includes('PRIVATE'),false);
 const tail=await getPublicLibrary(language,'discover',{visit:2,presentation:'feed',records:first.continuation.records});
 assert.equal(new Set([...first.items,...tail.items].map(item=>item.id)).size,18);
});

test('public museum links expose no private settings and unsafe tour updates are rejected',async()=>{
 const tour={title:'Fixture tour',description:'',url:'https://museum.example.invalid/tour'};
 const {GET}=loader({'@/lib/settings':{getSystemSettings:async()=>({virtual_museum_tours:JSON.stringify([tour]),smtp_password:'PRIVATE'})}})('src/app/api/v1/museum/route.ts');
 const response=await GET(new Request('https://app.example.invalid/api/v1/museum'));const value=await response.json();assert.deepEqual(value.data,{tours:[tour]});assert.equal(JSON.stringify(value).includes('PRIVATE'),false);
 const {PATCH}=loader({'@/lib/auth':{auth:async()=>({user:{id:'master',isMasterSuperAdmin:true}})},'@/lib/settings':{setSystemSettings:()=>assert.fail('Invalid links must not be persisted')},'@/lib/audit':{logAction:async()=>{}}})('src/app/api/super-admin/settings/route.ts');
 assert.equal((await PATCH(new Request('https://app.example.invalid/api/super-admin/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({virtual_museum_tours:JSON.stringify([{...tour,url:'javascript:alert(1)'}])})}))).status,400);
});

test('authorized administrators can save an NRF partner logo through the existing image-validation path',async()=>{
 let saved;
 const {POST}=loader({'@/lib/auth':{auth:async()=>({user:{id:'master',isMasterSuperAdmin:true}})},'@/lib/cloudinary':{uploadToCloudinary:async()=>({url:'https://images.example.invalid/nrf.png',publicId:'nrf-fixture'})},'@/lib/settings':{setSystemSetting:async(key,value)=>{saved={key,value};}},'@/lib/audit':{logAction:async()=>{}}})('src/app/api/super-admin/branding/route.ts');
 const form=new FormData();form.set('partner','nrf');form.set('file',new File([Buffer.from([137,80,78,71,13,10,26,10])],'nrf-fixture.png',{type:'image/png'}));
 assert.equal((await POST(new Request('https://app.example.invalid/api/super-admin/branding',{method:'POST',body:form}))).status,200);
 assert.deepEqual(saved,{key:'nrf_logo_url',value:'https://images.example.invalid/nrf.png'});
});
