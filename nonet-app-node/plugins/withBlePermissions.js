const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withBlePermissions(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    manifest.manifest["uses-permission"] =
      manifest.manifest["uses-permission"] || [];

    const perms = [
      "android.permission.BLUETOOTH",
      "android.permission.BLUETOOTH_ADMIN",
      "android.permission.BLUETOOTH_ADVERTISE",
      "android.permission.BLUETOOTH_CONNECT",
      "android.permission.BLUETOOTH_SCAN",
      "android.permission.ACCESS_FINE_LOCATION",
    ];

    const existing = new Set(
      (manifest.manifest["uses-permission"] || []).map(
        (p) => p.$["android:name"]
      )
    );

    perms.forEach((p) => {
      if (!existing.has(p)) {
        manifest.manifest["uses-permission"].push({ $: { "android:name": p } });
      }
    });

    return config;
  });
};
