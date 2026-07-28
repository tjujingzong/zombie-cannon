import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.zombiecannon',
  appName: '僵尸炮台',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
