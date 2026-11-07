import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, scenePoint, movementTarget } from '../src/gameLogic.mjs';
import { CONFIG, STATE, CHILD } from '../src/config.mjs';

function ready(stage=1,config=CONFIG,stages) { const game=new Game(config,stages);game.startStage(stage);game.tick(config.introDuration);return game; }
function at(game,x) { game.santa.x=x;game.santa.targetX=x; }
function wake(game,id) { const child=game.children.find(c=>c.id===id);at(game,child.x);for(let i=0;i<3;i++){if(i)game.tick(CONFIG.bellCooldown);assert.equal(game.ring().ok,true);}return child; }
function deliver(game,id) { at(game,game.children.find(c=>c.id===id).x);assert.equal(game.giveGift(),true);game.tick(CONFIG.giftDuration); }

test('starts on title and starts each stage with the defined coordinates',()=>{
  const g=new Game();assert.equal(g.state,STATE.TITLE);assert.equal(g.santa.x,100);
  g.startStage(2);assert.deepEqual(g.children.map(c=>c.x),[300,750]);assert.equal(g.remaining,45);
});
test('introduction blocks input and never consumes countdown time',()=>{
  const g=new Game();g.startStage(1);g.tick(.6);assert.equal(g.remaining,30);assert.equal(g.moveTo(740),false);assert.equal(g.ring().ok,false);
  g.tick(.6);assert.equal(g.interactive,true);assert.equal(g.remaining,30);g.tick(.25);assert.equal(g.remaining,29.75);
});
test('a frame spanning the intro counts only its playable portion',()=>{const g=new Game();g.startStage(1);g.tick(2);assert.equal(g.remaining,29.2);});
test('walks at 240 logical pixels per second, redirects and faces left',()=>{
  const g=ready();g.moveTo(740);g.tick(.5);assert.equal(g.santa.x,220);assert.equal(g.santa.direction,1);
  g.moveTo(60);g.tick(.5);assert.equal(g.santa.x,100);assert.equal(g.santa.direction,-1);g.tick(1);assert.equal(g.santa.x,60);
});
test('movement clamps to the floor range and rejects non-finite targets',()=>{
  const g=ready();g.moveTo(5000);g.tick(5);assert.equal(g.santa.x,900);g.moveTo(-5);g.tick(5);assert.equal(g.santa.x,60);assert.equal(g.moveTo(NaN),false);
});
for(const sign of [-1,1])test(`bell includes the exact 125px boundary (${sign})`,()=>{const g=ready();at(g,740+sign*125);g.ring();assert.equal(g.children[0].rings,1);});
test('bell outside the boundary does not increase the gauge',()=>{const g=ready();at(g,614.999);const r=g.ring();assert.deepEqual(r.affected,[]);assert.equal(g.children[0].rings,0);});
test('bell cooldown rejects repeated input below 0.8s, accepts at 0.8s',()=>{
  const g=ready();at(g,740);g.ring();assert.equal(g.ring().reason,'cooldown');g.tick(.799);assert.equal(g.ring().reason,'cooldown');g.tick(.001);assert.equal(g.ring().ok,true);assert.equal(g.children[0].rings,2);
});
test('an out-of-range ring also consumes the bell cooldown',()=>{const g=ready();g.ring();at(g,740);g.tick(.79);assert.equal(g.ring().ok,false);assert.equal(g.children[0].rings,0);});
test('exactly three rings change sleeping → waking → awake',()=>{
  const g=ready();at(g,740);assert.equal(g.children[0].state,CHILD.SLEEPING);g.ring();assert.equal(g.children[0].state,CHILD.WAKING);
  g.tick(.8);g.ring();assert.equal(g.children[0].rings,2);g.tick(.8);g.ring();assert.equal(g.children[0].state,CHILD.AWAKE);
  g.tick(.8);g.ring();assert.equal(g.children[0].rings,3);assert.equal(g.children[0].giftReceived,false);
});
test('every sleeping child in range receives a ring independently',()=>{
  const stages=[{number:1,seconds:30,children:[{id:'girl',name:'a',gender:'girl',x:300},{id:'boy',name:'b',gender:'boy',x:500}]}];
  const g=ready(1,CONFIG,stages);at(g,400);assert.deepEqual(g.ring().affected,['girl','boy']);assert.deepEqual(g.children.map(c=>c.rings),[1,1]);
});
test('cannot give a gift to a sleeping or partially waking child',()=>{const g=ready();at(g,740);assert.equal(g.giveGift(),false);g.ring();assert.equal(g.giveGift(),false);});
test('gift range includes 125px and excludes greater distances',()=>{const g=ready();wake(g,'girl');at(g,614.999);assert.equal(g.giftTarget(),null);at(g,615);assert.equal(g.giftTarget().id,'girl');});
test('all awake stops the timer immediately; gifting can wait indefinitely',()=>{
  const g=ready();wake(g,'girl');const left=g.remaining;assert.equal(g.timerRunning,false);g.tick(100);assert.equal(g.remaining,left);assert.equal(g.state,STATE.STAGE1_PLAYING);assert.equal(g.giveGift(),true);
});
test('stage 1 clears only after the present arrives and prevents duplicates',()=>{
  const g=ready();wake(g,'girl');assert.equal(g.state,STATE.STAGE1_PLAYING);g.giveGift();assert.equal(g.giveGift(),false);g.tick(.3);assert.equal(g.children[0].giftReceived,false);g.tick(.55);assert.equal(g.state,STATE.STAGE1_CLEAR);assert.equal(g.children[0].giftReceived,true);assert.equal(g.children[0].state,CHILD.GIFT_RECEIVED);assert.equal(g.giveGift(),false);
});
test('stage 1 fails at 30 seconds if the child is asleep',()=>{const g=ready();g.tick(29.999);assert.equal(g.state,STATE.STAGE1_PLAYING);g.tick(.001);assert.equal(g.state,STATE.GAME_OVER);assert.equal(g.remaining,0);});
test('stage 2 independently preserves waking and gift state; one child is insufficient',()=>{
  const g=ready(2);wake(g,'girl');assert.equal(g.timerRunning,true);assert.equal(g.children[1].rings,0);deliver(g,'girl');assert.equal(g.state,STATE.STAGE2_PLAYING);assert.equal(g.timerRunning,true);g.tick(45);assert.equal(g.state,STATE.GAME_OVER);
});
test('stage 2 supports either wake order and clears after both presents',()=>{
  for(const order of [['girl','boy'],['boy','girl']]){const g=ready(2);wake(g,order[0]);deliver(g,order[0]);g.tick(.8);wake(g,order[1]);const left=g.remaining;g.tick(90);assert.equal(g.remaining,left);assert.equal(g.timerRunning,false);deliver(g,order[1]);assert.equal(g.state,STATE.STAGE2_CLEAR);assert.equal(g.children.every(c=>c.giftReceived),true);}
});
test('stage 2 with one awake child fails at 45 seconds',()=>{const g=ready(2);wake(g,'girl');g.tick(g.remaining);assert.equal(g.state,STATE.GAME_OVER);});
test('a present cannot complete a stage when another child is asleep at timeout',()=>{const g=ready(2);wake(g,'girl');g.tick(g.remaining-.2);g.giveGift();g.tick(.9);assert.equal(g.state,STATE.GAME_OVER);assert.equal(g.giftFlight,null);});
test('nearest eligible child is selected; equal distances prefer the girl',()=>{
  const stages=[{number:1,seconds:30,children:[{id:'boy',name:'b',gender:'boy',x:500},{id:'girl',name:'a',gender:'girl',x:300}]}];
  const g=ready(1,CONFIG,stages);at(g,400);for(let i=0;i<3;i++){if(i)g.tick(.8);g.ring();}assert.equal(g.giftTarget().id,'girl');at(g,410);assert.equal(g.giftTarget().id,'boy');g.children[0].giftReceived=true;assert.equal(g.giftTarget().id,'girl');
});
test('paused time freezes countdown, movement, cooldown and delivery',()=>{
  const g=ready(2);wake(g,'girl');g.giveGift();g.moveTo(750);g.paused=true;const snapshot=JSON.stringify({remaining:g.remaining,x:g.santa.x,flight:g.giftFlight,elapsed:g.elapsed});g.tick(100);assert.equal(JSON.stringify({remaining:g.remaining,x:g.santa.x,flight:g.giftFlight,elapsed:g.elapsed}),snapshot);assert.equal(g.ring().ok,false);g.paused=false;g.tick(.1);assert.equal(g.remaining<45,true);
});
test('retry resets the current stage, both children, timer, position and effects',()=>{
  const g=ready(2);wake(g,'girl');deliver(g,'girl');g.tick(45);g.retry();assert.equal(g.stage,2);assert.equal(g.state,STATE.STAGE2_PLAYING);assert.equal(g.remaining,45);assert.equal(g.santa.x,100);assert.equal(g.lastBellAt,-Infinity);assert.equal(g.giftFlight,null);assert.equal(g.introRemaining,CONFIG.introDuration);assert.equal(g.children.every(c=>c.rings===0&&!c.giftReceived&&c.state===CHILD.SLEEPING),true);
});
test('returning to title prepares a fresh stage 1',()=>{const g=ready(2);g.toTitle();assert.equal(g.state,STATE.TITLE);assert.equal(g.stage,1);assert.equal(g.children.length,1);assert.equal(g.remaining,30);});
test('floor and bed input ignore furniture and transform scaled/offset coordinates',()=>{
  const point=scenePoint(390,220,{left:20,top:40,width:480,height:270});assert.deepEqual(point,{x:740,y:360});
  assert.equal(movementTarget(point,[{x:740}]),740);assert.equal(movementTarget({x:380,y:400},[]),380);assert.equal(movementTarget({x:100,y:250},[]),null);assert.equal(movementTarget({x:30,y:400},[]),null);
});
test('invalid time steps and input on terminal screens cannot alter state',()=>{
  const g=ready();g.tick(-1);g.tick(NaN);assert.equal(g.remaining,30);g.tick(30);const state=JSON.stringify(g);g.tick(100);g.ring();g.giveGift();g.moveTo(500);assert.equal(JSON.stringify(g),state);
});
