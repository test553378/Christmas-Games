import { Game, isFullyAwake, scenePoint, movementTarget } from './gameLogic.mjs';
import { CONFIG, STATE, STAGES, MOM, TIME_CHOICES } from './config.mjs';
import { Renderer } from './renderer.mjs';
import { AudioManager } from './audio.mjs';

const $ = id => document.getElementById(id);
const icon = (name, className = '') => `<svg class="icon ${className}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const game = new Game(), audio = new AudioManager(), renderer = new Renderer($('game-canvas'));
const ui = Object.fromEntries(['scene','stage-display','child-status','timer','time-label','time-number','time-unit','time-fill','title-stars','title-screen','title-footer','scene-caption','play-controls','guide-text','bell-button','bell-count','gift-button','gift-hint','intro','intro-text','result-screen','result-art','result-kicker','result-title','result-message','result-button','result-home','pause-button','sound-button','bed-targets','help-dialog','pause-dialog'].map(id => [id, $(id)]));
let lastTime = performance.now(), visualTime = 0, lastState = null, lastChildren = '', marker = null;
let temporaryGuide = '', guideUntil = 0, lastGuide = '';
const timeDialog=$('time-dialog'),timeChoices=$('time-choices');
timeChoices.innerHTML=TIME_CHOICES.map(choice=>`<button type="button" class="time-choice" data-minutes="${choice.minutes}">${choice.label}</button>`).join('');

try { audio.enabled = localStorage.getItem('santa-sound') !== 'off'; } catch {}
function soundUI() {
  ui['sound-button'].innerHTML = `${icon(audio.enabled ? 'sound' : 'mute')}<span>おと ${audio.enabled ? 'ON' : 'OFF'}</span>`;
  ui['sound-button'].setAttribute('aria-label', audio.enabled ? 'おとをけす' : 'おとをつける');
  ui['sound-button'].setAttribute('aria-pressed', String(audio.enabled));
}
soundUI();

function advance(now = performance.now()) {
  const dt = Math.max(0, (now - lastTime) / 1000);
  lastTime = now;
  game.tick(dt);
}
function notify(text, seconds = 2) { temporaryGuide = text; guideUntil = game.elapsed + seconds; }
function unlock() { audio.unlock(); advance(); }
function updatePaused() { advance(); game.paused = document.hidden || ui['help-dialog'].open || ui['pause-dialog'].open; lastTime = performance.now(); }

function avatar(child) {
  const girl = child.gender === 'girl';
  const awake=isFullyAwake(child)||child.state===MOM.ASKING_TIME;
  return `<svg class="child-avatar" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="18" fill="${child.role==='mom'?'#e9e0ed':girl ? '#f2e0d7' : '#dfe8df'}"/>${child.role==='mom'?'<circle cx="26" cy="9" r="6" fill="#78583e"/>':''}<ellipse cx="18" cy="18" rx="12" ry="13" fill="#78583e"/><ellipse cx="18" cy="20" rx="10" ry="10" fill="#efc5a3"/><path d="M8 16Q9 4 23 8q8 3 5 11-8-2-10-8-3 6-10 5" fill="#78583e"/>${awake ? '<circle cx="14" cy="20" r="1.2" fill="#67503c"/><circle cx="22" cy="20" r="1.2" fill="#67503c"/><path d="M15 25q3 3 6 0" fill="none" stroke="#b3745a"/>' : '<path d="m12 20 2 1 2-1m4 0 2 1 2-1" fill="none" stroke="#67503c" stroke-width="1.4"/>'}${girl ? '<path d="m25 11-4-3v6l4-3 4 3V8z" fill="#d28e93"/>' : ''}</svg>`;
}

function setResult() {
  const over = game.state === STATE.GAME_OVER, all = game.state === STATE.ALL_CLEAR;
  ui['result-art'].innerHTML = over ? icon('moon') : `${icon('star', 'little-star')}${icon(all ? 'gift' : 'star')}${icon('star', 'little-star')}`;
  ui['result-kicker'].textContent = over ? 'LET’S TRY AGAIN' : all ? 'MERRY CHRISTMAS!' : `STAGE ${game.stage} COMPLETE`;
  ui['result-title'].innerHTML = over ? 'もういちど チャレンジ！' : all ? 'ぜんぶクリア！<br><span class="merry-title">メリークリスマス！</span>' : 'やったね！クリア！';
  ui['result-message'].innerHTML = over ? 'まだ すやすや ねているね。<br>つぎは きっと できるよ！' : all ? 'サンタさん、ありがとう！<br>みんなの えがおが いちばんの プレゼント。' : game.stage===2 ? 'ふたりに プレゼントが とどいたよ。<br>つぎは おかあさんも いるよ！' : 'はなちゃんに プレゼントが とどいたよ。<br>つぎの おへやに いってみよう！';
  ui['result-button'].innerHTML = over ? `${icon('retry')}もういちど` : all ? `もういちど あそぶ ${icon('star')}` : `つぎへ ${icon('arrow')}`;
  ui['result-home'].hidden = all;
  // Keyboard users reach the newly available action as soon as a result appears.
  ui['result-button'].focus({ preventScroll: true });
}

function syncUI() {
  const title = game.state === STATE.TITLE, playing = game.playing, result = !title && !playing;
  if (lastState !== game.state) {
    ui['title-screen'].hidden = !title; ui['title-footer'].hidden = !title;
    ui['scene-caption'].hidden = !title; ui['title-stars'].hidden = !title;
    ui['play-controls'].hidden = !playing; ui.timer.hidden = title;
    ui['result-screen'].hidden = !result; ui['pause-button'].hidden = !playing;
    document.querySelector('.game-shell').classList.toggle('stage-three',!title&&game.stage===3);
    ui['stage-display'].innerHTML = title ? '<span class="eyebrow">CHRISTMAS EVE</span><span class="stage-name">とくべつな よるの はじまり</span>' : `<span class="eyebrow">STAGE 0${game.stage} / 0${STAGES.length}</span><span class="stage-name">${game.stage === 1 ? 'はなちゃんの おへや' : game.stage===2 ? 'ふたりの おへや':'みんなの おへや'}<span class="stage-pips">${STAGES.map(stage=>stage.number<=game.stage?'<b class="active">●</b>':'○').join('')}</span></span>`;
    ui['bed-targets'].innerHTML = playing ? game.children.map(child => `<button class="bed-target" data-child="${child.id}" style="left:${(child.x-92*(child.bedScale??1))/9.6}%;top:${175/5.4}%;width:${184*(child.bedScale??1)/9.6}%;height:${195/5.4}%" aria-label="${child.name}の ベッドへ あるく"></button>`).join('') : '';
    if (result) setResult();
    lastState = game.state; lastChildren = '';
  }
  const childrenKey = title ? 'title' : game.children.map(c => `${c.id}:${c.state}:${c.rings}:${c.giftReceived}`).join('|');
  if (childrenKey !== lastChildren) {
    ui['child-status'].innerHTML = title ? '' : game.children.map(child => {
      const awake=isFullyAwake(child),busy=child.state===MOM.ASKING_TIME||child.state===MOM.GOING_BACK_TO_SLEEP;
      const state = child.giftReceived ? 'とどいたよ！' : child.state===MOM.ASKING_TIME ? 'いまなんじ？' : child.state===MOM.GOING_BACK_TO_SLEEP ? 'おやすみ…' : awake ? 'おきたよ！' : child.rings === 0 ? 'すやすや…' : `あと${game.ringsNeeded(child)-child.rings}かい`;
      return `<div class="child-chip">${avatar(child)}<div><span class="child-chip-name">${child.name}</span><span class="child-chip-state">${state}${!awake&&!busy ? `<span class="status-pips" aria-label="すず ${child.rings}かい">${Array.from({length:game.ringsNeeded(child)},(_,i) => `<i class="${i<child.rings?'on':''}"></i>`).join('')}</span>` : ''}</span></div></div>`;
    }).join('');
    lastChildren = childrenKey;
  }
  ui.intro.hidden = !playing || game.introRemaining <= 0;
  ui['intro-text'].textContent = `ステージ ${['','１','２','３'][game.stage]}`;
  ui['time-number'].textContent = Math.ceil(game.remaining);
  ui['time-label'].textContent = game.allAwake||game.momBusy ? 'とけいは' : 'のこり';
  ui['time-unit'].textContent = game.allAwake ? 'とまったよ' : game.momBusy ? 'おやすみ' : 'びょう';
  ui.timer.classList.toggle('urgent', game.remaining <= 10 && !game.allAwake && !game.momBusy);
  ui.timer.classList.toggle('stopped', game.allAwake||game.momBusy);
  ui['time-fill'].style.width = `${100 * game.remaining/game.duration}%`;
  const track = ui['time-fill'].parentElement;
  track.setAttribute('aria-valuemax', game.duration);
  track.setAttribute('aria-valuenow', Math.ceil(game.remaining));
  track.setAttribute('aria-valuetext', game.allAwake ? 'みんな おきたので とまっているよ' : game.momBusy ? 'おはなしの あいだは とまっているよ' : `のこり ${Math.ceil(game.remaining)}びょう`);
  const cooldown = game.elapsed-game.lastBellAt < CONFIG.bellCooldown - 1e-9;
  ui['bell-button'].disabled = !game.interactive || cooldown || game.allAwake;
  ui['bell-button'].classList.toggle('cooling', cooldown);
  const target = game.giftTarget();
  ui['gift-button'].disabled = !target;
  ui['gift-hint'].textContent = game.giftFlight ? 'プレゼントを おとどけちゅう' : target ? `${target.name}に とどけよう！` : game.allAwake ? 'こどもの そばに いこう' : 'おきたら わたせるよ';
  ui['bed-targets'].inert = !game.interactive;
  const near = game.children.filter(c => Math.abs(c.x-game.santa.x)<=CONFIG.bellRange && !isFullyAwake(c)).sort((a,b)=>Math.abs(a.x-game.santa.x)-Math.abs(b.x-game.santa.x))[0];
  ui['bell-count'].textContent = game.momBusy ? 'おはなし' : game.allAwake ? 'おきたよ' : cooldown ? 'ちりん♪' : near ? `あと${game.ringsNeeded(near)-near.rings}かい` : '３かい';
  let guide = game.askingTime ? 'おかあさんに じかんを おしえてね。' : game.momReturning ? 'あくびを しているよ。すこし まとう。' : game.giftFlight ? 'プレゼントが とんでいくよ！' : target ? 'おきたよ！ プレゼントを わたそう！' : near ? `すずを あと${game.ringsNeeded(near)-near.rings}かい ならそう！` : game.allAwake ? 'おきた みんなの そばに いこう！' : 'ベッドを タップして ちかづこう！';
  if (game.elapsed < guideUntil) guide = temporaryGuide;
  if (guide !== lastGuide) { ui['guide-text'].textContent = guide; lastGuide = guide; }
  if(game.askingTime&&playing&&!timeDialog.open){
    for(const button of timeChoices.querySelectorAll('button'))button.disabled=false;
    timeDialog.showModal();
  }else if((!game.askingTime||!playing)&&timeDialog.open)timeDialog.close();
}

function processEvents() {
  for (const event of game.drainEvents()) {
    if (event.type === 'bell') {
      audio.bell();
      if (event.woken.length) { audio.awake(); notify(game.allAwake ? 'みんな おきたよ！ とけいが とまったね。' : 'おきたよ！ プレゼントを わたせるね。'); }
      else if (!event.affected.length && !game.allAwake) notify('もっとちかづこう！ ベッドを タップしてね。');
    }
    if (event.type === 'received') { audio.gift(); notify('ありがとう！ とっても うれしいな！'); }
    if (event.type === 'momQuestion') { audio.tone(659,0,.3);audio.tone(784,.15,.35); }
    if (event.type === 'momAnswer') { if(event.success)audio.awake();else audio.tone(330,0,.4,.025);notify(event.text,2.8); }
    if (event.type === 'momSlept') notify('また ねちゃった！ すずを もう６かい ならそう！');
    if (event.type === 'clear') audio.clear();
    if (event.type === 'over') audio.tone(220, 0, .5, .025);
  }
}

function begin(number) {
  unlock(); game.startStage(number); lastTime = performance.now();
  preparePlay();
}
function preparePlay() {
  temporaryGuide=''; guideUntil=0; marker=null; lastState=null; syncUI();
  $('game-canvas').focus({ preventScroll:true });
}
function home() {
  ui['pause-dialog'].close(); ui['help-dialog'].close();timeDialog.close(); game.toTitle();
  guideUntil=0; marker=null; syncUI(); $('start-button').focus({ preventScroll:true });
}
function ring() { unlock(); game.ring(); processEvents(); syncUI(); }
function give() { unlock(); game.giveGift(); processEvents(); syncUI(); }

$('start-button').addEventListener('click', () => begin(1));
ui['bell-button'].addEventListener('click', ring);
ui['gift-button'].addEventListener('click', give);
ui['result-button'].addEventListener('click', () => {
  if (game.state === STATE.ALL_CLEAR) home();
  else if(game.state===STATE.GAME_OVER)begin(game.stage);
  else {unlock();if(game.nextStage()){lastTime=performance.now();preparePlay();}}
});
timeDialog.addEventListener('cancel',event=>event.preventDefault());
timeChoices.addEventListener('click',event=>{
  const button=event.target.closest('[data-minutes]');
  if(!button||button.disabled)return;
  unlock();
  if(game.answerTime(Number(button.dataset.minutes))){
    for(const choice of timeChoices.querySelectorAll('button'))choice.disabled=true;
    processEvents();syncUI();
    if(game.interactive)$('game-canvas').focus({preventScroll:true});
  }
});
ui['result-home'].addEventListener('click', home);
document.querySelector('.brand').addEventListener('click', event => { event.preventDefault(); home(); });
ui['scene'].addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0 || event.target.closest('button')) return;
  event.preventDefault(); unlock();
  const point = scenePoint(event.clientX,event.clientY,$('game-canvas').getBoundingClientRect());
  const target = movementTarget(point,game.children);
  if (target !== null && game.moveTo(target)) marker={ x:target,time:visualTime };
});
ui['bed-targets'].addEventListener('click', event => {
  const button=event.target.closest('[data-child]');
  if (!button) return;
  unlock(); const child=game.children.find(c=>c.id===button.dataset.child);
  if(child&&game.moveTo(child.x))marker={x:child.x,time:visualTime};
});
ui['sound-button'].addEventListener('click', () => {
  audio.toggle(); soundUI(); try { localStorage.setItem('santa-sound',audio.enabled?'on':'off'); } catch {}
});
$('help-button').addEventListener('click', () => { unlock(); ui['help-dialog'].showModal(); updatePaused(); });
$('help-close').addEventListener('click', () => ui['help-dialog'].close());
ui['pause-button'].addEventListener('click', () => { unlock(); ui['pause-dialog'].showModal(); updatePaused(); });
$('resume-button').addEventListener('click', () => { audio.unlock(); ui['pause-dialog'].close(); });
$('pause-home').addEventListener('click', home);
for (const dialog of [ui['help-dialog'],ui['pause-dialog']]) dialog.addEventListener('close', updatePaused);
document.addEventListener('visibilitychange', () => { updatePaused(); if(document.hidden)audio.suspend();else audio.unlock(); });
window.addEventListener('pagehide', () => { game.paused=true; audio.suspend(); });
window.addEventListener('pageshow', updatePaused);
document.addEventListener('keydown', event => {
  if (event.repeat || event.target.closest('button, dialog') || !game.interactive) return;
  if(event.code==='ArrowLeft'||event.code==='ArrowRight') { event.preventDefault();unlock();game.moveTo(game.santa.targetX+(event.code==='ArrowLeft'?-90:90)); }
  else if(event.code==='Space'||event.code==='KeyB'){event.preventDefault();ring();}
  else if(event.code==='KeyG'){event.preventDefault();give();}
  else if(event.code==='Escape'){ui['pause-dialog'].showModal();updatePaused();}
});
if ('ResizeObserver' in window) new ResizeObserver(() => renderer.resize()).observe($('game-canvas'));
else window.addEventListener('resize',()=>renderer.resize());

function frame(now) {
  const previous=lastTime;
  advance(now);
  if(!document.hidden)visualTime+=Math.max(0,(now-previous)/1000);
  processEvents();syncUI();
  if(game.santa.moving&&game.interactive)audio.step(game.elapsed);
  renderer.draw(game,visualTime,marker);
  requestAnimationFrame(frame);
}
syncUI();requestAnimationFrame(frame);
