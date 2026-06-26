import React from 'react';
import { View, Platform, useWindowDimensions, StyleSheet } from 'react-native';

/**
 * On a desktop web browser the app would otherwise stretch edge-to-edge and
 * look like a broken website. This wraps it in a centered, phone-sized frame.
 * On native and on narrow (mobile) browsers it renders children untouched.
 */
export default function WebFrame({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const framed = Platform.OS === 'web' && width > 600;

  if (!framed) return <>{children}</>;

  return (
    <View style={styles.page}>
      <View style={[styles.frame, webShadow]}>{children}</View>
    </View>
  );
}

// boxShadow is a web-only style not present in RN's ViewStyle types.
const webShadow = { boxShadow: '0 24px 70px rgba(0,0,0,0.55)' } as any;

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#070707',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  frame: {
    width: '100%',
    maxWidth: 400,
    height: '100%',
    maxHeight: 860,
    borderRadius: 44,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
});
