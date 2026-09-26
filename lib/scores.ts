export type ScoreGame = { id: string; round: string; type: string; team1: string; team2: string; playerIds1: string[]; playerIds2: string[]; score1: number; score2: number; completed: boolean };
export function parsePlayerIds(value?: string): string[] {
  try { const ids = JSON.parse(value ?? '[]'); return Array.isArray(ids) && ids.every(id => typeof id === 'string') ? ids : []; } catch { return []; }
}
export function validateScore(body: any) {
  if (!body || !Array.isArray(body.playerIds1) || !Array.isArray(body.playerIds2) || body.playerIds1.length !== 2 || body.playerIds2.length !== 2 || [...body.playerIds1, ...body.playerIds2].some(id => typeof id !== 'string') || new Set([...body.playerIds1, ...body.playerIds2]).size !== 4) return 'Choose four different players.';
  if (![body.score1, body.score2].every(n => Number.isInteger(n) && n >= 0 && n <= 99) || body.score1 === body.score2) return 'Enter different whole-number scores from 0 to 99.';
  if (!['Round Robin', 'Finals'].includes(body.type)) return 'Choose qualifying or finals.';
  if (typeof body.round !== 'string' || !body.round.trim() || body.round.length > 60) return 'Enter a round or game label (up to 60 characters).';
  if (typeof body.id !== 'string' || !/^game_[a-zA-Z0-9-]{1,80}$/.test(body.id)) return 'Invalid game identifier.';
  return null;
}
export function calculateStandings(games: ScoreGame[], players: {id: string; name: string}[]) {
  const rows = new Map(players.map(p => [p.id, {name:p.name, played:0,wins:0,losses:0,pointsFor:0,pointsAgainst:0,differential:0}]));
  for (const g of games) {
    if (!g.completed || g.type !== 'Round Robin' || g.playerIds1.length !== 2 || g.playerIds2.length !== 2) continue;
    for (const [ids, pf, pa] of [[g.playerIds1,g.score1,g.score2],[g.playerIds2,g.score2,g.score1]] as const) {
      for (const id of ids) { const r=rows.get(id); if (!r) continue; r.played++; r.pointsFor+=pf; r.pointsAgainst+=pa; if(pf>pa) r.wins++; else if(pa>pf) r.losses++; r.differential=r.pointsFor-r.pointsAgainst; }
    }
  }
  return [...rows.values()].filter(r=>r.played).sort((a,b)=>b.wins-a.wins || b.differential-a.differential || a.name.localeCompare(b.name));
}
