import { describe, expect, it } from 'vitest';
import { resolveTableChrome } from './table-chrome-pure';

describe('resolveTableChrome', () => {
  it('defaults to an open fan', () => {
    expect(resolveTableChrome({ gameType: 'freeplay' })).toEqual({
      handReveal: 'open',
      stockIntent: 'play',
      slapIntent: null,
      drawFromIntent: null,
      askRankIntent: null,
      turnButtons: [],
      showSharedPiles: true,
      reserveBattleLane: false,
      actWhen: 'seat',
      drawPicked: false,
      showTableau: false,
      showMemory: false,
      showLadders: false,
      widowSwap: false,
      holeFromState: false,
      showCorners: false,
      showFishing: false,
      showPeg: false,
      cribDiscard: false,
    });
  });

  it('reserves a battle lane for trick-taking', () => {
    expect(resolveTableChrome({ gameType: 'hearts', family: 'trick' })).toMatchObject({
      reserveBattleLane: true,
      showSharedPiles: false,
    });
  });

  it('uses a face-down stock for war', () => {
    expect(resolveTableChrome({ gameType: 'war', handReveal: 'stock' })).toEqual({
      handReveal: 'stock',
      stockIntent: 'war-play',
      slapIntent: null,
      drawFromIntent: null,
      askRankIntent: null,
      turnButtons: [],
      showSharedPiles: false,
      reserveBattleLane: true,
      actWhen: 'seat',
      drawPicked: false,
      showTableau: false,
      showMemory: false,
      showLadders: false,
      widowSwap: false,
      holeFromState: false,
      showCorners: false,
      showFishing: false,
      showPeg: false,
      cribDiscard: false,
    });
  });

  it('maps Egyptian Ratscrew to flip + slap', () => {
    expect(resolveTableChrome({ gameType: 'egyptian_ratscrew', handReveal: 'stock' })).toMatchObject({
      stockIntent: 'flip',
      slapIntent: 'slap',
    });
  });

  it('maps Old Maid to draw-from an opponent', () => {
    expect(resolveTableChrome({ gameType: 'old_maid' })).toMatchObject({
      drawFromIntent: 'draw-from',
      showSharedPiles: false,
    });
  });

  it('maps Go Fish to ask-rank', () => {
    expect(resolveTableChrome({ gameType: 'go_fish' })).toMatchObject({
      askRankIntent: 'gofish-ask',
      showSharedPiles: true,
    });
  });

  it('maps Blackjack to hit / stand', () => {
    expect(resolveTableChrome({ gameType: 'blackjack' })).toMatchObject({
      turnButtons: [
        { intent: 'hit', label: 'Hit' },
        { intent: 'stand', label: 'Stand' },
      ],
      showSharedPiles: false,
    });
  });
});
