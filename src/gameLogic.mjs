import { CONFIG, STAGES, STATE, CHILD, MOM, TIME_CHOICES } from './config.mjs';

export function isValidTime(minutes) { return Number.isInteger(minutes) && minutes >= 0 && minutes < 24 * 60; }
export function isWakeTime(minutes, threshold = CONFIG.momWakeMinutes) {
  return isValidTime(minutes) && minutes >= threshold;
}
export function isFullyAwake(person, ringsToWake = CONFIG.ringsToWake) {
  return person.role === 'mom' ? person.state === MOM.AWAKE || person.state === MOM.GIFT_RECEIVED : person.rings >= ringsToWake;
}

export class Game {
  constructor(config = CONFIG, stages = STAGES) {
    this.config = config;
    this.stages = stages;
    this.startStage(1);
    this.state = STATE.TITLE;
  }

  get playing() { return [STATE.STAGE1_PLAYING, STATE.STAGE2_PLAYING, STATE.STAGE3_PLAYING].includes(this.state); }
  get mom() { return this.children.find(person => person.role === 'mom') ?? null; }
  get askingTime() { return this.mom?.state === MOM.ASKING_TIME; }
  get momReturning() { return this.mom?.state === MOM.GOING_BACK_TO_SLEEP; }
  get momBusy() { return this.askingTime || this.momReturning; }
  get interactive() { return this.playing && this.introRemaining <= 0 && !this.paused && !this.momBusy; }
  get allAwake() { return this.children.every(child => isFullyAwake(child, this.config.ringsToWake)); }
  get timerRunning() { return this.playing && this.introRemaining <= 0 && !this.paused && !this.momBusy && !this.allAwake; }
  ringsNeeded(person) { return person.role === 'mom' ? this.config.momRingsToWake : this.config.ringsToWake; }

  startStage(number) {
    const stage = this.stages.find(s => s.number === number);
    if (!stage) throw new RangeError('Unknown stage');
    this.stage = number;
    this.state = STATE[`STAGE${number}_PLAYING`];
    this.children = stage.children.map(child => ({ ...child, state: child.role === 'mom' ? MOM.SLEEPING : CHILD.SLEEPING, rings: 0, giftReceived: false, lastRingAt: -Infinity }));
    this.santa = { x: this.config.startX, targetX: this.config.startX, direction: 1, moving: false };
    this.remaining = stage.seconds;
    this.duration = stage.seconds;
    this.elapsed = 0;
    this.introRemaining = this.config.introDuration;
    this.lastBellAt = -Infinity;
    this.paused = false;
    this.giftFlight = null;
    this.momSleepRemaining = 0;
    this.momReaction = null;
    this.events = [];
  }

  retry() { this.startStage(this.stage); }
  toTitle() { this.startStage(1); this.state = STATE.TITLE; }
  nextStage() {
    if (![STATE.STAGE1_CLEAR, STATE.STAGE2_CLEAR].includes(this.state)) return false;
    this.startStage(this.stage + 1);
    return true;
  }

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
      if (isFullyAwake(child, this.config.ringsToWake) || Math.abs(this.santa.x - child.x) > this.config.bellRange) continue;
      child.rings++;
      child.lastRingAt = this.elapsed;
      const reached = child.rings === this.ringsNeeded(child);
      child.state = child.role === 'mom' ? (reached ? MOM.ASKING_TIME : MOM.STIRRING) : (reached ? CHILD.AWAKE : CHILD.WAKING);
      affected.push(child.id);
      if (child.state === CHILD.AWAKE) woken.push(child.id);
      if (child.state === MOM.ASKING_TIME) {
        this.santa.moving = false;
        this.momReaction = null;
        this.events.push({ type: 'momQuestion' });
      }
    }
    this.events.push({ type: 'bell', affected, woken });
    return { ok: true, affected, woken };
  }

  answerTime(minutes) {
    if (!this.playing || !this.askingTime || this.paused || !isValidTime(minutes)) return false;
    const success = isWakeTime(minutes, this.config.momWakeMinutes);
    const choice = TIME_CHOICES.find(choice => choice.minutes === minutes);
    this.momReaction = { minutes, success, text: choice?.reaction ?? (success ? 'おきなきゃ！' : 'もうすこしねるね'), at: this.elapsed };
    this.mom.state = success ? MOM.AWAKE : MOM.GOING_BACK_TO_SLEEP;
    if (!success) this.momSleepRemaining = this.config.momSleepDuration;
    this.events.push({ type: 'momAnswer', ...this.momReaction });
    return true;
  }

  giftTarget() {
    if (!this.interactive || this.giftFlight) return null;
    return this.children.filter(c => isFullyAwake(c, this.config.ringsToWake) && !c.giftReceived && Math.abs(c.x - this.santa.x) <= this.config.giftRange)
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
      if (this.introRemaining <= 1e-9) this.introRemaining = 0;
      if (dt <= 0) return;
    }
    // The question freezes play entirely. Returning to sleep advances only its
    // animation, then counts the remaining portion of a frame as normal play.
    if (this.askingTime) return;
    if (this.momReturning) {
      const step = Math.min(dt, this.momSleepRemaining);
      this.elapsed += step;
      this.momSleepRemaining = Math.max(0, this.momSleepRemaining - step);
      dt -= step;
      if (this.momSleepRemaining > 1e-9) return;
      this.momSleepRemaining = 0;
      Object.assign(this.mom, { state: MOM.SLEEPING, rings: 0, lastRingAt: -Infinity });
      this.events.push({ type: 'momSlept' });
      if (dt <= 0) return;
    }
    this.elapsed += dt;
    if (this.timerRunning) {
      this.remaining = Math.max(0, this.remaining - dt);
      if (this.remaining <= 1e-9 && !this.allAwake) {
        this.remaining = 0;
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
        child.state = child.role === 'mom' ? MOM.GIFT_RECEIVED : CHILD.GIFT_RECEIVED;
        this.giftFlight = null;
        this.events.push({ type: 'received', childId: child.id });
        if (this.allAwake && this.children.every(c => c.giftReceived)) {
          this.state = this.stages.some(stage => stage.number > this.stage) ? STATE[`STAGE${this.stage}_CLEAR`] : STATE.ALL_CLEAR;
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
  const bed = children.find(child => Math.abs(point.x - child.x) <= 92 * (child.bedScale ?? 1) && point.y >= 175 && point.y <= 370);
  if (bed) return bed.x;
  return point.y >= config.floorTop && point.y <= config.height && point.x >= config.minX && point.x <= config.maxX ? point.x : null;
}
