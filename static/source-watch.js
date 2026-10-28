/* Career-page Watchlist: approved employer ATS APIs, no arbitrary crawling. */
(function(){
 'use strict';
 let state={sources:[],ctx:null,request:0,query:''};
 const h=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const allowed=new Set(['greenhouse','lever','ashby','smartrecruiters']);
 const urls={
  greenhouse:'https://docs.greenhouse.io/job-board.html',
  lever:'https://github.com/lever/postings-api',
  ashby:'https://developers.ashbyhq.com/docs/public-job-posting-api',
  smartrecruiters:'https://developers.smartrecruiters.com/'
 };
 const el=id=>document.getElementById(id);
 function status(row){
   if(!row.enabled)return ['Paused','neutral'];
   if(row.status==='running')return ['Checking','checking'];
   if(row.last_success){
    if(['degraded','cooldown'].includes(row.status))return ['Needs retry','warning'];
    return ['Checked','good'];
   }
   if(row.error_category)return ['Check failed','warning'];
   return ['Not yet checked','neutral'];
 }
 function renderRows(){
   const q=state.query;
   const rows=state.sources.filter(x=>(String(x.name)+' '+String(x.provider)+' '+String(x.slug)).toLowerCase().includes(q));
   const host=el('watch-items');if(!host)return;
   el('watch-matches').textContent=rows.length+' matching boards';
   host.innerHTML=rows.length?rows.slice(0,120).map(x=>{
    const pair=status(x),label=pair[0],cls=pair[1],ref=String(x.reference||x.url||'');
    const checked=x.last_success?new Date(x.last_success).toLocaleDateString('en-IN',{year:'numeric',month:'short',day:'numeric'}):'Never successfully checked';
    return '<article class="watch-entry">'+
     '<div class="watch-employer"><span class="watch-letter">'+h((x.name||'C').charAt(0))+'</span><span><strong>'+h(x.name)+'</strong>'+
     '<small>'+h(x.provider)+' · '+h(x.slug)+'</small></span></div>'+
     '<span class="watch-status '+cls+'">'+h(label)+'</span>'+
     '<div class="watch-entry-foot"><span>'+h(checked)+' · '+Number(x.record_count||0)+' role records at last check</span>'+
     '<a href="'+h(ref)+'" target="_blank" rel="noopener noreferrer">Career source ↗</a></div>'+
     '</article>';
   }).join(''):'<p class="watch-empty">No connected boards match this search. Add a verified employer career page below.</p>';
 }
 function html(){
   return '<div class="deck-shell watch-shell">'+
    '<div class="deck-utility"><span class="live-indicator"><i></i>PUBLIC CAREER-PAGE INTELLIGENCE</span><span>Real employer boards · cached source checks</span></div>'+
    '<section class="watch-hero"><div><span class="deck-section-eyebrow">COMPANY RADAR</span><h1>Follow employers.<br><em>Catch the right openings.</em></h1>'+
      '<p>Connect published careers boards you actually care about. Opportunity OS reads public listings using approved APIs and keeps the original employer link, location and requirements.</p>'+
      '<div class="watch-hero-actions"><button class="deck-action-main" data-watch="refresh">Check connected boards ↗</button><a class="deck-action-glass" href="#matches">View my matches</a></div></div>'+
      '<div class="watch-hero-side"><strong id="watch-active">—</strong><span>connected employer boards</span><small>Checked when the service is awake · not a live crawler of all companies</small></div></section>'+
    '<div class="watch-layout"><section class="watch-panel"><div class="watch-section-header"><div><div class="deck-section-eyebrow">01 / MY SOURCES</div><h2>Connected career pages</h2><p id="watch-matches">Loading boards…</p></div></div>'+
      '<input id="watch-search" type="search" aria-label="Find a watched company" placeholder="Search employer name, ATS or board ID…">'+
      '<div class="watch-list" id="watch-items" aria-live="polite"></div></section>'+
    '<section class="watch-column">'+
      '<section class="watch-panel"><div class="deck-section-eyebrow">02 / ADD AN EMPLOYER</div><h2>Register a published board</h2>'+
        '<p class="watch-helper">Use an employer’s real hosted ATS board and official careers-page URL. Registration validates the board before saving it. No guessing of company IDs.</p>'+
        '<form id="watch-form" class="watch-form"><label for="watch-provider">Public board provider</label>'+
        '<select name="provider" id="watch-provider" required><option value="greenhouse">Greenhouse</option><option value="lever">Lever</option><option value="ashby">Ashby</option><option value="smartrecruiters">SmartRecruiters</option></select>'+
        '<label for="watch-name">Employer</label><input id="watch-name" name="name" maxlength="160" placeholder="Employer company name" required>'+
        '<label for="watch-slug">Published board ID</label><input id="watch-slug" name="slug" maxlength="80" pattern="[A-Za-z0-9_-]+" placeholder="Exact slug from their jobs board" required>'+
        '<label for="watch-reference">Official careers evidence</label><input id="watch-reference" name="reference" type="url" placeholder="https://company.com/careers" required>'+
        '<button class="deck-action-main" type="submit">Validate & follow employer</button><p id="watch-message" class="watch-message" role="status" aria-live="polite">No source added yet.</p></form>'+
      '</section>'+
      '<section class="watch-panel watch-privacy"><div class="deck-section-eyebrow">HOW THE WATCH WORKS</div><h2>Signals, not promises.</h2>'+
        '<div class="watch-guide"><span>01</span><p><strong>Check public APIs</strong> for published employer roles; source requests are cached and rate-limited.</p></div>'+
        '<div class="watch-guide"><span>02</span><p><strong>Evaluate suitability</strong> using 2028 graduation, India location, Python/backend/AI/cloud and winter evidence.</p></div>'+
        '<div class="watch-guide"><span>03</span><p><strong>Review the actual listing.</strong> Pay, dates and work authorization remain unverified unless explicitly stated.</p></div>'+
        '<p class="watch-disclaimer">Website source scans do not deliver instant push alerts while a free Render service sleeps. The separately scheduled ChatGPT internship watch delivers confirmed updates on its own schedule. Adding a board here does not automatically change that external watch.</p></section>'+
      '<section class="watch-panel"><div class="deck-section-eyebrow">SUPPORTED PROVIDERS</div><h2>Official API references</h2>'+
        Object.entries(urls).map(([name,url])=>'<a class="watch-doc" target="_blank" rel="noopener noreferrer" href="'+url+'">'+h(name)+' <span>Official docs ↗</span></a>').join('')+
      '</section></section></div></div>';
 }
 async function render(ticket,ctx){
   state.ctx=ctx;state.request=ticket;state.query='';
   el('content').innerHTML=html();
   try{
    const data=await ctx.api('sources');
    if(ticket!==ctx.getRequest())return;
    state.sources=(data.sources||[]).filter(x=>x.mode==='API'&&allowed.has(x.provider));
    state.sources.sort((a,b)=>(Number(Boolean(b.enabled))-Number(Boolean(a.enabled)))||a.name.localeCompare(b.name));
    el('watch-active').textContent=state.sources.filter(x=>x.enabled).length;
    renderRows();
   }catch(error){el('watch-items').textContent=error.message;}
 }
 const report=(message,error=false)=>{const m=el('watch-message');if(m){m.textContent=message;m.classList.toggle('error',error);}};
 document.addEventListener('input',e=>{
   if(e.target.id==='watch-search'){state.query=e.target.value.trim().toLowerCase();renderRows();}
 });
 document.addEventListener('click',async e=>{
   const b=e.target.closest('[data-watch]');if(!b||location.hash!=='#watch')return;
   e.preventDefault();
   if(b.dataset.watch==='refresh'){
    b.disabled=true;
    try{
      const result=await state.ctx.mutate('refresh');
      report('Employer source check '+(result.status||'queued')+'. This is not proof new jobs are available. Refresh this page to see results.');
    }catch(error){report(error.message,true);}
    finally{b.disabled=false;}
   }
 });
 document.addEventListener('submit',async e=>{
   if(e.target.id!=='watch-form')return;
   e.preventDefault();e.stopImmediatePropagation();
   const b=e.target.querySelector('button[type=submit]');b.disabled=true;
   const data=Object.fromEntries(new FormData(e.target));
   try{
     if(!allowed.has(data.provider))throw Error('Choose a supported public board.');
     if(!/^https:\/\//.test(data.reference))throw Error('Use the official HTTPS careers page.');
     const result=await state.ctx.mutate('sources',data);
     report('Validated '+result.name+' board. The next scheduled source check can collect its new listings.');
     state.sources.push(Object.assign({},result,{mode:'API',enabled:1}));
     state.sources.sort((a,b)=>a.name.localeCompare(b.name));renderRows();
     e.target.reset();
   }catch(error){report(error.message,true);}
   finally{b.disabled=false;}
 });
 window.SourceWatch={render};
})();