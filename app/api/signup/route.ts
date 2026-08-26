import {
  createPlayer,
  isAirtableConfigured,
  listPlayers,
  normalizeName,
} from "@/lib/airtable";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAirtableConfigured()) {
    return Response.json(
      { error: "Registration is not connected yet. Please check back soon." },
      { status: 503 },
    );
  }

  try {
    const payload = (await request.json()) as {
      name?: unknown;
      contact?: unknown;
      website?: unknown;
    };

    if (typeof payload.website === "string" && payload.website.trim()) {
      return Response.json(
        { error: "Unable to submit registration." },
        { status: 400 },
      );
    }

    const name =
      typeof payload.name === "string"
        ? payload.name.trim().replace(/\s+/g, " ")
        : "";
    const contact =
      typeof payload.contact === "string" ? payload.contact.trim() : "";

    if (name.length < 2 || name.length > 60) {
      return Response.json(
        { error: "Enter a player name between 2 and 60 characters." },
        { status: 400 },
      );
    }

    if (contact.length > 120) {
      return Response.json(
        { error: "Contact information must be 120 characters or fewer." },
        { status: 400 },
      );
    }

    const players = await listPlayers();
    const duplicate = players.find(
      ({ fields }) =>
        fields.Active === true &&
        fields.Name &&
        normalizeName(fields.Name) === normalizeName(name),
    );

    if (duplicate) {
      return Response.json(
        {
          error: "That player name is already registered.",
          player: {
            id: duplicate.fields["Player ID"],
            name: duplicate.fields.Name,
          },
        },
        { status: 409 },
      );
    }

    const playerId = `player_${crypto.randomUUID()}`;
    await createPlayer({
      "Player ID": playerId,
      Name: name,
      Contact: contact || undefined,
      "Registration Date": new Date().toISOString(),
      Active: true,
    });

    return Response.json(
      { player: { id: playerId, name } },
      { status: 201 },
    );
  } catch {
    return Response.json(
      { error: "Registration could not be saved. Please try again." },
      { status: 502 },
    );
  }
}
