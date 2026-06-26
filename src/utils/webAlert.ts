// No-op on native. The web variant (webAlert.web.ts) patches react-native-web's
// Alert (whose Alert.alert is an empty no-op) to use the browser's dialogs.
export {};
