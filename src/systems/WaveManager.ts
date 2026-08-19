import type { LevelConfig, SpawnGroup } from '../data/levels';
import {
  HORDE_BASE_COUNT,
  HORDE_COUNT_PER_LEVEL,
  HORDE_MAX_COUNT,
  HORDE_SPAWN_INTERVAL,
  BOSS_ZOMBIE_TYPES,
  ZOMBIE_TYPES,
  getUnlockedZombieTypes,
  type ZombieTypeKey,
} from '../data/balance';
import { randomBetween, type RandomSource } from './SeededRandom';

// 单个待执行的刷怪任务
interface SpawnTask {
  type: ZombieTypeKey;
  remaining: number;
  total: number;
  interval: number;
  nextAt: number; // 下一次刷怪的波内时间（秒）
}

export type WaveState = 'idle' | 'spawning' | 'clearing' | 'levelDone';

/**
 * 波次调度器：由 GameScene 每帧调用 update(dt)，
 * 需要刷怪时回调 onSpawn；一波刷完且场上清空后进入 'clearing' -> 下一波。
 */
export class WaveManager {
  private level: LevelConfig;
  private waveIndex = -1;
  private tasks: SpawnTask[] = [];
  private waveTime = 0;
  /** 怪物数量倍率（用于战前免费选技能后的难度平衡） */
  private monsterMultiplier: number;
  private nextWaveMultiplier = 1;
  private readonly endlessMode: boolean;
  private readonly random: RandomSource;
  private currentBossWave = false;
  state: WaveState = 'idle';
  isHordeWave = false;
  hordeProgress = 0;

  onSpawn: (type: ZombieTypeKey) => void = () => {};
  onHordeStart: (count: number) => void = () => {};

  constructor(
    level: LevelConfig,
    monsterMultiplier = 1,
    endlessMode = false,
    random: RandomSource = Math.random,
  ) {
    this.level = level;
    this.monsterMultiplier = monsterMultiplier;
    this.endlessMode = endlessMode;
    this.random = random;
  }

  /** 动态设置怪物倍率（在 startNextWave 之前生效） */
  setMonsterMultiplier(m: number): void {
    this.monsterMultiplier = m;
  }

  /** 仅强化下一波，供波间风险契约使用。 */
  setNextWaveMultiplier(multiplier: number): void {
    this.nextWaveMultiplier = Math.max(1, multiplier);
  }

  get currentWave(): number {
    return this.waveIndex + 1;
  }

  get totalWaves(): number {
    return this.endlessMode ? Infinity : this.level.waves.length;
  }

  get isLastWave(): boolean {
    return !this.endlessMode && this.waveIndex >= this.level.waves.length - 1;
  }

  get isBossWave(): boolean {
    return this.currentBossWave;
  }

  /** 开始下一波，返回 false 表示已无后续波次 */
  startNextWave(): boolean {
    if (!this.endlessMode && this.waveIndex + 1 >= this.level.waves.length) {
      this.state = 'levelDone';
      return false;
    }
    this.waveIndex++;
    this.waveTime = 0;
    const waveNumber = this.waveIndex + 1;
    const waveConfig = this.endlessMode
      ? this.generateEndlessWave(waveNumber)
      : this.level.waves[this.waveIndex];
    this.currentBossWave = Boolean(waveConfig.bossWave);
    this.isHordeWave = this.endlessMode ? waveNumber % 5 === 0 : this.waveIndex === this.level.waves.length - 1;
    this.hordeProgress = 0;
    const effectiveMultiplier = this.monsterMultiplier * this.nextWaveMultiplier;
    this.nextWaveMultiplier = 1;
    this.tasks = waveConfig.groups.map((gr: SpawnGroup) => {
      const countScale = 1 + this.waveIndex * 0.16;
      const paceScale = 1 + this.waveIndex * 0.28;
      const total = Math.max(1, Math.round(gr.count * effectiveMultiplier * countScale));
      return {
        type: gr.type,
        remaining: total,
        total,
        interval: Math.max(0.06, gr.interval / paceScale),
        nextAt: (gr.delay ?? 0) * 0.5,
      };
    });

    if (this.isHordeWave) {
      const difficultyIndex = this.endlessMode ? waveNumber : this.level.id;
      const rawCount = HORDE_BASE_COUNT + difficultyIndex * HORDE_COUNT_PER_LEVEL;
      const swarmTotal = Math.min(HORDE_MAX_COUNT, Math.round(rawCount * effectiveMultiplier));
      const fastTotal = Math.max(8, Math.round((8 + difficultyIndex * 0.45) * effectiveMultiplier));
      this.tasks.push(
        {
          type: 'swarm', remaining: swarmTotal, total: swarmTotal,
          interval: Math.max(0.055, HORDE_SPAWN_INTERVAL - difficultyIndex * 0.0005), nextAt: 0.7,
        },
        {
          type: 'fast', remaining: fastTotal, total: fastTotal,
          interval: 0.18, nextAt: 2.2,
        },
      );
      if (difficultyIndex >= 6) {
        const burrowers = Math.min(14, 3 + Math.floor(difficultyIndex / 5));
        const conductors = Math.min(6, 1 + Math.floor(difficultyIndex / 12));
        const siphons = Math.min(7, Math.floor(difficultyIndex / 10));
        this.tasks.push(
          { type: 'burrower', remaining: burrowers, total: burrowers, interval: 0.52, nextAt: 1.3 },
          { type: 'conductor', remaining: conductors, total: conductors, interval: 2.2, nextAt: 0.9 },
        );
        if (siphons > 0) {
          this.tasks.push({ type: 'siphon', remaining: siphons, total: siphons, interval: 1.9, nextAt: 3.2 });
        }
      }
      this.onHordeStart(this.tasks.reduce((sum, task) => sum + task.total, 0));
    }
    this.state = 'spawning';
    return true;
  }

  private generateEndlessWave(wave: number): { groups: SpawnGroup[]; bossWave?: boolean } {
    const equivalentLevel = Math.min(99, Math.max(1, 4 + wave * 2));
    const unlocked = getUnlockedZombieTypes(equivalentLevel).filter((type) => type !== 'swarm');
    const candidates = [...unlocked];
    const groupCount = Math.min(5, 2 + Math.floor((wave - 1) / 3));
    const groups: SpawnGroup[] = [];
    for (let index = 0; index < groupCount && candidates.length > 0; index++) {
      const typeIndex = randomBetween(this.random, 0, candidates.length - 1);
      const type = candidates.splice(typeIndex, 1)[0];
      const archetype = ZOMBIE_TYPES[type].archetype;
      const support = ['healer', 'summoner', 'shield', 'jammer', 'conductor', 'siphon'].includes(archetype);
      const heavy = archetype === 'tank';
      groups.push({
        type,
        count: support
          ? Math.max(1, 1 + Math.floor(wave / 12))
          : heavy
            ? Math.max(2, 2 + Math.floor(wave / 10))
            : Math.max(3, 6 + Math.floor(wave * 0.7) - index),
        interval: Math.max(0.28, 1.18 - wave * 0.025 + index * 0.11),
        delay: index * 1.1,
      });
    }
    const bossWave = wave % 10 === 0;
    if (bossWave) {
      const bossIndex = Math.floor(wave / 10) % BOSS_ZOMBIE_TYPES.length;
      groups.unshift({
        type: BOSS_ZOMBIE_TYPES[bossIndex],
        count: Math.min(3, 1 + Math.floor((wave - 10) / 30)),
        interval: 5,
        delay: 0.4,
      });
    }
    return { groups, bossWave };
  }

  /** aliveCount: 场上存活僵尸数量 */
  update(dt: number, aliveCount: number): void {
    if (this.state === 'spawning') {
      this.waveTime += dt;
      let allDone = true;
      for (const task of this.tasks) {
        let spawnedThisFrame = 0;
        while (task.remaining > 0 && this.waveTime >= task.nextAt && spawnedThisFrame < 5) {
          task.remaining--;
          task.nextAt += task.interval;
          this.onSpawn(task.type);
          spawnedThisFrame++;
        }
        if (task.remaining > 0) allDone = false;
      }
      if (this.isHordeWave) {
        const total = this.tasks.reduce((sum, task) => sum + task.total, 0);
        const remaining = this.tasks.reduce((sum, task) => sum + task.remaining, 0);
        this.hordeProgress = total > 0 ? 1 - remaining / total : 1;
      }
      if (allDone) {
        this.state = 'clearing';
      }
    } else if (this.state === 'clearing') {
      // 等待场上清空，由 GameScene 检查后调用 startNextWave 或结算
      if (aliveCount === 0) {
        this.state = 'idle';
      }
    }
  }
}
