import type { ComponentType } from 'react';
import type { GameType } from '../../game/gameTypes';
import type { PublicState } from '../../game/engine';
import { GameTable } from '../components/GameTable';

export type TableProps = {
  game: PublicState['game'];
  player: PublicState['players'][number];
  players: PublicState['players'];
  send: (action: { intent: string; [k: string]: unknown }) => void;
  busy: boolean;
  busyHint?: string;
  showInvite?: boolean;
  canAct?: (action: { intent: string; [k: string]: unknown }) => boolean;
};

/** One felt table for every game. Surface look comes from the theme registry. */
export function tableFor(_type: GameType): ComponentType<TableProps> {
  return GameTable;
}
