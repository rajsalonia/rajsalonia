/* Opportunity OS 6 — focused command deck. This module never sends email or applies. */
(function(){
  'use strict';
  let activeTab='all', latest=null, context=null;
  const safe=(value)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n=x=>Math.max(0,Number(x)||0);
  function fitItem(item,ctx,mode='grid'){
    const fit=item.fit||{}, f=item.extracted||{},checks=fit.checks||[], reasons=fit.reasons||[];
    const work=f.work_mode||'Work mode unknown', remote=fit.remote||{};
    const pay=f.fields?.compensation?.value||'Stipend not disclosed';
    const loc=item.location||'Location not provided';
    const company=item.company||'Employer not listed';
    const score=n(fit.score);
    const winter=String(fit.winter||'').startsWith('winter ')||String(fit.winter||'').startsWith('possible winter ');
    const source=item.provider||'Recorded source';
    const stage=fit.level==='strong'?'Worth reviewing':'Verify eligibility';
    const heading=mode==='row'?'signal-row':'signal-card';
    return '<article class="'+heading+'">'+
      '<div class="signal-top"><span class="signal-employer"><span class="signal-avatar">'+safe(company.charAt(0))+'</span>'+
        '<span><strong>'+safe(company)+'</strong><small>'+safe(source)+' · '+(item.stale?'Check freshness':'Recorded opening')+'</small></span></span>'+
        '<span class="signal-score" title="Rules-based relevance; not probability of being hired">'+score+'<small>/100 fit</small></span></div>'+
      '<button class="signal-role" type="button" data-action="detail" data-key="'+safe(item.key)+'">'+safe(item.title)+'</button>'+
      '<div class="signal-tags">'+
        '<span class="signal-pill '+(fit.level==='strong'?'positive':'neutral')+'">'+safe(stage)+'</span>'+
        '<span class="signal-pill">'+safe(fit.track==='general'?'Software':String(fit.track||'general').toUpperCase())+'</span>'+
        (winter?'<span class="signal-pill winter">Winter signal</span>':'')+
        '<span class="signal-pill">'+safe(work)+'</span></div>'+
      '<p class="signal-meta">'+safe(loc)+' <span>·</span> '+safe(pay)+'</p>'+
      '<p class="signal-why"><strong>Why this one:</strong> '+safe(reasons[0]||'An early-career role with skills to investigate.')+'</p>'+
      '<p class="signal-caution">'+safe((work==='Remote'&&!remote.india_eligible)?'Remote-from-India not confirmed · '+(remote.evidence||'Check employer location rules'):(checks[0]||'Confirm application requirements on the official page'))+'</p>'+
      '<div class="signal-actions"><button class="signal-secondary" data-action="detail" data-key="'+safe(item.key)+'">Review fit '+ctx.icon('arrow-right')+'</button>'+
      ctx.link('Employer listing '+ctx.icon('external-link'),item.url,'signal-primary')+'</div></article>';
  }
  function metric(label,value,note,icon,href,ctx){
    return '<a class="deck-metric" href="'+href+'"><span class="deck-metric-top">'+ctx.icon(icon)+safe(label)+ctx.icon('arrow-up-right')+'</span>'+
      '<strong>'+n(value)+'</strong><small>'+safe(note)+'</small></a>';
  }
  function emptyCard(){
    return '<div class="deck-empty"><div class="deck-empty-glow">✦</div><h3>No eligible leads in the current cache</h3><p>Run source checks, add an official employer board, or widen your search. Unknown requirements are never presented as confirmed eligibility.</p>'+
    '<div class="deck-empty-actions"><a href="#watch" class="signal-primary">Connect a career page</a><a href="#discover" class="signal-secondary">Explore all roles</a></div></div>';
  }
  const last=(items,n=3)=>items.slice(0,n);
  async function renderHome(ticket,ctx){
    context=ctx;
    const [today,report,match]=await Promise.all([ctx.api('today'),ctx.api('analytics'),ctx.api('matches')]);
    if(ticket!==ctx.getRequest())return;
    latest=match;
    ctx.remember([...today.recommended,...today.research_first,...today.recently_discovered,...today.pinned,...match.items]);
    const count=match.counts||{}, items=match.items||[];
    const top=items.filter(x=>x.fit.level==='strong').slice(0,2);
    const featured=top.length?top:items.slice(0,2);
    const recommendations=featured.length?featured.map(x=>fitItem(x,ctx)).join(''):emptyCard();
    const upcoming=[...today.deadlines.today,...today.deadlines.week,...today.deadlines.month].slice(0,4);
    const inReview=(today.priorities||[]).find(x=>x.kind==='inbox')?.count||0;
    const urgent=(today.priorities||[]).find(x=>x.kind==='deadline')?.count||0;
    const feedback=match.model?.feedback_records||0;
    const sourceCount=match.items?.filter(x=>!x.stale).length||0;
    const hour=Number(new Intl.DateTimeFormat('en-GB',{hour:'numeric',timeZone:'Asia/Kolkata'}).format(new Date()));
    const greet=hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
    const date=new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'long',weekday:'long',timeZone:'Asia/Kolkata'}).format(new Date());
    document.getElementById('content').innerHTML=
      '<div class="deck-shell">'+
        '<div class="deck-utility"><span class="live-indicator"><i></i>PERSONAL CAREER RADAR</span><span>'+safe(date)+' · India</span></div>'+
        '<section class="deck-hero"><div class="deck-hero-copy"><span class="deck-kicker">'+safe(greet)+', Raj <span>✦</span></span>'+
          '<h1>Find the right internship.<br><em>Skip the noise.</em></h1>'+
          '<p>Your next move, not another dashboard. Employer-sourced roles ranked for Python, backend, AI and cloud — with the eligibility questions that matter.</p>'+
          '<div class="deck-hero-actions"><a class="deck-action-main" href="#matches">Explore my best matches '+ctx.icon('arrow-up-right')+'</a>'+
            '<a class="deck-action-glass" href="#winter">'+ctx.icon('calendar-days')+' Winter internships</a></div>'+
          '<div class="deck-hero-foot"><span>'+ctx.icon('shield-check')+' Evidence-first recommendations</span>'+
             '<span>'+ctx.icon('globe')+' Remote from India requires proof</span></div></div>'+
          '<div class="deck-orbit" aria-label="'+n(count.strong)+' strong-match signals from stored records">'+
            '<div class="deck-orbit-halo"><span class="orbit-dash dash-a"></span><span class="orbit-dash dash-b"></span><span class="orbit-dot dot-a"></span><span class="orbit-dot dot-b"></span>'+
            '<div class="deck-orbit-core"><span>YOUR SIGNAL</span><strong>'+n(count.strong)+'</strong><small>worth reviewing</small></div></div>'+
            '<div class="orbit-footnote">Not acceptance odds · refreshed when sources run</div></div></section>'+
        '<section class="deck-metrics" aria-label="Recorded opportunities">'+
          metric('Good-fit leads',count.strong,'Rules-based shortlist','sparkles','#matches',ctx)+
          metric('Winter signals',count.winter,'Verify intake dates','calendar-days','#winter',ctx)+
          metric('India-remote stated',count.remote_india_stated,'Eligibility still needs checking','globe','#matches',ctx)+
          metric('Application pipeline',report.tracked,'Tracked stages, not confirmed applications','briefcase-business','#applications',ctx)+
        '</section>'+
        '<div class="deck-main"><div class="deck-primary">'+
          '<div class="deck-section-head"><div><div class="deck-section-eyebrow">01 / OPPORTUNITY SIGNALS</div><h2>Worth your attention</h2><p>Focused recommendations with evidence — not a giant job-board feed.</p></div><a href="#matches" class="deck-all-link">View shortlist '+ctx.icon('arrow-right')+'</a></div>'+
          '<div class="deck-featured">'+recommendations+'</div>'+
          '<div class="deck-section-head deck-gap"><div><div class="deck-section-eyebrow">02 / STAY AHEAD</div><h2>Recently discovered</h2><p>From source records; links may need a live check.</p></div><a href="#discover" class="deck-all-link">Browse all '+ctx.icon('arrow-right')+'</a></div>'+
          '<div class="deck-feed">'+(today.recently_discovered.length?last(today.recently_discovered,4).map(x=>
            '<button type="button" data-action="detail" data-key="'+safe(x.key)+'" class="deck-feed-row"><span class="deck-feed-icon">'+safe((x.company||'O')[0])+'</span><span class="deck-feed-text"><strong>'+safe(x.title)+'</strong><small>'+safe(x.company||'Employer')+' · '+safe(x.location||'Location unspecified')+'</small></span>'+ctx.icon('arrow-up-right')+'</button>').join(''):
           '<div class="deck-feed-none">No newly discovered records since the last visit. Refresh official sources to check for changes.</div>')+'</div>'+
        '</div><aside class="deck-side">'+
          '<section class="deck-side-panel action-deck"><div class="deck-section-eyebrow">YOUR NEXT MOVES</div><h2>Keep moving.</h2>'+
           '<a href="#matches" class="action-deck-row"><span class="action-number">01</span><span><strong>Review your best leads</strong><small>'+n(count.strong)+' promising signals, evidence attached</small></span>'+ctx.icon('arrow-up-right')+'</a>'+
           '<a href="#outreach" class="action-deck-row"><span class="action-number">02</span><span><strong>Prepare recruiter outreach</strong><small>One thoughtful email at a time</small></span>'+ctx.icon('arrow-up-right')+'</a>'+
           '<a href="#inbox" class="action-deck-row"><span class="action-number">03</span><span><strong>Check real recruiter responses</strong><small>'+n(inReview)+' recorded inbox signals to review</small></span>'+ctx.icon('arrow-up-right')+'</a>'+
           '<a href="#watch" class="action-deck-row"><span class="action-number">04</span><span><strong>Watch more companies</strong><small>Greenhouse, Lever and Ashby career boards</small></span>'+ctx.icon('arrow-up-right')+'</a></section>'+
          '<section class="deck-side-panel"><div class="deck-panel-title">'+ctx.icon('calendar-days')+' <h2>Deadlines & reminders</h2></div>'+
            (upcoming.length?upcoming.slice(0,3).map(e=>ctx.deadlineRow(e)).join(''):'<p class="deck-small-empty">No near-term deadlines recorded. Unknown cutoff dates are not guessed.</p>')+
            '<a href="#calendar" class="deck-all-link">Open calendar '+ctx.icon('arrow-right')+'</a></section>'+
          '<section class="deck-side-panel learning-panel"><div class="deck-panel-title">'+ctx.icon('brain-circuit')+' <h2>Teach your match engine</h2></div>'+
            '<p>Mark roles as interested / not interested to build a real, private training set.</p>'+
            '<div class="learning-track"><span style="width:'+Math.min(100,Math.round(n(feedback)/40*100))+'%"></span></div>'+
            '<small>'+n(feedback)+' of 40 distinct feedback examples · positive and negative labels also required</small>'+
            '<a href="#matches" class="deck-all-link">Rate suggestions '+ctx.icon('arrow-right')+'</a></section>'+
          '<div class="deck-source-note">'+ctx.icon('shield-check')+'<span><strong>'+n(sourceCount)+' shortlist records with recent source checks</strong><small>A successful check does not guarantee a vacancy is still open.</small></span></div>'+
        '</aside></div></div>';
    const countSaved=document.getElementById('count-saved'),countApp=document.getElementById('count-applications');
    if(countSaved)countSaved.textContent=today.counts.saved||'';
    if(countApp)countApp.textContent=report.tracked||'';
    ctx.mutate('visit').catch(()=>{});
  }
  function tab(label,key,amount){
    return '<button type="button" data-match-tab="'+key+'" aria-pressed="'+(activeTab===key)+'"><span>'+safe(label)+'</span><small>'+n(amount)+'</small></button>';
  }
  function matchRows(){
    if(!latest||!context)return;
    const all=latest.items||[],t=activeTab;
    const rows=all.filter(x=>{
      if(t==='all')return true;
      if(t==='remote')return x.fit.remote?.india_eligible;
      if(t==='winter')return /^winter |^possible winter /.test(x.fit.winter||'');
      return n(x.fit.track_hits?.[t])>0;
    });
    const box=document.getElementById('match-results');
    if(!box)return;
    box.innerHTML=rows.length?rows.map(x=>fitItem(x,context,'grid')).join(''):emptyCard();
    document.getElementById('match-result-count').textContent=rows.length+' displayed · '+latest.total+' eligible for review in cached records';
  }
  async function renderMatches(ticket,ctx){
    context=ctx;
    const data=await ctx.api('matches');
    if(ticket!==ctx.getRequest())return;
    latest=data;
    ctx.remember(data.items||[]);
    activeTab='all';
    const feedback=n(data.model?.feedback_records), min=n(data.model?.minimum_distinct_opportunities||40);
    const activated=(data.model?.models||[]).find(x=>x.status==='active');
    const cnt=data.counts||{};
    document.getElementById('content').innerHTML=
      '<div class="deck-shell match-shell">'+
        '<div class="deck-utility"><span class="live-indicator"><i></i>YOUR MATCH INTELLIGENCE</span><span>2028 B.Tech · India-first</span></div>'+
        '<section class="match-hero"><div><div class="deck-section-eyebrow">FIND BETTER, NOT MORE</div><h1>Picked for <em>your path.</em></h1><p>Early-career roles sorted for backend, Python, AI and cloud, with explicit uncertainty about location and employer requirements.</p>'+
           '<div class="match-head-actions"><a href="#watch" class="deck-action-glass">'+ctx.icon('globe')+' Career-page watchlist</a><button data-action="refresh" class="deck-action-main">'+ctx.icon('refresh-cw')+' Check sources</button></div></div>'+
           '<div class="match-hero-number"><strong>'+n(data.total)+'</strong><small>possible matches in stored sources</small></div></section>'+
        '<section class="match-learning"><div><span class="deck-section-eyebrow">PRIVATE RELEVANCE MODEL</span>'+
          '<h2>'+(activated?'Feedback model active':'Feedback-powered training, when ready')+'</h2>'+
          '<p>'+(activated?'An evaluated model has been activated. Hard employer eligibility rules still apply.':
             'The app uses explainable rules now. Record genuine positive and negative role feedback to qualify a model for held-out evaluation.')+'</p></div>'+
          '<div class="match-learning-side"><div class="match-learning-count">'+feedback+' <span>/ '+min+' labels</span></div>'+
          '<div class="learning-track"><span style="width:'+Math.min(100,Math.round(feedback/Math.max(min,1)*100))+'%"></span></div>'+
          (feedback>=min?'<button class="signal-secondary" data-action="evaluate-model">Evaluate feedback model</button>':
            '<small>Requires '+min+' distinct opportunities and at least 8 positive & 8 negative examples.</small>')+'</div></section>'+
        '<div class="match-section-head"><div><h2>Explore the signals</h2><p id="match-result-count">Filtering stored employer records…</p></div></div>'+
        '<div class="match-tabs" role="group" aria-label="Match focus">'+
          tab('For you','all',data.total)+
          tab('Backend & Python','backend',data.items.filter(x=>n(x.fit.track_hits.backend)>0).length)+
          tab('AI engineering','ai',data.items.filter(x=>n(x.fit.track_hits.ai)>0).length)+
          tab('Cloud & DevOps','cloud',data.items.filter(x=>n(x.fit.track_hits.cloud)>0).length)+
          tab('India-remote stated','remote',cnt.remote_india_stated)+
          tab('Winter intake','winter',cnt.winter)+'</div>'+
        '<div class="match-trust">'+ctx.icon('shield-check')+' <span><strong>Be selective:</strong> “Remote” alone never proves India eligibility. Scores are relevance points, not chances of getting hired. Confirm the official employer listing before applying.</span></div>'+
        '<div id="match-results" class="match-grid"></div>'+
        '<footer class="match-end">Showing a ranked shortlist; <a href="#discover">explore all recorded opportunities</a> for broader coverage.</footer>'+
      '</div>';
    matchRows();
  }
  document.addEventListener('click',e=>{
    const hit=e.target.closest('[data-match-tab]');if(!hit)return;
    e.preventDefault();activeTab=hit.dataset.matchTab;
    document.querySelectorAll('[data-match-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b===hit)));
    matchRows();
  });
  window.MissionControl={renderHome,renderMatches};
})();