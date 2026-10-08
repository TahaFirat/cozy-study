import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cozystudy.sanctuary',
  appName: 'LockIn',
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
    // CSS env(safe-area-inset-*) owns the insets. Automatic WKWebView
    // insetting would apply the notch/home-indicator spacing twice.
    contentInset: 'never',
    allowsLinkPreview: false,
    scrollEnabled: false,
    preferredContentMode: 'mobile',
    backgroundColor: '#0c0a09',
  }
};

export default config;
