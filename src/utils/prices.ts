// Comuna Coins economy.
// Users buy coins with one (simulated) payment, then spend coins on actions.
// Adjust these placeholders when real pricing is defined.

// Coin cost per action.
export const COIN_COSTS = {
  createTeam: 50,
  joinTeam: 30,
  dailyMatch: 20,
  oneMatch: 10,
};

// Coin bundles the user can buy (price in COP).
export const COIN_BUNDLES = [
  { coins: 50, price: 50000 },
  { coins: 100, price: 95000 },
  { coins: 200, price: 180000 },
];

export const TEAM_CAPACITY = 8;
export const DAILY_MATCH_CAPACITY = 18;

export function formatCOP(amount: number): string {
  return `$${amount.toLocaleString('es-CO')}`;
}
