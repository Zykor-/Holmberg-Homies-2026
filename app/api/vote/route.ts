import {
  createVote,
  isAirtableConfigured,
  listPlayers,
  listVotes,
  type PartnerFormatVote,
} from "@/lib/airtable";

export const dynamic = "force-dynamic";

const voteOptions: PartnerFormatVote[] = [
  "Random Partners",
  "Choose Your Partners",
];

export async function POST(request: Request) {
  if (!isAirtableConfigured()) {
    return Response.json(
      { error: "Voting is not connected yet. Please check back soon." },
      { status: 503 },
    );
  }

  try {
    const payload = (await request.json()) as {
      playerId?: unknown;
      vote?: unknown;
      website?: unknown;
    };

    if (typeof payload.website === "string" && payload.website.trim()) {
      return Response.json(
        { error: "Unable to submit vote." },
        { status: 400 },
      );
    }

    const playerId =
      typeof payload.playerId === "string" ? payload.playerId.trim() : "";
    const vote =
      typeof payload.vote === "string"
        ? (payload.vote as PartnerFormatVote)
        : null;

    if (!playerId || !vote || !voteOptions.includes(vote)) {
      return Response.json(
        { error: "Select your registered name and one partner format." },
        { status: 400 },
      );
    }

    const [players, votes] = await Promise.all([listPlayers(), listVotes()]);
    const registeredPlayer = players.find(
      ({ fields }) =>
        fields.Active === true && fields["Player ID"] === playerId,
    );

    if (!registeredPlayer) {
      return Response.json(
        { error: "Only currently registered players can vote." },
        { status: 403 },
      );
    }

    const duplicateVote = votes.some(
      ({ fields }) => fields.Player === playerId,
    );
    if (duplicateVote) {
      return Response.json(
        { error: "That player has already voted." },
        { status: 409 },
      );
    }

    await createVote({
      "Vote ID": `vote_${crypto.randomUUID()}`,
      Player: playerId,
      "Partner Format Vote": vote,
      "Vote Date": new Date().toISOString(),
    });

    return Response.json({ success: true }, { status: 201 });
  } catch {
    return Response.json(
      { error: "Your vote could not be saved. Please try again." },
      { status: 502 },
    );
  }
}
