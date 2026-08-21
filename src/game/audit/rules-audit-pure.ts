import { applyAction } from '../engine';
import { createLocalMatch } from '../bots/local-match-pure';
import { defaultBotCandidates, firstLegalAction } from '../bots/bot-pure';
import { GAME_CATALOG, GAME_CONFIGS } from '../registry/catalog';
import { GAME_REGISTRY } from '../registry/registry';
import type { GameType } from '../gameTypes';
import type { GameAction } from '../registry/types';
import type { EngineState } from '../state';
import { rulesCardFor } from '../../client/lib/game-rules-pure';
import { resolveTableChrome } from '../../client/lib/table-chrome-pure';
import { resolveFeltActions, isUnknownIntentError } from '../../client/lib/felt-actions-pure';
import { resolveTableKind } from './playability-registry-pure';
import { GLOSSARY } from '../../content/glossary';
import { askTurnHint, seatActionLabel } from '../../client/lib/ask-action-pure';
import { lastAskLine, setCountLabel, setScoreHeading } from '../../client/lib/last-ask-pure';
import { undefinedJargon } from './plain-copy-pure';

export type RulesFail = { id: string; detail: string };

export type RulesAudit = {
  type: GameType;
  name: string;
  ok: boolean;
  fails: RulesFail[];
  firstIntent: string | null;
  deal: { players: number; hand: number }[];
};

/** Human words the Rules sheet must use for a felt/engine intent. */
const INTENT_NEEDLES: Record<string, { id: string; re: RegExp; why: string }[]> = {
  'gofish-ask': [
    { id: 'ask', re: /\bask\b/i, why: 'the table move is Ask' },
    { id: 'hold', re: /\b(hold|already have|you have)\b/i, why: 'you must already have the number or face you ask for' },
    { id: 'pick', re: /\b(pick|tap|choose)\b/i, why: 'pick a number or face on the Ask control' },
    { id: 'who', re: /\banyone\b|\bplayer\b|\bwho\b/i, why: 'ask Anyone or a named player' },
    { id: 'miss', re: /go fish|\bdraw\b|\btake one\b/i, why: 'a miss is Go Fish (take one from the pile)' },
  ],
  'draw-from': [
    { id: 'draw', re: /\bdraw\b/i, why: 'the table move is Draw' },
    { id: 'from', re: /\bfrom\b/i, why: 'draw from another seat' },
  ],
  hit: [{ id: 'hit', re: /take a card|\bhit\b/i, why: 'Take a card' }],
  stand: [{ id: 'stand', re: /\bstay\b|\bstand\b/i, why: 'Stay' }],
  'war-play': [{ id: 'flip', re: /\bflip/i, why: 'flip your pile' }],
  'war-collect': [{ id: 'collect', re: /\b(collect|win the|takes? the)\b/i, why: 'winner collects' }],
  flip: [{ id: 'flip', re: /\bflip/i, why: 'flip a card' }],
  slap: [{ id: 'slap', re: /\bslap\b/i, why: 'Slap' }],
  snap: [{ id: 'snap', re: /\bsnap\b/i, why: 'Snap' }],
  play: [{ id: 'play', re: /\bplay/i, why: 'play a card' }],
  discard: [{ id: 'discard', re: /\bdiscard\b|put (one |a card )?aside/i, why: 'put one aside' }],
  draw: [{ id: 'draw', re: /\bdraw\b|take (a |one )?cards?|take more|swap or keep/i, why: 'take or swap a card' }],
  pass: [{ id: 'pass', re: /\bpass\b/i, why: 'Pass' }],
  knock: [{ id: 'knock', re: /\bknock\b|stop here|stop the round/i, why: 'Stop here' }],
  swap: [{ id: 'swap', re: /\bswap\b/i, why: 'Swap' }],
  bid: [{ id: 'bid', re: /\bbid\b/i, why: 'bid' }],
  'set-trump': [{ id: 'trump', re: /\btrump\b/i, why: 'name trump' }],
  bet: [{ id: 'bet', re: /\bbet\b/i, why: 'bet' }],
  check: [{ id: 'check', re: /\bno bet\b|\bcheck\b/i, why: 'No bet' }],
  call: [{ id: 'call', re: /\bmatch bet\b|\bcall\b/i, why: 'Match bet' }],
  raise: [{ id: 'raise', re: /\bbet more\b|\braise\b/i, why: 'Bet more' }],
  fold: [{ id: 'fold', re: /\bgive up\b|\bfold\b/i, why: 'Give up' }],
  showdown: [{ id: 'showdown', re: /\bcompare\b|\bshowdown\b/i, why: 'Compare' }],
  capture: [{ id: 'capture', re: /\bcapture\b|take match/i, why: 'Take match' }],
  build: [{ id: 'build', re: /\bbuild\b|make a pile/i, why: 'Make a pile' }],
  trail: [{ id: 'trail', re: /\btrail\b|leave (a card|it)/i, why: 'Leave it' }],
  'capture-build': [{ id: 'take-build', re: /\bbuild\b|take the pile|take a pile/i, why: 'Take the pile' }],
  'discard-to-crib': [{ id: 'crib', re: /\bcrib\b|extra pile/i, why: 'to the extra pile' }],
  go: [{ id: 'go', re: /\bgo\b/i, why: 'Go' }],
  count: [{ id: 'count', re: /\bcount\b/i, why: 'Count' }],
  meld: [{ id: 'meld', re: /\bmeld\b|lay down|set of|of a kind/i, why: 'lay down a set' }],
  layoff: [{ id: 'layoff', re: /\blay\s?off\b|\bmeld\b/i, why: 'layoff' }],
  move: [{ id: 'move', re: /\b(move|tableau|foundation|column|cell)\b/i, why: 'move cards on the tableau' }],
  'draw-stock': [{ id: 'stock', re: /\b(stock|draw pile|draw)\b/i, why: 'take a card from the draw pile' }],
  'deal-row': [{ id: 'deal-row', re: /\b(deal|row|draw pile|stock)\b/i, why: 'lay a new row' }],
  doubt: [{ id: 'doubt', re: /\b(doubt|cheat|challenge)\b/i, why: 'challenge a bluff' }],
  'play-center': [{ id: 'center', re: /\bcenter\b|\bcorner\b/i, why: 'play to the center' }],
  'side-pile': [{ id: 'side', re: /\b(side|payoff)\b/i, why: 'side pile' }],
  'draw-center': [{ id: 'draw-center', re: /\b(draw|center|pile)\b/i, why: 'draw from a center pile' }],
  'go-out': [{ id: 'go-out', re: /\bgo(ing)? out\b|\bempty\b/i, why: 'go out' }],
};

/** Words in the sheet that name a move — must be an engine intent, not a pamphlet extra. */
const PHANTOM_WORDS: { re: RegExp; intent: string; label: string }[] = [
  { re: /\bhit\b/i, intent: 'hit', label: 'Hit' },
  { re: /\bstand\b/i, intent: 'stand', label: 'Stand' },
  { re: /\bknock\b/i, intent: 'knock', label: 'Knock' },
  { re: /\bslap\b/i, intent: 'slap', label: 'Slap' },
  { re: /\bsnap\b/i, intent: 'snap', label: 'Snap' },
  { re: /\bfold\b/i, intent: 'fold', label: 'Fold' },
  { re: /\braise\b/i, intent: 'raise', label: 'Raise' },
  { re: /\bbid\b/i, intent: 'bid', label: 'bid' },
  { re: /go fish/i, intent: 'gofish-ask', label: 'Go Fish ask' },
  { re: /\bdraw from (an? )?(opponent|player|seat|them)\b/i, intent: 'draw-from', label: 'draw-from' },
];

function extraCandidates(state: EngineState, playerId: string) {
  const player = state.players.find((p) => p.id === playerId);
  const others = state.players.filter((p) => p.id !== playerId);
  const ranks = [...new Set(player?.hand.map((c) => c.rank) ?? [])];
  const out: GameAction[] = [
    { intent: 'bid', amount: 0 },
    { intent: 'bid', amount: 1 },
    { intent: 'bid', amount: 2 },
    { intent: 'bid', amount: 3 },
    { intent: 'bid', tricks: 1 },
    { intent: 'set-trump' },
    { intent: 'doubt' },
    { intent: 'meld' },
    { intent: 'layoff' },
    { intent: 'go-out' },
    { intent: 'showdown' },
    { intent: 'draw-center' },
    { intent: 'side-pile' },
    { intent: 'play-center' },
    { intent: 'discard-to-crib' },
    { intent: 'go' },
    { intent: 'count' },
    { intent: 'capture' },
    { intent: 'build' },
    { intent: 'trail' },
    { intent: 'war-collect' },
  ];
  for (const other of others) {
    out.push({ intent: 'draw-from', targetId: other.id });
    for (const rank of ranks) out.push({ intent: 'gofish-ask', rank, targetId: other.id });
  }
  for (const card of player?.hand ?? []) {
    out.push({ intent: 'play', cardId: card.id });
    out.push({ intent: 'discard', cardId: card.id });
  }
  return out;
}

function firstMove(state: EngineState, playerId: string) {
  return firstLegalAction(
    state,
    playerId,
    [...defaultBotCandidates(state, playerId), ...extraCandidates(state, playerId)],
    applyAction,
  );
}

function engineKnowsIntent(state: EngineState, playerId: string, intent: string): boolean {
  try {
    applyAction(state, { intent, playerId });
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return !isUnknownIntentError(message);
  }
}

function sheetText(type: GameType): { overlay: string; full: string; steps: readonly string[]; win: string } {
  const config = GAME_CONFIGS[type];
  const glossary = GLOSSARY[type];
  const card = rulesCardFor(config, glossary);
  const overlay = [card.tagline, card.win, ...card.steps].join('\n');
  const glossaryBody = (glossary?.sections ?? []).map((s) => `${s.heading} ${s.body}`).join('\n');
  const faq = (glossary?.faq ?? []).map((f) => `${f.q} ${f.a}`).join('\n');
  const full = [overlay, config.description, glossaryBody, glossary?.intro ?? '', faq].join('\n');
  return { overlay, full, steps: card.steps, win: card.win };
}

function dealSamples(type: GameType): { players: number; hand: number }[] {
  const config = GAME_CONFIGS[type];
  const counts = new Set<number>([Math.max(config.minPlayers, config.minPlayers === 1 ? 1 : 2)]);
  if (config.maxPlayers >= 4 && config.minPlayers <= 4) counts.add(4);
  const out: { players: number; hand: number }[] = [];
  for (const n of counts) {
    const state = createLocalMatch(type, n);
    out.push({ players: state.players.length, hand: state.players[0]?.hand.length ?? 0 });
  }
  return out;
}

function numbersIn(text: string): Set<number> {
  return new Set([...text.matchAll(/\b(\d+)\b/g)].map((m) => Number(m[1])));
}

function gsKeys(state: EngineState): Set<string> {
  const gs = state.game.gameState;
  if (!gs || typeof gs !== 'object') return new Set();
  return new Set(Object.keys(gs as object));
}

function requireMatch(text: string, needles: { id: string; re: RegExp; why: string }[], fails: RulesFail[], prefix: string) {
  for (const n of needles) {
    if (!n.re.test(text)) fails.push({ id: `${prefix}:${n.id}`, detail: `Rules never say how to ${n.why}` });
  }
}

export function auditGameRules(type: GameType): RulesAudit {
  const entry = GAME_CATALOG.find((e) => e.type === type);
  const config = GAME_CONFIGS[type];
  const name = config?.name ?? type;
  const fails: RulesFail[] = [];
  if (!entry || !config) {
    return { type, name, ok: false, fails: [{ id: 'catalog', detail: 'missing catalog entry' }], firstIntent: null, deal: [] };
  }

  const { overlay, full, steps, win } = sheetText(type);
  const chrome = resolveTableChrome({
    gameType: type,
    handReveal: config.handReveal,
    family: entry.family,
  });
  const felt = resolveFeltActions({
    tableKind: resolveTableKind(entry),
    family: entry.family,
    gameType: type,
  });

  let firstIntent: string | null = null;
  let state: EngineState | null = null;
  let deal: { players: number; hand: number }[] = [];
  try {
    deal = dealSamples(type);
    const n = Math.max(config.minPlayers, config.minPlayers === 1 ? 1 : 2);
    state = createLocalMatch(type, n);
    const actor = state.players.find((p) => p.seat === state!.game.currentSeat) ?? state.players[0];
    firstIntent = actor ? firstMove(state, actor.id)?.intent ?? null : null;
  } catch (e) {
    fails.push({ id: 'setup', detail: e instanceof Error ? e.message : String(e) });
  }

  if (steps.length < 3) {
    fails.push({ id: 'steps', detail: 'Rules sheet needs at least 3 steps a new player can follow' });
  }
  for (const step of steps) {
    if (step.trim() === config.tagline.trim()) {
      fails.push({ id: 'tagline-step', detail: `Step repeats the tagline (${config.tagline})` });
    }
    if (step.length > 140) {
      fails.push({ id: 'step-length', detail: `Step too long for the phone sheet: “${step.slice(0, 48)}…”` });
    }
  }

  if (chrome.askRankIntent) requireMatch(overlay, INTENT_NEEDLES['gofish-ask'] ?? [], fails, 'ask');
  if (chrome.drawFromIntent) requireMatch(overlay, INTENT_NEEDLES['draw-from'] ?? [], fails, 'draw-from');
  if (chrome.slapIntent) requireMatch(overlay, INTENT_NEEDLES[chrome.slapIntent] ?? [], fails, 'slap');
  if (chrome.stockIntent && config.handReveal === 'stock') {
    requireMatch(overlay, INTENT_NEEDLES[chrome.stockIntent] ?? INTENT_NEEDLES.flip, fails, 'stock');
  }
  for (const b of chrome.turnButtons) {
    const needles = INTENT_NEEDLES[b.intent];
    if (needles) requireMatch(overlay, needles, fails, `button:${b.intent}`);
    else if (!new RegExp(b.label.replace(/[^a-z]+/gi, '|').replace(/^\||\|$/g, ''), 'i').test(overlay)) {
      fails.push({ id: `button:${b.intent}`, detail: `Rules omit the ${b.label} control the felt shows` });
    }
  }
  if (felt.allowPlay && !chrome.askRankIntent && !chrome.drawFromIntent && !/\bplay/i.test(overlay)) {
    fails.push({ id: 'felt:play', detail: 'Felt lets you play a card; the sheet never says play' });
  }
  if (felt.allowDraw && !/\bdraw\b|take (a |one )?cards?|take more|take from/i.test(overlay)) {
    fails.push({ id: 'felt:draw', detail: 'The table lets you take a card; the sheet never says so' });
  }
  if (felt.allowDiscard && !/\bdiscard\b|put (one |a card )?aside/i.test(overlay)) {
    fails.push({ id: 'felt:discard', detail: 'The table lets you put a card aside; the sheet never says so' });
  }

  const coveredByChrome = new Set<string>();
  if (chrome.askRankIntent) coveredByChrome.add(chrome.askRankIntent);
  if (chrome.drawFromIntent) coveredByChrome.add(chrome.drawFromIntent);
  if (chrome.slapIntent) coveredByChrome.add(chrome.slapIntent);
  if (chrome.stockIntent) coveredByChrome.add(chrome.stockIntent);
  for (const b of chrome.turnButtons) coveredByChrome.add(b.intent);

  if (firstIntent && !coveredByChrome.has(firstIntent)) {
    requireMatch(overlay, INTENT_NEEDLES[firstIntent] ?? [], fails, `first:${firstIntent}`);
  } else if (!firstIntent && state) {
    const actorId = state.players[0].id;
    if (engineKnowsIntent(state, actorId, 'bid') && !/\bbid\b/i.test(overlay)) {
      fails.push({ id: 'first:bid', detail: 'The table starts with a bid; the sheet never says bid' });
    } else if (chrome.showTableau && !/\b(column|pile|ace|king|draw pile|move|build)\b/i.test(overlay)) {
      fails.push({ id: 'first:tableau', detail: 'Column games must say how to move cards on this board' });
    } else if (
      !chrome.askRankIntent &&
      !chrome.turnButtons.length &&
      !chrome.showTableau &&
      engineKnowsIntent(state, actorId, 'play') &&
      !/\bplay/i.test(overlay)
    ) {
      fails.push({ id: 'first:play', detail: 'A legal first turn is play; the sheet never says play' });
    }
  }

  const nums = numbersIn(overlay);
  const catalogDeal = config.dealCount;
  if (typeof catalogDeal === 'number') {
    const observed = [...new Set(deal.map((d) => d.hand).filter((h) => h > 0))];
    if (observed.length === 0) {
      /* hole-card games keep the deal in gameState, not hand */
    } else if (observed.every((h) => h === catalogDeal)) {
      if (!nums.has(catalogDeal)) {
        fails.push({
          id: 'deal:count',
          detail: `Setup deals ${catalogDeal}; the sheet never mentions ${catalogDeal}`,
        });
      }
    } else {
      for (const h of new Set([catalogDeal, ...observed])) {
        if (!nums.has(h)) {
          fails.push({
            id: `deal:variant:${h}`,
            detail: `Engine deals ${observed.join('/')} (catalog ${catalogDeal}); mention ${h}`,
          });
        }
      }
    }
  }

  const keys = state ? gsKeys(state) : new Set<string>();
  if (keys.has('books')) {
    if (/\bbooks?\b/i.test(full)) {
      fails.push({ id: 'jargon:book', detail: 'Say four of a kind / set of four — “book” is jargon' });
    }
    if (!/\bfour of a kind|set of four|four cards (with|of) the same/i.test(overlay)) {
      fails.push({ id: 'win:sets', detail: 'Engine scores four-of-a-kind sets; the sheet never says so' });
    }
    if (!/\b(empty|gone|no one is holding)\b/i.test(`${overlay}\n${win}`)) {
      fails.push({ id: 'win:empty', detail: 'Sets score when the pile is gone and no one is holding cards; the sheet omits that' });
    }
  }
  if (keys.has('lives') || keys.has('tokens')) {
    if (!/\b(life|lives|token|last)\b/i.test(`${overlay}\n${win}`)) {
      fails.push({ id: 'win:lives', detail: 'Engine tracks lives/tokens; the win line never says so' });
    }
  }
  if (!win.trim()) fails.push({ id: 'win', detail: 'Rules overlay has no win line' });

  const glossary = GLOSSARY[type];
  const winning = (glossary?.sections ?? [])
    .filter((s) => /win/i.test(s.heading))
    .map((s) => `${s.heading} ${s.body}`)
    .join('\n');
  const chromeLabels = chrome.turnButtons.map((b) => b.label).join('\n');
  const tableCopy = [
    overlay,
    config.description,
    winning,
    chromeLabels,
    askTurnHint(null),
    seatActionLabel({ askRank: true, drawFrom: false, rank: null, name: 'Alice', handCount: 4 }),
    setCountLabel(1),
    setScoreHeading(),
    lastAskLine({ fromName: 'You', toName: 'Alice', rank: '7', result: 'go_fish' }) ?? '',
    'Choose a number or face you already have, then who — Anyone or a named player.',
    'Shared cards · pick one of yours first',
    'Your cards',
    'Put aside',
    'Leftover pile',
    'Number or face',
  ].join('\n');
  for (const hit of undefinedJargon(tableCopy)) {
    fails.push({
      id: `jargon:${hit.word}`,
      detail: `“${hit.word}” is undefined club talk: “${hit.sentence.slice(0, 88)}${hit.sentence.length > 88 ? '…' : ''}”`,
    });
  }

  if (state) {
    const actor = state.players[0];
    for (const phantom of PHANTOM_WORDS) {
      if (!phantom.re.test(full)) continue;
      if (engineKnowsIntent(state, actor.id, phantom.intent)) continue;
      if (phantom.intent === chrome.askRankIntent || phantom.intent === chrome.drawFromIntent) continue;
      if (chrome.turnButtons.some((b) => b.intent === phantom.intent || phantom.re.test(b.label))) continue;
      if (chrome.slapIntent === phantom.intent) continue;
      fails.push({
        id: `phantom:${phantom.intent}`,
        detail: `Rules describe ${phantom.label}; engine does not implement ${phantom.intent}`,
      });
    }
  }

  if (glossary?.playerCount) {
    const expected = config.minPlayers === config.maxPlayers
      ? String(config.minPlayers)
      : `${config.minPlayers}`;
    if (!glossary.playerCount.includes(expected)) {
      fails.push({
        id: 'players:glossary',
        detail: `Glossary playerCount “${glossary.playerCount}” disagrees with catalog ${config.minPlayers}–${config.maxPlayers}`,
      });
    }
  }

  const uniq = new Map(fails.map((f) => [f.id, f]));
  const list = [...uniq.values()];
  return { type, name, ok: list.length === 0, fails: list, firstIntent, deal };
}

export function auditAllRules(): RulesAudit[] {
  return GAME_CATALOG.map((e) => auditGameRules(e.type));
}

export function formatRulesAudit(reports: RulesAudit[]): string {
  const lines = [
    'GAME                    STATUS   FIRST          WHY',
    '--------------------------------------------------------------------------------',
  ];
  for (const r of reports) {
    const first = (r.firstIntent ?? '—').padEnd(14);
    if (r.ok) {
      lines.push(`${r.type.padEnd(24)}${'pass'.padEnd(9)}${first}`);
    } else {
      lines.push(`${r.type.padEnd(24)}${'FAIL'.padEnd(9)}${first}${r.fails[0]?.detail ?? ''}`);
      for (const f of r.fails.slice(1)) lines.push(`${''.padEnd(47)}${f.detail}`);
    }
  }
  const passed = reports.filter((r) => r.ok).length;
  lines.push('--------------------------------------------------------------------------------');
  lines.push(`${passed} passed, ${reports.length - passed} failed  (${reports.length} total)`);
  return lines.join('\n');
}

