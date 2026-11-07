import { CONFIG, STATE } from './config.mjs';

const C = { ink: '#493e38', green: '#28675c', red: '#cc554c', cream: '#fff6dc', gold: '#f2bc5c', wood: '#bb8055' };
const TAU = Math.PI * 2;
const font = '"Hiragino Maru Gothic ProN", "Yu Gothic", "Noto Sans JP", sans-serif';

function roundPath(c, x, y, w, h, r) {
  if (typeof c.roundRect === 'function') { c.roundRect(x, y, w, h, r); return; }
  r = Math.min(r, w / 2, h / 2);
  c.moveTo(x+r,y); c.lineTo(x+w-r,y); c.quadraticCurveTo(x+w,y,x+w,y+r);
  c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  c.lineTo(x+r,y+h); c.quadraticCurveTo(x,y+h,x,y+h-r);
  c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y); c.closePath();
}
function rr(c, x, y, w, h, r, fill, stroke, width = 2) {
  c.beginPath(); roundPath(c, x, y, w, h, r);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}
function oval(c, x, y, rx, ry, color) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fillStyle = color; c.fill(); }
function line(c, points, color, width = 3) {
  c.beginPath(); c.moveTo(...points[0]); for (const p of points.slice(1)) c.lineTo(...p);
  c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
}
function star(c, x, y, radius, fill, rotation = -Math.PI / 2) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rotation + i * Math.PI / 5, r = i % 2 ? radius * 0.46 : radius;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (!i) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.closePath(); c.fillStyle = fill; c.fill();
}
function label(c, text, x, y, size = 15, color = C.ink, weight = 700) {
  c.fillStyle = color; c.font = `${weight} ${size}px ${font}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, x, y);
}
function gift(c, x, y, size = 35, color = C.red, tilt = 0) {
  c.save(); c.translate(x, y); c.rotate(tilt);
  rr(c, -size / 2, -size * 0.4, size, size * 0.8, 4, color);
  rr(c, -size * 0.55, -size * 0.47, size * 1.1, size * 0.19, 3, color);
  rr(c, -size * 0.09, -size * 0.47, size * 0.18, size * 0.87, 1, '#ffe2a0');
  line(c, [[-size * 0.35, -size * 0.01], [size * 0.36, -size * 0.01]], '#ffe2a0', size * 0.12);
  c.beginPath(); c.ellipse(-size * 0.15, -size * 0.57, size * 0.16, size * 0.11, 0.5, 0, TAU);
  c.ellipse(size * 0.15, -size * 0.57, size * 0.16, size * 0.11, -0.5, 0, TAU);
  c.strokeStyle = '#ffe2a0'; c.lineWidth = size * 0.07; c.stroke(); c.restore();
}
function bell(c, x, y, size = 16, angle = 0) {
  c.save(); c.translate(x, y); c.rotate(angle);
  line(c, [[0, -size * 0.85], [0, -size * 0.45]], '#88552f', size * 0.25);
  c.beginPath(); c.moveTo(-size * 0.5, size * 0.3); c.quadraticCurveTo(-size * 0.35, -size * 0.55, 0, -size * 0.55);
  c.quadraticCurveTo(size * 0.35, -size * 0.55, size * 0.5, size * 0.3); c.closePath(); c.fillStyle = '#f2bd55'; c.fill();
  rr(c, -size * 0.62, size * 0.22, size * 1.24, size * 0.21, 3, '#ffd986');
  oval(c, 0, size * 0.5, size * 0.12, size * 0.12, '#a77633');
  line(c, [[-size * 0.17, -size * 0.28], [-size * 0.3, size * 0.12]], '#ffe5a6', 2); c.restore();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
    this.background = document.createElement('canvas'); this.background.width = 960; this.background.height = 540;
    this.backgroundStage = 0; this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resize();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, CONFIG.maxPixelRatio);
    const width = Math.max(1, Math.round(rect.width * ratio)), height = Math.max(1, Math.round(rect.height * ratio));
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
  }

  wall(c, stage) {
    const wall = c.createLinearGradient(0, 0, 0, 350); wall.addColorStop(0, '#f4e7cd'); wall.addColorStop(1, '#e7cfac');
    c.fillStyle = wall; c.fillRect(0, 0, 960, 540);
    for (let x = 16; x < 960; x += 43) for (let y = 25; y < 280; y += 46) {
      oval(c, x, y, 1.4, 2, '#ddc5a252');
      line(c, [[x - 4, y + 9], [x, y + 13], [x + 4, y + 9]], '#e1caa642', 1);
    }
    rr(c, 0, 282, 960, 46, 0, '#bcbe9e');
    for (let x = 0; x < 960; x += 58) { rr(c, x + 4, 288, 48, 33, 3, '#d1d0b0', '#afb394', 1); }
    rr(c, 0, 279, 960, 8, 0, '#e4d5b8'); rr(c, 0, 322, 960, 9, 0, '#9d9e80');
    const floor = c.createLinearGradient(0, 330, 0, 540); floor.addColorStop(0, '#d8ad7d'); floor.addColorStop(1, '#efcf9d');
    c.fillStyle = floor; c.fillRect(0, 331, 960, 209);
    for (let y = 341; y < 540; y += 43) {
      line(c, [[0, y], [960, y]], '#b9895755', 2);
      for (let x = ((y - 341) / 43 % 2) * 130; x < 960; x += 258) line(c, [[x, y], [x - 11, y + 43]], '#b9895740', 2);
    }
    for (let i = 0; i < 42; i++) { const x = (i * 173 + 31) % 960, y = 346 + (i * 39) % 190; line(c, [[x, y], [x + 18 + i % 18, y + 1]], '#a87c4c12', 1); }
    oval(c, 517, 427, 260, 65, '#a46e3f1a');
    oval(c, 517, 420, 251, 62, '#b5be9a'); oval(c, 517, 420, 238, 53, '#d7dcc0');
    c.beginPath(); c.ellipse(517, 420, 227, 47, 0, 0, TAU); c.strokeStyle = '#abb794'; c.lineWidth = 2; c.setLineDash([4, 6]); c.stroke(); c.setLineDash([]);
    for (let i = 0; i < 16; i++) { const a = i * TAU / 16; oval(c, 517 + Math.cos(a) * 248, 420 + Math.sin(a) * 61, 3, 2, '#f0e5c5'); }
    this.window(c, stage === 1 ? 492 : 525);
    this.garland(c);
    this.tree(c, stage === 1 ? 291 : 524, stage === 1 ? 338 : 348, stage === 1 ? 1 : 0.82);
    if (stage === 1) {
      this.cabinet(c, 72, 244); this.nightstand(c, 873, 286);
      rr(c, 665, 81, 82, 65, 4, '#ac7956'); rr(c, 672, 88, 68, 51, 2, '#fff0cf');
      oval(c, 706, 112, 17, 17, '#d2d9ba'); star(c, 706, 110, 12, '#dcad55');
      line(c, [[109, 117], [109, 155]], '#ad8055', 2); rr(c, 75, 151, 68, 45, 4, '#a87753');
      rr(c, 80, 156, 58, 35, 2, '#d1d5b2'); label(c, 'NOEL', 109, 174, 15, '#6d7e60');
    } else { this.nightstand(c, 890, 287); this.cabinet(c, 77, 252); }
    const glow = c.createRadialGradient(470, 90, 30, 470, 90, 540); glow.addColorStop(0, '#fff9d817'); glow.addColorStop(1, '#fff9d800'); c.fillStyle = glow; c.fillRect(0, 0, 960, 540);
  }

  window(c, x) {
    c.save(); c.translate(x, 0);
    rr(c, -92, 67, 184, 183, 48, '#b99870'); rr(c, -84, 73, 168, 168, 41, '#2a4b60');
    c.save(); c.beginPath(); roundPath(c, -77, 80, 154, 153, 35); c.clip();
    const night = c.createLinearGradient(0, 80, 0, 233); night.addColorStop(0, '#203b57'); night.addColorStop(1, '#557a8a'); c.fillStyle = night; c.fillRect(-80, 78, 160, 160);
    oval(c, 33, 116, 18, 18, '#ffe9b0'); oval(c, 41, 109, 17, 17, '#29465e');
    star(c, -40, 111, 4, '#f7e9b5'); star(c, 0, 93, 3, '#f7e9b5'); star(c, 56, 157, 3, '#f7e9b5');
    c.beginPath(); c.moveTo(-90, 212); c.quadraticCurveTo(-30, 181, 12, 209); c.quadraticCurveTo(46, 184, 90, 213); c.lineTo(90, 250); c.lineTo(-90, 250); c.fillStyle = '#b4cfce'; c.fill();
    for (const [tx,ty,s] of [[-56,213,0.55],[47,219,0.72],[-6,221,0.37]]) {
      c.save(); c.translate(tx,ty); c.scale(s,s); c.beginPath(); c.moveTo(0,-65); c.lineTo(-23,0); c.lineTo(23,0); c.closePath(); c.fillStyle='#547a79'; c.fill(); c.restore();
    }
    c.restore();
    line(c, [[0, 77], [0, 235]], '#cfb48b', 7); line(c, [[-80, 158], [80, 158]], '#cfb48b', 6);
    rr(c, -101, 236, 202, 12, 5, '#f4dfb9'); rr(c, -87, 248, 174, 5, 2, '#b78c66');
    c.restore();
  }

  garland(c) {
    for (let i = 0; i < 25; i++) {
      const x = i * 41, y = 14 + Math.sin(i / 24 * Math.PI) * 33;
      oval(c, x, y, 31, 13, '#477d65'); oval(c, x + 10, y + 7, 24, 10, '#598a6d');
      for (let k = 0; k < 3; k++) line(c, [[x - 15 + k * 12, y + 5], [x - 22 + k * 12, y - 7]], '#7a9b71', 2);
      if (i % 3 === 1) { oval(c, x, y + 13, 5, 5, '#cb6250'); oval(c, x + 8, y + 12, 4, 4, '#db7a5c'); }
      if (i % 6 === 2) { line(c, [[x, y + 5], [x, y + 35]], '#b1905d', 1); star(c, x, y + 43, 10, '#e0b869'); }
    }
  }

  tree(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    oval(c, 0, 8, 85, 17, '#725e3c20'); rr(c, -13, -37, 26, 42, 4, '#927044');
    for (let i = 0; i < 3; i++) {
      const top = -225 + i * 53, w = 46 + i * 22;
      c.beginPath(); c.moveTo(0, top); c.quadraticCurveTo(-w * 0.5, top + 50, -w, top + 94);
      c.quadraticCurveTo(0, top + 117, w, top + 94); c.quadraticCurveTo(w * 0.5, top + 50, 0, top);
      c.fillStyle = ['#639074', '#4f836a', '#3f765e'][i]; c.fill();
      c.beginPath(); c.moveTo(-w + 6, top + 94); c.quadraticCurveTo(0, top + 111, w - 6, top + 94); c.strokeStyle = '#84a080'; c.lineWidth = 3; c.stroke();
    }
    for (const [a,b,d] of [[-30,-148,30],[-51,-94,50],[-73,-34,72]]) {
      c.beginPath(); c.moveTo(a,b); c.quadraticCurveTo(0,b+32,d,b+5); c.strokeStyle='#ddc380'; c.lineWidth=3; c.stroke();
    }
    const ornaments=[[-18,-157,'#d97e67'],[26,-128,'#f3d78e'],[-36,-89,'#f2c26c'],[41,-70,'#d67b62'],[-7,-56,'#f4e4b7'],[-56,-29,'#db8a65'],[54,-20,'#f0d49d'],[12,-101,'#bad2bc']];
    for (const [ox, oy, color] of ornaments) { line(c, [[ox,oy-10],[ox,oy-5]], '#c0ad74',1); oval(c,ox,oy,7,8,color); oval(c,ox-2,oy-3,2,2,'#ffffff78'); }
    star(c,0,-228,20,'#ffe2a1'); star(c,0,-228,12,'#f1bd59');
    gift(c,-52,0,39,'#d47a67',-.08); gift(c,27,7,45,'#a2bca4',.04); gift(c,65,9,29,'#f0c276',.1); c.restore();
  }

  cabinet(c, x, y) {
    oval(c,x,y+94,53,10,'#76553520'); rr(c,x-43,y+79,12,23,3,'#b28258'); rr(c,x+31,y+79,12,23,3,'#b28258');
    rr(c,x-52,y,104,86,6,'#c59466'); rr(c,x-56,y-5,112,12,4,'#e2b987');
    for(let i=0;i<2;i++){rr(c,x-42,y+13+i*33,84,27,4,'#d5aa79','#b88a5b',1); oval(c,x,y+26+i*33,4,4,'#937749');}
    // A wooden toy reindeer on the dresser.
    oval(c,x+4,y-21,20,11,'#b48a60'); oval(c,x+22,y-37,10,14,'#c69c70');
    line(c,[[x-7,y-17],[x-10,y-6]],'#9a7653',4); line(c,[[x+15,y-17],[x+19,y-6]],'#9a7653',4);
    line(c,[[x+22,y-48],[x+18,y-62],[x+11,y-65]],'#94734c',3); line(c,[[x+22,y-53],[x+29,y-61]],'#94734c',3);
    oval(c,x+26,y-40,1.6,1.6,C.ink); oval(c,x+32,y-34,4,3,'#cc6856');
  }

  nightstand(c, x, y) {
    rr(c,x-28,y+20,56,54,4,'#c99b72'); rr(c,x-33,y+15,66,9,3,'#e2b892');
    rr(c,x-22,y+29,44,23,3,'#deb38a'); oval(c,x,y+40,3,3,'#a27a52');
    line(c,[[x,y+14],[x,y-35]],'#a68350',5); oval(c,x,y+13,17,4,'#b48c55');
    const glow=c.createRadialGradient(x,y-28,8,x,y-28,87); glow.addColorStop(0,'#ffe6a56b'); glow.addColorStop(1,'#ffe6a500'); c.fillStyle=glow;c.fillRect(x-87,y-115,174,174);
    c.beginPath(); c.moveTo(x-18,y-62);c.lineTo(x+18,y-62);c.lineTo(x+31,y-19);c.quadraticCurveTo(x,y-10,x-31,y-19);c.closePath();c.fillStyle='#fff0bb';c.fill();
    line(c,[[x-29,y-19],[x+29,y-19]],'#e6c88e',3);
  }

  snow(c, x, time) {
    c.save();c.beginPath();roundPath(c,x-76,81,152,151,34);c.clip();
    for(let i=0;i<27;i++) { const sx=x-72+(i*41%147)+Math.sin(time*.3+i)*4, sy=82+(i*31+time*(7+i%4))%151; oval(c,sx,sy,1.2+i%3*.4,1.2+i%3*.4,'#eef8edbb'); }
    c.restore();
    line(c,[[x,81],[x,233]],'#cfb48b',7);line(c,[[x-76,158],[x+76,158]],'#cfb48b',6);
  }

  bed(c, child, time, elapsed) {
    const x=child.x, girl=child.gender==='girl', awake=child.rings>=3, happy=child.giftReceived;
    const blanket=girl?'#d88b8e':'#7da7b4', dark=girl?'#bf737a':'#638d9d';
    c.save();c.translate(x,0);
    oval(c,0,372,100,16,'#775d3c22');
    rr(c,-84,204,168,129,25,'#b8875f');rr(c,-77,212,154,109,20,'#dfb48a');
    for(let i=0;i<5;i++)rr(c,-58+i*29,228,9,64,5,'#cd9e76');
    oval(c,-84,210,9,9,'#efcc9f');oval(c,84,210,9,9,'#efcc9f');
    rr(c,-90,275,180,65,13,'#f9e6c9');rr(c,-76,244,152,41,13,'#fff5df');
    line(c,[[-63,251],[56,251]],'#e9d9bc',2);
    const breath=this.reduced?0:Math.sin(time*2)*1.4;
    const rise=awake?Math.min(1,Math.max(0,(elapsed-child.lastRingAt)/.45)):0;
    let cy=awake?260-29*(1-(1-rise)**3):260+breath;
    if(happy&&!this.reduced)cy-=Math.max(0,Math.sin(time*6))*4;
    c.save();c.translate(awake?0:-13,cy);
    if(!awake&&child.rings===1)c.rotate(Math.sin(time*3)*.045-.09);
    if(awake) { rr(c,-24,22,48,44,15,girl?'#eed5c8':'#b4c7c2'); for(let i=0;i<3;i++)oval(c,0,29+i*10,1.8,1.8,'#b09f94'); }
    // Rounded, hand-drawn hair and face.
    oval(c,0,0,29,30,girl?'#72503c':'#765740');
    if(girl){oval(c,-28,10,10,16,'#72503c');oval(c,28,10,10,16,'#72503c');}
    oval(c,0,5,24,25,'#f4c9a8');oval(c,-24,5,4,6,'#f4c9a8');oval(c,24,5,4,6,'#f4c9a8');
    c.beginPath();c.moveTo(-25,-5);c.quadraticCurveTo(-18,-30,8,-22);c.quadraticCurveTo(32,-18,25,2);c.quadraticCurveTo(9,-1,4,-13);c.quadraticCurveTo(-7,-2,-25,-5);c.fillStyle=girl?'#72503c':'#765740';c.fill();
    oval(c,-15,13,5,3,'#e8a18f99');oval(c,15,13,5,3,'#e8a18f99');
    if(awake) {
      if(happy){line(c,[[-13,5],[-9,2],[-5,5]],C.ink,2.4);line(c,[[5,5],[9,2],[13,5]],C.ink,2.4);}
      else{oval(c,-9,5,2.6,3.5,C.ink);oval(c,9,5,2.6,3.5,C.ink);oval(c,-9.6,3.7,.8,1,'#fff');oval(c,8.4,3.7,.8,1,'#fff');}
      c.beginPath();c.arc(0,14,6,0,Math.PI);c.fillStyle='#aa6655';c.fill();
    }else{line(c,[[-14,5],[-10,7],[-5,5]],'#68513e',2);line(c,[[5,5],[10,7],[14,5]],'#68513e',2);oval(c,0,17,2.6,2,'#ba856d');}
    if(girl){c.save();c.translate(22,-12);oval(c,-4,0,6,4,'#e2a0a0');oval(c,4,0,6,4,'#e2a0a0');oval(c,0,0,2.5,3,'#b86b76');c.restore();}
    if(happy){line(c,[[-22,35],[-43,17],[-47,2]],'#f4c9a8',10);line(c,[[22,35],[43,17],[47,2]],'#f4c9a8',10);}
    if(child.rings===2&&!awake){line(c,[[19,29],[13,9]],'#f4c9a8',9);oval(c,12,8,6,5,'#f4c9a8');}
    c.restore();
    rr(c,-88,287,176,56,12,blanket);rr(c,-87,283,174,16,6,girl?'#edb1ae':'#a7c8ce');
    for(let i=0;i<7;i++) {const sx=-70+i*23;star(c,sx,318+(i%2)*7,4,girl?'#f7cec2':'#cee2dc');}
    line(c,[[-77,301],[-77,331]],dark,2);line(c,[[77,301],[77,331]],dark,2);
    rr(c,-94,334,188,25,8,'#c5966e');rr(c,-94,329,188,11,5,'#e6bd92');
    rr(c,-93,344,13,35,4,'#b6845d');rr(c,80,344,13,35,4,'#b6845d');
    if(happy) {gift(c,36,284,39,girl?'#dbad58':'#cb7261',Math.sin(time*3)*.05);for(let i=0;i<5;i++){const a=time*.7+i*1.4;star(c,Math.cos(a)*66,227+Math.sin(a)*55,4,'#f7d07c');}}
    if(!awake){
      const z=child.rings===2?'…':'Z';
      for(let i=0;i<(child.rings===2?1:3);i++){const rise=(time*12+i*19)%58; c.globalAlpha=1-rise/72;label(c,z,36+rise*.35,226-rise,14+i*3,'#7d9290');}c.globalAlpha=1;
    }
    // The three large pips make waking progress readable without text.
    rr(c,-61,163,122,29,14,'#fff9e8e8');
    if(happy) label(c,'ありがとう！',0,178,13,C.green);
    else if(awake)label(c,'おきたよ！',0,178,14,C.green);
    else {for(let i=0;i<3;i++){oval(c,-28+i*28,178,8,8,i<child.rings?'#ecc164':'#e2d7bd'); if(i<child.rings)star(c,-28+i*28,178,5,'#fff5cd');}}
    label(c,child.name,0,397,13,'#765e46');
    c.restore();
  }

  santa(c, x, y, game, time, title = false) {
    const moving=game.santa.moving||game.introRemaining>0, clear=game.state===STATE.STAGE1_CLEAR||game.state===STATE.ALL_CLEAR;
    const ringing=game.elapsed-game.lastBellAt<.65, phase=time*13;
    const bob=this.reduced?0:moving?Math.sin(phase)*2.5:Math.sin(time*2)*1.4;
    oval(c,x,y+3,42,11,'#71563826');
    c.save();c.translate(x,y+bob);c.scale(game.santa.direction,1);
    // Bulging present sack behind Santa.
    oval(c,-32,-39,30,37,'#a58b51');oval(c,-36,-44,23,29,'#b69a5e');
    line(c,[[-43,-70],[-32,-80],[-19,-70]],'#b49b60',9);line(c,[[-42,-67],[-24,-65]],'#7d754a',4);
    for(let i=0;i<3;i++)line(c,[[-44+i*13,-49],[-45+i*13,-25]],'#c6ac743b',2);
    const stride=moving&&!this.reduced?Math.sin(phase)*7:0;
    rr(c,-23+stride,-17,21,19,6,'#4c5047');rr(c,5-stride,-17,21,19,6,'#454c43');
    rr(c,-28+stride,-6,27,11,5,'#3c4540');rr(c,4-stride,-6,29,11,5,'#3c4540');
    rr(c,-32,-75,66,64,24,'#c85349');
    rr(c,-33,-25,68,14,6,'#fff0d6');rr(c,-2,-66,11,46,3,'#fff0d6');
    rr(c,-32,-43,65,10,3,'#625345');rr(c,-2,-46,18,16,3,'#e6bd68');rr(c,2,-42,10,8,1,'#675444');
    // Left arm holds the sack; right arm rings or waves.
    const takingGift=game.giftFlight&&game.giftFlight.progress<.55;
    const handY=takingGift?-58-Math.sin(game.giftFlight.progress/.55*Math.PI)*9:-40;
    line(c,[[-26,-65],[-39,handY-3]],'#b94441',19);oval(c,-39,handY,10,10,'#f5dfbc');
    c.save();c.translate(27,-66);
    let angle=ringing?-1+Math.sin((game.elapsed-game.lastBellAt)*29)*.35:takingGift?-.9:clear||title?-.8+Math.sin(time*5)*.2:.22;
    c.rotate(angle);line(c,[[0,0],[7,26]],'#ce584d',18);line(c,[[3,20],[11,24]],'#fff1d7',9);oval(c,9,29,10,10,'#f3c8a6');
    bell(c,14,42,18,ringing?Math.sin(time*24)*.35:0);c.restore();
    oval(c,0,-92,30,31,'#fff3d9');oval(c,1,-98,24,25,'#f4c9a9');
    oval(c,-23,-91,6,8,'#f7d9bd');oval(c,25,-91,6,8,'#f7d9bd');
    // Soft scalloped beard and moustache.
    oval(c,0,-76,28,23,'#fff6e1');oval(c,-18,-83,11,15,'#fff6e1');oval(c,19,-83,11,15,'#fff6e1');oval(c,0,-59,13,10,'#fff6e1');
    oval(c,-11,-88,11,6,'#fffaf0');oval(c,12,-88,11,6,'#fffaf0');
    oval(c,-14,-97,6,4,'#e5a28d8c');oval(c,17,-97,6,4,'#e5a28d8c');
    line(c,[[-15,-104],[-9,-106],[-5,-104]],'#6b5b48',2.3);line(c,[[7,-104],[12,-106],[17,-104]],'#6b5b48',2.3);
    oval(c,2,-93,8,6,'#eab18e');
    c.beginPath();c.moveTo(-28,-115);c.quadraticCurveTo(-16,-159,23,-144);c.quadraticCurveTo(47,-133,46,-116);c.quadraticCurveTo(27,-134,18,-119);c.closePath();c.fillStyle='#ce584c';c.fill();
    line(c,[[-25,-118],[23,-118]],'#fff1d7',12);oval(c,46,-117,10,10,'#fff1d7');
    c.restore();
  }

  draw(game, time, marker = null) {
    const c=this.ctx, stage=game.state===STATE.TITLE?1:game.stage;
    c.setTransform(this.canvas.width/960,0,0,this.canvas.height/540,0,0);
    if(this.backgroundStage!==stage){this.wall(this.background.getContext('2d'),stage);this.backgroundStage=stage;}
    c.drawImage(this.background,0,0);
    const t=this.reduced?0:time;
    this.snow(c,stage===1?492:525,t);
    const treeX=stage===1?291:524, s=stage===1?1:.82, treeY=stage===1?338:348;
    for(let i=0;i<9;i++){const a=i*2.4, r=18+(i%3)*17;const x=treeX+Math.sin(a)*r*s, y=treeY+(-174+i*17)*s; const alpha=this.reduced?.7:.45+Math.sin(t*1.5+i)*.3;c.globalAlpha=alpha;oval(c,x,y,4,4,'#fff2b6');c.globalAlpha=1;}
    for(const child of game.children)this.bed(c,child,t,game.elapsed);
    if(marker&&time-marker.time<1.2){const age=time-marker.time;c.globalAlpha=1-age/1.2;c.beginPath();c.ellipse(marker.x,CONFIG.floorY+2,18+age*10,6+age*3,0,0,TAU);c.strokeStyle='#fff5cc';c.lineWidth=3;c.stroke();line(c,[[marker.x-5,CONFIG.floorY+1],[marker.x,CONFIG.floorY+5],[marker.x+6,CONFIG.floorY-3]],'#fff5cc',2);c.globalAlpha=1;}
    const title=game.state===STATE.TITLE;
    const sx=title?575:game.santa.x-(game.introRemaining/CONFIG.introDuration)*125;
    this.santa(c,sx,CONFIG.floorY,game,t,title);
    const bellAge=game.elapsed-game.lastBellAt;
    if(bellAge>=0&&bellAge<.8){
      for(let i=0;i<3;i++){const progress=(bellAge/.8-i*.17);if(progress<=0)continue;c.globalAlpha=Math.max(0,(1-progress)*.65);c.beginPath();c.ellipse(sx+game.santa.direction*43,CONFIG.floorY-95,25+progress*110,20+progress*65,0,0,TAU);c.strokeStyle='#fff0a0';c.lineWidth=3;c.stroke();}c.globalAlpha=1;
      for(let i=0;i<3;i++)star(c,sx+Math.cos(i*2+bellAge*2)*75,CONFIG.floorY-110+Math.sin(i*2)*35,5,'#ffdda0');
    }
    if(game.giftFlight){const f=game.giftFlight,p=f.progress, eased=1-(1-p)**2;const startX=f.fromX-(f.fromDirection??1)*32,x=startX+(f.toX-startX)*eased,y=CONFIG.floorY-57+(278-(CONFIG.floorY-57))*p-Math.sin(p*Math.PI)*90;gift(c,x,y,38,'#d87163',Math.sin(p*Math.PI*2)*.2);for(let i=0;i<4;i++)star(c,x-18-i*12,y+i*5,3,'#ffedba');}
    if(game.state===STATE.STAGE1_CLEAR||game.state===STATE.ALL_CLEAR)this.confetti(c,t);
    if(title){const fade=c.createLinearGradient(0,0,660,0);fade.addColorStop(0,'#f9edcff5');fade.addColorStop(.56,'#f9edcfea');fade.addColorStop(1,'#f9edcf00');c.fillStyle=fade;c.fillRect(0,0,660,540);}
    // Soft vignette, like the edge of a printed storybook page.
    const shade=c.createRadialGradient(480,270,200,480,270,600);shade.addColorStop(0,'#84603900');shade.addColorStop(1,'#84603913');c.fillStyle=shade;c.fillRect(0,0,960,540);
  }

  confetti(c,time){
    const colors=['#f1bf62','#cf8174','#87ae9c','#efdfaa'];
    for(let i=0;i<55;i++) {const x=(i*137+Math.sin(time+i)*20)%960, y=(i*79+time*35)%600-40;c.save();c.translate(x,y);c.rotate(time+i);if(i%3===0)star(c,0,0,5,colors[i%4]);else rr(c,-3,-5,6,10,2,colors[i%4]);c.restore();}
  }
}
