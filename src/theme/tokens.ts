export const colors = {
  black: '#000000',
  surface1: '#101010',
  surface2: '#212121',
  cream: '#E1E0CC',
  cream2: '#DEDBC8',
  cream70: 'rgba(222,219,200,0.70)',
  cream45: 'rgba(222,219,200,0.45)',
  cream25: 'rgba(222,219,200,0.22)',
  hairline: 'rgba(222,219,200,0.10)',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  green: '#22C55E',
};

export const radius = { card: 24, cardSm: 18, chip: 999, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 18, xl: 26, xxl: 40 };

export const font = {
  sans: 'Almarai_400Regular',
  sansBold: 'Almarai_700Bold',
  sansXBold: 'Almarai_800ExtraBold',
  sansLight: 'Almarai_300Light',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
};

export const type = {
  display: {
    fontFamily: font.sansXBold,
    fontSize: 58,
    letterSpacing: -2.9,
    lineHeight: 52,
  },
  h1: {
    fontFamily: font.sansXBold,
    fontSize: 27,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: font.sansBold,
    fontSize: 20,
  },
  body: {
    fontFamily: font.sans,
    fontSize: 15,
  },
  detail: {
    fontFamily: font.sans,
    fontSize: 12.5,
    color: colors.gray400,
  },
  eyebrow: {
    fontFamily: font.sansBold,
    fontSize: 10.5,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  serifNum: {
    fontFamily: font.serifItalic,
    fontSize: 22,
  },
};

export const motion = {
  easeOut: [0.16, 1, 0.3, 1] as const,
  fadeUpDistance: 8,
  duration: 450,
};
