import React from 'react';
import { colors, font } from '../../theme/tokens';
import type { DateFieldProps } from './DateField';

// Web date field: a real <input type="date"> so the browser's native date
// picker works. (react-native-web's TextInput drops the `type` prop, and
// @react-native-community/datetimepicker renders nothing on web.)
// Format from LOCAL components (the Date is created at local midnight below).
// Using toISOString() here would drift a day back in timezones east of UTC.
const toInputValue = (d: Date | null) => {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function DateField({ value, onChange, hasError }: DateFieldProps) {
  return (
    <input
      type="date"
      max={new Date().toISOString().slice(0, 10)}
      // Uncontrolled (defaultValue, not value): a controlled date input gets
      // wiped while the user fills it segment by segment, because its .value
      // stays "" until all of day/month/year are entered and React keeps
      // resetting it. defaultValue lets the browser own the in-progress entry.
      defaultValue={toInputValue(value)}
      onClick={(e) => {
        // On desktop, clicking the field doesn't open the calendar (only the
        // small icon does), so it feels broken. Match the native app: tapping
        // anywhere on the field opens the picker. Guarded for older browsers
        // and the "already open" case (e.g. clicking the icon itself).
        try {
          e.currentTarget.showPicker();
        } catch {
          /* showPicker unsupported or already showing — fall back to default */
        }
      }}
      onChange={(e) => {
        const v = e.target.value;
        // Parse at local midnight so getAge() doesn't drift a day from UTC.
        // Empty while the date is incomplete — only report once it's valid.
        if (v) onChange(new Date(v + 'T00:00:00'));
      }}
      style={{
        backgroundColor: colors.surface1,
        color: colors.cream,
        border: `1px solid ${hasError ? 'rgba(239,68,68,0.6)' : colors.hairline}`,
        borderRadius: 14,
        padding: '14px 16px',
        fontSize: 15,
        fontFamily: font.sans,
        width: '100%',
        boxSizing: 'border-box',
        colorScheme: 'dark',
        outline: 'none',
      }}
    />
  );
}
