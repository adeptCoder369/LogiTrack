const config = {
  appId: "com.ibrmco.infoeight",
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