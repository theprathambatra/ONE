(() => {
  "use strict";

  const cores=window.ONE_SKILLS;
  const {audiences,outcomes,formats,edges}=window.ONE_MATRIX;

  const TOTAL = cores.length * audiences.length * outcomes.length * formats.length * edges.length;
  if (TOTAL !== 187500) throw new Error("ONE pool must equal exactly 187,500");

  const modeWords = [
    ["Signal Plan","Performance System","Test Sprint","Growth Lab","Validation Track","Optimization Plan","Pilot System","Decision Sprint"],
    ["Momentum Stack","Growth Workflow","Execution Engine","Automation Loop","Operator System","Fast Track","Action Pipeline","Delivery Stack"],
    ["Diagnostic Pack","Scorecard","Benchmark Sprint","Audit Kit","Experiment Pack","Launch Playbook","Action Blueprint","Performance Kit"],
    ["Starter Kit","Growth Kit","Workflow Pack","Launch Kit","Operator Pack","Momentum Kit","Action System","Execution Pack"]
  ];

  function titleFor(core,audience,outcome,formatIndex,edgeIndex,seed){
    const mode = formatIndex * 2 + edgeIndex;
    const words = modeWords[mode];
    const variant = words[seed % words.length];

    if(mode===0) return `${core.name}: ${outcome.label} ${variant} for ${audience}`;
    if(mode===1) return `${core.name} ${variant} for ${audience}: ${outcome.label}`;
    if(mode===2) return `${audience} ${variant}: ${core.name} for ${outcome.label}`;
    return `${outcome.label} ${variant} for ${audience} with ${core.name}`;
  }

  function ideaFromIndex(index){
    let n = ((index % TOTAL) + TOTAL) % TOTAL;

    const edgeIndex = n % edges.length;
    const edge = edges[edgeIndex];
    n = Math.floor(n / edges.length);

    const formatIndex = n % formats.length;
    const format = formats[formatIndex];
    n = Math.floor(n / formats.length);

    const outcomeIndex = n % outcomes.length;
    const outcome = outcomes[outcomeIndex];
    n = Math.floor(n / outcomes.length);

    const audienceIndex = n % audiences.length;
    const audience = audiences[audienceIndex];
    n = Math.floor(n / audiences.length);

    const coreIndex = n % cores.length;
    const core = cores[coreIndex];

    const audienceLower = audience.toLowerCase();
    const seed = coreIndex * 17 + audienceIndex * 11 + outcomeIndex * 5;

    return {
      index,
      title: titleFor(core,audience,outcome,formatIndex,edgeIndex,seed),
      description: `For ${audienceLower}, use ${core.name} to ${outcome.phrase}. Shape it as ${format.desc}. Start with ${core.build}. Measure ${outcome.metric}. ${edge.desc}.`,
      learn: `${core.skill}; ${format.learn}; ${edge.learn}`,
      build: `${core.build}; then turn it into ${format.build}`,
      impact: `${core.why}. Track ${outcome.metric}.`
    };
  }

  const STORE_KEY = "one-deck-v4-187500";
  function gcd(a,b){ while(b){ [a,b] = [b,a%b]; } return a; }
  function secureInt(max){
    if(window.crypto && crypto.getRandomValues){
      const a = new Uint32Array(1);
      crypto.getRandomValues(a);
      return a[0] % max;
    }
    return Math.floor(Math.random()*max);
  }

  function freshDeck(){
    let a;
    do{ a = 1 + secureInt(TOTAL-1); }while(gcd(a,TOTAL)!==1);
    return {a, b:secureInt(TOTAL), k:0, cycle:1};
  }

  function loadDeck(){
    try{
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if(parsed && Number.isInteger(parsed.a) && Number.isInteger(parsed.b) && Number.isInteger(parsed.k) &&
         gcd(parsed.a,TOTAL)===1 && parsed.b>=0 && parsed.b<TOTAL && parsed.k>=0 && parsed.k<=TOTAL) return parsed;
    }catch(_){}
    const d=freshDeck();
    saveDeck(d);
    return d;
  }

  function saveDeck(d){
    try{ localStorage.setItem(STORE_KEY,JSON.stringify(d)); }catch(_){}
  }

  let deck = loadDeck();

  function nextUniqueIndex(){
    if(deck.k >= TOTAL){
      const oldCycle = deck.cycle || 1;
      deck = freshDeck();
      deck.cycle = oldCycle + 1;
    }
    const idx = (deck.a * deck.k + deck.b) % TOTAL;
    deck.k++;
    saveDeck(deck);
    return idx;
  }

  const startBtn = document.getElementById("startBtn");
  const againBtn = document.getElementById("againBtn");
  const scanner = document.getElementById("scanner");
  const tunnel = document.getElementById("tunnel");
  const counter = document.getElementById("counter");
  const scanLabel = document.getElementById("scanLabel");
  const resultNo = document.getElementById("resultNo");
  const resultTitle = document.getElementById("resultTitle");
  const resultCopy = document.getElementById("resultCopy");
  const learnSignal = document.getElementById("learnSignal");
  const buildSignal = document.getElementById("buildSignal");
  const impactSignal = document.getElementById("impactSignal");
  const deckStatus = document.getElementById("deckStatus");

  let selecting = false;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(hover:none), (pointer:coarse)").matches;

  function setState(state){ document.body.dataset.state = state; }
  function setEnergy(v){ document.documentElement.style.setProperty("--energy",v); }

  function updateDeckStatus(){
    const unseen = Math.max(0,TOTAL-deck.k);
    deckStatus.textContent = `${unseen.toLocaleString()} unseen on this device`;
  }

  function addGhost(index){
    const g=document.createElement("div");
    g.className="ghost";
    g.textContent=ideaFromIndex(index).title;
    g.style.top=`${46 + (Math.random()-.5)*10}%`;
    g.style.animationDuration=`${0.58 + Math.random()*.22}s`;
    tunnel.appendChild(g);
    setTimeout(()=>g.remove(),900);
  }

  function reveal(index){
    const idea=ideaFromIndex(index);
    resultNo.textContent=`#${String(index+1).padStart(6,"0")}`;
    resultTitle.textContent=idea.title;
    resultTitle.classList.toggle("long", idea.title.length > 78 && idea.title.length <= 100);
    resultTitle.classList.toggle("xlong", idea.title.length > 100);
    resultCopy.textContent=idea.description;
    learnSignal.textContent=idea.learn;
    buildSignal.textContent=idea.build;
    impactSignal.textContent=idea.impact;
    updateDeckStatus();
    tunnel.innerHTML="";
    scanner.setAttribute("aria-hidden","true");
    setState("result");
    setEnergy(.1);
    selecting=false;
    startBtn.disabled=false;
    if(coarse && navigator.vibrate) navigator.vibrate([18,45,26]);
  }

  function runSelection(){
    if(selecting) return;
    selecting=true;
    startBtn.disabled=true;
    setState("searching");
    scanner.setAttribute("aria-hidden","false");
    tunnel.innerHTML="";
    counter.textContent="000000";
    scanLabel.textContent="Opening the field";
    setEnergy(1);

    const winner=nextUniqueIndex();
    if(reducedMotion){
      setTimeout(()=>reveal(winner),250);
      return;
    }

    const duration = coarse ? 4300 : 5000;
    const start = performance.now();
    let lastGhost=0;
    let lastStage=-1;

    function frame(now){
      const t=Math.min(1,(now-start)/duration);
      const eased=1-Math.pow(1-t,3.2);
      const scanned=Math.min(TOTAL,Math.floor(eased*TOTAL));
      counter.textContent=String(scanned).padStart(6,"0");

      const stage = t<.25?0:t<.52?1:t<.78?2:3;
      if(stage!==lastStage){
        scanLabel.textContent=[
          "Opening the field",
          "Eliminating noise",
          "Compressing 100K+ routes",
          "Locking one direction"
        ][stage];
        lastStage=stage;
      }

      if(now-lastGhost > (t<.55?62:t<.82?82:125)){
        addGhost(secureInt(TOTAL));
        lastGhost=now;
      }

      if(t<1){
        requestAnimationFrame(frame);
      }else{
        counter.textContent="187500";
        scanLabel.textContent="One selected";
        setTimeout(()=>reveal(winner),420);
      }
    }
    requestAnimationFrame(frame);
  }

  startBtn.addEventListener("click",runSelection);
  againBtn.addEventListener("click",()=>{
    if(selecting) return;
    setState("idle");
    setTimeout(runSelection,180);
  });
  updateDeckStatus();

  window.addEventListener("pointermove",e=>{
    document.documentElement.style.setProperty("--mx",`${e.clientX}px`);
    document.documentElement.style.setProperty("--my",`${e.clientY}px`);
  },{passive:true});

  if(coarse){
    window.addEventListener("pointerdown",e=>{
      document.documentElement.style.setProperty("--mx",`${e.clientX}px`);
      document.documentElement.style.setProperty("--my",`${e.clientY}px`);
      const b=document.createElement("div");
      b.className="touch-burst";
      b.style.left=e.clientX+"px";
      b.style.top=e.clientY+"px";
      document.body.appendChild(b);
      setTimeout(()=>b.remove(),760);
    },{passive:true});
  }

  const canvas=document.getElementById("field");
  const ctx=canvas.getContext("2d");
  let W=0,H=0,dpr=1,particles=[];
  const pointer={x:innerWidth/2,y:innerHeight/2,active:false};

  function resize(){
    W=innerWidth;
    H=innerHeight;
    dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.floor(W*dpr);
    canvas.height=Math.floor(H*dpr);
    canvas.style.width=W+"px";
    canvas.style.height=H+"px";
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const count=Math.max(34,Math.min(82,Math.floor((W*H)/19000)));
    particles=Array.from({length:count},()=>({
      x:Math.random()*W,
      y:Math.random()*H,
      vx:(Math.random()-.5)*.13,
      vy:(Math.random()-.5)*.13,
      r:.35+Math.random()*1.05,
      p:Math.random()*Math.PI*2
    }));
  }

  resize();
  addEventListener("resize",resize,{passive:true});
  if(window.visualViewport) visualViewport.addEventListener("resize",resize,{passive:true});

  addEventListener("pointermove",e=>{
    pointer.x=e.clientX;
    pointer.y=e.clientY;
    pointer.active=true;
  },{passive:true});
  addEventListener("pointerleave",()=>pointer.active=false,{passive:true});

  function draw(){
    ctx.clearRect(0,0,W,H);
    const searching=document.body.dataset.state==="searching";
    const speed=searching?2.8:1;

    for(const p of particles){
      p.x+=p.vx*speed;
      p.y+=p.vy*speed;
      p.p+=.015;
      if(p.x<-10)p.x=W+10;
      if(p.x>W+10)p.x=-10;
      if(p.y<-10)p.y=H+10;
      if(p.y>H+10)p.y=-10;

      if(pointer.active){
        const dx=pointer.x-p.x,dy=pointer.y-p.y,d2=dx*dx+dy*dy;
        if(d2<26000 && d2>1){
          const force=(1-d2/26000)*.0012;
          p.vx+=dx*force;
          p.vy+=dy*force;
        }
      }

      p.vx*=.995;
      p.vy*=.995;
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(255,255,255,${.16 + .08*Math.sin(p.p)})`;
      ctx.fill();
    }

    for(let i=0;i<particles.length;i++){
      for(let j=i+1;j<particles.length;j++){
        const a=particles[i],b=particles[j],dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy);
        if(d<120){
          ctx.beginPath();
          ctx.moveTo(a.x,a.y);
          ctx.lineTo(b.x,b.y);
          ctx.strokeStyle=`rgba(255,255,255,${(1-d/120)*.055})`;
          ctx.lineWidth=.7;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }

  draw();

  const sanity = new Set();
  for(let i=0;i<2500;i+=17) sanity.add(ideaFromIndex(i).title);
  if(sanity.size < 140) console.warn("ONE uniqueness sanity check failed");
})();
