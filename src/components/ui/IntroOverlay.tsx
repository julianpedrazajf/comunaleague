import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import CreamButton from './CreamButton';
import { colors, font, space, radius } from '../../theme/tokens';

export interface IntroPoint {
  title: string;
  desc: string;
}

interface IntroOverlayProps {
  visible: boolean;
  onClose: () => void;     // X / backdrop tap (does not run the CTA)
  onCta?: () => void;      // primary button; defaults to onClose
  title: string;
  subtitle?: string;
  points: IntroPoint[];
  cta: string;
}

/**
 * A one-time onboarding card explaining what a screen does. Rendered as a
 * centered modal over the screen. Content comes from i18n via the caller.
 */
export default function IntroOverlay({ visible, onClose, onCta, title, subtitle, points, cta }: IntroOverlayProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <X size={18} color={colors.cream45} strokeWidth={2} />
          </TouchableOpacity>

          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          <ScrollView style={styles.points} showsVerticalScrollIndicator={false}>
            {points.map((p, i) => (
              <View key={i} style={styles.point}>
                <View style={styles.dot} />
                <View style={styles.pointText}>
                  <Text style={styles.pointTitle}>{p.title}</Text>
                  <Text style={styles.pointDesc}>{p.desc}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <CreamButton label={cta} full onPress={onCta ?? onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '82%',
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.xl,
    gap: space.md,
  },
  closeBtn: { position: 'absolute', top: space.md, right: space.md, padding: 4, zIndex: 1 },

  title: { fontFamily: font.sansXBold, fontSize: 24, letterSpacing: -0.4, color: colors.cream, paddingRight: 28 },
  subtitle: { fontFamily: font.sans, fontSize: 14, color: colors.cream70, lineHeight: 20 },

  points: { flexGrow: 0, marginVertical: space.xs },
  point: { flexDirection: 'row', gap: space.md, paddingVertical: space.sm },
  dot: { width: 7, height: 7, borderRadius: 999, backgroundColor: colors.cream2, marginTop: 7 },
  pointText: { flex: 1, gap: 2 },
  pointTitle: { fontFamily: font.sansBold, fontSize: 15, color: colors.cream },
  pointDesc: { fontFamily: font.sans, fontSize: 13, color: colors.cream45, lineHeight: 18 },
});
