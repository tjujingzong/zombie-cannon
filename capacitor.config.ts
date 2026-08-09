import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.tjujingzong.zombiecannon',
  appName: '僵尸炮台',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
