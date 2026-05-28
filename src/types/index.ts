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

export interface Message {
  id: string;
  fromId: string;
  toId: string;
  content: string;
  timestamp: string;
}
