import { Alert } from 'react-native';

type TFunc = (key: string, opts?: Record<string, unknown>) => string;

// Shows the "not enough coins" alert with an option to buy more.
export function showInsufficientCoins(t: TFunc, goToBuyCoins: () => void): void {
  Alert.alert(
    t('coins.insufficientTitle'),
    t('coins.insufficientMessage'),
    [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('coins.buyCoins'), onPress: goToBuyCoins },
    ],
  );
}

// True if the backend error means the wallet didn't have enough coins.
export function isInsufficientCoinsError(e: any): boolean {
  return typeof e?.message === 'string' && e.message.includes('Insufficient coins');
}
