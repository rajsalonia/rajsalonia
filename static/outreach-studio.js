/* Opportunity OS Outreach Studio: owner-reviewed, one-recipient-at-a-time. */
(()=>{
 'use strict';
 const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const state={contacts:[],selected:null,preview:null,mailConnected:false,resumeReady:false,busy:false,method:'smart',search:''};
 const el=id=>document.getElementById(id);
 const meta=()=>document.querySelector('meta[name="csrf-token"]')?.content||'';
 async function req(path,opts={}){
  const result=await fetch(path,{credentials:'same-origin',...opts,headers:{'X-CSRF-Token':meta(),...opts.headers}});
  const data=await result.json().catch(()=>({error:'Unexpected response. Please try again.'}));
  if(!result.ok)throw Error(data.error||'Request failed');
  return data;
 }
 const say=(message,error=false)=>{const n=el('outreach-message');if(n){n.textContent=message;n.className=error?'outreach-notice error':'outreach-notice';}};
 const disabled=(v)=>{state.busy=v;document.querySelectorAll('[data-outreach]').forEach(b=>b.disabled=v);};
 const heading=()=>`<div class="page-heading"><div><div class="eyebrow">PERSONALIZED, REVIEWED OUTREACH</div><h1>Recruiter Outreach Studio</h1><p>Import spreadsheet contacts, inspect the extraction, prepare a relevant email, then authorize one send at a time.</p></div><div class="heading-actions"><a class="button" href="/classic#gmail">Classic Gmail tools</a></div></div>`;
 function layout(){
  return heading()+`
   <div class="outreach-callout"><strong>Two workflows · One safety standard.</strong> Smart prepare fills the draft using verified profile facts; self-send lets you edit every field. Neither mode sends emails in bulk. Sending requires a connected Gmail account in this website, a separate review, and confirmation for each recipient.</div>
   <section class="outreach-layout">
    <div class="outreach-column">
     <section class="card outreach-panel"><div class="section-heading"><div><h2>1 · Upload your contact sheet</h2><p>CSV or XLSX · up to 4 MB · headers and contact fields inferred when possible</p></div></div>
       <label for="outreach-upload">Spreadsheet with company and recruiter contact details</label>
       <input id="outreach-upload" type="file" accept=".csv,.xlsx" aria-describedby="outreach-upload-note">
       <p class="muted small-text" id="outreach-upload-note">Nothing is imported until you review the preview. Emails are never invented from names.</p>
       <div class="outreach-actions"><button class="button" type="button" data-outreach="preview">Inspect spreadsheet</button><button class="button primary" type="button" data-outreach="import" id="outreach-import" disabled>Confirm import</button></div>
       <div id="outreach-preview" aria-live="polite"></div>
     </section>
     <section class="card outreach-panel"><div class="section-heading"><div><h2>2 · Contact queue <span id="outreach-count" class="tag">0</span></h2><p>Choose one person. Already-sent and do-not-contact records are clearly marked.</p></div></div>
       <input id="outreach-find" type="search" placeholder="Search company, recruiter or email" aria-label="Filter contacts" autocomplete="off">
       <div id="outreach-contacts" class="outreach-contacts" aria-live="polite"></div>
     </section>
    </div>
    <div class="outreach-column">
     <section class="card outreach-panel outreach-editor">
       <div class="section-heading"><div><h2>3 · Personal message editor</h2><p>Auto-filled with truthful experience, editable before every individual send.</p></div></div>
       <div class="outreach-mode" role="group" aria-label="Drafting mode"><button type="button" data-outreach="mode" data-mode="smart" aria-pressed="true">Smart prepare</button><button type="button" data-outreach="mode" data-mode="manual" aria-pressed="false">Self-send</button></div>
       <div class="outreach-options"><div><label for="outreach-season">Internship season</label><select id="outreach-season"><option value="winter">Winter 2026–27</option><option value="summer">Summer 2027</option><option value="general">General internship enquiry</option></select></div>
         <div><label for="outreach-focus">Technical focus</label><select id="outreach-focus"><option value="backend">Python / Backend</option><option value="ai">AI Engineering</option><option value="cloud">Cloud / DevOps</option><option value="general">Software Engineering</option></select></div></div>
       <p class="muted small-text" id="outreach-draft-meta">Select a contact. A draft is not an application or an email sent.</p>
       <label for="outreach-to">Recipient</label><input id="outreach-to" type="email" readonly placeholder="Select a contact" autocomplete="off">
       <label for="outreach-subject">Subject</label><input id="outreach-subject" maxlength="250" placeholder="Select a contact" autocomplete="off">
       <label for="outreach-body">Message</label><textarea id="outreach-body" rows="15" maxlength="10000" placeholder="Select a contact to prepare a personal message"></textarea>
       <div class="outreach-checks"><label><input id="outreach-attach" type="checkbox"> Attach unchanged original PDF from the website resume vault</label>
       <label><input id="outreach-approved" type="checkbox"> I checked this recipient, company, previous outreach, email text and attachment, and approve this one email.</label></div>
       <div class="outreach-actions"><button type="button" class="button" data-outreach="draft">Prepare draft</button><button type="button" class="button" data-outreach="copy">Copy text</button><button type="button" class="button" data-outreach="next">Next unsent</button><button type="button" class="button primary" data-outreach="send">Send reviewed email</button></div>
       <p id="outreach-message" class="outreach-notice" role="status" aria-live="polite">No message sent.</p>
       <p class="muted small-text">This website records only its own sends; ChatGPT Gmail connections and outside outreach are not synchronized. Verify prior emails manually. Up to 10 approved emails daily; repeat recipients are blocked for 30 days.</p>
     </section>
    </div>
   </section>`;
 }
 function drawContacts(){
  const q=state.search;
  const visible=state.contacts.filter(x=>`${x.company} ${x.name} ${x.email} ${x.role}`.toLowerCase().includes(q));
  el('outreach-count').textContent=`${visible.length} contacts`;
  el('outreach-contacts').innerHTML=visible.length?visible.slice(0,500).map(c=>{
   const klass=c.excluded?'blocked':c.last_sent?'sent':'pending';
   const label=c.excluded?'Do not contact':c.last_sent?'Sent in website':'Ready to review';
   return `<article class="outreach-person ${state.selected===c.id?'selected':''}"><div class="outreach-person-main"><strong>${h(c.company||'Company unknown')}</strong><small>${h(c.name||c.role||'Contact not verified')}</small><small class="outreach-address">${h(c.email)}</small><span class="outreach-status ${klass}">${h(label)}</span></div><div class="outreach-person-actions"><button type="button" class="button" data-outreach="select" data-id="${h(c.id)}" ${c.excluded?'disabled':''}>Prepare</button><button type="button" class="text-button" data-outreach="toggle-block" data-id="${h(c.id)}">${c.excluded?'Unblock':'Block'}</button></div></article>`;
  }).join(''):`<p class="muted">No contacts match. Import a CSV/XLSX sheet or change your search.</p>`;
 }
 function drawPreview(){
  if(!state.preview){el('outreach-preview').innerHTML='';if(el('outreach-import'))el('outreach-import').disabled=true;return;}
  const d=state.preview;
  const rows=d.preview.map(c=>`<tr><td>${h(c.company||'Needs verification')}</td><td>${h(c.email||'Missing')}</td><td>${h(c.name)}</td><td>${c.duplicate?'Duplicate':c.excluded?'Blocked':c.ready?'Ready':'Review'}<small>${h((c.issues||[]).join(' · '))}</small></td></tr>`).join('');
  el('outreach-preview').innerHTML=`<div class="outreach-preview-summary">${d.total_rows} parsed · ${d.ready} importable · ${d.needs_review} need review · ${d.duplicates} duplicates · ${d.excluded} blocked</div>
    <div class="outreach-preview-table"><table><thead><tr><th>Company</th><th>Email</th><th>Name</th><th>Review</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="muted small-text">${d.preview_limited?'Showing first 150 rows for review. ':''}Unknown company names and no-reply addresses are not imported. This is rules-based extraction, not a trained model.</p>`;
  el('outreach-import').disabled=!d.ready;
 }
 async function reloadContacts(){
  const [contacts,integrations]=await Promise.all([req('/api/outreach/contacts'),req('/api/integrations')]);
  state.contacts=contacts.contacts;
  state.mailConnected=Boolean(integrations.gmail_connected);
  state.resumeReady=Boolean(integrations.resume_uploaded);
  const check=el('outreach-attach');if(check){check.disabled=!state.resumeReady;if(!state.resumeReady)check.checked=false;}
  drawContacts();
  const n=el('outreach-draft-meta');if(n&&!state.selected)n.textContent=state.mailConnected?
   'Website Gmail connected. Select a contact and verify any previous outreach before sending.':
   'Website Gmail is not connected. You can prepare/copy drafts; connect Gmail in the classic tools to send.';
 }
 async function prepare(){
  const contact=state.contacts.find(c=>c.id===state.selected);
  if(!contact){say('Choose a contact first.',true);return;}
  if(state.method==='manual'){
   el('outreach-to').value=contact.email;
   el('outreach-subject').value='';
   el('outreach-body').value='';
   el('outreach-approved').checked=false;
   el('outreach-draft-meta').textContent='Self-send: write and review your own message. No automatic text or sending.';
   return;
  }
  const data=await req('/api/outreach/draft/'+encodeURIComponent(contact.id)+'?'+new URLSearchParams({
   season:el('outreach-season').value,focus:el('outreach-focus').value
  }));
  el('outreach-to').value=data.to;
  el('outreach-subject').value=data.subject;
  el('outreach-body').value=data.body;
  el('outreach-approved').checked=false;
  el('outreach-draft-meta').textContent=data.warning+' Classification: '+(data.classification.category||'unverified')+'.';
  say('Personalized draft prepared — not sent.');
 }
 async function selectContact(id){
  const row=state.contacts.find(c=>c.id===id);
  if(!row||row.excluded)return;
  state.selected=id;
  drawContacts();
  await prepare();
 }
 async function doAction(target){
  const action=target.dataset.outreach;
  if(action==='mode'){
   state.method=target.dataset.mode;
   document.querySelectorAll('[data-outreach="mode"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===state.method)));
   if(state.selected)await prepare();
   return;
  }
  if(action==='preview'||action==='import'){
   const file=el('outreach-upload').files?.[0];
   if(!file)throw Error('Choose a CSV or XLSX sheet first.');
   if(file.size>4_000_000)throw Error('Spreadsheet exceeds the 4 MB limit.');
   if(action==='import'&&!state.preview)throw Error('Preview the spreadsheet before importing.');
   if(action==='import'&&!confirm('Import only rows marked ready? No emails will be sent.'))return;
   const fd=new FormData();fd.append('file',file);
   const result=await req('/api/contacts/import'+(action==='preview'?'?preview=1':''),{method:'POST',body:fd});
   if(action==='preview'){state.preview=result;drawPreview();say('Preview generated. Review names, employers and addresses before import.');}
   else {state.preview=null;drawPreview();await reloadContacts();say('Imported '+result.imported+' verified-field rows; '+result.needs_review+' need manual correction. No email was sent.');}
   return;
  }
  if(action==='select'){await selectContact(target.dataset.id);return;}
  if(action==='toggle-block'){
   const c=state.contacts.find(c=>c.id===target.dataset.id);if(!c)return;
   if(!confirm((c.excluded?'Unblock':'Block')+' outreach to '+c.email+'?'))return;
   await req('/api/outreach/exclusion/'+encodeURIComponent(c.id),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({excluded:!c.excluded})});
   if(state.selected===c.id){state.selected=null;el('outreach-to').value='';el('outreach-approved').checked=false;}
   await reloadContacts();say(c.excluded?'Contact unblocked.':'Contact added to the do-not-contact list.');return;
  }
  if(action==='draft'){await prepare();return;}
  if(action==='copy'){
   const text=[el('outreach-subject').value,el('outreach-body').value].join('\n\n');
   if(!text.trim())throw Error('Prepare or write a draft first.');
   await navigator.clipboard.writeText(text);say('Draft copied. No email was sent.');return;
  }
  if(action==='next'){
   const idx=state.contacts.findIndex(c=>c.id===state.selected);
   const next=state.contacts.slice(idx+1).concat(state.contacts.slice(0,Math.max(0,idx+1))).find(c=>!c.excluded&&!c.last_sent);
   if(!next){say('No unsent, unblocked contacts remain in this queue.');return;}
   await selectContact(next.id);return;
  }
  if(action==='send'){
   const contact=state.contacts.find(c=>c.id===state.selected);
   if(!contact||contact.excluded)throw Error('Select a non-blocked contact.');
   if(!state.mailConnected)throw Error('Connect Gmail in this website first. ChatGPT Gmail access does not connect the website.');
   if(!el('outreach-approved').checked)throw Error('Review and approve this individual message before sending.');
   const to=el('outreach-to').value.trim();
   if(to.toLowerCase()!==String(contact.email).toLowerCase())throw Error('Recipient does not match the selected contact.');
   const subject=el('outreach-subject').value.trim(),body=el('outreach-body').value.trim();
   if(!subject||body.length<30)throw Error('Write a valid subject and message first.');
   const attach_original_resume=el('outreach-attach').checked;
   if(!confirm('Send exactly ONE message to '+to+'?\nSubject: '+subject+'\nOriginal resume attached: '+(attach_original_resume?'yes':'no')+'\n\nThis action cannot be undone.'))return;
   const sent=await req('/api/gmail/send',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({to,subject,body,job_id:'contact_'+contact.id,attach_original_resume,reviewed_and_confirmed:true})});
   el('outreach-approved').checked=false;
   try{await reloadContacts();}catch(_){/* Preserve confirmed send receipt even if queue refresh fails. */}
   say('Sent ONE reviewed email. Gmail receipt: '+(sent.gmail_message_id||'accepted')+'. Use Next unsent to prepare another contact.');
  }
 }
 document.addEventListener('click',async event=>{
  const target=event.target.closest('[data-outreach]');if(!target||state.busy)return;
  event.preventDefault();
  disabled(true);
  try{await doAction(target);}catch(error){say(error.message,true);}finally{disabled(false);if(el('outreach-import'))el('outreach-import').disabled=!state.preview?.ready;document.querySelectorAll('[data-outreach="select"]').forEach(b=>{const row=state.contacts.find(c=>c.id===b.dataset.id);if(row?.excluded)b.disabled=true;});}
 });
 document.addEventListener('input',event=>{
  const t=event.target;if(t.id==='outreach-find'){state.search=t.value.trim().toLowerCase();drawContacts();}
  if(['outreach-to','outreach-subject','outreach-body'].includes(t.id)){if(el('outreach-approved'))el('outreach-approved').checked=false;}
  if(t.id==='outreach-upload'){state.preview=null;if(el('outreach-preview'))drawPreview();}
 });
 document.addEventListener('change',event=>{
  if(['outreach-season','outreach-focus'].includes(event.target.id)&&state.selected&&state.method==='smart')prepare().catch(e=>say(e.message,true));
 });
 window.OutreachStudio={async render(ticket){
  const content=el('content');content.innerHTML=layout();
  state.selected=null;state.preview=null;state.search='';
  try{await reloadContacts();}
  catch(error){if(location.hash.startsWith('#outreach'))say(error.message+' Private PostgreSQL is required for contact storage.',true);}
 }};
})();
