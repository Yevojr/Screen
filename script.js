const LENSES = [
  {id:'none', name:'No lens', short:'The page as it was designed.',
   about:'The page for someone with typical sight and a mouse. This is your baseline to compare the other lenses against.',
   fix:'Notice what already felt unclear here. Every other lens makes those same spots worse.'},
  {id:'blur', name:'Blurred vision', short:'Everything slightly out of focus.',
   about:'Stands in for low vision, for example from cataracts or eyesight that can\'t be fully corrected with glasses.',
   fix:'Larger text, strong contrast, and layouts that still work when someone zooms in to 200%.'},
  {id:'protan', name:'Red-blind (protanopia)', short:'Red looks dark and blends with green.',
   about:'Stands in for protanopia, a form of red-green colour blindness where red light is barely picked up. Red looks darker and is easily confused with green or brown.',
   fix:'Never use colour as the only signal. Add a word or an icon, like writing "Sold out" next to the dot, and don\'t rely on red to draw attention.'},
  {id:'colour', name:'Green-blind (deuteranopia)', short:'Red and green look alike.',
   about:'Stands in for deuteranopia. Green-related colour blindness is the most common kind, and makes red and green hard to tell apart.',
   fix:'Never use colour as the only signal. Add a word or an icon, like writing "Sold out" next to the dot.'},
  {id:'tritan', name:'Blue-yellow blind (tritanopia)', short:'Blue and yellow get confused.',
   about:'Stands in for tritanopia, a much rarer form where blue and yellow are hard to tell apart. It often gets forgotten because red-green is so much more common.',
   fix:'Test your palette with every type of colour blindness, not only red-green. Make selected states differ in brightness, shape or text, not only in hue.'},
  {id:'achro', name:'No colour (achromatopsia)', short:'Everything in shades of grey.',
   about:'Stands in for achromatopsia, a rare condition where people see little or no colour, often together with strong sensitivity to bright light.',
   fix:'Check that your design still works in greyscale: enough difference in brightness, plus text labels and icons for anything important.'},
  {id:'tremor', name:'Trembling hand', short:'Your cursor won\'t hold still.',
   about:'Stands in for a hand tremor, for example with Parkinson\'s disease or essential tremor.',
   fix:'Big click targets with space between them, and controls that forgive a slightly missed click.'},
  {id:'keyboard', name:'Keyboard only', short:'No mouse. Use Tab, Enter and Space.',
   about:'Many people navigate with a keyboard, a switch or a screen reader instead of a mouse.',
   fix:'A clearly visible focus outline, a logical tab order, and real buttons instead of clickable boxes.'},
  {id:'letters', name:'Moving letters', short:'Words shift while you read them.',
   about:'Based on how some people with dyslexia describe reading. Experiences differ a lot from person to person, so treat this one as a conversation starter.',
   fix:'Plain language, short labels, generous spacing, and no walls of text.'}
];
const lensById = id => LENSES.find(l => l.id === id);

const DAYS = ['Thursday','Friday','Saturday'];
const ACTS = ['Lowland Echo','Marrow & Tide','The Quiet Static','Sunfold','Harbour Ghosts','Velvet Circuit','Paper Lanterns','Nightbus','Glass Orchard'];
const TIMES = ['20:00','21:30','23:00'];
const KEY = 'same-page-different-eyes:results:v1';

const $ = s => document.querySelector(s);
const stage = $('#stage');
const fake = $('#fakeCursor');

let S = null; // current round state

/* ---------- storage ---------- */
function loadResults(){ try{ return JSON.parse(localStorage.getItem(KEY)) || []; }catch(e){ return []; } }
function saveResults(list){ try{ localStorage.setItem(KEY, JSON.stringify(list)); }catch(e){} }

/* ---------- views ---------- */
function view(id){
  ['home','round','done'].forEach(v => $('#'+v).hidden = v !== id);
  window.scrollTo(0,0);
}

function toast(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- home ---------- */
function renderLenses(){
  const list = $('#lensList');
  list.innerHTML = '';
  LENSES.forEach(l => {
    const b = document.createElement('button');
    b.className = 'lens-btn';
    b.innerHTML = '<strong></strong><span></span>';
    b.querySelector('strong').textContent = l.name;
    b.querySelector('span').textContent = l.short;
    b.addEventListener('click', () => newRound(l.id));
    list.appendChild(b);
  });
}

const avg = arr => { const v = arr.filter(x => x !== null && x !== undefined); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null; };
const fmt = (n, d=1) => n === null ? '\u2013' : n.toFixed(d);

function renderResults(){
  const all = loadResults();
  const box = $('#results');
  if(!all.length){ box.innerHTML = '<p class="empty">No rounds yet. Pick a lens to play the first one.</p>'; return; }
  let html = '<div class="table-wrap"><table><thead><tr><th>Lens</th><th>Rounds</th><th>Finished</th><th>Avg time</th><th>Avg misclicks</th><th>Avg wrong attempts</th><th>Avg difficulty (1\u20135)</th></tr></thead><tbody>';
  LENSES.forEach(l => {
    const r = all.filter(x => x.lens === l.id);
    if(!r.length) return;
    const fin = r.filter(x => x.completed);
    html += '<tr><td>'+l.name+'</td><td>'+r.length+'</td><td>'+fin.length+'</td>'
      + '<td>'+(fin.length ? fmt(avg(fin.map(x=>x.time)))+' s' : '\u2013')+'</td>'
      + '<td>'+fmt(avg(r.map(x=>x.misclicks)))+'</td>'
      + '<td>'+fmt(avg(r.map(x=>x.errors)))+'</td>'
      + '<td>'+fmt(avg(r.map(x=>x.rating)))+'</td></tr>';
  });
  html += '</tbody></table></div><button class="linkbtn" id="clearBtn">Clear all results</button>';
  box.innerHTML = html;
  $('#clearBtn').addEventListener('click', () => {
    if(confirm('Clear all saved results on this device?')){ saveResults([]); renderResults(); }
  });
}

/* ---------- round setup ---------- */
const rand = n => Math.floor(Math.random()*n);
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=rand(i+1); [a[i],a[j]]=[a[j],a[i]]; } return a; }

function makeShows(targetDay){
  const acts = shuffle(ACTS.slice());
  const shows = [];
  DAYS.forEach((day, d) => {
    for(let i=0;i<3;i++){
      shows.push({id:'s'+d+i, day, act:acts[d*3+i], time:TIMES[i], sold: Math.random() < 0.4});
    }
  });
  const onDay = shows.filter(s => s.day === targetDay);
  if(onDay.every(s => s.sold)) onDay[rand(3)].sold = false;
  if(onDay.every(s => !s.sold)) onDay[rand(3)].sold = true;
  return shows;
}

function newRound(lensId){
  const day = DAYS[rand(3)];
  S = {
    lens: lensId,
    target: {day, count: 2 + rand(3), type: Math.random() < 0.5 ? 'Student' : 'Regular'},
    shows: makeShows(day),
    selected: null, qty: 1, type: null,
    misclicks: 0, errors: 0, running: false, start: 0, elapsed: 0, completed: false, rating: null
  };
  const l = lensById(lensId);
  $('#roundLens').textContent = 'Lens: ' + l.name;
  $('#roundTask').textContent = 'Book ' + S.target.count + ' ' + S.target.type.toLowerCase() + ' tickets for a ' + S.target.day + ' show that isn\'t sold out.';
  $('#timer').textContent = '0.0 s';
  $('#startBtn').hidden = false;
  $('#giveUpBtn').hidden = true;
  $('#backBtn').hidden = false;
  stage.className = 'stage';
  stage.innerHTML = placeholderHTML(lensId);
  view('round');
}

const TIPS = {
  none: 'Nothing changes. This round is your baseline to compare the other lenses with.',
  blur: 'The website will be out of focus.',
  protan: 'The colours on the website will match red-blind colour blindness.',
  deuteran: 'The colours on the website will match green-blind colour blindness.',
  tritan: 'The colours on the website will match blue-blind colour blindness.',
  achro: 'The colours on the website will look different.',
  tremor: 'Your real cursor disappears. Your click lands where the shaky arrow is, not where your hand is.',
  keyboard: 'The mouse is switched off. Press Tab to move between items, and Enter or Space to press them.',
  letters: 'The letters inside words will keep moving around.'
};
function placeholderHTML(lensId){
  return '<div class="placeholder"><p class="ph-title">Ready?</p><ol class="ph-steps">'
    + '<li>Read the task at the top of the screen.</li>'
    + '<li>Press <b>Start task</b>. The timer starts and the Nachtlicht website appears here.</li>'
    + '<li>Book the tickets the task asks for, then press <b>Book tickets</b> on the website.</li>'
    + '</ol><p class="ph-tip"><b>This lens:</b> ' + TIPS[lensId] + '</p></div>';
}

/* ---------- fake website ---------- */
function esc(s){ return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function siteHTML(){
  let days = '';
  DAYS.forEach(day => {
    days += '<div class="day"><h4>'+day+'</h4>';
    S.shows.filter(s => s.day === day).forEach(s => {
      days += '<button class="show" data-show="'+s.id+'" aria-pressed="false"><span class="dot '+(s.sold?'sold':'open')+'"></span><span>'+esc(s.act)+'</span><span class="time">'+s.time+'</span></button>';
    });
    days += '</div>';
  });
  return '<div class="browser"><div class="browser-bar"><span class="bdots"><i></i><i></i><i></i></span><span class="url">nachtlicht.nl/tickets</span></div>'
   + '<div class="site" id="site">'
   + '<div class="site-head"><span class="logo">Nachtlicht</span><span class="site-sub">Live music, three nights a week</span></div>'
   + '<h3>Pick a show</h3>'
   + '<p class="legend"><span><i class="dot open"></i>Available</span><span><i class="dot sold"></i>Sold out</span></p>'
   + '<div class="days">'+days+'</div>'
   + '<h3>Your tickets</h3>'
   + '<div class="row"><span class="lbl">Amount</span><button class="step" data-step="-1" aria-label="One ticket less">\u2212</button><span class="qty" id="qty">1</span><button class="step" data-step="1" aria-label="One ticket more">+</button></div>'
   + '<div class="row"><span class="lbl">Type</span><button class="chip" data-type="Regular" aria-pressed="false">Regular</button><button class="chip" data-type="Student" aria-pressed="false">Student</button></div>'
   + '<p class="hint">Student tickets need a valid student card at the door.</p>'
   + '<label for="email">Email for your tickets</label><input id="email" type="email" autocomplete="off" spellcheck="false">'
   + '<p class="hint">We send your tickets to this address.</p>'
   + '<p class="site-error" id="siteError" role="alert"></p>'
   + '<button class="book" id="book">Book tickets</button>'
   + '</div></div>';
}

function siteError(msg){
  S.errors++;
  const e = document.getElementById('siteError');
  if(e) e.textContent = msg;
}

function onSiteClick(e){
  if(!S || !S.running) return;
  const b = e.target.closest('button');
  if(!b) return;
  if(b.dataset.show){
    S.selected = b.dataset.show;
    stage.querySelectorAll('.show').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  } else if(b.dataset.step){
    S.qty = Math.max(1, Math.min(8, S.qty + Number(b.dataset.step)));
    document.getElementById('qty').textContent = String(S.qty);
  } else if(b.dataset.type){
    S.type = b.dataset.type;
    stage.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  } else if(b.id === 'book'){
    book();
  }
}

function book(){
  const show = S.shows.find(s => s.id === S.selected);
  const email = (document.getElementById('email').value || '').trim();
  if(!show) return siteError('Choose a show first.');
  if(show.sold) return siteError('This show is sold out. Choose another show.');
  if(!S.type) return siteError('Choose a ticket type.');
  if(!/^\S+@\S+\.\S+$/.test(email)) return siteError('Enter an email address, like name@example.com.');
  const t = S.target;
  if(show.day !== t.day || S.qty !== t.count || S.type !== t.type){
    return siteError('This isn\'t the booking the task asks for. Check the task at the top and try again.');
  }
  finish(true);
}

/* ---------- running a round ---------- */
function beginTask(){
  stage.innerHTML = siteHTML();
  stage.className = 'stage lens-' + S.lens;
  S.running = true;
  S.start = performance.now();
  $('#startBtn').hidden = true;
  $('#backBtn').hidden = true;
  $('#giveUpBtn').hidden = false;
  S.timer = setInterval(() => {
    $('#timer').textContent = ((performance.now() - S.start)/1000).toFixed(1) + ' s';
  }, 100);
  if(S.lens === 'tremor') startTremor();
  if(S.lens === 'letters') startScramble();
  if(S.lens === 'keyboard'){
    stage.focus();
    toast('The mouse is off. Press Tab to move, Enter or Space to press.');
  }
}

function stopLens(){
  stopTremor();
  stopScramble();
}

function finish(completed){
  if(!S || !S.running) return;
  S.running = false;
  S.completed = completed;
  S.elapsed = (performance.now() - S.start)/1000;
  clearInterval(S.timer);
  stopLens();
  const l = lensById(S.lens);
  $('#doneTitle').textContent = completed ? 'Booked' : 'Stopped before booking';
  $('#dTime').textContent = S.elapsed.toFixed(1) + ' s';
  $('#dMiss').textContent = S.lens === 'keyboard' ? '\u2013' : String(S.misclicks);
  $('#dErr').textContent = String(S.errors);
  $('#dAbout').textContent = l.about;
  $('#dFix').textContent = l.fix;
  $('#scaleError').textContent = '';
  S.rating = null;
  renderScale();
  view('done');
}

const SCALE = ['Very easy','Easy','Okay','Hard','Very hard'];
function renderScale(){
  const box = $('#scale');
  box.innerHTML = '';
  SCALE.forEach((label, i) => {
    const b = document.createElement('button');
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = '<b>'+(i+1)+'</b><span>'+label+'</span>';
    b.addEventListener('click', () => {
      S.rating = i + 1;
      box.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      $('#scaleError').textContent = '';
    });
    box.appendChild(b);
  });
}

/* ---------- trembling hand ---------- */
const T = {rx:0, ry:0, ox:0, oy:0, vx:0, vy:0, fx:0, fy:0, raf:0, inside:false};
function startTremor(){
  T.vx = T.vy = T.ox = T.oy = 0;
  const loop = (now) => {
    T.vx = (T.vx + (Math.random()-0.5)*3.2) * 0.86;
    T.vy = (T.vy + (Math.random()-0.5)*3.2) * 0.86;
    T.ox = (T.ox + T.vx) * 0.93;
    T.oy = (T.oy + T.vy) * 0.93;
    const shake = Math.sin(now/1000 * Math.PI * 2 * 6);
    T.fx = T.rx + T.ox + shake*4;
    T.fy = T.ry + T.oy + Math.cos(now/1000 * Math.PI * 2 * 5)*3;
    fake.style.transform = 'translate(' + T.fx + 'px,' + T.fy + 'px)';
    fake.toggleAttribute('hidden', !T.inside);
    T.raf = requestAnimationFrame(loop);
  };
  T.raf = requestAnimationFrame(loop);
}
function stopTremor(){ cancelAnimationFrame(T.raf); T.raf = 0; fake.setAttribute('hidden', ''); }

stage.addEventListener('mousemove', e => { T.rx = e.clientX; T.ry = e.clientY; T.inside = true; });
stage.addEventListener('mouseleave', () => { T.inside = false; });
stage.addEventListener('mouseenter', e => { T.rx = e.clientX; T.ry = e.clientY; T.inside = true; });

/* Intercept real mouse input for the tremor and keyboard lenses.
   Keyboard-triggered clicks have detail 0 and are always let through. */
stage.addEventListener('mousedown', e => {
  if(!S || !S.running || !e.isTrusted) return;
  if(S.lens === 'tremor' || S.lens === 'keyboard') e.preventDefault();
}, true);

stage.addEventListener('click', e => {
  if(!S || !S.running || !e.isTrusted || e.detail === 0) return;
  if(S.lens === 'keyboard'){
    e.preventDefault(); e.stopImmediatePropagation();
    toast('The mouse is off. Press Tab to move, Enter or Space to press.');
    return;
  }
  if(S.lens === 'tremor'){
    e.preventDefault(); e.stopImmediatePropagation();
    const el = document.elementFromPoint(T.fx, T.fy);
    if(!el || !stage.contains(el)){ S.misclicks++; return; }
    const input = el.closest('input');
    if(input){ input.focus(); return; }
    el.click();
  }
}, true);

/* Count clicks that land on nothing clickable */
stage.addEventListener('click', e => {
  if(!S || !S.running || S.lens === 'keyboard') return;
  if(!e.target.closest('button, input, label')) S.misclicks++;
});
stage.addEventListener('click', onSiteClick);

/* ---------- moving letters ---------- */
const L = {map:new Map(), timer:0};
function scrambleWord(w){
  if(Math.random() > 0.35) return w;
  const mid = w.slice(1,-1).split('');
  shuffle(mid);
  return w[0] + mid.join('') + w[w.length-1];
}
function startScramble(){
  L.map = new Map();
  L.timer = setInterval(() => {
    const site = document.getElementById('site');
    if(!site) return;
    const walker = document.createTreeWalker(site, NodeFilter.SHOW_TEXT, {
      acceptNode: n => n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });
    let n;
    while((n = walker.nextNode())){
      let st = L.map.get(n);
      if(!st || n.nodeValue !== st.last){ st = {orig:n.nodeValue}; L.map.set(n, st); }
      st.last = st.orig.replace(/[A-Za-z]{4,}/g, scrambleWord);
      n.nodeValue = st.last;
    }
  }, 140);
}
function stopScramble(){
  clearInterval(L.timer); L.timer = 0;
  L.map.forEach((st, n) => { if(n.nodeValue === st.last) n.nodeValue = st.orig; });
  L.map = new Map();
}

/* ---------- buttons ---------- */
$('#startBtn').addEventListener('click', beginTask);
$('#quickStart').addEventListener('click', () => newRound('none'));
$('#toLenses').addEventListener('click', () => $('#lensTitle').scrollIntoView({behavior:'smooth', block:'start'}));
$('#giveUpBtn').addEventListener('click', () => finish(false));
$('#backBtn').addEventListener('click', () => { S = null; view('home'); });
$('#saveBtn').addEventListener('click', () => {
  if(!S.rating){ $('#scaleError').textContent = 'Pick how hard it was first, from 1 to 5.'; return; }
  const all = loadResults();
  all.push({lens:S.lens, completed:S.completed, time:Math.round(S.elapsed*10)/10,
    misclicks: S.lens === 'keyboard' ? null : S.misclicks, errors:S.errors, rating:S.rating, at:Date.now()});
  saveResults(all);
  S = null;
  renderResults();
  view('home');
  document.getElementById('lensList').scrollIntoView({block:'start'});
});
$('#discardBtn').addEventListener('click', () => { S = null; view('home'); });

/* ---------- theme ---------- */
const THEME_KEY = 'same-page-different-eyes:theme';
function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t);
  const b = $('#themeBtn');
  b.textContent = t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  try{ localStorage.setItem(THEME_KEY, t); }catch(e){}
}
$('#themeBtn').addEventListener('click', () => {
  applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});
applyTheme(document.documentElement.getAttribute('data-theme') || 'light');

renderLenses();
renderResults();