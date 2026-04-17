import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.a4e09c64fce94015a358ceb6b53fe078',
  appName: 'UNO Calculator',
  webDir: 'dist',
  server: {
    url: 'https://a4e09c64-fce9-4015-a358-ceb6b53fe078.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;
