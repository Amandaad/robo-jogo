(() => {
  "use strict";
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const $ = (id) => document.getElementById(id);
  const W = canvas.width, H = canvas.height;
  const GRAVITY = 0.62, SPEED = 4.4, JUMP = -12.5;

  const levelTemplates = [
    {
      name: "Vale Neon", goal: 5, world: 1800,
      platforms: [[0,485,500,55],[570,440,170,22],[800,390,150,22],[1010,440,180,22],[1250,385,170,22],[1480,455,320,85]],
      coins: [[170,440],[350,440],[630,395],[860,345],[1070,395],[1320,340],[1580,410]],
      spikes: [[450,465,36],[930,370,36],[1190,420,36]],
      enemies: [[700,412,620,755],[1390,357,1280,1430]],
      portal: [1695,395]
    },
    {
      name: "Fábrica Lunar", goal: 6, world: 2050,
      platforms: [[0,485,340,55],[400,430,150,22],[610,365,150,22],[820,420,160,22],[1040,345,160,22],[1260,400,170,22],[1500,340,170,22],[1740,450,310,90]],
      coins: [[120,440],[450,385],[660,320],[865,375],[1080,300],[1310,355],[1550,295],[1830,410]],
      spikes: [[290,465,35],[550,410,35],[960,400,35],[1435,380,35],[1680,430,35]],
      enemies: [[690,337,620,735],[1330,372,1270,1410],[1810,422,1760,1940]],
      portal: [1945,390]
    },
    {
      name: "Cidade das Estrelas", goal: 7, world: 2250,
      platforms: [[0,485,300,55],[355,425,130,22],[545,360,135,22],[740,420,140,22],[940,345,135,22],[1140,400,140,22],[1340,325,145,22],[1545,395,140,22],[1750,330,145,22],[1960,450,290,90]],
      coins: [[90,440],[390,380],[580,315],[775,375],[975,300],[1175,355],[1380,280],[1585,350],[1790,285],[2040,410]],
      spikes: [[260,465,35],[485,405,35],[680,340,35],[880,400,35],[1080,325,35],[1280,380,35],[1485,305,35],[1690,375,35],[1890,430,35]],
      enemies: [[580,332,550,650],[1170,372,1145,1240],[1580,367,1550,1660],[2020,422,1980,2170]],
      portal: [2150,390]
    }
  ];

  let levelIndex = 0, totalCoins = 0, lives = 3, running = false, gameOver = false;
  let cameraX = 0, frame = 0, keys = {}, jumpQueued = false;
  let level, player, particles = [];

  function loadLevel(index, keepCoins = true) {
    const t = levelTemplates[index];
    level = {
      ...t,
      platforms: t.platforms.map(p => ({x:p[0],y:p[1],w:p[2],h:p[3]})),
      coins: t.coins.map(c => ({x:c[0],y:c[1],got:false,bob:Math.random()*6})),
      spikes: t.spikes.map(s => ({x:s[0],y:s[1],w:s[2]})),
      enemies: t.enemies.map(e => ({x:e[0],y:e[1],min:e[2],max:e[3],dir:1,alive:true})),
      portal: {x:t.portal[0],y:t.portal[1]}
    };
    player = {x:45,y:420,w:32,h:43,vx:0,vy:0,onGround:false,invuln:0};
    cameraX = 0; particles = [];
    if (!keepCoins) totalCoins = 0;
    updateHud();
  }
  function updateHud() {
    $("levelValue").textContent = `${levelIndex+1} / ${levelTemplates.length}`;
    $("coinValue").textContent = totalCoins;
    $("lifeValue").textContent = "❤️".repeat(Math.max(0,lives)) || "—";
    $("goalValue").textContent = `${level.coins.filter(c=>c.got).length} / ${level.goal}`;
  }
  function startGame() {
    if (gameOver) { levelIndex=0; totalCoins=0; lives=3; gameOver=false; loadLevel(0); }
    running = true;
    $("overlay").classList.add("hidden");
    requestAnimationFrame(loop);
  }
  function showOverlay(icon,title,message,buttonText) {
    running = false;
    $("overlayIcon").textContent = icon;
    $("overlayTitle").textContent = title;
    $("overlayText").textContent = message;
    $("overlayBtn").textContent = buttonText;
    $("overlay").classList.remove("hidden");
  }
  function resetLevel() {
    loadLevel(levelIndex);
    running = true;
    $("overlay").classList.add("hidden");
    requestAnimationFrame(loop);
  }
  function rects(a,b) {
    return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  }
  function addParticles(x,y,color,n=9) {
    for(let i=0;i<n;i++) particles.push({x,y,vx:(Math.random()-.5)*5,vy:(Math.random()-.8)*5,life:25+Math.random()*15,color});
  }
  function hurt() {
    if (player.invuln > 0) return;
    lives--; player.invuln=100; player.vy=-7; player.vx=-player.vx || -4;
    addParticles(player.x+player.w/2,player.y+player.h/2,"#ff6788",12);
    updateHud();
    if(lives<=0) {
      gameOver=true;
      showOverlay("💥","Missão encerrada!","Suas vidas acabaram. Tente novamente e colete as moedas para abrir o portal.","Tentar novamente");
    }
  }
  function update() {
    frame++;
    const left = keys.ArrowLeft || keys.KeyA || keys.left;
    const right = keys.ArrowRight || keys.KeyD || keys.right;
    if(left) player.vx=-SPEED;
    else if(right) player.vx=SPEED;
    else player.vx*=0.78;
    if(jumpQueued && player.onGround) { player.vy=JUMP; player.onGround=false; addParticles(player.x+16,player.y+42,"#6cefe4",5); }
    jumpQueued=false;
    player.x += player.vx;
    player.x = Math.max(0,Math.min(level.world-player.w,player.x));
    const prevY=player.y;
    player.vy += GRAVITY;
    player.y += player.vy;
    player.onGround=false;
    for(const p of level.platforms) {
      const horizontal=player.x+player.w>p.x && player.x<p.x+p.w;
      if(horizontal && prevY+player.h<=p.y && player.y+player.h>=p.y && player.vy>=0) {
        player.y=p.y-player.h; player.vy=0; player.onGround=true;
      }
    }
    if(player.y>H+100) { hurt(); player.x=Math.max(30,player.x-80); player.y=350; player.vy=0; }
    if(player.invuln>0) player.invuln--;
    for(const c of level.coins) {
      if(!c.got && rects(player,{x:c.x-11,y:c.y-11+Math.sin(frame*.08+c.bob)*4,w:22,h:22})) {
        c.got=true; totalCoins++; addParticles(c.x,c.y,"#ffd45f",10); updateHud();
      }
    }
    for(const s of level.spikes) {
      if(rects(player,{x:s.x+4,y:s.y+8,w:s.w-8,h:20})) hurt();
    }
    for(const e of level.enemies) {
      if(!e.alive) continue;
      e.x += e.dir*1.15;
      if(e.x<e.min || e.x>e.max) e.dir*=-1;
      const enemyRect={x:e.x,y:e.y,w:30,h:30};
      if(rects(player,enemyRect)) {
        if(player.vy>1 && player.y+player.h-10<e.y+12) {
          e.alive=false; player.vy=-8; addParticles(e.x+15,e.y+15,"#ff8b75",12);
        } else hurt();
      }
    }
    const got=level.coins.filter(c=>c.got).length;
    if(got>=level.goal && rects(player,{x:level.portal.x,y:level.portal.y,w:45,h:75})) {
      if(levelIndex<levelTemplates.length-1) {
        levelIndex++; loadLevel(levelIndex); addParticles(player.x,player.y,"#a58bff",20);
      } else {
        gameOver=true;
        showOverlay("🏆","Você salvou a galáxia!","Parabéns! Você completou as 3 fases e coletou moedas pelo caminho. Quer jogar novamente?","Jogar novamente");
      }
    }
    for(const p of particles) {p.x+=p.vx;p.y+=p.vy;p.vy+=.12;p.life--;}
    particles=particles.filter(p=>p.life>0);
    cameraX=Math.max(0,Math.min(level.world-W,player.x-W*.35));
    updateHud();
  }

  function roundedRect(x,y,w,h,r,fill,stroke) {
    ctx.beginPath(); ctx.roundRect(x,y,w,h,r);
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}
  }
  function drawBackground() {
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,"#111b3d");g.addColorStop(1,"#263d68");
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    for(let i=0;i<75;i++){
      const x=((i*137-cameraX*.12)%W+W)%W, y=(i*71)%330;
      ctx.fillStyle=`rgba(210,235,255,${.25+(i%4)*.15})`;
      ctx.fillRect(x,y,2,2);
    }
    // distant futuristic skyline
    for(let i=0;i<18;i++){
      const bw=35+(i*17)%55, bh=80+(i*31)%160;
      const x=((i*105-cameraX*.28)%(W+100)+W+100)%(W+100)-30;
      ctx.fillStyle=i%2?"#17284c":"#1b2f57";
      ctx.fillRect(x,H-55-bh,bw,bh);
      ctx.fillStyle="#54e8e4";
      for(let wy=H-45-bh;wy<H-65;wy+=18) for(let wx=x+8;wx<x+bw-5;wx+=14){
        if((wx+wy+i)%3!==0){ctx.globalAlpha=.3+(i%3)*.15;ctx.fillRect(wx,wy,4,6);}
      }
      ctx.globalAlpha=1;
    }
    ctx.fillStyle="#0b1429";ctx.fillRect(0,H-55,W,55);
    ctx.fillStyle="#30476f";ctx.fillRect(0,H-55,W,4);
  }
  function drawPlatform(p) {
    const x=p.x-cameraX;
    const grad=ctx.createLinearGradient(0,p.y,0,p.y+p.h);
    grad.addColorStop(0,"#5b7aa9");grad.addColorStop(.22,"#263e67");grad.addColorStop(1,"#142440");
    roundedRect(x,p.y,p.w,p.h,7,grad,"#7897c7");
    ctx.fillStyle="#57f3e2";ctx.fillRect(x+5,p.y+4,Math.max(0,p.w-10),3);
    ctx.fillStyle="#49658c";
    for(let xx=x+18;xx<x+p.w-8;xx+=35) ctx.fillRect(xx,p.y+16,12,3);
  }
  function drawCoin(c) {
    if(c.got)return;
    const x=c.x-cameraX, y=c.y+Math.sin(frame*.08+c.bob)*4;
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(frame*.06+c.bob)*.2);
    ctx.shadowColor="#ffd65b";ctx.shadowBlur=15;
    ctx.fillStyle="#ffc94f";ctx.beginPath();ctx.arc(0,0,10,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;ctx.strokeStyle="#fff0a2";ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle="#a66a1c";ctx.font="bold 13px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("$",0,1);
    ctx.restore();
  }
  function drawSpike(s) {
    const x=s.x-cameraX;
    ctx.fillStyle="#ff6485";ctx.shadowColor="#ff416c";ctx.shadowBlur=9;
    ctx.beginPath();ctx.moveTo(x,s.y+22);ctx.lineTo(x+s.w/2,s.y);ctx.lineTo(x+s.w,s.y+22);ctx.closePath();ctx.fill();
    ctx.shadowBlur=0;ctx.strokeStyle="#ffc0ce";ctx.stroke();
  }
  function drawEnemy(e) {
    if(!e.alive)return;
    const x=e.x-cameraX;
    ctx.save();ctx.translate(x,e.y);
    ctx.shadowColor="#ff6688";ctx.shadowBlur=12;
    roundedRect(2,5,26,23,7,"#d34f79","#ff9ab3");ctx.shadowBlur=0;
    roundedRect(6,10,18,8,3,"#351b42");
    ctx.fillStyle="#ffe88a";ctx.fillRect(8,12,5,3);ctx.fillRect(17,12,5,3);
    ctx.fillStyle="#9c3e65";ctx.fillRect(4,27,7,4);ctx.fillRect(20,27,7,4);
    ctx.restore();
  }
  function drawPlayer() {
    if(player.invuln>0 && Math.floor(frame/5)%2===0)return;
    const x=player.x-cameraX,y=player.y;
    ctx.save();ctx.translate(x,y);
    // antenna
    ctx.strokeStyle="#b7c9ee";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(16,5);ctx.lineTo(16,0);ctx.stroke();
    ctx.fillStyle="#ffcf65";ctx.beginPath();ctx.arc(16,0,3,0,Math.PI*2);ctx.fill();
    // ears and body
    roundedRect(1,9,30,23,6,"#a8c4e8","#e0f0ff");
    roundedRect(-3,15,5,10,2,"#55f4e8");roundedRect(30,15,5,10,2,"#55f4e8");
    roundedRect(5,13,22,12,4,"#172846");
    ctx.fillStyle="#55f4e8";ctx.fillRect(8,16,5,4);ctx.fillRect(19,16,5,4);
    ctx.fillStyle="#d5e6ff";ctx.fillRect(11,27,10,2);
    roundedRect(5,33,22,8,3,"#6f91c2","#b5d4ff");
    ctx.fillStyle="#55f4e8";ctx.fillRect(8,40,6,3);ctx.fillRect(20,40,6,3);
    ctx.restore();
  }
  function drawPortal() {
    const x=level.portal.x-cameraX,y=level.portal.y;
    const active=level.coins.filter(c=>c.got).length>=level.goal;
    ctx.save();ctx.translate(x,y);
    ctx.shadowColor=active?"#65ffe2":"#8a8fae";ctx.shadowBlur=active?25:7;
    ctx.strokeStyle=active?"#65ffe2":"#7483a8";ctx.lineWidth=6;
    ctx.beginPath();ctx.ellipse(22,38,19,36,0,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle=active?"rgba(85,244,232,.22)":"rgba(130,145,180,.12)";
    ctx.beginPath();ctx.ellipse(22,38,15,31,0,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;ctx.restore();
    if(!active && x>-60 && x<W+60){
      ctx.fillStyle="#d2dcf5";ctx.font="bold 12px Nunito";ctx.textAlign="center";ctx.fillText("COLETE "+level.goal+" MOEDAS",x+22,y-14);
    }
  }
  function drawParticles() {
    for(const p of particles){ctx.globalAlpha=Math.min(1,p.life/20);ctx.fillStyle=p.color;ctx.fillRect(p.x-cameraX,p.y,4,4);}
    ctx.globalAlpha=1;
  }
  function draw() {
    drawBackground();
    for(const p of level.platforms)drawPlatform(p);
    for(const s of level.spikes)drawSpike(s);
    for(const c of level.coins)drawCoin(c);
    drawPortal();
    for(const e of level.enemies)drawEnemy(e);
    drawPlayer();drawParticles();
    // world progress
    const progress=player.x/Math.max(1,level.world-W);
    ctx.fillStyle="#080f20aa";ctx.fillRect(0,0,W,5);
    ctx.fillStyle="#55f4e8";ctx.fillRect(0,0,Math.min(W,progress*W),5);
  }
  function loop() {
    if(!running)return;
    update();draw();
    if(running)requestAnimationFrame(loop);
  }
  function setKey(code,down) {
    keys[code]=down;
    if(down && (code==="Space" || code==="ArrowUp" || code==="KeyW" || code==="jump"))jumpQueued=true;
  }
  window.addEventListener("keydown",e=>{
    if(["ArrowLeft","ArrowRight","ArrowUp","Space"].includes(e.code))e.preventDefault();
    if(e.code==="KeyR"){resetLevel();return;}
    setKey(e.code,true);
  });
  window.addEventListener("keyup",e=>setKey(e.code,false));
  function bindHold(id,key) {
    const el=$(id);
    el.addEventListener("pointerdown",e=>{e.preventDefault();el.setPointerCapture?.(e.pointerId);setKey(key,true);});
    const end=e=>{e.preventDefault();setKey(key,false);};
    el.addEventListener("pointerup",end);el.addEventListener("pointercancel",end);el.addEventListener("lostpointercapture",end);
  }
  bindHold("leftBtn","left");bindHold("rightBtn","right");bindHold("jumpBtn","jump");
  $("overlayBtn").addEventListener("click",startGame);
  $("restartBtn").addEventListener("click",()=>{levelIndex=0;totalCoins=0;lives=3;gameOver=false;loadLevel(0);startGame();});
  loadLevel(0);
  draw();
})();