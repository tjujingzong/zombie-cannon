import type { LevelConfig, SpawnGroup } from '../data/levels';
import {
  HORDE_BASE_COUNT,
  HORDE_COUNT_PER_LEVEL,
  HORDE_MAX_COUNT,
  HORDE_SPAWN_INTERVAL,
  type ZombieTypeKey,
} from '../data/balance';

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
  state: WaveState = 'idle';
  isHordeWave = false;
  hordeProgress = 0;

  onSpawn: (type: ZombieTypeKey) => void = () => {};
  onHordeStart: (count: number) => void = () => {};

  constructor(level: LevelConfig, monsterMultiplier = 1) {
    this.level = level;
    this.monsterMultiplier = monsterMultiplier;
  }

  /** 动态设置怪物倍率（在 startNextWave 之前生效） */
  setMonsterMultiplier(m: number): void {
    this.monsterMultiplier = m;
  }

  get currentWave(): number {
    return this.waveIndex + 1;
  }

  get totalWaves(): number {
    return this.level.waves.length;
  }

  get isLastWave(): boolean {
    return this.waveIndex >= this.level.waves.length - 1;
  }

  /** 开始下一波，返回 false 表示已无后续波次 */
  startNextWave(): boolean {
    if (this.waveIndex + 1 >= this.level.waves.length) {
      this.state = 'levelDone';
      return false;
    }
    this.waveIndex++;
    this.waveTime = 0;
    this.isHordeWave = this.waveIndex === this.level.waves.length - 1;
    this.hordeProgress = 0;
    this.tasks = this.level.waves[this.waveIndex].groups.map((gr: SpawnGroup) => {
      const countScale = 1 + this.waveIndex * 0.16;
      const paceScale = 1 + this.waveIndex * 0.28;
      const total = Math.max(1, Math.round(gr.count * this.monsterMultiplier * countScale));
      return {
        type: gr.type,
        remaining: total,
        total,
        interval: Math.max(0.06, gr.interval / paceScale),
        nextAt: (gr.delay ?? 0) * 0.5,
      };
    });

    if (this.isHordeWave) {
      const rawCount = HORDE_BASE_COUNT + this.level.id * HORDE_COUNT_PER_LEVEL;
      const swarmTotal = Math.min(HORDE_MAX_COUNT, Math.round(rawCount * this.monsterMultiplier));
      const fastTotal = Math.max(8, Math.round((8 + this.level.id * 0.45) * this.monsterMultiplier));
      this.tasks.push(
        {
          type: 'swarm', remaining: swarmTotal, total: swarmTotal,
          interval: Math.max(0.055, HORDE_SPAWN_INTERVAL - this.level.id * 0.0005), nextAt: 0.7,
        },
        {
          type: 'fast', remaining: fastTotal, total: fastTotal,
          interval: 0.18, nextAt: 2.2,
        },
      );
      this.onHordeStart(swarmTotal + fastTotal);
    }
    this.state = 'spawning';
    return true;
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
