import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bimapratama.dompetku',
  appName: 'DompetKu',
  webDir: '../dist',
  server: {
    androidScheme: 'https',
    url: 'https://dompet.bimapratama.com',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
