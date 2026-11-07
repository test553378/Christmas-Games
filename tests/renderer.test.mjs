import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/gameLogic.mjs';
import { STATE } from '../src/config.mjs';

// Drawing smoke check only. This validates the renderer's calls and finite coordinates,
// not actual pixels, browser compatibility, text layout, or Safari touch behavior.
test('renderer draws all scenes and animation states with finite coordinates',async()=>{
  const gradient={addColorStop(){}};
  let calls=0;
  const context=new Proxy({}, {get(target,key){
    if(key in target)return target[key];
    if(key==='createLinearGradient'||key==='createRadialGradient')return(...args)=>{args.forEach(n=>assert.ok(Number.isFinite(n)));return gradient;};
    return(...args)=>{calls++;for(const value of args)if(typeof value==='number')assert.ok(Number.isFinite(value),`${String(key)} received ${value}`);};
  },set(target,key,value){target[key]=value;return true;}});
  const canvas=()=>({width:960,height:540,getContext:()=>context,getBoundingClientRect:()=>({width:960,height:540})});
  globalThis.document={createElement:canvas};globalThis.window={devicePixelRatio:3};globalThis.matchMedia=()=>({matches:false});
  try{
    const {Renderer}=await import('../src/renderer.mjs');const renderer=new Renderer(canvas());const g=new Game();
    renderer.draw(g,1);assert.equal(renderer.canvas.width,1920);
    for(const stage of [1,2]){g.startStage(stage);g.tick(1.2);renderer.draw(g,2);g.moveTo(g.children[0].x);g.tick(1);renderer.draw(g,3,{x:300,time:2.9});
      for(let rings=0;rings<4;rings++){for(const child of g.children)child.rings=rings;g.lastBellAt=g.elapsed-.2;renderer.draw(g,4+rings);}
      for(const child of g.children)child.giftReceived=true;g.giftFlight={fromX:100,toX:740,progress:.5};renderer.draw(g,8);
      for(const state of [STATE.STAGE1_CLEAR,STATE.ALL_CLEAR,STATE.GAME_OVER]){g.state=state;renderer.draw(g,9);}
    }assert.ok(calls>5000);
  }finally{delete globalThis.document;delete globalThis.window;delete globalThis.matchMedia;}
});
