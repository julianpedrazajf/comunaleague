import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { ArrowRight, Check } from 'lucide-react-native';
import { colors, font, radius } from '../../theme/tokens';

interface CreamButtonProps {
  label: string;
  onPress?: () => void;
  full?: boolean;
  done?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

export default function CreamButton({ label, onPress, full, done, loading, disabled }: CreamButtonProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = () => { scale.value = withSpring(1.08, { damping: 15 }); };
  const handlePressOut = () => { scale.value = withSpring(1, { damping: 15 }); };

  return (
    <TouchableOpacity
      style={[styles.pill, full && styles.full]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={1}
    >
      <Text style={[styles.label, (disabled || loading) && styles.labelDim]} numberOfLines={1}>
        {label}
      </Text>
      <Animated.View style={[styles.circle, animStyle]}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.cream2} />
        ) : done ? (
          <Check size={18} color={colors.cream2} strokeWidth={2.5} />
        ) : (
          <ArrowRight size={18} color={colors.cream2} strokeWidth={2.5} />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream2,
    borderRadius: radius.pill,
    paddingLeft: 20,
    padding: 6,
    alignSelf: 'flex-start',
    gap: 12,
  },
  full: { alignSelf: 'stretch' },
  label: {
    flex: 1,
    fontFamily: font.sansBold,
    fontSize: 15,
    color: colors.black,
  },
  labelDim: { opacity: 0.5 },
  circle: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
