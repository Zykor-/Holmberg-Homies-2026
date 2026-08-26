import { env } from "cloudflare:workers";

export type PartnerFormatVote =
  | "Random Partners"
  | "Choose Your Partners";

export interface PlayerFields {
  "Player ID"?: string;
  Name?: string;
  Contact?: string;
  "Registration Date"?: string;
  Active?: boolean;
}

export interface VoteFields {
  "Vote ID"?: string;
  Player?: string;
  "Partner Format Vote"?: PartnerFormatVote;
  "Vote Date"?: string;
}

export interface MatchFields {
  "Match ID"?: string;
  Round?: string;
  "Team 1"?: string;
  "Team 2"?: string;
  "Team 1 Score"?: number;
  "Team 2 Score"?: number;
  Completed?: boolean;
  "Match Type"?: "Round Robin" | "Finals";
}

type AirtableRecord<T> = {
  id: string;
  createdTime: string;
  fields: T;
};

type RuntimeEnv = {
  AIRTABLE_TOKEN?: string;
  AIRTABLE_BASE_ID?: string;
  AIRTABLE_PLAYERS_TABLE_ID?: string;
  AIRTABLE_VOTES_TABLE_ID?: string;
  AIRTABLE_MATCHES_TABLE_ID?: string;
  AIRTABLE_SHOW_VOTE_TOTALS?: string;
};

function readRuntimeEnv(): RuntimeEnv {
  const workerEnv = env as unknown as RuntimeEnv;
  return {
    AIRTABLE_TOKEN: workerEnv.AIRTABLE_TOKEN ?? process.env.AIRTABLE_TOKEN,
    AIRTABLE_BASE_ID:
      workerEnv.AIRTABLE_BASE_ID ?? process.env.AIRTABLE_BASE_ID,
    AIRTABLE_PLAYERS_TABLE_ID:
      workerEnv.AIRTABLE_PLAYERS_TABLE_ID ??
      process.env.AIRTABLE_PLAYERS_TABLE_ID,
    AIRTABLE_VOTES_TABLE_ID:
      workerEnv.AIRTABLE_VOTES_TABLE_ID ??
      process.env.AIRTABLE_VOTES_TABLE_ID,
    AIRTABLE_MATCHES_TABLE_ID:
      workerEnv.AIRTABLE_MATCHES_TABLE_ID ??
      process.env.AIRTABLE_MATCHES_TABLE_ID,
    AIRTABLE_SHOW_VOTE_TOTALS:
      workerEnv.AIRTABLE_SHOW_VOTE_TOTALS ??
      process.env.AIRTABLE_SHOW_VOTE_TOTALS,
  };
}

export function isAirtableConfigured() {
  const config = readRuntimeEnv();
  return Boolean(
    config.AIRTABLE_TOKEN &&
      config.AIRTABLE_BASE_ID &&
      config.AIRTABLE_PLAYERS_TABLE_ID &&
      config.AIRTABLE_VOTES_TABLE_ID &&
      config.AIRTABLE_MATCHES_TABLE_ID,
  );
}

export function shouldShowVoteTotals() {
  return readRuntimeEnv().AIRTABLE_SHOW_VOTE_TOTALS?.toLowerCase() === "true";
}

function getConfig() {
  const config = readRuntimeEnv();
  if (
    !config.AIRTABLE_TOKEN ||
    !config.AIRTABLE_BASE_ID ||
    !config.AIRTABLE_PLAYERS_TABLE_ID ||
    !config.AIRTABLE_VOTES_TABLE_ID ||
    !config.AIRTABLE_MATCHES_TABLE_ID
  ) {
    throw new Error("Airtable is not configured");
  }

  return {
    token: config.AIRTABLE_TOKEN,
    baseId: config.AIRTABLE_BASE_ID,
    playersTableId: config.AIRTABLE_PLAYERS_TABLE_ID,
    votesTableId: config.AIRTABLE_VOTES_TABLE_ID,
    matchesTableId: config.AIRTABLE_MATCHES_TABLE_ID,
  };
}

async function airtableFetch<T>(
  tableId: string,
  searchParams?: URLSearchParams,
  init?: RequestInit,
): Promise<T> {
  const config = getConfig();
  const url = new URL(
    `https://api.airtable.com/v0/${config.baseId}/${tableId}`,
  );
  if (searchParams) {
    url.search = searchParams.toString();
  }

  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Airtable request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

async function listAllRecords<T>(tableId: string) {
  const records: AirtableRecord<T>[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (offset) params.set("offset", offset);
    const page = await airtableFetch<{
      records: AirtableRecord<T>[];
      offset?: string;
    }>(tableId, params);
    records.push(...page.records);
    offset = page.offset;
  } while (offset);

  return records;
}

export function listPlayers() {
  return listAllRecords<PlayerFields>(getConfig().playersTableId);
}

export function listVotes() {
  return listAllRecords<VoteFields>(getConfig().votesTableId);
}

export function listMatches() {
  return listAllRecords<MatchFields>(getConfig().matchesTableId);
}

export async function createPlayer(fields: PlayerFields) {
  const response = await airtableFetch<{
    records: AirtableRecord<PlayerFields>[];
  }>(getConfig().playersTableId, undefined, {
    method: "POST",
    body: JSON.stringify({ records: [{ fields }], typecast: true }),
  });
  return response.records[0];
}

export async function createVote(fields: VoteFields) {
  const response = await airtableFetch<{
    records: AirtableRecord<VoteFields>[];
  }>(getConfig().votesTableId, undefined, {
    method: "POST",
    body: JSON.stringify({ records: [{ fields }], typecast: true }),
  });
  return response.records[0];
}

export function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}
