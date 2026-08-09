import Phaser from 'phaser';

// 通用 UI 工具：圆角按钮与文本样式

export const FONT = '"PingFang SC", "Microsoft YaHei", sans-serif';

export function titleStyle(size = 64): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT,
    fontSize: `${size}px`,
    fontStyle: 'bold',
    color: '#ffffff',
    stroke: '#1a2530',
    strokeThickness: 8,
  };
}

export function textStyle(size = 28, color = '#ffffff'): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: FONT, fontSize: `${size}px`, color };
}

export interface ButtonOptions {
  width?: number;
  height?: number;
  color?: number;
  colorDown?: number;
  fontSize?: number;
  disabled?: boolean;
}

/** 创建一个圆角矩形按钮，返回容器 */
export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts: ButtonOptions = {}
): Phaser.GameObjects.Container {
  const w = opts.width ?? 320;
  const h = opts.height ?? 88;
  const color = opts.disabled ? 0x4a5560 : (opts.color ?? 0x2e7d32);
  const colorDown = opts.colorDown ?? 0x1b5e20;

  const bg = scene.add.graphics();
  const draw = (c: number) => {
    bg.clear();
    bg.fillStyle(0x000000, 0.42).fillRoundedRect(-w / 2 + 4, -h / 2 + 7, w, h, 10);
    bg.fillStyle(c, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    bg.fillStyle(0xffffff, 0.11).fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h * 0.46, { tl: 8, tr: 8, bl: 2, br: 2 });
    bg.fillStyle(0x000000, 0.14).fillRoundedRect(-w / 2 + 2, h / 2 - 9, w - 4, 7, { tl: 2, tr: 2, bl: 8, br: 8 });
    bg.lineStyle(1, 0xffffff, 0.18).strokeRoundedRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 9);
    bg.fillStyle(0xffffff, 0.72).fillRoundedRect(-w / 2 + 8, -h / 2 + 8, 4, h - 16, 2);
  };
  draw(color);

  const txt = scene.add
    .text(0, 0, label, {
      fontFamily: FONT,
      fontSize: `${opts.fontSize ?? 32}px`,
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#081117',
      strokeThickness: 2,
    })
    .setOrigin(0.5);

  const container = scene.add.container(x, y, [bg, txt]);
  container.setSize(w, h);

  if (!opts.disabled) {
    container.setInteractive({ useHandCursor: true });
    let pressed = false; // 防止在其它位置按下、在按钮上释放时误触
    container.on('pointerdown', () => {
      pressed = true;
      draw(colorDown);
      container.setScale(0.96);
    });
    container.on('pointerover', () => {
      if (!pressed) container.setScale(1.015);
    });
    container.on('pointerup', () => {
      draw(color);
      container.setScale(1);
      if (pressed) {
        pressed = false;
        onClick();
      }
    });
    container.on('pointerout', () => {
      pressed = false;
      draw(color);
      container.setScale(1);
    });
    container.on('pointerupoutside', () => {
      pressed = false;
      draw(color);
      container.setScale(1);
    });
  }
  return container;
}

/** 半透明全屏遮罩 */
export function createOverlay(scene: Phaser.Scene, alpha = 0.65): Phaser.GameObjects.Rectangle {
  const { width, height } = scene.scale;
  return scene.add
    .rectangle(width / 2, height / 2, width, height, 0x000000, alpha)
    .setInteractive(); // 拦截点击
}
