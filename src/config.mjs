export const CONFIG = Object.freeze({
  width: 960, height: 540, speed: 240, minX: 60, maxX: 900,
  floorY: 405, floorTop: 326, startX: 100, bellRange: 125,
  giftRange: 125, bellCooldown: 0.8, ringsToWake: 3,
  introDuration: 1.2, giftDuration: 0.85, maxPixelRatio: 2,
});

export const STAGES = [
  { number: 1, seconds: 30, children: [
    { id: 'girl', name: 'はなちゃん', gender: 'girl', x: 740 },
  ] },
  { number: 2, seconds: 45, children: [
    { id: 'girl', name: 'はなちゃん', gender: 'girl', x: 300 },
    { id: 'boy', name: 'ゆうくん', gender: 'boy', x: 750 },
  ] },
];

export const STATE = Object.freeze({
  TITLE: 'TITLE', STAGE1_PLAYING: 'STAGE1_PLAYING',
  STAGE1_CLEAR: 'STAGE1_CLEAR', STAGE2_PLAYING: 'STAGE2_PLAYING',
  ALL_CLEAR: 'ALL_CLEAR', GAME_OVER: 'GAME_OVER',
});
export const CHILD = Object.freeze({
  SLEEPING: 'SLEEPING', WAKING: 'WAKING', AWAKE: 'AWAKE', GIFT_RECEIVED: 'GIFT_RECEIVED',
});
