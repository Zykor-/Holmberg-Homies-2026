import { isAirtableConfigured, listMatches, listPlayers, saveMatch } from '@/lib/airtable';
import { validateScore } from '@/lib/scores';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  if (!isAirtableConfigured()) return Response.json({error:'Score entry is not connected.'},{status:503});
  let body;
  try { body = await request.json(); } catch { return Response.json({error:'Invalid score submission.'},{status:400}); }
  const error=validateScore(body);
  if(error) return Response.json({error},{status:400});
  try {
    const [players,matches]=await Promise.all([listPlayers(),listMatches()]);
    const names=new Map(players.filter(p=>p.fields.Active).map(p=>[p.fields['Player ID'],p.fields.Name]));
    if([...body.playerIds1,...body.playerIds2].some(id=>!names.has(id))) return Response.json({error:'Choose currently registered players.'},{status:400});
    const existing=matches.find(m=>m.fields['Match ID']===body.id);
    if(body.edit && !existing) return Response.json({error:'This game no longer exists. Refresh and try again.'},{status:404});
    if(existing && !body.edit) return Response.json({success:true});
    await saveMatch(existing?.id, {
      'Match ID':body.id, Round:body.round.trim(), 'Match Type':body.type,
      'Team 1':body.playerIds1.map((id: string)=>names.get(id)).join(' + '), 'Team 2':body.playerIds2.map((id: string)=>names.get(id)).join(' + '),
      'Team 1 Player IDs':JSON.stringify(body.playerIds1), 'Team 2 Player IDs':JSON.stringify(body.playerIds2),
      'Team 1 Score':body.score1,'Team 2 Score':body.score2, Completed:body.completed !== false,
    });
    return Response.json({success:true});
  } catch { return Response.json({error:'Could not save the score. Please try again.'},{status:502}); }
}
