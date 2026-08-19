import type { PublicState } from '../../game/engine';
import type { Card } from '../../game/types';

export type GameView = PublicState['game'];
export type PlayerView = PublicState['players'][number];

export type { Card, PublicState };
