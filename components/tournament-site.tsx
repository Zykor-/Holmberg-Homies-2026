"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  LoaderCircle,
  MapPin,
  Megaphone,
  RefreshCw,
  Shirt,
  Trophy,
  UtensilsCrossed,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  team1: string | null;
  team2: string | null;
};
type PotluckContribution = {
  id: string;
  playerId: string;
  playerName: string;
  item: string;
};
type SiteData = {
  configured: boolean;
  players: Player[];
  standings: Standing[];
  finals: FinalsMatch[];
  potluck: PotluckContribution[];
};

const emptyData: SiteData = {
  configured: true,
  players: [],
  standings: [],
  finals: [],
  potluck: [],
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
  const [potluckItem, setPotluckItem] = useState("");
  const [potluckStatus, setPotluckStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [potluckPending, setPotluckPending] = useState(false);

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
    // Initial remote data load; refreshData owns the async state transition.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      // Restore the player's prior selection from this device.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedPlayer(storedPlayer);
    }
  }, [data.players, selectedPlayer]);

  const selectedPlayerName = useMemo(
    () => data.players.find((player) => player.id === selectedPlayer)?.name,
    [data.players, selectedPlayer],
  );

  function selectPotluckPlayer(playerId: string) {
    setSelectedPlayer(playerId);
    const existing = data.potluck.find(
      (contribution) => contribution.playerId === playerId,
    );
    setPotluckItem(existing?.item ?? "");
    setPotluckStatus(null);
  }

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
        message: "You’re registered! Your name is on the player list.",
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

  async function submitPotluck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (potluckPending) return;
    setPotluckPending(true);
    setPotluckStatus(null);

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/potluck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: selectedPlayer,
          item: potluckItem,
          website: form.get("website"),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Your potluck item could not be saved.");
      }

      setPotluckStatus({
        type: "success",
        message: `Potluck item saved${selectedPlayerName ? ` for ${selectedPlayerName}` : ""}.`,
      });
      await refreshData();
    } catch (error) {
      setPotluckStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Your potluck item could not be saved.",
      });
    } finally {
      setPotluckPending(false);
    }
  }

  const championshipMatch = data.finals[0];

  const navItems = [
    { label: "Home", href: "#home" },
    { label: "Sign Up", href: "#signup" },
    { label: "Format", href: "#format" },
    { label: "Tournament", href: "#tournament" },
    { label: "Potluck", href: "#potluck" },
    { label: "T-Shirts", href: "#tshirts" },
  ];

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
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider text-white/75 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pickle)] sm:text-sm"
              >
                {item.label}
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
                <a href="#format">See the Format</a>
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

            <a
              href="https://www.guildeddragon.com/"
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-flex max-w-full items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-2 pr-4 text-white backdrop-blur transition hover:border-[var(--pickle)]/70 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pickle)]"
              aria-label="Visit tournament sponsor The Guilded Dragon"
            >
              <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-1 shadow-sm">
                <img
                  src="/guilded-dragon-logo.png"
                  alt="The Guilded Dragon logo"
                  className="size-full object-contain"
                />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.65rem] font-black uppercase tracking-[0.18em] text-[var(--pickle)]">
                  Proudly sponsored by
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-sm font-black sm:text-base">
                  The Guilded Dragon
                  <ExternalLink className="size-3.5 shrink-0" />
                </span>
              </span>
            </a>
          </div>
        </div>
      </section>

      <aside className="border-y border-[var(--deep-navy)]/15 bg-[var(--pickle)] text-[var(--deep-navy)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:px-8 lg:px-12">
          <div className="flex shrink-0 items-center gap-2 text-xs font-black uppercase tracking-[0.18em]">
            <Megaphone className="size-4" /> Announcements
          </div>
          <span className="hidden text-[var(--court-blue-dark)] sm:inline">
            {"//"}
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
        id="format"
        className="scroll-mt-20 bg-[#e7f4f8] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Step 02" title="Cream of the Crop">
            Qualifying uses rotating partners, with every player competing for
            an individual place in the standings.
          </SectionHeading>

          <div className="mt-12 grid gap-7 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
            <div className="rounded-[1.6rem] border border-[var(--deep-navy)]/15 bg-white p-6 shadow-[0_18px_55px_rgba(8,42,66,0.08)] sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <span className="grid size-10 place-items-center rounded-xl bg-[var(--court-blue)] text-white">
                    <RefreshCw className="size-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-black text-[var(--deep-navy)]">
                    Rotating partners
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Partners change during qualifying. Your results stay with
                    you, regardless of who is beside you.
                  </p>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <span className="grid size-10 place-items-center rounded-xl bg-[var(--pickle)] text-[var(--deep-navy)]">
                    <Users className="size-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-black text-[var(--deep-navy)]">
                    Individual standings
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Players are ranked by wins. Point differential breaks any
                    ties in the standings.
                  </p>
                </article>
              </div>

              <div className="mt-5 rounded-2xl border-l-4 border-[var(--coral)] bg-orange-50 px-5 py-4">
                <p className="font-black text-[var(--deep-navy)]">
                  You do not need a permanent partner.
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Just show up ready to play.
                </p>
              </div>
            </div>

            <aside className="rounded-[1.6rem] border border-[var(--deep-navy)]/15 bg-[var(--deep-navy)] p-6 text-white shadow-[0_18px_55px_rgba(8,42,66,0.13)] sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--coral)]">
                Championship path
              </p>
              <h3 className="mt-2 text-2xl font-black">
                The top four advance
              </h3>
              <p className="mt-3 text-sm leading-6 text-white/70">
                After qualifying, the four highest-ranked players form two
                teams for the championship.
              </p>

              <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="rounded-2xl bg-white/[0.08] px-3 py-5 text-center">
                  <p className="display-face text-3xl text-[var(--pickle)]">
                    #1 + #4
                  </p>
                </div>
                <span className="display-face text-xl text-[var(--coral)]">
                  VS
                </span>
                <div className="rounded-2xl bg-white/[0.08] px-3 py-5 text-center">
                  <p className="display-face text-3xl text-[var(--pickle)]">
                    #2 + #3
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-center text-sm font-black uppercase tracking-[0.16em]">
                Best of 3 final
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section
        id="tournament"
        className="scroll-mt-20 px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Step 03" title="Standings + Championship">
            Follow the individual qualifying leaderboard and the championship
            matchup here on tournament day.
          </SectionHeading>

          <div className="mt-12 overflow-hidden rounded-[1.6rem] border border-[var(--deep-navy)]/15 bg-white shadow-[0_18px_55px_rgba(8,42,66,0.08)]">
            <div className="flex flex-col gap-3 border-b bg-[var(--court-blue)] px-6 py-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--pickle)]">
                  Qualifying
                </p>
                <h3 className="mt-1 text-2xl font-black">
                  Individual standings
                </h3>
              </div>
              <p className="text-sm text-white/80">
                Ranked by wins, then point differential.
              </p>
            </div>

            <div className="divide-y divide-slate-200 md:hidden">
              {data.standings.length ? (
                data.standings.map((standing, index) => (
                  <article
                    key={standing.name}
                    className={`p-5 ${index < 4 ? "bg-[var(--pickle)]/[0.09]" : "bg-white"}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--deep-navy)] text-sm font-black text-[var(--pickle)]">
                          {index + 1}
                        </span>
                        <p className="truncate font-black text-[var(--deep-navy)]">
                          {standing.name}
                        </p>
                      </div>
                      {index < 4 && (
                        <span className="shrink-0 rounded-full bg-[var(--pickle)] px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wider text-[var(--deep-navy)]">
                          Top 4
                        </span>
                      )}
                    </div>
                    <dl className="mt-4 grid grid-cols-5 gap-2 text-center">
                      {[
                        ["GP", standing.played],
                        ["W", standing.wins],
                        ["PF", standing.pointsFor],
                        ["PA", standing.pointsAgainst],
                        ["+/-", `${standing.differential > 0 ? "+" : ""}${standing.differential}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg bg-slate-100 px-1 py-2">
                          <dt className="text-[0.65rem] font-black uppercase tracking-wider text-slate-500">
                            {label}
                          </dt>
                          <dd className="mt-1 text-sm font-black text-[var(--deep-navy)]">
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                ))
              ) : (
                <p className="px-5 py-14 text-center text-slate-500">
                  Standings will appear here on tournament day.
                </p>
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="w-16 px-5 text-center">Rank</TableHead>
                    <TableHead className="min-w-44">Player</TableHead>
                    <TableHead className="text-center">Games Played</TableHead>
                    <TableHead className="text-center">Wins</TableHead>
                    <TableHead className="text-center">Points For</TableHead>
                    <TableHead className="text-center">Points Against</TableHead>
                    <TableHead className="pr-5 text-right">
                      Point Differential
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.standings.length ? (
                    data.standings.map((standing, index) => (
                      <TableRow
                        key={standing.name}
                        className={index < 4 ? "bg-[var(--pickle)]/[0.09]" : ""}
                      >
                        <TableCell className="px-5 text-center font-black text-[var(--court-blue)]">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-black text-[var(--deep-navy)]">
                          <span className="flex items-center gap-2">
                            {standing.name}
                            {index < 4 && (
                              <span className="rounded-full bg-[var(--pickle)] px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wider">
                                Top 4
                              </span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">{standing.played}</TableCell>
                        <TableCell className="text-center font-bold text-emerald-700">
                          {standing.wins}
                        </TableCell>
                        <TableCell className="text-center">{standing.pointsFor}</TableCell>
                        <TableCell className="text-center">{standing.pointsAgainst}</TableCell>
                        <TableCell className="pr-5 text-right font-black">
                          {standing.differential > 0 ? "+" : ""}
                          {standing.differential}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-36 px-5 text-center text-slate-500"
                      >
                        Standings will appear here on tournament day.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="mt-8 rounded-[1.6rem] border border-[var(--deep-navy)]/15 bg-[var(--deep-navy)] p-6 text-white shadow-[0_18px_55px_rgba(8,42,66,0.13)] sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-xl bg-[var(--pickle)] text-[var(--deep-navy)]">
                  <Trophy className="size-6" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--coral)]">
                    Championship
                  </p>
                  <h3 className="mt-1 text-2xl font-black">Final matchup</h3>
                </div>
              </div>
              <span className="self-start rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--pickle)] sm:self-auto">
                Best of 3
              </span>
            </div>

            <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-stretch gap-3 sm:gap-5">
              <div className="grid min-h-28 place-items-center rounded-2xl border border-white/15 bg-white/[0.07] px-3 py-5 text-center sm:min-h-36 sm:px-6">
                <p className="display-face text-2xl leading-tight text-white sm:text-4xl">
                  {championshipMatch?.team1 ?? "#1 + #4"}
                </p>
              </div>
              <div className="grid place-items-center">
                <span className="display-face grid size-11 place-items-center rounded-full bg-[var(--coral)] text-sm text-[var(--deep-navy)] sm:size-14 sm:text-lg">
                  VS
                </span>
              </div>
              <div className="grid min-h-28 place-items-center rounded-2xl border border-white/15 bg-white/[0.07] px-3 py-5 text-center sm:min-h-36 sm:px-6">
                <p className="display-face text-2xl leading-tight text-white sm:text-4xl">
                  {championshipMatch?.team2 ?? "#2 + #3"}
                </p>
              </div>
            </div>

            <p className="mt-5 text-center text-sm leading-6 text-white/65">
              {championshipMatch
                ? "The championship pairing has been posted."
                : "The matchup will populate after qualifying is complete."}
            </p>
          </div>
        </div>
      </section>

      <section
        id="potluck"
        className="scroll-mt-20 px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Step 04" title="Potluck lineup">
            Tell everyone what you plan to bring so we can build a great spread
            without ending up with twelve bags of chips.
          </SectionHeading>

          <div className="mt-12 grid gap-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
            <form
              onSubmit={submitPotluck}
              className="paper-grain rounded-[1.6rem] border border-[var(--deep-navy)]/15 bg-white p-6 shadow-[0_18px_55px_rgba(8,42,66,0.09)] sm:p-8"
            >
              <div className="mb-7 flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-[var(--pickle)] text-[var(--deep-navy)] shadow-[3px_3px_0_var(--coral)]">
                  <UtensilsCrossed className="size-5" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-[var(--deep-navy)]">
                    Add your contribution
                  </h3>
                  <p className="text-sm text-slate-500">
                    Submitting again updates your existing item.
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <label className="block space-y-2 text-sm font-bold">
                  <span>Registered player</span>
                  <Select
                    value={selectedPlayer}
                    onValueChange={selectPotluckPlayer}
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

                <label className="block space-y-2 text-sm font-bold">
                  <span>What are you bringing?</span>
                  <Input
                    value={potluckItem}
                    onChange={(event) => setPotluckItem(event.target.value)}
                    required
                    minLength={2}
                    maxLength={120}
                    placeholder="Example: pasta salad and lemonade"
                    className="h-12 rounded-xl bg-white px-4 text-base"
                  />
                </label>

                <label className="sr-only" aria-hidden="true">
                  Website
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
                {potluckStatus && (
                  <StatusMessage type={potluckStatus.type}>
                    {potluckStatus.message}
                  </StatusMessage>
                )}
                {!data.players.length && !loadingData && (
                  <p className="text-sm text-slate-600">
                    Add your name to the{" "}
                    <a
                      href="#signup"
                      className="font-black text-[var(--court-blue)] underline underline-offset-4"
                    >
                      player list first.
                    </a>
                  </p>
                )}
                <Button
                  type="submit"
                  size="lg"
                  disabled={
                    !data.configured ||
                    !selectedPlayer ||
                    potluckItem.trim().length < 2 ||
                    potluckPending
                  }
                  className="h-12 w-full rounded-xl bg-[var(--court-blue)] text-base font-black shadow-[4px_4px_0_var(--pickle)] hover:bg-[var(--court-blue-dark)] sm:w-auto"
                >
                  {potluckPending ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <UtensilsCrossed />
                  )}
                  {potluckPending ? "Saving…" : "Add to the potluck"}
                </Button>
              </div>
            </form>

            <div className="overflow-hidden rounded-[1.6rem] border border-[var(--deep-navy)]/15 bg-[var(--deep-navy)] text-white shadow-[0_18px_55px_rgba(8,42,66,0.13)]">
              <div className="flex items-center justify-between border-b border-white/15 px-6 py-5 sm:px-8">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--pickle)]">
                    On the menu
                  </p>
                  <h3 className="mt-1 text-xl font-black">What everyone is bringing</h3>
                </div>
                <span className="grid size-11 place-items-center rounded-full bg-white/10 text-lg font-black">
                  {data.potluck.length}
                </span>
              </div>

              <div className="p-4 sm:p-6">
                {data.potluck.length ? (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {data.potluck.map((contribution) => (
                      <li
                        key={contribution.id}
                        className="rounded-xl border border-white/10 bg-white/[0.07] p-4"
                      >
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--pickle)]">
                          {contribution.playerName}
                        </p>
                        <p className="mt-2 text-sm font-bold leading-6 text-white">
                          {contribution.item}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="grid min-h-52 place-items-center rounded-xl border border-dashed border-white/20 px-6 text-center">
                    <div>
                      <UtensilsCrossed className="mx-auto mb-3 size-8 text-[var(--pickle)]" />
                      <p className="font-bold">The potluck list is empty.</p>
                      <p className="mt-1 text-sm text-white/60">
                        Be the first to claim what you’re bringing.
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
        id="tshirts"
        className="scroll-mt-20 bg-[#e7f4f8] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Step 05" title="Tournament T-Shirts">
            Custom Holmberg Homies 2026 event shirts will be available to order.
            The order link and shirt details are coming soon.
          </SectionHeading>

          <div className="mt-12 grid overflow-hidden rounded-[1.6rem] border border-[var(--deep-navy)]/15 bg-white shadow-[0_18px_55px_rgba(8,42,66,0.1)] lg:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
            <div className="paper-grain grid min-h-80 place-items-center bg-[var(--deep-navy)] p-8 text-center text-white sm:min-h-96">
              <div>
                <span className="mx-auto grid size-24 place-items-center rounded-[1.6rem] border border-white/15 bg-white/10 text-[var(--pickle)] shadow-[6px_6px_0_var(--coral)]">
                  <Shirt className="size-12" />
                </span>
                <p className="display-face mt-8 text-4xl leading-none">
                  Holmberg Homies
                </p>
                <p className="display-face mt-1 text-5xl leading-none text-[var(--pickle)]">
                  2026
                </p>
                <span className="mt-6 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/75">
                  Shirt artwork coming soon
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--court-blue)]">
                Event merch
              </p>
              <h3 className="mt-3 text-3xl font-black text-[var(--deep-navy)] sm:text-4xl">
                Holmberg Homies 2026 Shirts
              </h3>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
                We’re getting a custom tournament shirt ready. Check back here
                for the final artwork and the official purchase link.
              </p>

              <div className="mt-8">
                {siteConfig.shirtOrderUrl ? (
                  <Button
                    asChild
                    size="lg"
                    className="h-12 rounded-xl bg-[var(--court-blue)] px-6 text-base font-black shadow-[4px_4px_0_var(--pickle)] hover:bg-[var(--court-blue-dark)]"
                  >
                    <a
                      href={siteConfig.shirtOrderUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Order Shirts <ExternalLink />
                    </a>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="lg"
                    disabled
                    className="h-12 w-full rounded-xl bg-slate-200 px-6 text-base font-black text-slate-500 sm:w-auto"
                  >
                    <Shirt /> Order Link Coming Soon
                  </Button>
                )}
              </div>
            </div>
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
