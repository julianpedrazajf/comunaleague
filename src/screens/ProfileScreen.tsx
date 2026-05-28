import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, fontSizes } from '../utils/theme';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('home.profile')}</Text>
      {user && (
        <Text style={styles.name}>{user.name} {user.lastName}</Text>
      )}
      {/* TODO: Full profile view + edit form */}
      <TouchableOpacity style={styles.logout} onPress={signOut}>
        <Text style={styles.logoutText}>{t('auth.logout')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { fontSize: fontSizes.xl, fontWeight: 'bold', color: colors.darkGray },
  name: { fontSize: fontSizes.lg, color: colors.darkGray, marginTop: spacing.sm },
  logout: { marginTop: 'auto', padding: spacing.md, alignItems: 'center' },
  logoutText: { color: colors.primary, fontSize: fontSizes.md },
});
