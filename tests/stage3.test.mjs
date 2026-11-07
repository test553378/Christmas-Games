import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, isFullyAwake, isWakeTime, movementTarget } from '../src/gameLogic.mjs';
import { CONFIG, STATE, CHILD, MOM, TIME_CHOICES } from '../src/config.mjs';

function ready() { const g=new Game();g.startStage(3);g.tick(CONFIG.introDuration);return g; }
function at(g,id) { const person=g.children.find(p=>p.id===id);g.santa.x=person.x;g.santa.targetX=person.x;return person; }
function ring(g,id,count=3) { at(g,id);for(let i=0;i<count;i++){g.tick(CONFIG.bellCooldown);assert.equal(g.ring().ok,true);} }
function ask(g) { ring(g,'mom',CONFIG.momRingsToWake);assert.equal(g.askingTime,true); }
function give(g,id) { at(g,id);assert.equal(g.giveGift(),true);g.tick(CONFIG.giftDuration); }
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('stage 3 starts with 90 seconds and three separate beds in the specified order',()=>{
  const g=new Game();g.startStage(3);assert.equal(g.state,STATE.STAGE3_PLAYING);assert.equal(g.remaining,90);assert.equal(g.santa.x,100);
  assert.deepEqual(g.children.map(p=>p.id),['girl','boy','mom']);assert.ok(g.children[0].x<g.children[1].x&&g.children[1].x<g.mom.x);assert.equal(g.mom.state,MOM.SLEEPING);assert.ok(g.mom.bedScale>1);
  g.tick(CONFIG.introDuration);assert.equal(g.remaining,90);assert.equal(g.timerRunning,true);
});
test('stage 3 children wake after three rings, independently of mom',()=>{
  const g=ready();ring(g,'girl');assert.equal(g.children[0].state,CHILD.AWAKE);assert.equal(g.children[1].state,CHILD.SLEEPING);ring(g,'boy');
  assert.equal(g.children[1].state,CHILD.AWAKE);assert.equal(g.mom.rings,0);assert.equal(g.timerRunning,true);assert.equal(g.allAwake,false);
});
test('mom needs six rings and is never fully awake or gift-eligible after five',()=>{
  const g=ready();for(let i=1;i<=5;i++){ring(g,'mom',1);assert.equal(g.mom.rings,i);assert.equal(g.mom.state,MOM.STIRRING);assert.equal(g.askingTime,false);assert.equal(isFullyAwake(g.mom),false);assert.equal(g.giveGift(),false);}
  ring(g,'mom',1);assert.equal(g.mom.rings,6);assert.equal(g.mom.state,MOM.ASKING_TIME);assert.equal(g.allAwake,false);assert.equal(g.timerRunning,false);assert.equal(g.giveGift(),false);
});
test('mom uses the same 125px distance and 0.8s bell interval',()=>{
  const g=ready();g.santa.x=g.mom.x-125.01;g.santa.targetX=g.santa.x;g.ring();assert.equal(g.mom.rings,0);g.tick(.8);g.santa.x=g.mom.x-125;g.santa.targetX=g.santa.x;g.ring();assert.equal(g.mom.rings,1);g.tick(.799);assert.equal(g.ring().reason,'cooldown');g.tick(.001);g.ring();assert.equal(g.mom.rings,2);
});
test('time is compared as numeric minutes: 6:59 fails and 7:00 succeeds',()=>{
  assert.equal(isWakeTime(419),false);assert.equal(isWakeTime(420),true);assert.equal(isWakeTime(480),true);assert.equal(isWakeTime('7じ'),false);assert.equal(isWakeTime('420'),false);
  for(const [minutes,state] of [[419,MOM.GOING_BACK_TO_SLEEP],[420,MOM.AWAKE]]){const g=ready();ask(g);assert.equal(g.answerTime(minutes),true);assert.equal(g.mom.state,state);}
});
for(const choice of TIME_CHOICES)test(`${choice.label} uses ${choice.minutes} numeric minutes and the specified reaction`,()=>{
  const g=ready();ask(g);const remaining=g.remaining;g.tick(1000);assert.equal(g.remaining,remaining);assert.equal(g.answerTime(choice.minutes),true);assert.equal(g.momReaction.text,choice.reaction);
  if(choice.minutes<420){assert.equal(g.mom.state,MOM.GOING_BACK_TO_SLEEP);assert.equal(g.interactive,false);assert.equal(g.giveGift(),false);g.tick(CONFIG.momSleepDuration);assert.equal(g.mom.state,MOM.SLEEPING);assert.equal(g.mom.rings,0);assert.equal(g.remaining,remaining);assert.equal(g.timerRunning,true);}
  else{assert.equal(g.mom.state,MOM.AWAKE);assert.equal(g.interactive,true);assert.equal(isFullyAwake(g.mom),true);assert.equal(g.giftTarget().id,'mom');assert.equal(g.timerRunning,true);}
});
test('question blocks movement, ringing and gifting and freezes the timer indefinitely',()=>{
  const g=ready();ask(g);const snapshot=JSON.stringify(g);assert.equal(g.moveTo(100),false);assert.equal(g.ring().reason,'inactive');assert.equal(g.giveGift(),false);g.tick(10000);assert.equal(JSON.stringify(g),snapshot);
});
test('double answers are rejected after either a correct or incorrect choice',()=>{
  for(const minutes of [240,420]){const g=ready();ask(g);assert.equal(g.answerTime(minutes),true);const snapshot=JSON.stringify(g);assert.equal(g.answerTime(480),false);assert.equal(g.answerTime(240),false);assert.equal(JSON.stringify(g),snapshot);}
});
test('invalid time values and answers outside a question never alter state',()=>{
  const g=ready();assert.equal(g.answerTime(420),false);ask(g);
  for(const value of [-1,1440,NaN,Infinity,420.5,'420',null]){const snapshot=JSON.stringify(g);assert.equal(g.answerTime(value),false);assert.equal(JSON.stringify(g),snapshot);}
});
test('an incorrect answer preserves both children including received gifts',()=>{
  const g=ready();ring(g,'girl');give(g,'girl');ring(g,'boy');const before=JSON.stringify(g.children.slice(0,2));ask(g);g.answerTime(390);g.tick(CONFIG.momSleepDuration);
  assert.equal(JSON.stringify(g.children.slice(0,2)),before);assert.equal(g.children[0].giftReceived,true);assert.equal(g.children[1].state,CHILD.AWAKE);assert.equal(g.mom.rings,0);
  ring(g,'mom',5);assert.equal(g.askingTime,false);ring(g,'mom',1);assert.equal(g.askingTime,true);
});
test('returning to sleep freezes play and resumes the clock only after the animation',()=>{
  const g=ready();ask(g);g.answerTime(360);const left=g.remaining,x=g.santa.x;g.tick(.9);assert.equal(g.remaining,left);assert.equal(g.santa.x,x);assert.equal(g.moveTo(100),false);assert.equal(g.ring().ok,false);assert.equal(g.mom.state,MOM.GOING_BACK_TO_SLEEP);
  g.tick(.9);assert.equal(g.mom.state,MOM.SLEEPING);assert.equal(g.remaining,left);g.tick(.5);near(g.remaining,left-.5);
});
test('a frame spanning the end of returning animation counts only the playable portion',()=>{
  const g=ready();ask(g);g.answerTime(300);const left=g.remaining;g.tick(CONFIG.momSleepDuration+.25);near(g.remaining,left-.25);assert.equal(g.interactive,true);
});
test('tab/help pause freezes the sleep animation, and answers cannot be entered while paused',()=>{
  const g=ready();ask(g);g.paused=true;assert.equal(g.answerTime(420),false);g.tick(50);assert.equal(g.askingTime,true);g.paused=false;g.answerTime(240);g.paused=true;g.tick(50);assert.equal(g.momSleepRemaining,CONFIG.momSleepDuration);g.paused=false;g.tick(CONFIG.momSleepDuration);assert.equal(g.mom.state,MOM.SLEEPING);
});
test('correctly awakened mom never sleeps or asks again and can receive one gift',()=>{
  const g=ready();ask(g);g.answerTime(420);for(let i=0;i<8;i++){g.tick(.8);g.ring();}assert.equal(g.mom.state,MOM.AWAKE);assert.equal(g.mom.rings,6);assert.equal(g.answerTime(240),false);give(g,'mom');assert.equal(g.mom.state,MOM.GIFT_RECEIVED);assert.equal(isFullyAwake(g.mom),true);assert.equal(g.giveGift(),false);assert.equal(g.state,STATE.STAGE3_PLAYING);
});
test('an in-flight child gift freezes during the question and the sleep animation',()=>{
  const g=ready();ring(g,'boy');ring(g,'mom',5);g.tick(.8);g.santa.x=625;g.santa.targetX=625;assert.equal(g.giveGift(),true);g.moveTo(675);g.tick(.25);g.ring();assert.equal(g.askingTime,true);const progress=g.giftFlight.progress;g.tick(30);assert.equal(g.giftFlight.progress,progress);g.answerTime(390);g.tick(CONFIG.momSleepDuration);assert.equal(g.giftFlight.progress,progress);g.tick(1);assert.equal(g.children[1].giftReceived,true);
});
test('all three must be fully awake before time stops permanently; all three gifts are required',()=>{
  const g=ready();ring(g,'girl');give(g,'girl');ring(g,'boy');give(g,'boy');ask(g);assert.equal(g.allAwake,false);assert.equal(g.state,STATE.STAGE3_PLAYING);
  g.answerTime(420);assert.equal(g.allAwake,true);assert.equal(g.timerRunning,false);const left=g.remaining;g.tick(1000);assert.equal(g.remaining,left);assert.equal(g.state,STATE.STAGE3_PLAYING);give(g,'mom');assert.equal(g.state,STATE.ALL_CLEAR);assert.equal(g.children.every(c=>c.giftReceived),true);
});
test('mom can wake first; waking the last child stops the clock immediately',()=>{
  const g=ready();ask(g);g.answerTime(480);give(g,'mom');assert.equal(g.timerRunning,true);ring(g,'boy');give(g,'boy');ring(g,'girl');assert.equal(g.allAwake,true);assert.equal(g.timerRunning,false);const left=g.remaining;g.tick(1000);assert.equal(g.remaining,left);give(g,'girl');assert.equal(g.state,STATE.ALL_CLEAR);
});
test('90 seconds with anyone asleep fails even after two children received gifts',()=>{
  const g=ready();ring(g,'girl');give(g,'girl');ring(g,'boy');give(g,'boy');g.tick(g.remaining);assert.equal(g.state,STATE.GAME_OVER);assert.equal(g.remaining,0);assert.equal(g.answerTime(420),false);
});
test('wrong answers add no clock time and can be retried near the deadline',()=>{
  const g=ready();ask(g);g.answerTime(240);const left=g.remaining;g.tick(100);assert.equal(g.state,STATE.GAME_OVER);near(g.remaining,0);assert.ok(left<90);
  const h=ready();ask(h);h.answerTime(240);h.tick(CONFIG.momSleepDuration);h.tick(h.remaining-.1);h.tick(.1);assert.equal(h.state,STATE.GAME_OVER);
});
test('retry fully resets stage 3 from asking, returning, awake, received and game over',()=>{
  for(const phase of ['asking','returning','awake','received','over']){
    const g=ready();ring(g,'girl');give(g,'girl');ask(g);
    if(phase==='returning')g.answerTime(240);
    if(phase==='awake'||phase==='received'){g.answerTime(420);if(phase==='received')give(g,'mom');}
    if(phase==='over'){g.answerTime(240);g.tick(1000);}
    g.retry();assert.equal(g.stage,3);assert.equal(g.state,STATE.STAGE3_PLAYING);assert.equal(g.remaining,90);assert.equal(g.santa.x,100);assert.equal(g.introRemaining,CONFIG.introDuration);assert.equal(g.mom.state,MOM.SLEEPING);assert.equal(g.mom.rings,0);assert.equal(g.momReaction,null);assert.equal(g.momSleepRemaining,0);assert.equal(g.giftFlight,null);assert.equal(g.children.every(c=>c.rings===0&&!c.giftReceived),true);
  }
});
test('the larger mom bed has a matching tap area',()=>{const g=ready();assert.equal(movementTarget({x:g.mom.x+100,y:300},g.children),g.mom.x);assert.equal(movementTarget({x:g.children[0].x+100,y:300},g.children),null);});
test('title → stage 1 → stage 2 → stage 3 → all clear works through the real rules',()=>{
  const g=new Game();assert.equal(g.nextStage(),false);g.startStage(1);g.tick(CONFIG.introDuration);ring(g,'girl');give(g,'girl');assert.equal(g.state,STATE.STAGE1_CLEAR);assert.equal(g.nextStage(),true);assert.equal(g.stage,2);g.tick(CONFIG.introDuration);
  ring(g,'girl');give(g,'girl');ring(g,'boy');give(g,'boy');assert.equal(g.state,STATE.STAGE2_CLEAR);assert.equal(g.nextStage(),true);assert.equal(g.stage,3);g.tick(CONFIG.introDuration);
  ring(g,'girl');give(g,'girl');ring(g,'boy');give(g,'boy');ask(g);g.answerTime(420);give(g,'mom');assert.equal(g.state,STATE.ALL_CLEAR);assert.equal(g.nextStage(),false);g.toTitle();assert.equal(g.state,STATE.TITLE);assert.equal(g.stage,1);
});
