import Phaser from 'phaser';

/**
 * 金币（对象池成员）：掉落弹跳后飞向 HUD 金币位置并计入。
 */
export class Coin extends Phaser.GameObjects.Image {
  private collecting = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'coin');
  }

  drop(x: number, y: number, value: number, onCollected: (value: number) => void): void {
    this.setActive(true).setVisible(true);
    this.setPosition(x, y).setScale(0).setAlpha(1).setDepth(8);
    this.collecting = false;

    // 弹出动画
    const tx = x + Phaser.Math.Between(-40, 40);
    const ty = y + Phaser.Math.Between(-30, 10);
    this.scene.tweens.add({
      targets: this,
      x: tx,
      y: ty,
      scale: 1,
      duration: 250,
      ease: 'Back.Out',
      onComplete: () => {
        if (!this.active) return;
        // 短暂停留后飞向 HUD 左上角金币图标
        this.scene.time.delayedCall(280, () => {
          if (!this.active || this.collecting) return;
          this.collecting = true;
          this.scene.tweens.add({
            targets: this,
            x: 60,
            y: 40,
            scale: 0.5,
            duration: 380,
            ease: 'Cubic.In',
            onComplete: () => {
              onCollected(value);
              this.recycle();
            },
          });
        });
      },
    });
  }

  recycle(): void {
    this.scene.tweens.killTweensOf(this);
    this.setActive(false).setVisible(false);
  }
}
