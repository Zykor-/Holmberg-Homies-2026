"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  Megaphone,
  RefreshCw,
  Trophy,
  Users,
  Vote,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { siteConfig } from "@/lib/site-config";

type Player = { id: string; name: string };
type VoteTotals = {
  randomPartners: number;
  chooseYourPartners: number;
  total: number;
};
type Standing = {
  name: string;
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  differential: number;
};
type FinalsMatch = {
  id: string;
  round: string;
  team1: string | null;
  team2: string | null;
  team1Score: number | null;
  team2Score: number | null;
  completed: boolean;
};
type SiteData = {
  configured: boolean;
  players: Player[];
  showVoteTotals: boolean;
  voteTotals: VoteTotals | null;
  standings: Standing[];
  finals: FinalsMatch[];
};

const emptyData: SiteData = {
  configured: true,
  players: [],
  showVoteTotals: false,
  voteTotals: null,
  standings: [],
  finals: [],
};

function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-2xl">
      <p className="mb-3 text-xs font-black uppercase tracking-[0.26em] text-[var(--court-blue)]">
        {eyebrow}
      </p>
      <h2 className="display-face court-rule inline-block text-4xl leading-none text-[var(--deep-navy)] sm:text-5xl">
        {title}
      </h2>
      <p className="mt-8 text-base leading-7 text-slate-600 sm:text-lg">
        {children}
      </p>
    </div>
  );
}

function StatusMessage({
  type,
  children,
}: {
  type: "success" | "error" | "info";
  children: React.ReactNode;
}) {
  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-red-200 bg-red-50 text-red-900",
    info: "border-amber-200 bg-amber-50 text-amber-950",
  }[type];

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm leading-6 ${styles}`}
      role="status"
    >
      {children}
    </div>
  );
}

export function TournamentSite() {
  const [data, setData] = useState<SiteData>(emptyData);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [signupStatus, setSignupStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [signupPending, setSignupPending] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [partnerVote, setPartnerVote] = useState("");
  const [voteStatus, setVoteStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [votePending, setVotePending] = useState(false);

  const refreshData = useCallback(async () => {
    setDataError("");
    try {
      const response = await fetch("/api/data", { cache: "no-store" });
      const payload = (await response.json()) as SiteData & { error?: string };
      if (!response.ok) {
        throw new Error(
          payload.error ?? "Tournament data could not be loaded.",
        );
      }
      setData(payload);
    } catch (error) {
      setDataError(
        error instanceof Error
          ? error.message
          : "Tournament data could not be loaded.",
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!data.players.length || selectedPlayer) return;
    const storedPlayer = window.localStorage.getItem(
      "holmberg-homies-player-id",
    );
    if (
      storedPlayer &&
      data.players.some((player) => player.id === storedPlayer)
    ) {
      setSelectedPlayer(storedPlayer);
    }
  }, [data.players, selectedPlayer]);

  const selectedPlayerName = useMemo(
    () => data.players.find((player) => player.id === selectedPlayer)?.name,
    [data.players, selectedPlayer],
  );

  async function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (signupPending) return;
    setSignupPending(true);
    setSignupStatus(null);

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          contact,
          website: form.get("website"),
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        player?: Player;
      };

      if (!response.ok) {
        if (response.status === 409 && payload.player?.id) {
          setSelectedPlayer(payload.player.id);
          window.localStorage.setItem(
            "holmberg-homies-player-id",
            payload.player.id,
          );
        }
        throw new Error(payload.error ?? "Registration could not be saved.");
      }

      if (payload.player) {
        setSelectedPlayer(payload.player.id);
        window.localStorage.setItem(
          "holmberg-homies-player-id",
          payload.player.id,
        );
      }
      setName("");
      setContact("");
      setSignupStatus({
        type: "success",
        message:
          "You’re registered! Your name is ready on the voting form below.",
      });
      await refreshData();
    } catch (error) {
      setSignupStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Registration could not be saved.",
      });
    } finally {
      setSignupPending(false);
    }
  }

  async function submitVote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (votePending) return;
    setVotePending(true);
    setVoteStatus(null);

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: selectedPlayer,
          vote: partnerVote,
          website: form.get("website"),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Your vote could not be saved.");
      }

      setVoteStatus({
        type: "success",
        message: `Vote saved${selectedPlayerName ? ` for ${selectedPlayerName}` : ""}. Thanks!`,
      });
      await refreshData();
    } catch (error) {
      setVoteStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Your vote could not be saved.",
      });
    } finally {
      setVotePending(false);
    }
  }

  const totals = data.voteTotals;
  const randomPercent = totals?.total
    ? Math.round((totals.randomPartners / totals.total) * 100)
    : 0;
  const choosePercent = totals?.total
    ? Math.round((totals.chooseYourPartners / totals.total) * 100)
    : 0;

  const finalsByRound = data.finals.reduce<Record<string, FinalsMatch[]>>(
    (groups, match) => {
      (groups[match.round] ??= []).push(match);
      return groups;
    },
    {},
  );

  return (
    <main className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-50 border-b border-white/15 bg-[var(--deep-navy)]/95 text-white shadow-lg backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-5 px-4 sm:px-6 lg:px-8">
          <a
            href="#home"
            className="flex shrink-0 items-center gap-2.5"
            aria-label="Holmberg Homies home"
          >
            <span className="grid size-9 -rotate-3 place-items-center rounded-lg bg-[var(--pickle)] text-sm font-black text-[var(--deep-navy)] shadow-[3px_3px_0_var(--coral)]">
              HH
            </span>
            <span className="hidden text-sm font-black uppercase tracking-[0.14em] sm:inline">
              Holmberg Homies
            </span>
          </a>
          <nav
            className="scrollbar-thin ml-auto flex items-center gap-1 overflow-x-auto"
            aria-label="Primary navigation"
          >
            {["Home", "Sign Up", "Vote", "Tournament"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(" ", "")}`}
                className="rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider text-white/75 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pickle)] sm:text-sm"
              >
                {item}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <section
        id="home"
        className="relative min-h-[680px] scroll-mt-16 overflow-hidden bg-[var(--deep-navy)] text-white"
      >
        <img
          src="/holmberg-homies-hero.png"
          alt="Illustration of pickleball paddles and a neon pickleball on blue courts surrounded by Inland Northwest evergreens"
          className="absolute inset-0 h-full w-full object-cover object-[64%_center]"
        />
        <div className="hero-scrim absolute inset-0" />
        <div className="relative mx-auto grid min-h-[680px] max-w-7xl items-center px-5 py-16 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] backdrop-blur">
              <MapPin className="size-4 text-[var(--pickle)]" />
              {siteConfig.locationName} · {siteConfig.locationDetail}
            </div>
            <p className="display-face text-5xl leading-[0.82] text-white sm:text-7xl lg:text-[6.7rem]">
              Holmberg
              <br />
              Homies
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <span className="display-face text-7xl leading-none text-[var(--pickle)] sm:text-8xl">
                {siteConfig.year}
              </span>
              <span className="-rotate-2 rounded-lg bg-[var(--coral)] px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-[var(--deep-navy)] shadow-[4px_4px_0_var(--pickle)] sm:text-base">
                {siteConfig.tagline}
              </span>
            </div>
            <p className="mt-7 max-w-xl text-base leading-7 text-white/80 sm:text-lg">
              {siteConfig.description}
            </p>

            <div className="mt-7 flex flex-wrap gap-3 text-sm font-bold">
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-[var(--deep-navy)]/60 px-4 py-3 backdrop-blur">
                <CalendarDays className="size-4 text-[var(--pickle)]" /> Date:{" "}
                {siteConfig.dateLabel}
              </span>
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-[var(--deep-navy)]/60 px-4 py-3 backdrop-blur">
                <Clock3 className="size-4 text-[var(--pickle)]" /> Time:{" "}
                {siteConfig.timeLabel}
              </span>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-xl bg-[var(--pickle)] px-6 font-black text-[var(--deep-navy)] shadow-[4px_4px_0_var(--coral)] hover:bg-[#e5ff71]"
              >
                <a href="#signup">
                  Sign Up <ArrowRight />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-white/45 bg-white/10 px-6 font-black text-white hover:bg-white hover:text-[var(--deep-navy)]"
              >
                <a href="#vote">Vote</a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="h-12 rounded-xl px-5 font-black text-white hover:bg-white/10 hover:text-white"
              >
                <a href="#tournament">Tournament</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <aside className="border-y border-[var(--deep-navy)]/15 bg-[var(--pickle)] text-[var(--deep-navy)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:px-8 lg:px-12">
          <div className="flex shrink-0 items-center gap-2 text-xs font-black uppercase tracking-[0.18em]">
            <Megaphone className="size-4" /> Announcements
          </div>
          <span className="hidden text-[var(--court-blue-dark)] sm:inline">
            //
          </span>
          <p className="text-sm font-semibold">
            {siteConfig.announcements[0]}
          </p>
        </div>
      </aside>

      <section
        id="signup"
        className="scroll-mt-20 px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Step 01" title="Sign Up">
            Add your name to the player list. Contact information is optional
            and is never displayed publicly.
          </SectionHeading>

          <div className="mt-12 grid gap-7 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
            <form
              onSubmit={submitSignup}
              className="paper-grain rounded-[1.6rem] border border-[var(--deep-navy)]/15 bg-white p-6 shadow-[0_18px_55px_rgba(8,42,66,0.09)] sm:p-8"
            >
              <div className="mb-7 flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-[var(--court-blue)] text-white">
                  <Users className="size-5" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-[var(--deep-navy)]">
                    Player registration
                  </h3>
                  <p className="text-sm text-slate-500">
                    One registration per player.
                  </p>
                </div>
              </div>

              {!data.configured && (
                <div className="mb-5">
                  <StatusMessage type="info">
                    Registration is being connected. The form will open as soon
                    as setup is complete.
                  </StatusMessage>
                </div>
              )}

              <div className="space-y-5">
                <label className="block space-y-2 text-sm font-bold text-[var(--deep-navy)]">
                  <span>Player name</span>
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    minLength={2}
                    maxLength={60}
                    autoComplete="name"
                    placeholder="Your name"
                    className="h-12 rounded-xl bg-white px-4 text-base"
                  />
                </label>
                <label className="block space-y-2 text-sm font-bold text-[var(--deep-navy)]">
                  <span>
                    Email or contact{" "}
                    <span className="font-normal text-slate-500">
                      (optional)
                    </span>
                  </span>
                  <Input
                    value={contact}
                    onChange={(event) => setContact(event.target.value)}
                    maxLength={120}
                    autoComplete="email"
                    placeholder="For tournament coordination"
                    className="h-12 rounded-xl bg-white px-4 text-base"
                  />
                </label>
                <label className="sr-only" aria-hidden="true">
                  Website
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
                {signupStatus && (
                  <StatusMessage type={signupStatus.type}>
                    {signupStatus.message}
                  </StatusMessage>
                )}
                <Button
                  type="submit"
                  size="lg"
                  disabled={!data.configured || signupPending}
                  className="h-12 w-full rounded-xl bg-[var(--court-blue)] text-base font-black shadow-[4px_4px_0_var(--pickle)] hover:bg-[var(--court-blue-dark)] sm:w-auto"
                >
                  {signupPending ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <CheckCircle2 />
                  )}
                  {signupPending ? "Saving…" : "Join the player list"}
                </Button>
              </div>
            </form>

            <div className="overflow-hidden rounded-[1.6rem] border border-[var(--deep-navy)]/15 bg-[var(--deep-navy)] text-white shadow-[0_18px_55px_rgba(8,42,66,0.13)]">
              <div className="flex items-center justify-between border-b border-white/15 px-6 py-5 sm:px-8">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--pickle)]">
                    Roster
                  </p>
                  <h3 className="mt-1 text-xl font-black">
                    Registered players
                  </h3>
                </div>
                <span className="grid size-11 place-items-center rounded-full bg-white/10 text-lg font-black">
                  {loadingData ? "—" : data.players.length}
                </span>
              </div>
              <div className="max-h-[390px] overflow-y-auto p-4 sm:p-6">
                {loadingData ? (
                  <p className="flex items-center gap-2 rounded-xl bg-white/[0.07] p-4 text-sm text-white/70">
                    <LoaderCircle className="size-4 animate-spin" /> Loading the
                    roster…
                  </p>
                ) : dataError ? (
                  <div className="space-y-3 rounded-xl bg-white/[0.07] p-4 text-sm text-white/75">
                    <p>{dataError}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void refreshData()}
                      className="border-white/30 bg-transparent text-white hover:bg-white hover:text-[var(--deep-navy)]"
                    >
                      <RefreshCw /> Try again
                    </Button>
                  </div>
                ) : data.players.length ? (
                  <ol className="grid gap-2 sm:grid-cols-2">
                    {data.players.map((player, index) => (
                      <li
                        key={player.id}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm font-bold"
                      >
                        <span className="text-xs font-black text-[var(--pickle)]">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        {player.name}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="grid min-h-44 place-items-center rounded-xl border border-dashed border-white/20 px-6 text-center">
                    <div>
                      <Users className="mx-auto mb-3 size-7 text-[var(--pickle)]" />
                      <p className="font-bold">No players registered yet.</p>
                      <p className="mt-1 text-sm text-white/60">
                        The first name added will appear here.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="vote"
        className="scroll-mt-20 bg-[#e7f4f8] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Step 02" title="Choose the format">
            Registered players can vote once on how partners should be formed.
            The result does not lock in a team format until voting is finished.
          </SectionHeading>

          <div className="mt-12 grid gap-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
            <form
              onSubmit={submitVote}
              className="rounded-[1.6rem] border border-[var(--deep-navy)]/15 bg-white p-6 shadow-[0_18px_55px_rgba(8,42,66,0.08)] sm:p-8"
            >
              <div className="mb-6 flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-[var(--coral)] text-[var(--deep-navy)]">
                  <Vote className="size-5" />
                </span>
                <div>
                  <h3 className="text-lg font-black">Partner format vote</h3>
                  <p className="text-sm text-slate-500">
                    Select your registered name first.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <label className="block space-y-2 text-sm font-bold">
                  <span>Registered player</span>
                  <Select
                    value={selectedPlayer}
                    onValueChange={setSelectedPlayer}
                    disabled={!data.configured || !data.players.length}
                  >
                    <SelectTrigger className="h-12 w-full rounded-xl bg-white px-4 text-base">
                      <SelectValue
                        placeholder={
                          data.players.length ? "Choose your name" : "Sign up first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {data.players.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <fieldset>
                  <legend className="mb-3 text-sm font-bold">
                    How should partners be formed?
                  </legend>
                  <RadioGroup
                    value={partnerVote}
                    onValueChange={setPartnerVote}
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    <label
                      className={`cursor-pointer rounded-2xl border-2 p-5 transition ${
                        partnerVote === "Random Partners"
                          ? "border-[var(--court-blue)] bg-blue-50 shadow-[4px_4px_0_var(--pickle)]"
                          : "border-slate-200 hover:border-[var(--court-blue)]/50"
                      }`}
                    >
                      <span className="flex items-start gap-3">
                        <RadioGroupItem
                          value="Random Partners"
                          className="mt-1"
                        />
                        <span>
                          <span className="block font-black text-[var(--deep-navy)]">
                            Random Partners
                          </span>
                          <span className="mt-1 block text-sm leading-6 text-slate-600">
                            Partners would be drawn after voting closes.
                          </span>
                        </span>
                      </span>
                    </label>
                    <label
                      className={`cursor-pointer rounded-2xl border-2 p-5 transition ${
                        partnerVote === "Choose Your Partners"
                          ? "border-[var(--coral)] bg-orange-50 shadow-[4px_4px_0_var(--pickle)]"
                          : "border-slate-200 hover:border-[var(--coral)]/60"
                      }`}
                    >
                      <span className="flex items-start gap-3">
                        <RadioGroupItem
                          value="Choose Your Partners"
                          className="mt-1"
                        />
                        <span>
                          <span className="block font-black text-[var(--deep-navy)]">
                            Choose Your Partners
                          </span>
                          <span className="mt-1 block text-sm leading-6 text-slate-600">
                            Partner selection can be added if this format wins.
                          </span>
                        </span>
                      </span>
                    </label>
                  </RadioGroup>
                </fieldset>

                <label className="sr-only" aria-hidden="true">
                  Website
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
                {voteStatus && (
                  <StatusMessage type={voteStatus.type}>
                    {voteStatus.message}
                  </StatusMessage>
                )}
                {!data.players.length && !loadingData && (
                  <p className="text-sm text-slate-600">
                    Need a name on the list?{" "}
                    <a
                      href="#signup"
                      className="font-black text-[var(--court-blue)] underline underline-offset-4"
                    >
                      Sign up above.
                    </a>
                  </p>
                )}
                <Button
                  type="submit"
                  size="lg"
                  disabled={
                    !data.configured ||
                    !selectedPlayer ||
                    !partnerVote ||
                    votePending
                  }
                  className="h-12 w-full rounded-xl bg-[var(--deep-navy)] text-base font-black shadow-[4px_4px_0_var(--pickle)] hover:bg-[var(--court-blue-dark)] sm:w-auto"
                >
                  {votePending ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Vote />
                  )}
                  {votePending ? "Saving vote…" : "Submit vote"}
                </Button>
              </div>
            </form>

            <div className="rounded-[1.6rem] border border-[var(--deep-navy)]/15 bg-[var(--deep-navy)] p-6 text-white shadow-[0_18px_55px_rgba(8,42,66,0.13)] sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--pickle)]">
                Vote status
              </p>
              <h3 className="mt-2 text-2xl font-black">Live totals</h3>
              {data.showVoteTotals && totals ? (
                <div className="mt-8 space-y-7">
                  <div>
                    <div className="mb-2 flex justify-between gap-4 text-sm font-bold">
                      <span>Random Partners</span>
                      <span>
                        {totals.randomPartners} · {randomPercent}%
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-white/15">
                      <div
                        className="h-full rounded-full bg-[var(--pickle)]"
                        style={{ width: `${randomPercent}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex justify-between gap-4 text-sm font-bold">
                      <span>Choose Your Partners</span>
                      <span>
                        {totals.chooseYourPartners} · {choosePercent}%
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-white/15">
                      <div
                        className="h-full rounded-full bg-[var(--coral)]"
                        style={{ width: `${choosePercent}%` }}
                      />
                    </div>
                  </div>
                  <p className="border-t border-white/15 pt-5 text-sm text-white/65">
                    {totals.total} vote{totals.total === 1 ? "" : "s"} recorded.
                  </p>
                </div>
              ) : (
                <div className="mt-8 rounded-2xl border border-dashed border-white/25 bg-white/[0.07] p-6">
                  <Vote className="mb-4 size-8 text-[var(--pickle)]" />
                  <p className="font-black">Totals are currently hidden.</p>
                  <p className="mt-2 text-sm leading-6 text-white/65">
                    Votes are still being counted. Visibility can be switched on
                    later without changing the form.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section
        id="tournament"
        className="scroll-mt-20 px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Step 03" title="Tournament">
            Return here for pairings, round-robin standings, and the finals once
            teams and schedules are ready.
          </SectionHeading>

          <div className="mt-12 overflow-hidden rounded-[1.6rem] border border-[var(--deep-navy)]/15 bg-white shadow-[0_18px_55px_rgba(8,42,66,0.08)]">
            <div className="flex flex-col gap-3 border-b bg-[var(--court-blue)] px-6 py-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--pickle)]">
                  Round Robin
                </p>
                <h3 className="mt-1 text-2xl font-black">Standings</h3>
              </div>
              <p className="text-sm text-white/75">
                Sorted by wins, then point differential.
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="w-14 px-5 text-center">#</TableHead>
                  <TableHead className="min-w-48">Team / Player</TableHead>
                  <TableHead className="text-center">Played</TableHead>
                  <TableHead className="text-center">Wins</TableHead>
                  <TableHead className="text-center">Losses</TableHead>
                  <TableHead className="pr-5 text-right">
                    Point Diff.
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.standings.length ? (
                  data.standings.map((standing, index) => (
                    <TableRow key={standing.name}>
                      <TableCell className="px-5 text-center font-black text-[var(--court-blue)]">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-black text-[var(--deep-navy)]">
                        {standing.name}
                      </TableCell>
                      <TableCell className="text-center">
                        {standing.played}
                      </TableCell>
                      <TableCell className="text-center font-bold text-emerald-700">
                        {standing.wins}
                      </TableCell>
                      <TableCell className="text-center">
                        {standing.losses}
                      </TableCell>
                      <TableCell className="pr-5 text-right font-black">
                        {standing.differential > 0 ? "+" : ""}
                        {standing.differential}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-36 px-5 text-center text-slate-500"
                    >
                      Standings will appear after completed round-robin matches
                      are entered.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-8 rounded-[1.6rem] border border-[var(--deep-navy)]/15 bg-[var(--deep-navy)] p-6 text-white shadow-[0_18px_55px_rgba(8,42,66,0.13)] sm:p-8">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-xl bg-[var(--pickle)] text-[var(--deep-navy)]">
                <Trophy className="size-6" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--coral)]">
                  Finals
                </p>
                <h3 className="mt-1 text-2xl font-black">Playoff bracket</h3>
              </div>
            </div>

            {Object.keys(finalsByRound).length ? (
              <div className="scrollbar-thin mt-8 flex gap-5 overflow-x-auto pb-3">
                {Object.entries(finalsByRound).map(([round, matches]) => (
                  <div key={round} className="min-w-64 flex-1">
                    <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-[var(--pickle)]">
                      {round}
                    </p>
                    <div className="space-y-3">
                      {matches.map((match) => (
                        <article
                          key={match.id}
                          className="overflow-hidden rounded-xl border border-white/15 bg-white/[0.07]"
                        >
                          {[
                            { name: match.team1, score: match.team1Score },
                            { name: match.team2, score: match.team2Score },
                          ].map((side, index) => (
                            <div
                              key={index}
                              className="flex min-h-11 items-center justify-between gap-4 border-b border-white/10 px-4 py-2 last:border-0"
                            >
                              <span className="text-sm font-bold">
                                {side.name ?? "TBD"}
                              </span>
                              <span className="font-black text-[var(--pickle)]">
                                {match.completed && side.score !== null
                                  ? side.score
                                  : "—"}
                              </span>
                            </div>
                          ))}
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-8 grid min-h-52 place-items-center rounded-2xl border border-dashed border-white/25 bg-white/[0.07] px-6 text-center">
                <div>
                  <Trophy className="mx-auto mb-4 size-9 text-[var(--pickle)]" />
                  <p className="text-xl font-black">
                    Pairings and schedule coming soon
                  </p>
                  <p className="mt-2 text-sm text-white/60">
                    Finals matches will appear here when they are added.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[var(--deep-navy)] px-5 py-10 text-white sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="display-face text-3xl">
              Holmberg Homies{" "}
              <span className="text-[var(--pickle)]">2026</span>
            </p>
            <p className="mt-2 text-sm text-white/60">
              {siteConfig.locationName} · {siteConfig.locationDetail}
            </p>
          </div>
          <a
            href="#home"
            className="text-sm font-black uppercase tracking-wider text-[var(--pickle)] hover:text-white"
          >
            Back to top ↑
          </a>
        </div>
      </footer>
    </main>
  );
}
