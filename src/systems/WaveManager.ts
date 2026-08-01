import type { LevelConfig, SpawnGroup } from '../data/levels';
import type { ZombieTypeKey } from '../data/balance';

// 单个待执行的刷怪任务
interface SpawnTask {
  type: ZombieTypeKey;
  remaining: number;
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
  state: WaveState = 'idle';

  onSpawn: (type: ZombieTypeKey) => void = () => {};

  constructor(level: LevelConfig) {
    this.level = level;
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
    this.tasks = this.level.waves[this.waveIndex].groups.map((gr: SpawnGroup) => ({
      type: gr.type,
      remaining: gr.count,
      interval: gr.interval,
      nextAt: gr.delay ?? 0,
    }));
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
