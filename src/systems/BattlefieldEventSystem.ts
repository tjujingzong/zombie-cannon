import {
  BATTLEFIELD_EVENTS,
  type BattlefieldEventDef,
  type BattlefieldEventKey,
} from '../data/events';

export interface ActiveBattlefieldEvent {
  def: BattlefieldEventDef;
  wave: number;
  remaining: number;
}

/**
 * 每局安排两个不同事件，并维护单个活动事件的生命周期。
 * 场景负责解释事件效果，导演器不直接访问 Phaser 对象。
 */
export class BattlefieldEventSystem {
  private readonly schedule = new Map<number, BattlefieldEventKey>();
  private activeEvent: ActiveBattlefieldEvent | null = null;

  constructor(eligibleWaves: number[], random: () => number = Math.random) {
    const waves = this.shuffle([...new Set(eligibleWaves)], random).slice(0, 2).sort((a, b) => a - b);
    const keys = this.shuffle(Object.keys(BATTLEFIELD_EVENTS) as BattlefieldEventKey[], random).slice(0, waves.length);
    waves.forEach((wave, index) => this.schedule.set(wave, keys[index]));
  }

  get active(): ActiveBattlefieldEvent | null {
    return this.activeEvent;
  }

  getSchedule(): { wave: number; event: BattlefieldEventKey }[] {
    return [...this.schedule.entries()]
      .map(([wave, event]) => ({ wave, event }))
      .sort((a, b) => a.wave - b.wave);
  }

  startWave(wave: number): ActiveBattlefieldEvent | null {
    const key = this.schedule.get(wave);
    if (!key) return null;
    const def = BATTLEFIELD_EVENTS[key];
    this.activeEvent = { def, wave, remaining: def.duration };
    return this.activeEvent;
  }

  update(dt: number): boolean {
    if (!this.activeEvent) return false;
    this.activeEvent.remaining = Math.max(0, this.activeEvent.remaining - dt);
    return this.activeEvent.remaining <= 0;
  }

  finishActive(): ActiveBattlefieldEvent | null {
    const finished = this.activeEvent;
    this.activeEvent = null;
    return finished;
  }

  private shuffle<T>(items: T[], random: () => number): T[] {
    for (let index = items.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(random() * (index + 1));
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }
    return items;
  }
}
