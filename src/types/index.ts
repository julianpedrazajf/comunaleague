export type UserPosition =
  | 'goalkeeper'
  | 'defender'
  | 'center_back'
  | 'right_back'
  | 'left_back'
  | 'sweeper'
  | 'midfielder'
  | 'central_midfielder'
  | 'defensive_midfielder'
  | 'attacking_midfielder'
  | 'winger'
  | 'right_winger'
  | 'left_winger'
  | 'forward'
  | 'striker'
  | 'second_striker';

export type PreferredFoot = 'left' | 'right' | 'both';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
export type TeamFormat = 5 | 11;
export type TournamentType = 'league' | 'daily';
export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  email: string;
  name: string;
  lastName: string;
  age: number;
  country: string;
  city: string;
  position: UserPosition;
  foot: PreferredFoot;
  height: number;
  skillLevel: SkillLevel;
  favoriteTeam?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  badgeUrl?: string;
  format: TeamFormat;
  playerIds: string[];
  ownerId: string;
  createdAt: string;
}

export interface Tournament {
  id: string;
  name: string;
  type: TournamentType;
  format: TeamFormat;
  startDate: string;
  location: string;
  registrationDeadline: string;
  price: number;
}

export interface Match {
  id: string;
  date: string;
  time: string;
  location: string;
  homeTeamId: string;
  awayTeamId: string;
  result?: string;
  confirmedPlayerIds: string[];
}

export interface Registration {
  id: string;
  userId?: string;
  teamId?: string;
  tournamentId: string;
  status: RegistrationStatus;
  paymentId?: string;
}

export interface PlayerStats {
  id: string;
  userId: string;
  position: number;
  goals: number;
  assists: number;
  matches: number;
  updatedAt: string;
}

export interface Standing {
  id: string;
  teamId: string;
  tournamentId: string | null;
  position: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  updatedAt: string;
}

export interface Message {
  id: string;
  fromId: string;
  toId: string;
  content: string;
  timestamp: string;
}

export interface PlayerRequest {
  id: string;
  teamId: string;
  matchId: string;
  createdAt: string;
  status: 'open' | 'cancelled';
  team?: { name: string; badgeUrl?: string; format: TeamFormat };
  match?: { date: string; time: string; location: string };
}

export type NotificationType =
  | 'player_request_interest'
  | 'player_request_accepted'
  | 'player_request_rejected';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  relatedId?: string;
  fromUserId?: string;
  fromName?: string;
  read: boolean;
  response?: 'accepted' | 'rejected';
  createdAt: string;
}
