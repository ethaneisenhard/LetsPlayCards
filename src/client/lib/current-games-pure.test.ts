import { describe, expect, it } from 'vitest';
import {
  forgetRememberedGame,
  mergePlayerCodes,
  parseRememberedGames,
  playerCodesFromStorageKeys,
  upsertRememberedGame,
} from './current-games-pure';

describe('current games', () => {
  it('parses valid rows and drops junk', () => {
    expect(
      parseRememberedGames([
        { code: 'ABC123', gameType: 'freeplay', rememberedAt: 1 },
        { code: '', gameType: 'war', rememberedAt: 1 },
        { nope: true },
      ]),
    ).toEqual([{ code: 'ABC123', gameType: 'freeplay', rememberedAt: 1 }]);
  });

  it('upserts by code and moves the row to the front', () => {
    const list = [
      { code: 'OLD111', gameType: 'war', rememberedAt: 1 },
      { code: 'ABC123', gameType: 'unknown', rememberedAt: 1 },
    ];
    expect(upsertRememberedGame(list, { code: 'abc123', gameType: 'freeplay', rememberedAt: 9 })).toEqual([
      { code: 'ABC123', gameType: 'freeplay', rememberedAt: 9 },
      { code: 'OLD111', gameType: 'war', rememberedAt: 1 },
    ]);
  });

  it('forgets by code', () => {
    const list = [{ code: 'ABC123', gameType: 'war', rememberedAt: 1 }];
    expect(forgetRememberedGame(list, 'abc123')).toEqual([]);
  });

  it('recovers codes from player localStorage keys', () => {
    expect(playerCodesFromStorageKeys(['lpc:player:abc123', 'lpc:name', 'lpc:player:ZZZ999'])).toEqual([
      'ABC123',
      'ZZZ999',
    ]);
  });

  it('merges unknown player-key games without clobbering known types', () => {
    const list = [{ code: 'ABC123', gameType: 'freeplay', rememberedAt: 1 }];
    expect(mergePlayerCodes(list, ['abc123', 'new444'], 50)).toEqual([
      { code: 'NEW444', gameType: 'unknown', rememberedAt: 50 },
      { code: 'ABC123', gameType: 'freeplay', rememberedAt: 1 },
    ]);
  });
});
