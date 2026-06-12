// Placeholder prices (COP) for the simulated payment flow.
// Adjust here when real MercadoPago pricing is defined.
export const PRICES = {
  createTeam: 50000,
  joinTeam: 30000,
  oneMatch: 10000,
};

export const TEAM_CAPACITY = 8;
export const DAILY_MATCH_CAPACITY = 18;

export function formatCOP(amount: number): string {
  return `$${amount.toLocaleString('es-CO')}`;
}
