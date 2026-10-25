export type Category = { id: number; name: string };

export type Channel = {
  id: string;
  name: string;
  image: string;
  preview: string;
  url: string;
  categories: number[];
};

export type EventTeam = { name: string; image: string };

export type LiveEvent = {
  id: number;
  slug: string;
  title: string;
  league: { name: string; image: string };
  teams: { home: EventTeam; away: EventTeam };
  time_start: string;
  time_end: string;
  players: string[];
};

export type ChannelsResponse = {
  categories: Category[];
  channels: Channel[];
};
