/**
 * AudioSystem —— 程序化音频系统（零外部资源）
 *
 * 使用 Web Audio API 实时合成：
 * - BGM：分层循环（低音 drone + pad 和弦 + 节拍 + 偶发琶音），紧张压抑
 * - SFX：短促合成音（射击/命中/暴击/击杀/爆炸/金币/Boss/波次/UI/胜负/组合技）
 *
 * 自动降级：浏览器不支持 AudioContext 时全部静默。
 * 用户首次交互后 resume()（解决 autoplay policy）。
 *
 * 暴露的 API：
 *   AudioSystem.play('shoot' | 'hit' | ...)
 *   AudioSystem.startBGM(theme?: 'normal' | 'boss')
 *   AudioSystem.stopBGM()
 *   AudioSystem.setMuted(bool)
 *   AudioSystem.toggleMuted()
 */

type SfxName =
  | 'shoot' | 'hit' | 'crit' | 'kill' | 'explosion' | 'coin'
  | 'boss' | 'wave' | 'upgrade' | 'synergy' | 'ui_click'
  | 'win' | 'lose' | 'summon' | 'acid' | 'wall_hit' | 'kill_streak'
  | 'heal' | 'reroll' | 'horde' | 'overdrive' | 'lightning' | 'armageddon';

type BgmTheme = 'normal' | 'boss' | 'horde' | 'menu';

class AudioSystemImpl {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private muted = false;

  // BGM 调度
  private bgmTimer: number | null = null;
  private bgmNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
  private bgmStep = 0;
  private currentTheme: BgmTheme | null = null;
  private lastSfxAt: Partial<Record<SfxName, number>> = {};

  // ---- 初始化 ----
  private unlockAttached = false;

  private ensureCtx(): boolean {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return true;
    }
    const AC = (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    if (!AC) return false;
    try {
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.85;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.9;
      this.sfxGain.connect(this.masterGain);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.5;
      this.bgmGain.connect(this.masterGain);
    } catch {
      this.ctx = null;
      return false;
    }
    // 全局手势解锁：浏览器 autoplay policy 要求首次用户交互后才能播放
    this.attachGlobalUnlock();
    return true;
  }

  /** 在 window 上挂一次性监听，确保任何首次交互都能解锁音频 */
  private attachGlobalUnlock(): void {
    if (this.unlockAttached) return;
    this.unlockAttached = true;
    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
      // 解锁后若静音前有 BGM 主题待恢复，则重启
      if (!this.muted && this.currentTheme && this.bgmTimer === null) {
        const t = this.currentTheme;
        this.currentTheme = null;
        this.startBGM(t);
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: false });
    window.addEventListener('keydown', unlock, { once: false });
    window.addEventListener('touchstart', unlock, { once: false, passive: true });
  }

  /** 用户首次交互时调用，解锁音频（向后兼容旧入口） */
  resume(): void {
    this.ensureCtx();
  }

  get isMuted(): boolean {
    return this.muted;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.masterGain && this.ctx) {
      const t = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(t);
      this.masterGain.gain.linearRampToValueAtTime(m ? 0 : 0.85, t + 0.08);
    }
    try { localStorage.setItem('zc-muted', m ? '1' : '0'); } catch { /* ignore */ }
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /** 读取上次静音状态 */
  loadMutedPref(): void {
    try {
      this.muted = localStorage.getItem('zc-muted') === '1';
    } catch { /* ignore */ }
  }

  // ---- SFX 合成 ----
  play(name: SfxName, opts: { volume?: number } = {}): void {
    if (!this.ensureCtx() || this.muted) return;
    const ctx = this.ctx!;
    const out = this.sfxGain!;
    const vol = opts.volume ?? 1;
    const now = ctx.currentTime;
    const minGap: Partial<Record<SfxName, number>> = {
      shoot: 0.035, hit: 0.04, kill: 0.045, coin: 0.03, wall_hit: 0.08,
    };
    const last = this.lastSfxAt[name] ?? -Infinity;
    if (minGap[name] !== undefined && now - last < minGap[name]!) return;
    this.lastSfxAt[name] = now;

    switch (name) {
      case 'shoot':      this.sfxShoot(now, vol); break;
      case 'hit':        this.sfxHit(now, vol); break;
      case 'crit':       this.sfxCrit(now, vol); break;
      case 'kill':       this.sfxKill(now, vol); break;
      case 'explosion':  this.sfxExplosion(now, vol); break;
      case 'coin':       this.sfxCoin(now, vol); break;
      case 'boss':       this.sfxBoss(now, vol); break;
      case 'wave':       this.sfxWave(now, vol); break;
      case 'upgrade':    this.sfxUpgrade(now, vol); break;
      case 'synergy':    this.sfxSynergy(now, vol); break;
      case 'ui_click':   this.sfxBlip(now, vol, 660, 0.05); break;
      case 'win':        this.sfxWin(now, vol); break;
      case 'lose':       this.sfxLose(now, vol); break;
      case 'summon':     this.sfxSummon(now, vol); break;
      case 'acid':       this.sfxAcid(now, vol); break;
      case 'wall_hit':   this.sfxWallHit(now, vol); break;
      case 'kill_streak':this.sfxKillStreak(now, vol); break;
      case 'heal':       this.sfxHeal(now, vol); break;
      case 'reroll':     this.sfxReroll(now, vol); break;
      case 'horde':      this.sfxHorde(now, vol); break;
      case 'overdrive':  this.sfxOverdrive(now, vol); break;
      case 'lightning':  this.sfxLightning(now, vol); break;
      case 'armageddon': this.sfxArmageddon(now, vol); break;
    }
    void out;
  }

  // 基础工具
  private osc(type: OscillatorType, freq: number, t: number, dur: number, vol: number, dest: AudioNode): OscillatorNode {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }

  private noise(t: number, dur: number, vol: number, filterType: BiquadFilterType, freq: number, q: number): AudioBufferSourceNode {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter); filter.connect(g); g.connect(this.sfxGain!);
    src.start(t); src.stop(t + dur + 0.05);
    return src;
  }

  // 各 SFX 实现
  private sfxShoot(t: number, vol: number): void {
    // 主射击音：方波从高频快速下滑，模拟枪声
    const o1 = this.osc('square', 1200, t, 0.12, 0.22 * vol, this.sfxGain!);
    o1.frequency.exponentialRampToValueAtTime(180, t + 0.12);
    // 低频冲击层
    const o2 = this.osc('sine', 150, t, 0.15, 0.18 * vol, this.sfxGain!);
    o2.frequency.exponentialRampToValueAtTime(60, t + 0.15);
    // 枪口噪声层（更宽的带通）
    this.noise(t, 0.08, 0.15 * vol, 'bandpass', 3000, 1.5);
    // 高频尾音
    this.noise(t + 0.02, 0.06, 0.08 * vol, 'highpass', 5000, 1);
  }
  private sfxHit(t: number, vol: number): void {
    // 命中冲击：低频 thump + 中频 crack
    this.osc('sine', 200, t, 0.1, 0.16 * vol, this.sfxGain!).frequency.exponentialRampToValueAtTime(80, t + 0.1);
    this.noise(t, 0.08, 0.18 * vol, 'bandpass', 2200, 2);
    // 高频碎片音
    this.noise(t + 0.02, 0.05, 0.1 * vol, 'highpass', 4000, 1);
  }
  private sfxCrit(t: number, vol: number): void {
    // 暴击冲击：多层叠加
    // 低频爆炸层
    this.osc('sine', 120, t, 0.2, 0.25 * vol, this.sfxGain!).frequency.exponentialRampToValueAtTime(40, t + 0.2);
    // 中频方波下滑
    this.osc('square', 1800, t, 0.08, 0.2 * vol, this.sfxGain!).frequency.exponentialRampToValueAtTime(400, t + 0.08);
    // 高频噪声爆发
    this.noise(t, 0.1, 0.22 * vol, 'bandpass', 4000, 2);
    // 暴击鸣响尾音
    this.osc('triangle', 1200, t + 0.05, 0.25, 0.15 * vol, this.sfxGain!);
    // 高频碎片
    this.noise(t + 0.03, 0.08, 0.12 * vol, 'highpass', 6000, 1);
  }
  private sfxKill(t: number, vol: number): void {
    // 击杀冲击：低频爆炸 + 高频碎片
    const o1 = this.osc('sine', 150, t, 0.25, 0.28 * vol, this.sfxGain!);
    o1.frequency.exponentialRampToValueAtTime(40, t + 0.25);
    // 中频 crunch
    this.osc('square', 600, t, 0.1, 0.15 * vol, this.sfxGain!).frequency.exponentialRampToValueAtTime(200, t + 0.1);
    // 高频噪声爆发
    this.noise(t, 0.12, 0.2 * vol, 'bandpass', 3000, 2);
    // 击杀尾音 ping
    this.osc('triangle', 1600, t + 0.05, 0.15, 0.1 * vol, this.sfxGain!);
  }
  private sfxExplosion(t: number, vol: number): void {
    // 低频 boom + 宽带噪声
    const o = this.osc('sine', 110, t, 0.4, 0.32 * vol, this.sfxGain!);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.4);
    this.noise(t, 0.35, 0.32 * vol, 'lowpass', 900, 0.7);
    this.noise(t, 0.15, 0.22 * vol, 'highpass', 2000, 0.6);
  }
  private sfxCoin(t: number, vol: number): void {
    // 上升双音
    this.osc('sine', 1320, t, 0.08, 0.14 * vol, this.sfxGain!);
    this.osc('sine', 1760, t + 0.06, 0.1, 0.12 * vol, this.sfxGain!);
  }
  private sfxBoss(t: number, vol: number): void {
    // 警报 + 低吼
    const o = this.osc('sawtooth', 220, t, 1.2, 0.22 * vol, this.sfxGain!);
    o.frequency.setValueAtTime(220, t);
    o.frequency.linearRampToValueAtTime(440, t + 0.4);
    o.frequency.linearRampToValueAtTime(180, t + 1.2);
    this.noise(t, 0.8, 0.18 * vol, 'lowpass', 300, 0.8);
  }
  private sfxWave(t: number, vol: number): void {
    // 上升和弦
    [440, 554, 659].forEach((f, i) => {
      this.osc('triangle', f, t + i * 0.08, 0.45, 0.12 * vol, this.sfxGain!);
    });
  }
  private sfxUpgrade(t: number, vol: number): void {
    // 明亮大三和弦琶音
    [523, 659, 784, 1047].forEach((f, i) => {
      this.osc('triangle', f, t + i * 0.05, 0.4, 0.14 * vol, this.sfxGain!);
    });
  }
  private sfxSynergy(t: number, vol: number): void {
    // 闪亮和弦
    [784, 988, 1175, 1568].forEach((f, i) => {
      this.osc('sine', f, t + i * 0.04, 0.5, 0.13 * vol, this.sfxGain!);
    });
  }
  private sfxBlip(t: number, vol: number, freq: number, dur: number): void {
    this.osc('square', freq, t, dur, 0.12 * vol, this.sfxGain!);
  }
  private sfxWin(t: number, vol: number): void {
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      this.osc('triangle', f, t + i * 0.12, 0.6, 0.18 * vol, this.sfxGain!);
    });
  }
  private sfxLose(t: number, vol: number): void {
    [440, 392, 330, 262].forEach((f, i) => {
      this.osc('sawtooth', f, t + i * 0.18, 0.55, 0.16 * vol, this.sfxGain!);
    });
  }
  private sfxSummon(t: number, vol: number): void {
    const o = this.osc('sawtooth', 200, t, 0.3, 0.16 * vol, this.sfxGain!);
    o.frequency.exponentialRampToValueAtTime(80, t + 0.3);
  }
  private sfxAcid(t: number, vol: number): void {
    this.noise(t, 0.15, 0.14 * vol, 'bandpass', 1400, 4);
    const o = this.osc('sine', 700, t, 0.12, 0.1 * vol, this.sfxGain!);
    o.frequency.exponentialRampToValueAtTime(300, t + 0.12);
  }
  private sfxWallHit(t: number, vol: number): void {
    const o = this.osc('sine', 120, t, 0.18, 0.22 * vol, this.sfxGain!);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.18);
    this.noise(t, 0.08, 0.14 * vol, 'lowpass', 600, 0.8);
  }
  private sfxKillStreak(t: number, vol: number): void {
    [659, 784, 988, 1319].forEach((f, i) => {
      this.osc('square', f, t + i * 0.06, 0.25, 0.14 * vol, this.sfxGain!);
    });
  }
  private sfxHeal(t: number, vol: number): void {
    [523, 659, 784].forEach((f, i) => {
      this.osc('sine', f, t + i * 0.08, 0.3, 0.1 * vol, this.sfxGain!);
    });
  }
  private sfxReroll(t: number, vol: number): void {
    this.osc('square', 880, t, 0.05, 0.12 * vol, this.sfxGain!);
    this.osc('square', 440, t + 0.06, 0.08, 0.12 * vol, this.sfxGain!);
  }
  private sfxHorde(t: number, vol: number): void {
    this.osc('sawtooth', 90, t, 0.7, 0.22 * vol, this.sfxGain!).frequency.exponentialRampToValueAtTime(38, t + 0.7);
    this.noise(t, 0.4, 0.2 * vol, 'bandpass', 900, 0.8);
    [196, 233, 294].forEach((f, i) => this.osc('square', f, t + i * 0.08, 0.3, 0.12 * vol, this.sfxGain!));
  }
  private sfxOverdrive(t: number, vol: number): void {
    [220, 330, 494, 740, 988].forEach((f, i) => this.osc('sawtooth', f, t + i * 0.055, 0.6, 0.16 * vol, this.sfxGain!));
    this.noise(t, 0.22, 0.2 * vol, 'highpass', 2800, 1);
  }
  private sfxLightning(t: number, vol: number): void {
    this.noise(t, 0.12, 0.24 * vol, 'highpass', 3600, 1);
    this.osc('square', 1500, t, 0.16, 0.14 * vol, this.sfxGain!).frequency.exponentialRampToValueAtTime(260, t + 0.16);
  }
  private sfxArmageddon(t: number, vol: number): void {
    this.osc('sine', 70, t, 1.2, 0.28 * vol, this.sfxGain!).frequency.exponentialRampToValueAtTime(25, t + 1.2);
    this.noise(t, 0.8, 0.28 * vol, 'lowpass', 700, 0.6);
    this.osc('sawtooth', 440, t + 0.1, 0.7, 0.16 * vol, this.sfxGain!).frequency.exponentialRampToValueAtTime(60, t + 0.8);
  }

  // ---- BGM ----
  startBGM(theme: BgmTheme = 'normal'): void {
    if (!this.ensureCtx() || this.muted) {
      // 即使静音也记住当前主题，解除静音时恢复
      this.currentTheme = theme;
      return;
    }
    if (this.currentTheme === theme && this.bgmTimer !== null) return;
    this.stopBGM(true);
    this.currentTheme = theme;
    this.bgmStep = 0;
    const ctx = this.ctx!;
    const bgmGain = this.bgmGain!;

    // 持续低音 drone（小调根音）
    const rootFreq = theme === 'boss' ? 55 : theme === 'horde' ? 41 : 49; // G1 / G#1
    const drone = ctx.createOscillator();
    drone.type = 'sawtooth';
    drone.frequency.value = rootFreq;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.16;
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 220;
    drone.connect(droneFilter); droneFilter.connect(droneGain); droneGain.connect(bgmGain);
    drone.start();
    this.bgmNodes.push({ osc: drone, gain: droneGain });

    // pad：缓慢和声（小调三和弦 + 七音）
    const padNotes = theme === 'boss'
      ? [196, 233, 294, 349]   // G Bb D F —— 更紧张
      : theme === 'horde' ? [164, 196, 233, 277] : [196, 233, 294];
    padNotes.forEach((f) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.detune.value = (Math.random() - 0.5) * 8;
      const g = ctx.createGain();
      g.gain.value = 0.04;
      // 缓慢呼吸
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.1 + Math.random() * 0.15;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain); lfoGain.connect(g.gain);
      lfo.start();
      o.connect(g); g.connect(bgmGain);
      o.start();
      this.bgmNodes.push({ osc: o, gain: g });
      this.bgmNodes.push({ osc: lfo, gain: lfoGain });
    });

    // 节拍 + 旋律：用 setInterval 调度（每 0.5 秒一步）
    const intervalMs = theme === 'boss' ? 220 : theme === 'horde' ? 150 : 280;
    const scale = theme === 'boss'
      ? [55, 58, 62, 65, 69, 73, 78, 82]  // 更激进的半音阶
      : theme === 'horde'
        ? [41, 46, 49, 55, 58, 62, 65, 70]
        : [49, 52, 58, 62, 65, 69, 73, 78]; // 小调音阶

    this.bgmTimer = window.setInterval(() => {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      const step = this.bgmStep++;

      // 每 4 步一拍鼓点（低频脉冲）
      if (step % 4 === 0) {
        const drum = this.osc('sine', 90, t, 0.18, theme === 'boss' ? 0.22 : 0.16, this.bgmGain!);
        drum.frequency.exponentialRampToValueAtTime(40, t + 0.18);
        if (theme === 'boss' || theme === 'horde') {
          this.noise(t, 0.05, 0.1, 'highpass', 3000, 1);
        }
      }

      // 旋律：稀疏的小调琶音（每 2 步发一音，偶发休止）
      if (step % 2 === 0 && Math.random() < 0.7) {
        const note = scale[Math.floor(Math.random() * scale.length)];
        const freq = note * 4; // 上提两个八度
        this.osc('triangle', freq, t, 0.5, 0.06, this.bgmGain!);
      }

      // boss 主题：加入不和谐音
      if ((theme === 'boss' || theme === 'horde') && step % 8 === 4) {
        this.osc('sawtooth', 116, t, 0.4, 0.05, this.bgmGain!);
      }
    }, intervalMs);
  }

  stopBGM(keepTheme = false): void {
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    const ctx = this.ctx;
    if (ctx) {
      const t = ctx.currentTime;
      for (const n of this.bgmNodes) {
        try {
          n.gain.gain.cancelScheduledValues(t);
          n.gain.gain.linearRampToValueAtTime(0, t + 0.3);
          n.osc.stop(t + 0.35);
        } catch { /* already stopped */ }
      }
    }
    this.bgmNodes = [];
    if (!keepTheme) this.currentTheme = null;
  }

  /** 解除静音时若 BGM 应在播则重启 */
  refreshMuteState(): void {
    if (!this.muted && this.currentTheme && this.bgmTimer === null) {
      const theme = this.currentTheme;
      this.currentTheme = null; // 强制重启
      this.startBGM(theme);
    } else if (this.muted && this.bgmTimer !== null) {
      // 静音时停止调度但不重置主题
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const AudioSystem = new AudioSystemImpl();
