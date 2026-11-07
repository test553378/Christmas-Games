export const CONFIG = Object.freeze({
  width: 960, height: 540, speed: 240, minX: 60, maxX: 900,
  floorY: 405, floorTop: 326, startX: 100, bellRange: 125,
  giftRange: 125, bellCooldown: 0.8, ringsToWake: 3,
  introDuration: 1.2, giftDuration: 0.85, maxPixelRatio: 2,
  momRingsToWake: 6, momSleepDuration: 1.8, momWakeMinutes: 420,
});

export const STAGES = [
  { number: 1, seconds: 30, children: [
    { id: 'girl', name: 'はなちゃん', gender: 'girl', x: 740 },
  ] },
  { number: 2, seconds: 45, children: [
    { id: 'girl', name: 'はなちゃん', gender: 'girl', x: 300 },
    { id: 'boy', name: 'ゆうくん', gender: 'boy', x: 750 },
  ] },
  { number: 3, seconds: 90, children: [
    { id: 'girl', name: 'はなちゃん', gender: 'girl', x: 240 },
    { id: 'boy', name: 'ゆうくん', gender: 'boy', x: 500 },
    { id: 'mom', name: 'おかあさん', gender: 'woman', role: 'mom', x: 800, bedScale: 1.14 },
  ] },
];

export const STATE = Object.freeze({
  TITLE: 'TITLE', STAGE1_PLAYING: 'STAGE1_PLAYING',
  STAGE1_CLEAR: 'STAGE1_CLEAR', STAGE2_PLAYING: 'STAGE2_PLAYING',
  STAGE2_CLEAR: 'STAGE2_CLEAR', STAGE3_PLAYING: 'STAGE3_PLAYING',
  ALL_CLEAR: 'ALL_CLEAR', GAME_OVER: 'GAME_OVER',
});
export const CHILD = Object.freeze({
  SLEEPING: 'SLEEPING', WAKING: 'WAKING', AWAKE: 'AWAKE', GIFT_RECEIVED: 'GIFT_RECEIVED',
});

export const MOM = Object.freeze({
  SLEEPING: 'MOM_SLEEPING', STIRRING: 'MOM_STIRRING',
  ASKING_TIME: 'MOM_ASKING_TIME', GOING_BACK_TO_SLEEP: 'MOM_GOING_BACK_TO_SLEEP',
  AWAKE: 'MOM_AWAKE', GIFT_RECEIVED: 'MOM_GIFT_RECEIVED',
});

export const TIME_CHOICES = Object.freeze([
  { minutes: 240, label: '4じ', reaction: 'まだはやいよ〜' },
  { minutes: 300, label: '5じ', reaction: 'まだねむいよ〜' },
  { minutes: 360, label: '6じ', reaction: 'もうすこしねるね' },
  { minutes: 390, label: '6じ30ぷん', reaction: 'あとちょっとねたいな' },
  { minutes: 420, label: '7じ', reaction: 'もう7じ！？ おきなきゃ！' },
  { minutes: 480, label: '8じ', reaction: 'たいへん！ もう8じ！' },
]);
