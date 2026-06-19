const config = {
  appId: "com.infoeight.logitrack",
  appName: "IBRMCO",
  webDir: "build",
  server: {
    androidScheme: "https",
    cleartext: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    CapacitorHttp: {
      enabled: false,
    },
  },
  android: {
    buildOptions: {
      keystoreAlias: "logitrack",
    },
  },
};

module.exports = config;