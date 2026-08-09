import {
  ENDLESS_MUTATIONS,
  type EndlessMutationDef,
  type EndlessMutationKey,
} from '../data/endless';
import { createSeededRandom, deriveSeed, randomBetween, type RandomSource } from './SeededRandom';

export interface ActiveEndlessMutation {
  def: EndlessMutationDef;
  stacks: number;
}

export interface EndlessMilestone {
  wave: number;
  mutation: ActiveEndlessMutation;
  repairRatio: number;
  overdrive: number;
  coins: number;
}

export class EndlessRunSystem {
  readonly seed: number;
  readonly code: string;
  score = 0;
  private readonly random: RandomSource;
  private readonly mutationStacks = new Map<EndlessMutationKey, number>();

  constructor(seed: number) {
    this.seed = seed >>> 0 || 0x5f3759df;
    this.code = this.seed.toString(36).toUpperCase().padStart(7, '0').slice(0, 7);
    this.random = createSeededRandom(deriveSeed(this.seed, 'mutations'));
  }

  get activeMutations(): ActiveEndlessMutation[] {
    return (Object.keys(ENDLESS_MUTATIONS) as EndlessMutationKey[])
      .map((key) => ({ def: ENDLESS_MUTATIONS[key], stacks: this.mutationStacks.get(key) ?? 0 }))
      .filter((entry) => entry.stacks > 0);
  }

  get totalMutationStacks(): number {
    return [...this.mutationStacks.values()].reduce((sum, stacks) => sum + stacks, 0);
  }

  get countMultiplier(): number {
    return 1 + this.sumMutationStat('countPerStack');
  }

  get hpMultiplier(): number {
    return 1 + this.sumMutationStat('hpPerStack');
  }

  get speedMultiplier(): number {
    return 1 + this.sumMutationStat('speedPerStack');
  }

  get eliteChanceBonus(): number {
    return Math.min(0.45, this.sumMutationStat('eliteChancePerStack'));
  }

  enemyHpMultiplier(wave: number): number {
    const waveGrowth = 1 + Math.max(0, wave - 1) * 0.15 + Math.floor(Math.max(0, wave - 1) / 10) * 0.35;
    return waveGrowth * this.hpMultiplier;
  }

  enemySpeedMultiplier(wave: number): number {
    const waveGrowth = Math.min(1.6, 1 + Math.max(0, wave - 1) * 0.018);
    return Math.min(2, waveGrowth * this.speedMultiplier);
  }

  addMilestone(wave: number): EndlessMilestone | null {
    if (wave <= 0 || wave % 5 !== 0) return null;
    const keys = Object.keys(ENDLESS_MUTATIONS) as EndlessMutationKey[];
    const minimumStacks = Math.min(...keys.map((key) => this.mutationStacks.get(key) ?? 0));
    const candidates = keys.filter((key) => (this.mutationStacks.get(key) ?? 0) === minimumStacks);
    const key = candidates[randomBetween(this.random, 0, candidates.length - 1)];
    const stacks = (this.mutationStacks.get(key) ?? 0) + 1;
    this.mutationStacks.set(key, stacks);
    return {
      wave,
      mutation: { def: ENDLESS_MUTATIONS[key], stacks },
      repairRatio: 0.2,
      overdrive: 30,
      coins: 35 + wave * 4,
    };
  }

  recordKill(coinValue: number, elite: boolean, boss: boolean): void {
    const base = Math.max(5, coinValue * 8);
    this.score += Math.round(base * (elite ? 1.5 : 1) + (boss ? 1200 : 0));
  }

  completeWave(wave: number, wallRatio: number): void {
    this.score += Math.round(wave * 150 + Math.max(0, Math.min(1, wallRatio)) * 500);
  }

  private sumMutationStat(
    key: 'countPerStack' | 'hpPerStack' | 'speedPerStack' | 'eliteChancePerStack',
  ): number {
    return this.activeMutations.reduce((sum, mutation) => sum + mutation.def[key] * mutation.stacks, 0);
  }
}
