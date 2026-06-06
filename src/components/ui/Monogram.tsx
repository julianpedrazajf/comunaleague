import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Camera } from 'lucide-react-native';
import { colors, font, radius } from '../../theme/tokens';

interface MonogramProps {
  name: string;
  lastName?: string;
  size?: number;
  shape?: 'circle' | 'square';
  imageUri?: string | null;
  onPress?: () => void;
}

export default function Monogram({
  name,
  lastName,
  size = 48,
  shape = 'circle',
  imageUri,
  onPress,
}: MonogramProps) {
  const initials = `${name[0] ?? '?'}${lastName ? lastName[0] : ''}`.toUpperCase();
  const br = shape === 'circle' ? size / 2 : radius.cardSm;

  const inner = imageUri ? (
    <Image
      source={{ uri: imageUri }}
      style={{ width: size, height: size, borderRadius: br }}
      resizeMode="cover"
    />
  ) : (
    <View style={[styles.base, { width: size, height: size, borderRadius: br }]}>
      <Text style={[styles.text, { fontSize: size * 0.32 }]}>{initials}</Text>
    </View>
  );

  if (!onPress) return inner;

  const badgeSize = Math.round(size * 0.32);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={{ width: size, height: size }}>
      {inner}
      <View style={[styles.cameraBadge, { borderRadius: badgeSize / 2, width: badgeSize, height: badgeSize }]}>
        <Camera size={badgeSize * 0.55} color={colors.cream} strokeWidth={2} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.cream25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontFamily: font.sansXBold, color: colors.cream },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
