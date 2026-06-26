import { Alert } from 'react-native';

// react-native-web ships Alert.alert as an empty no-op, so every Alert.alert
// call across the app silently does nothing in a browser. Patch it once to use
// the browser's native dialogs so confirmations and messages actually appear.
type AlertButton = {
  text?: string;
  onPress?: (value?: string) => void;
  style?: 'default' | 'cancel' | 'destructive';
};

(Alert as unknown as {
  alert: (title: string, message?: string, buttons?: AlertButton[]) => void;
}).alert = (title, message, buttons) => {
  const text = [title, message].filter(Boolean).join('\n\n');

  // No buttons or a single button: just show the message, then run its handler.
  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }

  // 2+ buttons: OK -> the confirm (non-cancel) action, Cancel -> the cancel action.
  const cancelBtn = buttons.find((b) => b.style === 'cancel');
  const confirmBtn = buttons.find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];
  if (window.confirm(text)) {
    confirmBtn?.onPress?.();
  } else {
    cancelBtn?.onPress?.();
  }
};

export {};
