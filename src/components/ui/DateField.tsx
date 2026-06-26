import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, font } from '../../theme/tokens';

export type DateFieldProps = {
  value: Date | null;
  onChange: (date: Date) => void;
  hasError?: boolean;
  placeholder: string;
};

// Native date field: tappable row that opens the platform DateTimePicker.
// The web variant lives in DateField.web.tsx (Metro picks it for web builds).
export default function DateField({ value, onChange, hasError, placeholder }: DateFieldProps) {
  const [show, setShow] = React.useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.input, hasError && styles.inputError]}
        onPress={() => setShow(true)}
        activeOpacity={0.8}
      >
        <Text style={value ? styles.dateText : styles.placeholder}>
          {value ? value.toLocaleDateString() : placeholder}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value ?? new Date(2000, 0, 1)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          themeVariant="dark"
          textColor={colors.cream}
          maximumDate={new Date()}
          onChange={(_event, date) => {
            setShow(Platform.OS === 'ios');
            if (date) onChange(date);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputError: { borderColor: 'rgba(239,68,68,0.6)' },
  dateText: { fontFamily: font.sans, fontSize: 15, color: colors.cream },
  placeholder: { fontFamily: font.sans, fontSize: 15, color: colors.cream45 },
});
