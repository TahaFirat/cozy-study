import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cozystudy.sanctuary',
  appName: 'Cozy Study',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  backgroundColor: '#0c0a09',
  android: {
    backgroundColor: '#0c0a09',
    allowMixedContent: true,
    captureInput: true,
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scrollEnabled: false,
    preferredContentMode: 'mobile',
    backgroundColor: '#0c0a09',
  }
};

export default config;
