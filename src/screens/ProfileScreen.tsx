import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, fontSizes } from '../utils/theme';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>{t('home.profile')}</Text>
        {user && (
          <Text style={styles.subtitle}>{user.name} {user.lastName}</Text>
        )}
      </View>

      <View style={styles.content}>
        {/* TODO: Full profile view + edit form */}
      </View>

      <TouchableOpacity style={styles.logout} onPress={signOut}>
        <Text style={styles.logoutText}>{t('auth.logout')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  pageHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pageTitle: { fontSize: fontSizes.xxl, fontWeight: 'bold', color: colors.darkGray },
  subtitle: { fontSize: fontSizes.sm, color: colors.gray, marginTop: spacing.xs },
  content: { flex: 1, padding: spacing.lg },
  logout: {
    margin: spacing.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  logoutText: { color: colors.primary, fontSize: fontSizes.md, fontWeight: '600' },
});
