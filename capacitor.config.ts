import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.audiomorphic.app',
  appName: 'Audiomorphic AR',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    hostname: 'audiomorphic.app'
  }
};

export default config;
