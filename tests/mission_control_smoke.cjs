/* Dependency-free runtime smoke test for private Career Desk views.
   Tests a real JS render path, not only syntax. No email, network or deployment. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const nodes = new Map();
const actions = [];
function node(id) {
  if (!nodes.has(id)) nodes.set(id,{innerHTML:'',textContent:'',value:'',dataset:{},focus(){}});
  return nodes.get(id);
}
const context = {
  window: {},
  document: {
    getElementById:node,
    addEventListener:(name,handler)=>actions.push({name,handler}),
    querySelectorAll:()=>[]
  },
  Intl, Date, Math, Number, String, Boolean, Array, Object, Promise, RegExp,
  console,
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../static/mission-control.js'),'utf8'),context);
assert.equal(typeof context.window.MissionControl.renderHome,'function');
assert.equal(typeof context.window.MissionControl.renderMatches,'function');

const item={
  key:'j:'+'a'.repeat(32),company:'Acme Research',title:'Python Backend Intern',
  location:'Remote - India',provider:'ashby',url:'https://jobs.ashbyhq.com/acme/test',
  category:'Internship',first_seen:'2026-10-28',stale:false,stage:'Discovered',
  eligibility:{code:'likely',reasons:['Eligible undergraduate degree']},
  extracted:{work_mode:'Remote',description:'Backend Python and FastAPI',
    fields:{compensation:{value:'Paid — amount not stated'}},deadline:{date:null}},
  fit:{level:'strong',score:82,track:'backend',
    winter:'winter 2026–2027',
    remote:{india_eligible:true},checks:['Check start date'],
    reasons:['Python backend technology match'],
    track_hits:{backend:3,ai:0,cloud:0}
  }
};
const matches={
  items:[item],total:1,
  counts:{strong:1,winter:1,remote_india_stated:1},
  model:{feedback_records:12,minimum_distinct_opportunities:40,models:[]}
};
const today={
  counts:{saved:1},date:'2026-10-28',last_visit:null,
  recommended:[item],research_first:[],recently_discovered:[item],pinned:[],
  priorities:[{kind:'inbox',count:0}],
  deadlines:{today:[],week:[],month:[]}
};
const calls=[];
const ctx={
  api:async key=>{
    if(key==='today')return today;
    if(key==='analytics')return {tracked:3};
    if(key==='matches')return matches;
    throw new Error('Unexpected API '+key);
  },
  getRequest:()=>1,
  remember:items=>calls.push(['remember',items.length]),
  mutate:async key=>{calls.push(['mutate',key]);return {ok:true};},
  icon:name=>'<svg data-test-icon="'+name+'"></svg>',
  link:(label,url,cls)=>'<a class="'+cls+'" href="'+url+'">'+label+'</a>',
  fmt:day=>day,
  search:q=>calls.push(['search',q])
};
(async()=>{
  await context.window.MissionControl.renderHome(1,ctx);
  const home=node('content').innerHTML;
  assert.ok(home.includes('desk-home-search'),'Home must expose functional search');
  assert.ok(home.includes('Make your'),'Home should have real hierarchy');
  assert.ok(home.includes('Python Backend Intern'),'Home must show real stored job');
  assert.ok(home.includes('Remote · India stated'),'Proof-backed remote label expected');
  assert.ok(home.includes('jobs.ashbyhq.com'),'Employer URL must be present');
  assert.ok(!home.includes('Your next chapter is taking shape'),'Remove generic placeholder language');

  await context.window.MissionControl.renderMatches(1,ctx);
  const page=node('content').innerHTML;
  const results=node('desk-match-results').innerHTML;
  assert.ok(page.includes('desk-match-input'),'Match search must exist');
  assert.ok(page.includes('data-match-tab="remote"'),'Verified remote filter must exist');
  assert.ok(results.includes('Python Backend Intern'),'Matches must show recorded role');
  assert.ok(results.includes('data-kind="Not interested"'),'Feedback controls must be usable');
  assert.ok(results.includes('Check start date'),'Uncertainty must remain visible');

  const search=actions.find(x=>x.name==='submit');
  assert.ok(search,'Search submission listener missing');
  const oldEventNode=node('desk-search-input');
  oldEventNode.value='Python FastAPI';
  const form={
    id:'desk-home-search',
    querySelector:selector=>selector==='input[name=q]'?oldEventNode:null
  };
  let prevented=false,stopped=false;
  search.handler({target:form,
    preventDefault:()=>prevented=true,
    stopImmediatePropagation:()=>stopped=true});
  assert.equal(prevented,true);
  assert.equal(stopped,true);
  assert.ok(calls.some(([key,value])=>key==='search'&&value==='Python FastAPI'));

  console.log('Career Desk runtime smoke: home, employer links, match filters, feedback, and search passed.');
})().catch(err=>{console.error(err);process.exitCode=1;});
