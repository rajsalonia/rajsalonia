/* Opportunity OS — Career Desk (2026). Real workflows, not decorative analytics. */
(function () {
  'use strict';

  let context = null;
  let dataset = null;
  let activeTab = 'all';
  let sortMode = 'fit';
  let searchText = '';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[c]);
  const count = value => Math.max(0, Number(value) || 0);
  const text = (value, fallback = 'Not stated') => String(value || fallback);
  const itemTrack = item => text(item.fit?.track, 'software');
  const winter = item => /^(winter |possible winter )/i.test(item.fit?.winter || '');
  const money = item => text(item.extracted?.fields?.compensation?.value, 'Pay not disclosed');
  const age = item => item.stale ? 'Source needs rechecking' : 'Source record';
  const initial = value => String(value || '?').trim().charAt(0).toUpperCase();
  const flag = (label, className = '') =>
    '<span class="desk-chip ' + className + '">' + esc(label) + '</span>';

  function labelFor(item) {
    const fit = item.fit || {};
    if (fit.level === 'strong') return flag('Good match', 'is-success');
    if (item.eligibility?.code === 'unknown') return flag('Eligibility unknown', 'is-warning');
    return flag('Needs review', 'is-warning');
  }

  function trackLabel(item) {
    const track = itemTrack(item);
    return {
      backend:'Python / Backend', ai:'AI Engineering',
      cloud:'Cloud / DevOps', general:'Software'
    }[track] || 'Software';
  }

  function location(item) {
    const mode = text(item.extracted?.work_mode, 'Work mode unknown');
    if (mode === 'Remote' && item.fit?.remote?.india_eligible) return 'Remote · India stated';
    if (mode === 'Remote') return 'Remote · India not verified';
    if (mode === 'Hybrid') return 'Hybrid · ' + text(item.location, 'location unknown');
    if (mode === 'On-site') return 'On-site · ' + text(item.location, 'location unknown');
    return text(item.location, 'Location not stated');
  }

  function lead(item, ctx, expanded = false) {
    const fit = item.fit || {};
    const company = text(item.company, 'Employer not disclosed');
    const key = esc(item.key);
    const check = (fit.checks || [])[0] || 'Check employer requirements before applying.';
    const why = (fit.reasons || [])[0] || 'An early-career engineering role to investigate.';
    return '<article class="desk-lead' + (expanded ? ' is-expanded' : '') + '">' +
      '<div class="desk-lead-icon" aria-hidden="true">' + esc(initial(company)) + '</div>' +
      '<div class="desk-lead-body">' +
        '<div class="desk-lead-company">' + esc(company) +
          '<span class="desk-separator">/</span>' + esc(text(item.provider, 'Recorded source')) +
          (winter(item) ? flag('Winter signal', 'is-winter') : '') + '</div>' +
        '<button type="button" class="desk-lead-title" data-action="detail" data-key="' + key + '">' +
          esc(item.title) + ctx.icon('arrow-up-right') + '</button>' +
        '<div class="desk-lead-facts">' +
          flag(trackLabel(item)) + flag(location(item), item.extracted?.work_mode === 'Remote' &&
            !fit.remote?.india_eligible ? 'is-warning' : '') +
          flag(money(item)) + '</div>' +
        (expanded ? '<p class="desk-lead-why">' + ctx.icon('sparkles') +
          '<span>' + esc(why) + '</span></p>' : '') +
        '<p class="desk-lead-caution">' + ctx.icon('info') + esc(check) + '</p>' +
        (expanded ? '<div class="desk-lead-feedback"><span>Is this role relevant to you?</span>' +
          '<button data-action="feedback" data-kind="Interested" data-key="' + key + '">Yes</button>' +
          '<button data-action="feedback" data-kind="Not interested" data-key="' + key + '">Not for me</button></div>' : '') +
      '</div>' +
      '<div class="desk-lead-aside"><div class="desk-fit" title="Rules-based relevance, not hiring probability">' +
        '<strong>' + count(fit.score) + '</strong><small>fit score</small></div>' +
        labelFor(item) +
        '<div class="desk-lead-links">' +
          '<button type="button" data-action="detail" data-key="' + key + '" aria-label="Review ' +
             esc(item.title) + '">' + ctx.icon('eye') + '</button>' +
          ctx.link('Open listing ' + ctx.icon('arrow-up-right'), item.url, 'desk-external') +
        '</div></div></article>';
  }

  function emptyState(iconName, title, detail, target = 'watch') {
    return '<div class="desk-empty">' +
      '<span class="desk-empty-symbol">' + context.icon(iconName) + '</span>' +
      '<h3>' + esc(title) + '</h3><p>' + esc(detail) + '</p>' +
      '<a href="#' + target + '">Continue with ' + (target === 'watch' ? 'employer sources' : 'opportunities') +
         ' ' + context.icon('arrow-right') + '</a></div>';
  }

  function dateLabel() {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone:'Asia/Kolkata', weekday:'long', day:'numeric', month:'short', year:'numeric'
    }).format(new Date());
  }

  function greeting() {
    const hour = Number(new Intl.DateTimeFormat('en-GB', {
      hour:'numeric',timeZone:'Asia/Kolkata'
    }).format(new Date()));
    return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  }

  function searchBox(ctx) {
    return '<form id="desk-home-search" class="desk-search" role="search">' +
      '<label for="desk-search-input">' + ctx.icon('search') +
        '<span class="sr-only">Search internship opportunities</span></label>' +
      '<input id="desk-search-input" type="search" name="q" autocomplete="off"' +
        ' placeholder="Try Python backend internship, remote India, AI agents…" aria-label="Search openings">' +
      '<button type="submit">Search openings ' + ctx.icon('arrow-right') + '</button></form>' +
      '<div class="desk-preset" role="group" aria-label="Popular searches">' +
        '<span>Quick searches</span>' +
        ['Python FastAPI internship', 'Remote backend India', 'AI engineering internship', 'Winter 2026 internship']
          .map(q => '<button type="button" data-desk-search="' + esc(q) + '">' + esc(q) + '</button>').join('') +
      '</div>';
  }

  function quickCount(value, label, caption, href, ico, ctx) {
    return '<a class="desk-stat" href="' + href + '">' +
      '<span class="desk-stat-top">' + ctx.icon(ico) + label + '</span>' +
      '<span class="desk-stat-mid"><strong>' + count(value) + '</strong>' +
        ctx.icon('arrow-up-right') + '</span>' +
      '<small>' + caption + '</small></a>';
  }

  function sectionTitle(eyebrow, title, detail, action, href, ctx) {
    return '<div class="desk-section-heading"><div>' +
      '<div class="desk-eyebrow">' + esc(eyebrow) + '</div><h2>' + esc(title) + '</h2>' +
      '<p>' + esc(detail) + '</p></div>' +
      (action ? '<a class="desk-inline-link" href="' + href + '">' + action + ' ' +
        ctx.icon('arrow-right') + '</a>' : '') + '</div>';
  }

  function deadlineList(events, ctx) {
    if (!events.length) return '<p class="desk-side-empty">No upcoming deadlines recorded. Unknown cutoff times stay unknown.</p>';
    return events.slice(0,3).map(event => {
      const date = event.deadline?.local_date || event.deadline?.date || '';
      const day = date.slice(8) || '—';
      const month = date ? ctx.fmt(date,{month:'short'}).replace(/^\d+\s*/, '') : 'Unknown';
      return '<a class="desk-deadline" href="#calendar">' +
        '<span class="desk-deadline-date"><b>' + esc(day) + '</b><small>' + esc(month) + '</small></span>' +
        '<span><strong>' + esc(event.title) + '</strong>' +
          '<small>' + esc(event.kind || 'Deadline') + (event.deadline?.cutoff_known ?
            ' · Stated cutoff' : ' · Exact time not stated') + '</small></span>' +
          ctx.icon('arrow-up-right') + '</a>';
    }).join('');
  }

  function actionsPanel(today, match, ctx) {
    const inbox = (today.priorities || []).find(x => x.kind === 'inbox')?.count || 0;
    const eligible = count(match.counts?.strong);
    return '<section class="desk-action-panel">' +
      '<div class="desk-eyebrow">YOUR NEXT MOVES</div>' +
      '<h2>Stay one step ahead.</h2>' +
      '<a href="#matches" class="desk-action"><span class="desk-action-no">01</span><span>' +
        '<strong>Review best-fit internships</strong><small>' + eligible + ' potential matches from saved sources</small></span>' +
        ctx.icon('arrow-up-right') + '</a>' +
      '<a href="#winter" class="desk-action"><span class="desk-action-no">02</span><span>' +
        '<strong>Check winter internships</strong><small>Verify dates and 2028 eligibility</small></span>' +
        ctx.icon('arrow-up-right') + '</a>' +
      '<a href="#inbox" class="desk-action"><span class="desk-action-no">03</span><span>' +
        '<strong>Review employer messages</strong><small>' + count(inbox) +
        ' unreviewed recorded signals · not verified interviews</small></span>' +
        ctx.icon('arrow-up-right') + '</a>' +
      '<a href="#outreach" class="desk-action"><span class="desk-action-no">04</span><span>' +
        '<strong>Prepare recruiter outreach</strong><small>Draft and confirm one email at a time</small></span>' +
        ctx.icon('arrow-up-right') + '</a></section>';
  }

  function modelNote(model, ctx) {
    const feedback = count(model?.feedback_records);
    const required = Math.max(40, count(model?.minimum_distinct_opportunities));
    const progress = Math.min(100,Math.round(feedback/required*100));
    return '<section class="desk-model-note"><div class="desk-note-icon">' + ctx.icon('brain') + '</div>' +
      '<div><strong>Make your matches smarter</strong><p>Rate real roles to build a private relevance model.</p>' +
      '<div class="desk-progress"><span style="width:' + progress + '%"></span></div>' +
      '<small>' + feedback + ' / ' + required + ' labeled roles · balanced labels required</small>' +
      '<a href="#matches">Review matches ' + ctx.icon('arrow-right') + '</a></div></section>';
  }

  async function renderHome(ticket, ctx) {
    context = ctx;
    const [today, analytics, match] = await Promise.all([
      ctx.api('today'), ctx.api('analytics'), ctx.api('matches')
    ]);
    if (ticket !== ctx.getRequest()) return;
    dataset = match;
    const items = match.items || [];
    ctx.remember([...items, ...(today.recommended || []), ...(today.research_first || []),
      ...(today.recently_discovered || []), ...(today.pinned || [])]);
    const primary = items.filter(item => item.fit?.level === 'strong').slice(0,4);
    const suggested = primary.length ? primary : items.slice(0,4);
    const deadlines = [...(today.deadlines.today || []), ...(today.deadlines.week || []),
      ...(today.deadlines.month || [])];
    const fresh = (today.recently_discovered || []).slice(0,3);
    const $content = document.getElementById('content');
    $content.innerHTML =
      '<div class="desk-shell desk-home">' +
      '<div class="desk-meta"><span><i></i>OPPORTUNITY OS / YOUR CAREER DESK</span>' +
        '<span>' + esc(dateLabel()) + '</span></div>' +
      '<div class="desk-welcome">' +
        '<div><p class="desk-eyebrow">' + greeting() + ', Raj</p>' +
          '<h1>Make your <em>next move</em> count.</h1>' +
          '<p>Find relevant internships, check eligibility, and stay ahead of deadlines—all without the noise.</p></div>' +
        '<div class="desk-welcome-actions">' +
          '<button type="button" data-action="refresh" class="desk-outline">' + ctx.icon('refresh-cw') +
             ' Check new openings</button>' +
          '<a class="desk-main-btn" href="#matches">Explore matches ' +
             ctx.icon('arrow-up-right') + '</a></div></div>' +
      '<section class="desk-search-panel">' + searchBox(ctx) + '</section>' +
      '<section class="desk-stats" aria-label="Your opportunity overview">' +
        quickCount(match.counts?.strong, 'Worth reviewing', 'Profile-based suggestions', '#matches','sparkles',ctx) +
        quickCount(match.counts?.winter, 'Winter signals', 'Intake dates need review', '#winter','snowflake',ctx) +
        quickCount(match.counts?.remote_india_stated, 'India-remote stated', 'Confirm employer work scope', '#matches','globe',ctx) +
        quickCount(analytics.tracked, 'Tracked applications', 'Not all employer-confirmed', '#applications','briefcase-business',ctx) +
        '</section>' +
      '<div class="desk-content-grid"><div class="desk-main-column">' +
        sectionTitle('01 / MATCHES FOR YOU','Internships worth a closer look',
          'A short list based on your skills and recorded requirements.', 'See all matches','#matches',ctx) +
        '<div class="desk-lead-list">' +
          (suggested.length ? suggested.map(item => lead(item,ctx)).join('') :
            emptyState('briefcase-business','Your shortlist starts here',
              'Connect official employer career boards to find internships matching your profile.')) +
        '</div>' +
        sectionTitle('02 / NEW FROM YOUR SOURCES','Recently discovered',
          'These are recorded leads, not confirmed open vacancies.', 'Browse all','#discover',ctx) +
        '<div class="desk-recent">' +
        (fresh.length ? fresh.map(item =>
          '<button type="button" class="desk-recent-row" data-action="detail" data-key="' + esc(item.key) +
          '"><span class="desk-recent-avatar">' + esc(initial(item.company)) + '</span>' +
          '<span><strong>' + esc(item.title) + '</strong><small>' + esc(item.company || 'Employer') +
          ' · ' + esc(item.location || 'Location not stated') + '</small></span>' +
          ctx.icon('arrow-up-right') + '</button>').join('') :
          '<p class="desk-side-empty">No newly discovered leads recorded since the last visit.</p>') +
        '</div></div>' +
      '<aside class="desk-right-column" aria-label="Next actions and deadlines">' +
         actionsPanel(today,match,ctx) +
         '<section class="desk-side-panel"><div class="desk-side-head"><h2>Upcoming deadlines</h2>' +
           '<a href="#calendar" aria-label="Open calendar">' + ctx.icon('arrow-up-right') + '</a></div>' +
           deadlineList(deadlines,ctx) + '</section>' +
         modelNote(match.model,ctx) +
         '<div class="desk-transparency">' + ctx.icon('shield-check') +
          '<span>Matches use stored source evidence and explainable rules, not hiring probabilities. ' +
          'Check the official employer page before applying.</span></div>' +
      '</aside></div></div>';
    const saved = document.getElementById('count-saved');
    if(saved) saved.textContent = today.counts.saved || '';
    const tracked = document.getElementById('count-applications');
    if(tracked) tracked.textContent = analytics.tracked || '';
    ctx.mutate('visit').catch(()=>{});
  }

  function optionButton(key,label,total) {
    return '<button type="button" class="desk-tab" data-match-tab="' + esc(key) + '"' +
      ' aria-pressed="' + (activeTab === key) + '">' +
      esc(label) + '<span>' + count(total) + '</span></button>';
  }

  function inTab(item) {
    const hits = item.fit?.track_hits || {};
    if(activeTab === 'all') return true;
    if(activeTab === 'winter') return winter(item);
    if(activeTab === 'remote') return Boolean(item.fit?.remote?.india_eligible);
    return count(hits[activeTab]) > 0;
  }

  function updateResults() {
    if (!dataset || !context) return;
    const items = (dataset.items || []).filter(item =>
      inTab(item) &&
      (!searchText || [item.title,item.company,item.location,item.extracted?.description]
        .some(value => String(value || '').toLowerCase().includes(searchText)))
    );
    items.sort((a,b) => sortMode === 'recent' ?
      String(b.first_seen || '').localeCompare(String(a.first_seen || '')) :
      count(b.fit?.score) - count(a.fit?.score));
    const target = document.getElementById('desk-match-results');
    if(!target) return;
    target.innerHTML = items.length ?
      items.map(item => lead(item,context,true)).join('') :
      emptyState('search-x','No matches for these filters',
        'Try a different track, remove the search term, or explore the full discovery feed.','discover');
    const label = document.getElementById('desk-result-count');
    if(label) label.textContent = items.length + ' shown · ' + count(dataset.total) +
      ' potential matches in stored records';
  }

  async function renderMatches(ticket,ctx) {
    context = ctx;
    const match = await ctx.api('matches');
    if (ticket !== ctx.getRequest()) return;
    dataset = match;
    ctx.remember(match.items || []);
    activeTab = 'all';
    sortMode = 'fit';
    searchText = '';
    const counts = match.counts || {};
    const feedback = count(match.model?.feedback_records);
    const min = count(match.model?.minimum_distinct_opportunities) || 40;
    const activeModel = (match.model?.models || []).some(m => m.status === 'active');
    document.getElementById('content').innerHTML =
      '<div class="desk-shell desk-matches">' +
       '<div class="desk-meta"><span><i></i>CAREER INTELLIGENCE / RANKED SHORTLIST</span>' +
         '<span>India-first · graduating 2028</span></div>' +
       '<section class="desk-match-heading"><div>' +
         '<p class="desk-eyebrow">MY OPPORTUNITIES</p>' +
         '<h1>Find your <em>kind of work.</em></h1>' +
         '<p>Python, backend, AI and cloud internships selected from recorded public job sources. ' +
           'No inferred employer eligibility is treated as certain.</p></div>' +
         '<div class="desk-match-heading-actions"><a href="#watch" class="desk-outline">' +
          ctx.icon('globe') + ' Add employer</a>' +
          '<button data-action="refresh" class="desk-main-btn">' +
          ctx.icon('refresh-cw') + ' Refresh sources</button></div></section>' +
       '<div class="desk-match-summary">' +
         '<div><strong>' + count(match.total) + '</strong><span>possible roles in source records</span></div>' +
         '<div><strong>' + count(counts.strong) + '</strong><span>worth reviewing</span></div>' +
         '<div><strong>' + count(counts.remote_india_stated) + '</strong><span>India-remote stated</span></div>' +
         '<div><strong>' + count(counts.winter) + '</strong><span>winter-intake signals</span></div></div>' +
       '<section class="desk-match-controls">' +
         '<div class="desk-match-search">' + ctx.icon('search') +
           '<input id="desk-match-input" type="search" placeholder="Find company, technology, or role…" ' +
           'aria-label="Filter these matches"></div>' +
         '<label class="desk-sort-label">Sort <select id="desk-match-sort">' +
           '<option value="fit">Best fit</option><option value="recent">Newest recorded</option></select></label></section>' +
       '<div class="desk-match-tabs" role="group" aria-label="Filter by career track">' +
         optionButton('all','For you',match.total) +
         optionButton('backend','Backend / Python',(match.items||[]).filter(x=>count(x.fit?.track_hits?.backend)).length) +
         optionButton('ai','AI engineering',(match.items||[]).filter(x=>count(x.fit?.track_hits?.ai)).length) +
         optionButton('cloud','Cloud / DevOps',(match.items||[]).filter(x=>count(x.fit?.track_hits?.cloud)).length) +
         optionButton('remote','India-remote stated',counts.remote_india_stated) +
         optionButton('winter','Winter',counts.winter) + '</div>' +
       '<div class="desk-match-trust">' + ctx.icon('info') +
         'Remote does not automatically mean India-eligible. “Fit” describes skill relevance—not your chances of being hired.' +
         '</div>' +
       '<div class="desk-results-heading"><h2>Recommended for review</h2>' +
         '<small id="desk-result-count"></small></div>' +
       '<div id="desk-match-results" class="desk-match-results"></div>' +
       '<div class="desk-learning"><div><p class="desk-eyebrow">TRAIN WITH GENUINE FEEDBACK</p>' +
         '<h2>' + (activeModel ? 'Your evaluated relevance model is active' :
           'A personalized model needs real examples') + '</h2>' +
         '<p>Use “Yes” and “Not for me” on individual roles. Once you have enough balanced feedback, ' +
           'you can evaluate a private ranking model. No email or resume data is used for training.</p></div>' +
         '<div class="desk-learning-count"><strong>' + feedback + ' / ' + min + '</strong>' +
         '<div class="desk-progress"><span style="width:' +
           Math.min(100,Math.round(feedback/Math.max(1,min)*100)) + '%"></span></div>' +
         (feedback >= min ? '<button type="button" data-action="evaluate-model" class="desk-outline">Evaluate model</button>' :
           '<small>At least 8 positive and 8 negative examples also required.</small>') + '</div></div>' +
       '<p class="desk-footer-note">Not seeing a company? <a href="#watch">Add its public career board</a> · ' +
       '<a href="#discover">Open the full opportunities feed</a></p></div>';
    updateResults();
  }

  document.addEventListener('submit', event => {
    if(event.target?.id !== 'desk-home-search') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const q = event.target.querySelector('input[name=q]')?.value.trim();
    if(q && context?.search) context.search(q);
    else document.getElementById('desk-search-input')?.focus();
  }, true);

  document.addEventListener('click', event => {
    const preset = event.target.closest('[data-desk-search]');
    if(preset) {
      event.preventDefault();
      context?.search?.(preset.dataset.deskSearch);
    }
    const tab = event.target.closest('[data-match-tab]');
    if(!tab)return;
    activeTab = tab.dataset.matchTab;
    document.querySelectorAll('[data-match-tab]').forEach(button =>
      button.setAttribute('aria-pressed', String(button === tab)));
    updateResults();
  });

  document.addEventListener('input', event => {
    if(event.target?.id !== 'desk-match-input')return;
    searchText = event.target.value.trim().toLowerCase();
    updateResults();
  });

  document.addEventListener('change', event => {
    if(event.target?.id !== 'desk-match-sort')return;
    sortMode = event.target.value === 'recent' ? 'recent' : 'fit';
    updateResults();
  });

  window.MissionControl = {renderHome, renderMatches};
})();