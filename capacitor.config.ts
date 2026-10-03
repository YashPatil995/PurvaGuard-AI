import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yashpatil.purvaguardai',
  appName: 'PurvaGuard AI',
  webDir: 'public',
  server: {
    url: 'https://purva-guard-ai.vercel.app',
  },
};

export default config;