import { CONFIG, STAGES, STATE, CHILD } from './config.mjs';

export class Game {
  constructor(config = CONFIG, stages = STAGES) {
    this.config = config;
    this.stages = stages;
    this.startStage(1);
    this.state = STATE.TITLE;
  }

  get playing() { return this.state === STATE.STAGE1_PLAYING || this.state === STATE.STAGE2_PLAYING; }
  get interactive() { return this.playing && this.introRemaining <= 0 && !this.paused; }
  get allAwake() { return this.children.every(child => child.rings >= this.config.ringsToWake); }

  startStage(number) {
    const stage = this.stages.find(s => s.number === number);
    if (!stage) throw new RangeError('Unknown stage');
    this.stage = number;
    this.state = number === 1 ? STATE.STAGE1_PLAYING : STATE.STAGE2_PLAYING;
    this.children = stage.children.map(child => ({ ...child, state: CHILD.SLEEPING, rings: 0, giftReceived: false, lastRingAt: -Infinity }));
    this.santa = { x: this.config.startX, targetX: this.config.startX, direction: 1, moving: false };
    this.remaining = stage.seconds;
    this.duration = stage.seconds;
    this.elapsed = 0;
    this.introRemaining = this.config.introDuration;
    this.lastBellAt = -Infinity;
    this.timerRunning = false;
    this.paused = false;
    this.giftFlight = null;
    this.events = [];
  }

  retry() { this.startStage(this.stage); }
  toTitle() { this.startStage(1); this.state = STATE.TITLE; }

  moveTo(x) {
    if (!this.interactive || !Number.isFinite(x)) return false;
    this.santa.targetX = Math.max(this.config.minX, Math.min(this.config.maxX, x));
    return true;
  }

  ring() {
    if (!this.interactive) return { ok: false, reason: 'inactive' };
    if (this.elapsed - this.lastBellAt < this.config.bellCooldown - 1e-9) return { ok: false, reason: 'cooldown' };
    this.lastBellAt = this.elapsed;
    const affected = [], woken = [];
    for (const child of this.children) {
      if (child.rings >= this.config.ringsToWake || Math.abs(this.santa.x - child.x) > this.config.bellRange) continue;
      child.rings++;
      child.lastRingAt = this.elapsed;
      child.state = child.rings === this.config.ringsToWake ? CHILD.AWAKE : CHILD.WAKING;
      affected.push(child.id);
      if (child.state === CHILD.AWAKE) woken.push(child.id);
    }
    if (this.allAwake) this.timerRunning = false;
    this.events.push({ type: 'bell', affected, woken });
    return { ok: true, affected, woken };
  }

  giftTarget() {
    if (!this.interactive || this.giftFlight) return null;
    return this.children.filter(c => c.rings >= this.config.ringsToWake && !c.giftReceived && Math.abs(c.x - this.santa.x) <= this.config.giftRange)
      .sort((a, b) => Math.abs(a.x - this.santa.x) - Math.abs(b.x - this.santa.x) || (a.gender === 'girl' ? -1 : b.gender === 'girl' ? 1 : 0))[0] ?? null;
  }

  giveGift() {
    const target = this.giftTarget();
    if (!target) return false;
    this.giftFlight = { childId: target.id, fromX: this.santa.x, fromDirection: this.santa.direction, toX: target.x, progress: 0, startedAt: this.elapsed };
    this.events.push({ type: 'gift', childId: target.id });
    return true;
  }

  tick(dt) {
    if (!this.playing || this.paused || !Number.isFinite(dt) || dt <= 0) return;
    if (this.introRemaining > 0) {
      const introStep = Math.min(dt, this.introRemaining);
      this.introRemaining = Math.max(0, this.introRemaining - introStep);
      dt -= introStep;
      if (this.introRemaining <= 1e-9) { this.introRemaining = 0; this.timerRunning = !this.allAwake; }
      if (dt <= 0) return;
    }
    this.elapsed += dt;
    if (this.timerRunning) {
      this.remaining = Math.max(0, this.remaining - dt);
      if (this.remaining <= 1e-9 && !this.allAwake) {
        this.remaining = 0;
        this.timerRunning = false;
        this.state = STATE.GAME_OVER;
        this.santa.moving = false;
        this.giftFlight = null;
        this.events.push({ type: 'over' });
        return;
      }
    }
    const delta = this.santa.targetX - this.santa.x;
    const step = Math.min(Math.abs(delta), this.config.speed * dt);
    this.santa.moving = step > 0;
    if (step > 0) { this.santa.direction = Math.sign(delta); this.santa.x += this.santa.direction * step; }
    if (this.giftFlight) {
      this.giftFlight.progress = Math.min(1, this.giftFlight.progress + dt / this.config.giftDuration);
      if (this.giftFlight.progress >= 1) {
        const child = this.children.find(c => c.id === this.giftFlight.childId);
        child.giftReceived = true;
        child.state = CHILD.GIFT_RECEIVED;
        this.giftFlight = null;
        this.events.push({ type: 'received', childId: child.id });
        if (this.children.every(c => c.giftReceived)) {
          this.state = this.stage === 1 ? STATE.STAGE1_CLEAR : STATE.ALL_CLEAR;
          this.santa.moving = false;
          this.events.push({ type: 'clear' });
        }
      }
    }
  }

  drainEvents() { const events = this.events; this.events = []; return events; }
}

export function scenePoint(clientX, clientY, rect, config = CONFIG) {
  return { x: (clientX - rect.left) * config.width / rect.width, y: (clientY - rect.top) * config.height / rect.height };
}

export function movementTarget(point, children, config = CONFIG) {
  const bed = children.find(child => Math.abs(point.x - child.x) <= 92 && point.y >= 175 && point.y <= 370);
  if (bed) return bed.x;
  return point.y >= config.floorTop && point.y <= config.height && point.x >= config.minX && point.x <= config.maxX ? point.x : null;
}
