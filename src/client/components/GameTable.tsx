import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BattleLane } from './BattleLane';
import { CenterPile } from './CenterPile';
import { CardFlightLayer } from './CardFlightLayer';
import { RulesOverlay } from './RulesOverlay';
import { CardHand } from './CardHand';
import { FeltBoardExtras } from './FeltBoardExtras';
import { MemoryGrid } from './MemoryGrid';
import { PlayerSeat } from './PlayerSeat';
import { PlayingCard } from './PlayingCard';
import { StockPile } from './StockPile';
import { TableauBoard } from './TableauBoard';
import { rulesCardFor } from '../lib/game-rules-pure';
import type { GameView, PlayerView } from '../lib/types';
import type { Card } from '../../game/types';
import { GLOSSARY } from '../../content/glossary';
import { resolveTableKind } from '../../game/audit/playability-registry-pure';
import { catalogEntry, GAME_CONFIGS } from '../../game/registry/catalog';
import { resolveFeltActions } from '../lib/felt-actions-pure';
import {
  laneFlights,
  originAnchor,
  type CardFlightPlan,
} from '../lib/card-flight-pure';
import { centerBattleSlots, centerPileCards, hasSharedCenterPile, labeledCenterRows, laneSnapshotFromState } from '../lib/center-projection-pure';
import { useChrome } from '../lib/chrome';
import { resolveActorId, resolveIsMyTurn } from '../lib/felt-turn-pure';
import { bookCounts, bookScoreLine, lastAskLine } from '../lib/last-ask-pure';
import { PREFS_CHANGED_EVENT } from '../lib/prefs-events';
import { suitLaddersFromPlayed } from '../lib/suit-ladder-pure';
import { resolveTableChrome } from '../lib/table-chrome-pure';
import { resolveSurface } from '../lib/table-theme';
import { shouldAutoWarCollect, WAR_REVEAL_HOLD_MS } from '../lib/war-reveal-pure';

const DUMMY_CARD = { id: 'back', suit: 'spades' as const, rank: 'A' as const };

function FaceDownStock({
  count,
  onFlip,
  disabled,
  mobile,
  playerId,
}: {
  count: number;
  onFlip: () => void;
  disabled: boolean;
  mobile?: boolean;
  playerId: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-3">
      <div className="text-gold/70 text-xs tracking-widest uppercase font-semibold">Your pile</div>
      <StockPile
        playerId={playerId}
        count={count}
        onFlip={onFlip}
        disabled={disabled}
        small={mobile}
      />
      <p className="text-white/35 text-xs h-4">
        {count === 0 ? 'No cards left' : disabled ? 'Wait…' : 'Click the pile to flip'}
      </p>
    </div>
  );
}

interface GameTableProps {
  game: GameView;
  players: PlayerView[];
  player: PlayerView;
  send: (action: { intent: string; [k: string]: unknown }) => void;
  busy: boolean;
  busyHint?: string;
  showInvite?: boolean;
  canAct?: (action: { intent: string; [k: string]: unknown }) => boolean;
}

export function GameTable({
  game,
  players,
  player,
  send,
  busy,
  busyHint,
  showInvite = true,
  canAct,
}: GameTableProps) {
  const config = GAME_CONFIGS[game.gameType] ?? GAME_CONFIGS.freeplay;
  const rules = rulesCardFor(config, GLOSSARY[game.gameType]);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [themeTick, setThemeTick] = useState(0);
  const [pickedCardId, setPickedCardId] = useState<string | null>(null);
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null);
  const { setActiveGameType } = useChrome();
  const theme = useMemo(
    () => resolveSurface(game.gameType, config.tableTheme),
    [game.gameType, config.tableTheme, themeTick],
  );
  const entry = catalogEntry(game.gameType);
  const chrome = resolveTableChrome({
    gameType: game.gameType,
    handReveal: config.handReveal,
    family: entry?.family,
  });
  const felt = resolveFeltActions({
    tableKind: entry ? resolveTableKind(entry) : 'special',
    family: entry?.family,
    gameType: game.gameType,
  });
  const allowPlay =
    felt.allowPlay &&
    (!canAct || player.hand.some((card) => canAct({ intent: 'play', cardId: card.id })));
  const allowDiscard =
    felt.allowDiscard &&
    (!canAct || player.hand.some((card) => canAct({ intent: 'discard', cardId: card.id })));

  useEffect(() => {
    setActiveGameType(game.gameType);
    return () => setActiveGameType(undefined);
  }, [game.gameType, setActiveGameType]);

  useEffect(() => {
    const sync = () => setThemeTick((n) => n + 1);
    window.addEventListener(PREFS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(PREFS_CHANGED_EVENT, sync);
  }, []);

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  function trySend(action: { intent: string; [k: string]: unknown }) {
    const tableauIntent = action.intent === 'move' || action.intent === 'draw-stock' || action.intent === 'deal-row';
    if (!tableauIntent && canAct && !canAct(action)) return;
    send(action);
  }
  function handlePlay(card: Card) {
    trySend({ intent: 'play', cardId: card.id });
  }
  function handleDiscard(card: Card) {
    trySend({ intent: 'discard', cardId: card.id });
  }
  function handleDraw() {
    trySend({ intent: 'draw' });
  }
  function handlePickup(cardId: string) {
    trySend({ intent: 'pickup', cardId });
  }
  function handleFlipStock() {
    trySend({ intent: chrome.stockIntent });
  }
  function handleSlap() {
    if (!chrome.slapIntent) return;
    trySend({ intent: chrome.slapIntent });
  }
  function handleDrawFrom(targetId: string) {
    if (!chrome.drawFromIntent) return;
    trySend({ intent: chrome.drawFromIntent, targetId });
  }

  const opponents = players.filter((p) => p.id !== player.id);
  const gs = (game.gameState ?? {}) as {
    roundCards?: Record<string, Card[]>;
    currentTrick?: { playerId: string; card: Card }[];
    roundWinnerId?: string | null;
    center?: Card[];
    current?: string;
    currentPlayerId?: string;
    lastAsk?: { fromName: string; toName: string; rank: string; result: 'success' | 'go_fish' } | null;
    books?: Record<string, unknown[]>;
    dealer?: Card[];
    community?: Card[];
    playerHand?: Card[];
    bankerHand?: Card[];
    widow?: Card[];
    grid?: unknown;
    played?: Record<string, { min: number; max: number } | null>;
    cards?: Record<string, Card>;
    tokens?: Record<string, number>;
    lives?: Record<string, number>;
    chips?: Record<string, number>;
    pairs?: Record<string, number>;
    pot?: number;
    phase?: string;
    bets?: Record<string, unknown>;
    drawn?: Record<string, boolean>;
    currentBet?: number;
    drawsLeft?: number;
    corners?: unknown;
    table?: unknown;
    builds?: unknown;
    scores?: Record<string, number>;
    starter?: Card | null;
    peggingPlays?: { card: Card }[];
    pegTotal?: number;
    countQueue?: { playerId: string }[];
  };
  const actorId = resolveActorId(gs);
  const isMyTurn = resolveIsMyTurn({
    actWhen: chrome.actWhen,
    actorId,
    playerId: player.id,
    currentSeat: game.currentSeat,
    playerSeat: player.seat,
    phase: gs.phase,
    hasBet: Boolean(gs.bets && player.id in gs.bets),
    hasDrawn: gs.drawn?.[player.id] === true,
  });
  const drawsLeft = gs.drawsLeft;
  const hasDrawLimit = typeof drawsLeft === 'number';
  const currentTurnPlayer = actorId
    ? players.find((p) => p.id === actorId)
    : players.find((p) => p.seat === game.currentSeat);
  const pickedRank = player.hand.find((c) => c.id === pickedCardId)?.rank ?? null;
  const books = bookCounts(gs.books);
  const askLine = lastAskLine(gs.lastAsk);
  const scoreLine = bookScoreLine(books, players);
  const extraRows = labeledCenterRows(
    chrome.widowSwap
      ? Object.fromEntries(Object.entries(gs as Record<string, unknown>).filter(([k]) => k !== 'widow'))
      : (gs as Record<string, unknown>),
  );
  const ladders = chrome.showLadders ? suitLaddersFromPlayed(gs.played) : [];
  const hole = chrome.holeFromState ? gs.cards?.[player.id] : undefined;
  const seatScore = (id: string): string | undefined => {
    if (gs.books) return `${books[id] ?? 0} books`;
    if (gs.tokens) return `${gs.tokens[id] ?? 0} tokens`;
    if (gs.lives) return `${gs.lives[id] ?? 0} lives`;
    if (gs.chips) return `${gs.chips[id] ?? 0} chips`;
    if (gs.pairs) return `${gs.pairs[id] ?? 0} pairs`;
    if (gs.scores) return `${gs.scores[id] ?? 0}`;
    return undefined;
  };

  function handleTurnButton(b: { intent: string; label: string; amount?: number; side?: string }) {
    const action: { intent: string; [k: string]: unknown } = { intent: b.intent };
    if (b.side) action.side = b.side;
    if (b.intent === 'raise') {
      const currentBet = typeof gs.currentBet === 'number' ? gs.currentBet : 0;
      action.amount = currentBet > 0 ? currentBet : 2;
    } else if (typeof b.amount === 'number') {
      action.amount = b.amount;
    }
    if (chrome.drawPicked && b.intent === 'draw') action.cardIds = pickedIds;
    if (b.intent === 'discard-to-crib') action.cards = pickedIds;
    if ((b.intent === 'play-center' || b.intent === 'trail' || b.intent === 'discard') && pickedCardId) {
      action.cardId = pickedCardId;
    }
    if ((b.intent === 'capture' || b.intent === 'build') && pickedCardId) {
      action.cardId = pickedCardId;
      action.targetIds = targetIds;
    }
    if (b.intent === 'capture-build' && pickedCardId && selectedBuildId) {
      action.cardId = pickedCardId;
      action.buildId = selectedBuildId;
    }
    trySend(action);
    setPickedIds([]);
    setTargetIds([]);
    setSelectedBuildId(null);
  }
  function handlePick(card: Card) {
    if (chrome.drawPicked || chrome.cribDiscard) {
      setPickedIds((ids) => (ids.includes(card.id) ? ids.filter((id) => id !== card.id) : [...ids, card.id]));
      return;
    }
    setPickedCardId((id) => (id === card.id ? null : card.id));
  }
  const canPickHand = Boolean(
    chrome.askRankIntent ||
      chrome.widowSwap ||
      chrome.drawPicked ||
      chrome.cribDiscard ||
      chrome.showCorners ||
      chrome.showFishing,
  );

  function handleTarget(targetId: string) {
    if (chrome.askRankIntent) {
      if (!pickedRank) return;
      trySend({ intent: chrome.askRankIntent, rank: pickedRank, targetId });
      setPickedCardId(null);
      return;
    }
    handleDrawFrom(targetId);
  }
  function canTarget(opp: PlayerView): boolean {
    if (busy || !isMyTurn || opp.handCount === 0) return false;
    if (chrome.askRankIntent) {
      if (!pickedRank) return false;
      return !canAct || canAct({ intent: chrome.askRankIntent, rank: pickedRank, targetId: opp.id });
    }
    if (chrome.drawFromIntent) {
      if (player.handCount === 0) return false;
      return !canAct || canAct({ intent: chrome.drawFromIntent, targetId: opp.id });
    }
    return false;
  }
  const seatTarget = Boolean(chrome.drawFromIntent || chrome.askRankIntent);

  useEffect(() => {
    setPickedCardId(null);
    setPickedIds([]);
    setTargetIds([]);
    setSelectedBuildId(null);
  }, [game.currentSeat, game.gameType, player.id, actorId]);
  const canDraw =
    felt.allowDraw &&
    isMyTurn &&
    game.deckCount > 0 &&
    (!hasDrawLimit || drawsLeft > 0) &&
    (!canAct || canAct({ intent: 'draw' }));
  const snap = laneSnapshotFromState(gs);
  const battleSlots = centerBattleSlots(players, gs);
  const centerCards = centerPileCards(gs);
  const showCenterPile = hasSharedCenterPile(gs) && !chrome.showCorners && !chrome.showFishing;
  const showBattle = !showCenterPile && (chrome.reserveBattleLane || battleSlots.some((s) => s.cards.length > 0));
  const canSlap = Boolean(chrome.slapIntent) && !busy && centerCards.length > 0;
  const flipNeedsTurn = chrome.stockIntent !== 'war-play';
  const stockDisabled = busy || player.handCount === 0 || (flipNeedsTurn && !isMyTurn);
  const [heldWinner, setHeldWinner] = useState<string | null>(null);
  const cardsOnLane = battleSlots.some((s) => s.cards.length > 0);
  useEffect(() => {
    if (gs.roundWinnerId) setHeldWinner(gs.roundWinnerId);
    if (cardsOnLane || busy) return;
    const t = setTimeout(() => setHeldWinner(null), 560);
    return () => clearTimeout(t);
  }, [gs.roundWinnerId, cardsOnLane, busy]);

  // Multiplayer War: winner settles after a hold so both cards can sit, shake, then fly home.
  // Solo matches already settle via the bot loop (`canAct` is set).
  useEffect(() => {
    if (
      !shouldAutoWarCollect({
        phase: gs.phase,
        roundWinnerId: gs.roundWinnerId,
        playerId: player.id,
        hasLocalSettle: Boolean(canAct),
      })
    ) {
      return;
    }
    if (busy) return;
    const t = setTimeout(() => {
      send({ intent: 'war-collect' });
    }, WAR_REVEAL_HOLD_MS);
    return () => clearTimeout(t);
  }, [gs.phase, gs.roundWinnerId, player.id, busy, canAct, send]);

  const snapStamp = battleSlots.map((s) => `${s.playerId}:${s.cards.map((c) => c.id).join(',')}`).join('|');
  const prevSnap = useRef(snap);
  const prevType = useRef(game.gameType);
  const [flights, setFlights] = useState<CardFlightPlan[]>([]);
  useEffect(() => {
    if (prevType.current !== game.gameType) {
      prevType.current = game.gameType;
      prevSnap.current = snap;
      setFlights([]);
      return;
    }
    const planned = laneFlights(prevSnap.current, snap, gs.roundWinnerId ?? heldWinner);
    prevSnap.current = snap;
    if (planned.length) {
      setFlights((cur) => {
        const have = new Set(cur.map((f) => f.key));
        const add = planned.filter((f) => !have.has(f.key));
        return add.length ? [...cur, ...add] : cur;
      });
    }
  }, [snapStamp, game.gameType, gs.roundWinnerId, heldWinner]);
  const onFlightDone = useCallback((key: string) => {
    setFlights((cur) => cur.filter((f) => f.key !== key));
  }, []);
  const hiddenCardIds = new Set(flights.map((f) => f.card.id));
  const revealWinnerId = gs.phase === 'reveal' ? (gs.roundWinnerId ?? null) : null;
  const winnerName = revealWinnerId
    ? (players.find((p) => p.id === revealWinnerId)?.name ?? 'Winner')
    : null;

  const stock = chrome.handReveal === 'stock';

  return (
    <div className="flex flex-col w-full h-full min-h-0 select-none" style={{ background: theme.pageBg }}>
      <div className="relative z-30 flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-white/5 shrink-0 h-11">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-white font-bold text-sm truncate">{config.name}</span>
          {showInvite && (
            <span className="text-gold font-mono font-bold tracking-widest text-xs">{game.code}</span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <a href="/" className="text-white/40 hover:text-gold/80 text-xs transition-colors">
            ⟳ Change game
          </a>
          {showInvite && (
            <button onClick={copyInviteLink} className="text-white/30 hover:text-gold/70 text-xs transition-colors">
              {copied ? '✓ Copied!' : '⧉ Invite'}
            </button>
          )}
          <span className="text-white/30 text-xs hidden sm:inline">{players.length}P</span>
          <div className={`w-2 h-2 rounded-full ${game.deckCount > 0 ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
          <div className="relative">
            <button
              type="button"
              onClick={() => setRulesOpen((v) => !v)}
              aria-expanded={rulesOpen}
              className={`text-xs font-semibold ${rulesOpen ? 'text-gold' : 'text-white/50 hover:text-gold/80'}`}
            >
              Rules
            </button>
            {rulesOpen && <RulesOverlay card={rules} onClose={() => setRulesOpen(false)} />}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 px-4 border-b border-white/5 text-xs shrink-0 h-8">
        <span className={busy ? 'text-gold/80 font-semibold' : isMyTurn ? 'text-emerald-400 font-semibold' : 'text-white/40'}>
          {busy
            ? (busyHint ?? 'Opponent is playing…')
            : revealWinnerId
              ? revealWinnerId === player.id
                ? '● You won — cards coming home…'
                : `● ${winnerName} won — collecting…`
              : isMyTurn
              ? chrome.drawFromIntent
                ? '● Your turn · click a player to draw'
                : chrome.askRankIntent
                  ? pickedRank
                    ? `● Ask someone for ${pickedRank}s`
                    : '● Your turn · pick a rank, then a player'
                  : chrome.turnButtons.length > 0
                    ? '● Your turn · Hit or Stand'
                    : '● Your turn'
              : `Waiting for ${currentTurnPlayer?.name ?? '…'}…`}
        </span>
        {isMyTurn && hasDrawLimit && (
          <span className="text-white/30">
            · {drawsLeft > 0 ? `${drawsLeft} draw${drawsLeft !== 1 ? 's' : ''} left` : 'no draws left'} · discard to end turn
          </span>
        )}
      </div>

      {/* ── MOBILE LAYOUT ── */}
      <div className="flex-1 flex flex-col overflow-hidden sm:hidden min-h-0 w-full">
        {opponents.length > 0 && (
        <div className="flex items-center justify-center gap-4 px-4 py-3 border-b border-white/5 shrink-0">
          {opponents.slice(0, 4).map((opp) => (
            <StockPile
              key={opp.id}
              playerId={opp.id}
              count={opp.handCount}
              name={opp.name}
              small
              onFlip={seatTarget ? () => handleTarget(opp.id) : undefined}
              disabled={!canTarget(opp)}
              actionLabel={
                chrome.askRankIntent
                  ? pickedRank
                    ? `Ask ${opp.name} for ${pickedRank}s`
                    : `Ask ${opp.name}`
                  : chrome.drawFromIntent
                    ? `Draw from ${opp.name}`
                    : undefined
              }
            />
          ))}
        </div>
        )}

        <div className={`flex-1 flex items-center justify-center gap-6 px-4 py-6 min-h-0 w-full ${chrome.showTableau ? 'overflow-auto items-start' : 'overflow-hidden'}`} style={{ background: theme.mobileFelt }}>
          {chrome.showSharedPiles && (
          <div className="flex flex-col items-center gap-1 w-12 shrink-0">
            <button onClick={handleDraw} disabled={busy || !canDraw} className="group relative">
              <div className="relative w-12 h-[68px]">
                {game.deckCount > 1 && <div className="absolute -top-0.5 -left-0.5 w-12 h-[68px] rounded-lg bg-indigo-800/80 border border-white/10" />}
                <div className="relative z-10 w-12 h-[68px] rounded-lg bg-linear-to-br from-indigo-700 to-slate-800 border border-white/20 flex items-center justify-center shadow-lg group-hover:shadow-emerald-900/30 transition-all">
                  <span className="text-white/30 text-[10px] font-bold">{game.deckCount}</span>
                </div>
              </div>
            </button>
            <span className={`h-3 text-[9px] ${canDraw ? 'text-gold/40' : 'text-white/20'}`}>
              {game.deckCount > 0 ? (canDraw ? 'Draw' : 'No draws') : ''}
            </span>
          </div>
          )}

          {showBattle && (
            <BattleLane
              slots={battleSlots}
              players={players}
              hiddenCardIds={hiddenCardIds}
              winnerId={revealWinnerId}
              small
            />
          )}
          {showCenterPile && (
            <CenterPile cards={centerCards} onSlap={handleSlap} canSlap={canSlap} small />
          )}
          {chrome.showTableau && (
            <TableauBoard gameType={game.gameType} gameState={gs as Record<string, unknown>} viewerId={player.id} busy={busy} onAction={trySend} />
          )}
          {chrome.showMemory && (
            <MemoryGrid grid={gs.grid} busy={busy || !isMyTurn} onFlip={(index) => trySend({ intent: 'flip', index })} />
          )}
          {chrome.drawFromIntent && isMyTurn && !busy && (
            <p className="text-white/45 text-xs text-center max-w-[10rem]">Click a player to draw</p>
          )}
          {(askLine || scoreLine || extraRows.length > 0 || chrome.turnButtons.length > 0 || ladders.length > 0 || hole || chrome.widowSwap || chrome.showCorners || chrome.showFishing || chrome.showPeg) && (
            <div className="flex flex-col items-center gap-2 max-w-[14rem]">
              {typeof gs.pot === 'number' && <p className="text-gold/60 text-[10px]">Pot {gs.pot}</p>}
              <FeltBoardExtras
                showCorners={chrome.showCorners}
                showFishing={chrome.showFishing}
                showPeg={chrome.showPeg}
                gameState={gs as Record<string, unknown>}
                pickedCardId={pickedCardId}
                targetIds={targetIds}
                selectedBuildId={selectedBuildId}
                disabled={busy || !isMyTurn}
                onCorner={(index) => {
                  if (!pickedCardId) return;
                  trySend({ intent: 'play', cardId: pickedCardId, corner: index });
                  setPickedCardId(null);
                }}
                onToggleTable={(cardId) =>
                  setTargetIds((ids) => (ids.includes(cardId) ? ids.filter((id) => id !== cardId) : [...ids, cardId]))
                }
                onSelectBuild={setSelectedBuildId}
              />
              {ladders.map((row) => (
                <span key={row.suit} className="text-white/50 text-[10px]">{row.mark} {row.label}</span>
              ))}
              {hole && (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-white/40 text-[10px] uppercase">Your card</span>
                  <PlayingCard card={hole} small />
                </div>
              )}
              {chrome.widowSwap && (gs.widow ?? []).length > 0 && (
                <div className="flex gap-1">
                  {(gs.widow ?? []).map((card, i) => (
                    <PlayingCard
                      key={card.id}
                      card={card}
                      small
                      onClick={() => {
                        if (!pickedCardId) return;
                        trySend({ intent: 'swap', cardId: pickedCardId, from: 'widow', widowIndex: i });
                        setPickedCardId(null);
                      }}
                      disabled={busy || !isMyTurn || !pickedCardId}
                    />
                  ))}
                </div>
              )}
              {extraRows.map((row) => (
                <div key={row.label} className="flex flex-col items-center gap-1">
                  <span className="text-white/40 text-[10px] uppercase tracking-widest">{row.label}</span>
                  <div className="flex gap-1">
                    {row.cards.map((card) => (
                      <PlayingCard key={card.id} card={card} small />
                    ))}
                  </div>
                </div>
              ))}
              {chrome.turnButtons.length > 0 && isMyTurn && !busy && (
                <div className="flex flex-wrap justify-center gap-2">
                  {chrome.turnButtons.map((b) => (
                    <button
                      key={`${b.intent}-${b.side ?? ''}-${b.label}`}
                      type="button"
                      onClick={() => handleTurnButton(b)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold"
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              )}
              {askLine && <p className="text-white/50 text-[10px] text-center">{askLine}</p>}
              {scoreLine && <p className="text-gold/50 text-[10px] text-center">Books · {scoreLine}</p>}
            </div>
          )}

          {game.tableCards.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center max-w-[160px]">
              {game.tableCards.slice(0, 4).map((card) => (
                <button key={`${card.id}-${card.playedBy}`} onClick={() => handlePickup(card.id)} disabled={busy || !isMyTurn || !felt.allowPickup} className="w-10 h-14 rounded-lg bg-white border border-white/40 flex flex-col justify-between p-0.5 text-[8px] hover:scale-105 transition-all">
                  <span className={card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600 font-bold' : 'text-slate-800 font-bold'}>{card.rank}</span>
                  <span className={`text-center text-base ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-slate-800'}`}>
                    {card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}
                  </span>
                </button>
              ))}
              {game.tableCards.length > 4 && (
                <div className="w-10 h-14 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-white/30 text-[9px]">
                  +{game.tableCards.length - 4}
                </div>
              )}
            </div>
          )}

          {chrome.showSharedPiles && (
          <div className="flex flex-col items-center gap-1 w-12 shrink-0">
            <div className="w-12 h-[68px] rounded-lg border border-dashed border-white/20 flex items-center justify-center">
              {game.discardPile.length > 0 ? (
                <div className="w-12 h-[68px] rounded-lg bg-white border border-white/40 flex flex-col justify-between p-0.5">
                  <span className={`text-[8px] font-bold ${game.discardPile[game.discardPile.length - 1].suit === 'hearts' || game.discardPile[game.discardPile.length - 1].suit === 'diamonds' ? 'text-red-600' : 'text-slate-800'}`}>
                    {game.discardPile[game.discardPile.length - 1].rank}
                  </span>
                  <span className={`text-center text-base ${game.discardPile[game.discardPile.length - 1].suit === 'hearts' || game.discardPile[game.discardPile.length - 1].suit === 'diamonds' ? 'text-red-600' : 'text-slate-800'}`}>
                    {game.discardPile[game.discardPile.length - 1].suit === 'hearts' ? '♥' : game.discardPile[game.discardPile.length - 1].suit === 'diamonds' ? '♦' : game.discardPile[game.discardPile.length - 1].suit === 'clubs' ? '♣' : '♠'}
                  </span>
                </div>
              ) : (
                <span className="text-white/15 text-[9px] text-center">Discard</span>
              )}
            </div>
            <span className="text-white/20 text-[9px] h-3">{game.discardPile.length}</span>
          </div>
          )}
        </div>

        <div className="border-t border-white/5 shrink-0 pb-[env(safe-area-inset-bottom)]" style={{ background: theme.handBg }}>
          {stock ? (
            <FaceDownStock
              playerId={player.id}
              count={player.handCount}
              onFlip={handleFlipStock}
              disabled={stockDisabled}
              mobile
            />
          ) : chrome.showTableau ? null : (
            <div data-card-anchor={originAnchor(player.id)}>
              <CardHand
                cards={player.hand}
                onPlay={allowPlay ? handlePlay : undefined}
                onDiscard={allowDiscard ? handleDiscard : undefined}
                onPick={canPickHand ? handlePick : undefined}
                pickedCardId={pickedCardId}
                pickedCardIds={chrome.drawPicked || chrome.cribDiscard ? pickedIds : undefined}
                pickHint={
                  chrome.askRankIntent
                    ? pickedRank
                      ? `Ask someone for ${pickedRank}s`
                      : 'Tap a rank you hold'
                    : undefined
                }
                playerName={player.name}
                isMyTurn={isMyTurn && !busy}
                mobile
              />
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP LAYOUT ── */}
      <div
        className={
          stock
            ? 'hidden sm:grid flex-1 min-h-0 w-full relative overflow-hidden grid-rows-[auto_minmax(0,1fr)_auto]'
            : 'hidden sm:flex flex-1 min-h-0 w-full flex-col relative overflow-hidden'
        }
      >
        <div className="absolute inset-3 sm:inset-5 rounded-[2rem] sm:rounded-[48px] shadow-[inset_0_0_80px_rgba(0,0,0,0.6),0_0_60px_rgba(0,0,0,0.8)]" style={{ background: theme.desktopFelt }} />
        <div className="absolute inset-2 sm:inset-3 rounded-[2.25rem] sm:rounded-[56px] border-4 pointer-events-none" style={{ borderColor: theme.rail }} />

        {opponents.length > 0 && (
        <div className="relative z-10 flex justify-center items-center gap-8 pt-6 px-10 shrink-0 min-h-[6.5rem]">
          {opponents.slice(0, 3).map((opp) => (
            <PlayerSeat
              key={opp.id}
              player={opp}
              position="top"
              stock={stock}
              onSelect={seatTarget ? () => handleTarget(opp.id) : undefined}
              selectLabel={
                chrome.askRankIntent
                  ? pickedRank
                    ? `Ask ${opp.name} for ${pickedRank}s`
                    : `Ask ${opp.name}`
                  : chrome.drawFromIntent
                    ? `Draw from ${opp.name}`
                    : undefined
              }
              selectDisabled={!canTarget(opp)}
              scoreLabel={seatScore(opp.id)}
            />
          ))}
        </div>
        )}

        <div className={`relative z-10 flex-1 flex items-center justify-center gap-8 py-4 min-h-0 ${chrome.showTableau ? 'overflow-auto items-start pt-8' : ''}`}>
          {chrome.showSharedPiles && (
          <div className="flex flex-col items-center gap-2 w-[70px] shrink-0">
            <button onClick={handleDraw} disabled={busy || !canDraw} className="group relative">
              <div className="relative w-[70px] h-[100px]">
                {[2, 1, 0].map((offset) => (
                  <div key={offset} className="absolute" style={{ top: -offset * 2, left: offset }}>
                    <PlayingCard card={DUMMY_CARD} faceDown />
                  </div>
                ))}
                <div className="relative z-10">
                  <PlayingCard card={DUMMY_CARD} faceDown />
                </div>
              </div>
            </button>
            <span className="text-white/50 text-xs h-4 tabular-nums">{game.deckCount} left</span>
            <span className={`h-4 text-[10px] tracking-wide ${canDraw ? 'text-gold/60' : 'text-white/25'}`}>
              {game.deckCount > 0 ? (canDraw ? 'Click to draw' : 'No draws left') : ''}
            </span>
          </div>
          )}

          {showBattle && (
            <BattleLane
              slots={battleSlots}
              players={players}
              hiddenCardIds={hiddenCardIds}
              winnerId={revealWinnerId}
            />
          )}
          {showCenterPile && (
            <CenterPile cards={centerCards} onSlap={handleSlap} canSlap={canSlap} />
          )}
          {chrome.showTableau && (
            <TableauBoard gameType={game.gameType} gameState={gs as Record<string, unknown>} viewerId={player.id} busy={busy} onAction={trySend} />
          )}
          {chrome.showMemory && (
            <MemoryGrid grid={gs.grid} busy={busy || !isMyTurn} onFlip={(index) => trySend({ intent: 'flip', index })} />
          )}
          {chrome.drawFromIntent && isMyTurn && !busy && (
            <p className="text-white/50 text-sm text-center max-w-xs">Click a player to draw from their hand</p>
          )}
          {(askLine || scoreLine || extraRows.length > 0 || chrome.turnButtons.length > 0 || ladders.length > 0 || hole || chrome.widowSwap || chrome.showCorners || chrome.showFishing || chrome.showPeg) && (
            <div className="flex flex-col items-center gap-3 max-w-lg">
              {typeof gs.pot === 'number' && <p className="text-gold/70 text-sm">Pot {gs.pot}</p>}
              <FeltBoardExtras
                showCorners={chrome.showCorners}
                showFishing={chrome.showFishing}
                showPeg={chrome.showPeg}
                gameState={gs as Record<string, unknown>}
                pickedCardId={pickedCardId}
                targetIds={targetIds}
                selectedBuildId={selectedBuildId}
                disabled={busy || !isMyTurn}
                onCorner={(index) => {
                  if (!pickedCardId) return;
                  trySend({ intent: 'play', cardId: pickedCardId, corner: index });
                  setPickedCardId(null);
                }}
                onToggleTable={(cardId) =>
                  setTargetIds((ids) => (ids.includes(cardId) ? ids.filter((id) => id !== cardId) : [...ids, cardId]))
                }
                onSelectBuild={setSelectedBuildId}
              />
              {ladders.length > 0 && (
                <div className="flex gap-4 text-white/60 text-sm">
                  {ladders.map((row) => (
                    <span key={row.suit}>{row.mark} {row.label}</span>
                  ))}
                </div>
              )}
              {hole && (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-white/40 text-xs uppercase tracking-widest">Your card</span>
                  <PlayingCard card={hole} />
                </div>
              )}
              {chrome.widowSwap && (gs.widow ?? []).length > 0 && (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-white/40 text-xs uppercase tracking-widest">Widow · pick a hand card first</span>
                  <div className="flex gap-2">
                    {(gs.widow ?? []).map((card, i) => (
                      <PlayingCard
                        key={card.id}
                        card={card}
                        onClick={() => {
                          if (!pickedCardId) return;
                          trySend({ intent: 'swap', cardId: pickedCardId, from: 'widow', widowIndex: i });
                          setPickedCardId(null);
                        }}
                        disabled={busy || !isMyTurn || !pickedCardId}
                      />
                    ))}
                  </div>
                  {pickedCardId && (
                    <button
                      type="button"
                      onClick={() => {
                        trySend({ intent: 'swap', cardId: pickedCardId, from: 'stock' });
                        setPickedCardId(null);
                      }}
                      className="text-white/50 text-xs hover:text-gold"
                    >
                      Swap with stock
                    </button>
                  )}
                </div>
              )}
              {extraRows.map((row) => (
                <div key={row.label} className="flex flex-col items-center gap-2">
                  <span className="text-white/40 text-xs uppercase tracking-widest">{row.label}</span>
                  <div className="flex gap-2">
                    {row.cards.map((card) => (
                      <PlayingCard key={card.id} card={card} />
                    ))}
                  </div>
                </div>
              ))}
              {chrome.turnButtons.length > 0 && isMyTurn && !busy && (
                <div className="flex flex-wrap justify-center gap-3">
                  {chrome.turnButtons.map((b) => (
                    <button
                      key={`${b.intent}-${b.side ?? ''}-${b.label}`}
                      type="button"
                      onClick={() => handleTurnButton(b)}
                      className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold"
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              )}
              {askLine && <p className="text-white/60 text-sm text-center">{askLine}</p>}
              {scoreLine && <p className="text-gold/60 text-xs text-center">Books · {scoreLine}</p>}
            </div>
          )}

          {game.tableCards.length > 0 && (
            <div className="flex flex-col items-center gap-2 max-w-md">
              <div className="text-white/30 text-xs tracking-wide uppercase mb-1">Table</div>
              <div className="flex flex-wrap justify-center gap-2">
                {game.tableCards.map((card) => (
                  <div key={`${card.id}-${card.playedBy}`} className="flex flex-col items-center gap-1">
                    <PlayingCard
                      card={card}
                      onClick={() => handlePickup(card.id)}
                      disabled={busy || !isMyTurn || !felt.allowPickup}
                      label={`Pick up ${card.rank} of ${card.suit}`}
                    />
                    <span className="text-white/30 text-[9px] max-w-[70px] truncate">{card.playedByName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {chrome.showSharedPiles && (
          <div className="flex flex-col items-center gap-2 w-[70px] shrink-0">
            <div className="w-[70px] h-[100px] rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center">
              {game.discardPile.length > 0
                ? <PlayingCard card={game.discardPile[game.discardPile.length - 1]} />
                : <span className="text-white/20 text-xs text-center leading-tight">Discard<br />Pile</span>}
            </div>
            <span className="text-white/30 text-xs h-4">{game.discardPile.length} discarded</span>
          </div>
          )}
        </div>

        <div className="relative z-10 px-4 pb-4 shrink-0 min-h-0 flex items-center justify-center">
          {stock ? (
            <FaceDownStock
              playerId={player.id}
              count={player.handCount}
              onFlip={handleFlipStock}
              disabled={stockDisabled}
            />
          ) : chrome.showTableau ? null : (
            <div data-card-anchor={originAnchor(player.id)}>
              <CardHand
                cards={player.hand}
                onPlay={allowPlay ? handlePlay : undefined}
                onDiscard={allowDiscard ? handleDiscard : undefined}
                onPick={canPickHand ? handlePick : undefined}
                pickedCardId={pickedCardId}
                pickedCardIds={chrome.drawPicked || chrome.cribDiscard ? pickedIds : undefined}
                pickHint={
                  chrome.askRankIntent
                    ? pickedRank
                      ? `Ask someone for ${pickedRank}s`
                      : 'Click a rank you hold, then a player'
                    : undefined
                }
                playerName={player.name}
                isMyTurn={isMyTurn && !busy}
              />
            </div>
          )}
        </div>
      </div>
      <CardFlightLayer flights={flights} onFlightDone={onFlightDone} />
    </div>
  );
}
