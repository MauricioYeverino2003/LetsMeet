// app/event/[id]/page.tsx
"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";

// UI COMPONENTS
import Link from "next/link";
import { Calendar, ArrowLeft, Users, Share, Check, User } from "lucide-react";
import Image from "next/image";
// Custom
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChatSection } from "@/components/ChatSection";
import { PollsSection } from "@/components/PollsSection";

// TYPES
type EventData = {
  id: string;
  title: string;
  description?: string;
  banner?: string;
  dateRange: [number, number]; // days from today
  timeRange: [number, number]; // hours (0-23)
};

type Participant = {
  name: string;
  availability: Set<string>; // Set of "dateIndex-timeIndex"
};

type GridStyle = React.CSSProperties & { ["--cols"]?: number };

// HELPERS
import { getGridDefaults } from "@/lib/event/getGridDefaults";
import getMyParticipant from "@/lib/event/getMyParticipant";
import confirmParticipant from "@/lib/event/comfirmParticipant";
import saveAvailabilities from "@/lib/event/saveAvailabilities";
import { cellsToIsoSlotsInZone } from "@/lib/event/cellsToUtcIsoSlots";

// COMPONENT
export default function EventClient({ event }: {
  event: {
    id: string; title: string; description?: string | null;
    timezone?: string | null; starts_at: string; ends_at: string;
    banner_url?: string | null;
  };
}) {

  const { startDay: defaultStartDay, endDay: defaultEndDay, startHour: defaultStartHour, endHour: defaultEndHour } = getGridDefaults(event.starts_at, event.ends_at, event.timezone ?? "UTC")

  // MAYBE INIT EVENT HELPER
  const eventData: EventData = {
    id: event.id,
    title: event.title,
    description: event.description ?? "",
    banner: event.banner_url ?? undefined,
    dateRange: [defaultStartDay, defaultEndDay],
    timeRange: [defaultStartHour, defaultEndHour],
  };

  // ---- Local state ----
  const [guestName, setGuestName] = useState("");
  const [confirmedName, setConfirmedName] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myAvailability, setMyAvailability] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [dragStartCell, setDragStartCell] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState<boolean>(false)
  const supaRef = useRef<SupabaseClient | null>(null);

  //LOADS STATE OF EVENT. COULD BE FUNCTION IN LIB
  async function loadEventState(supa: SupabaseClient) {
    // Grab participants + their slots for this event
    const { data, error } = await supa
      .from("event_participants")
      .select("display_name, availabilities(slot_start,slot_end)")
      .eq("event_id", event.id);

    if (error) return;

    // Build fast lookup maps to turn slots -> cell IDs
    const tz = event.timezone ?? "UTC";
    const dateKey = (d: Date) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
        .format(d);                           // "YYYY-MM-DD" in event TZ
    const dayIndex = new Map(dates.map((d, i) => [dateKey(d), i]));
    const hourIndex = new Map(timeSlots.map((h, i) => [h, i]));

    const next: typeof participants = [];

    for (const row of data ?? []) {
      const set = new Set<string>();
      for (const slot of row.availabilities ?? []) {
        const start = new Date(slot.slot_start);
        const key = dateKey(start);
        const hour = Number(
          new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(start)
        );
        const di = dayIndex.get(key);
        const ti = hourIndex.get(hour);
        if (di != null && ti != null) set.add(`${di}-${ti}`);
      }
      next.push({ name: row.display_name, availability: set });
    }

    setParticipants(next);

    if (confirmedName) {
      const me = next.find(p => p.name === confirmedName);
      if (me) setMyAvailability(new Set(me.availability));
    }
  }

  //MOUNTS FOR REALTIME UPDATES
  useEffect(() => {
  let cleanup = () => {};
  (async () => {
    try {
      // 1) fetch short-lived viewer token for THIS event
      const resp = await fetch(`/api/events/${event.id}/viewer-token`, { credentials: "same-origin" });
      const { token } = await resp.json();

      // 2) create a scoped client that carries the JWT (RLS will check event_id claim)
      const supa = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        }
      );
      supaRef.current = supa;
      supa.realtime.setAuth(token);

      // 3) initial load
      await loadEventState(supa);

      // 4) realtime subscribe → on any change, reload state
      const onAnyChange = () => loadEventState(supa);
      const channel = supa
        .channel(`event-${event.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "availabilities", filter: `event_id=eq.${event.id}` },
          onAnyChange
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "event_participants", filter: `event_id=eq.${event.id}` },
          onAnyChange
        )
        .subscribe();

      cleanup = () => {
        supa.removeChannel(channel);
      };
    } catch (e) {
      console.error("Realtime init failed", e);
    }
  })();
  return () => cleanup();
}, [event.id, event.timezone]);

  // FETCHES IDENTITY IF IT EXISTS
  useEffect(() => {
    (async () => {
      try {
        const res = await getMyParticipant(event.id);
        if (res.participant) {
          setConfirmedName(res.participant.display_name);
          setGuestName(res.participant.display_name);
        }
      } catch (e) {
        // optional: console.warn(e);
      }
    })();
  }, [event.id]);

  // CAN MAYBE MAKE AN IMPORT
  const getRandomBannerUrl = () => {
    const bannerIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const randomId = bannerIds[Math.floor(Math.random() * bannerIds.length)];
    return `https://picsum.photos/800/300?random=${randomId}`;
  };

  const [imgSrc, setImgSrc] = useState(eventData.banner || getRandomBannerUrl());

  // ---- Derived data ----
  const dates = Array.from(
    { length: eventData.dateRange[1] - eventData.dateRange[0] + 1 },
    (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + eventData.dateRange[0] + i);
      return date;
    }
  );

  const timeSlots = Array.from(
    { length: eventData.timeRange[1] - eventData.timeRange[0] + 1 },
    (_, i) => eventData.timeRange[0] + i
  );

  // ---- Helpers ---- DEF NEED TO ORGANIZE HELPERS LOOOOL
  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const formatTime = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const getCellId = (dateIndex: number, timeIndex: number) => `${dateIndex}-${timeIndex}`;

  const getParticipantsForCell = (cellId: string) => {
    const available = participants.filter((p) => p.availability.has(cellId));
    const unavailable = participants.filter((p) => !p.availability.has(cellId));
    return { available, unavailable };
  };

  //Need to fix
  const getCellColor = (cellId: string) => {
    const { available } = getParticipantsForCell(cellId);
    const count = available.length;
    if (count === 0) return { backgroundColor: "transparent" };

    const maxParticipants = Math.max(1, participants.length);
    const intensity = count / maxParticipants;
    const hue = 142;
    const saturation = Math.min(80, 30 + intensity * 50);
    const lightness = Math.max(30, 80 - intensity * 50);
    const opacity = 0.4 + intensity * 0.6;

    return {
      backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      opacity,
    };
  };

  // ---- Name + availability interactions ----
  const handleConfirmName = async () => {
    const name = guestName.trim();
    if (!name) {
      alert("Please enter your name");
      return;
    }
    setConfirming(true);
    try {
      const res = await confirmParticipant(event.id, name);
      setConfirmedName(res.display_name);
      // If user changed the name before confirming, you already reset myAvailability above.
    } catch (e: any) {
      alert(e?.message ?? "Failed to confirm name");
    } finally {
      setConfirming(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, cellId: string) => {
    if (e.button !== 0) return;
    e.preventDefault();
    if (!confirmedName) return alert("Please confirm your name first");

    setIsSelecting(true);
    setDragStartCell(cellId);

    const next = new Set(myAvailability);
    next.has(cellId) ? next.delete(cellId) : next.add(cellId);
    setMyAvailability(next);
  };

  //Currently draggin does not deselect, it only selects
  const handleMouseEnter = (cellId: string) => {
    if (isSelecting && dragStartCell && confirmedName) {
      const next = new Set(myAvailability);
      const [sd, st] = dragStartCell.split("-").map(Number);
      const [ed, et] = cellId.split("-").map(Number);
      for (let d = Math.min(sd, ed); d <= Math.max(sd, ed); d++) {
        for (let t = Math.min(st, et); t <= Math.max(st, et); t++) {
          next.add(getCellId(d, t));
        }
      }
      setMyAvailability(next);
    }
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    setDragStartCell(null);
  };

  const handleSubmitAvailability = async () => {
    if (!confirmedName) {
      alert("Please confirm your name first");
      return;
    }
    const slots = cellsToIsoSlotsInZone(
      myAvailability,
      dates,
      timeSlots,
      event.timezone ?? "UTC"
    );
    if (slots.length === 0) {
      alert("Select at least one time slot");
      return;
    }

    setSubmitting(true);
    try {
      const res = await saveAvailabilities(event.id, slots, /* replaceAll */ true);
      // Optimistic local update to sidebar list:
      const existingIdx = participants.findIndex((p) => p.name === confirmedName);
      const next = [...participants];
      if (existingIdx >= 0) next[existingIdx].availability = new Set(myAvailability);
      else next.push({ name: confirmedName, availability: new Set(myAvailability) });
      setParticipants(next);

      alert(`Saved ${res.count} slot${res.count === 1 ? "" : "s"}!`);
    } catch (e: any) {
      alert(e?.message ?? "Failed to save availability");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Effects ----
  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  useEffect(() => {
    if (!confirmedName) return;
    const existing = participants.find((p) => p.name === confirmedName);
    if (existing) setMyAvailability(new Set(existing.availability));
  }, [confirmedName, participants]);

  // ---- Render ----
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background to-accent/20">
        {/* Header */}
        <header className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-medium text-lg">LetsMeetAt</span>
            </Link>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Share className="w-4 h-4" />
                Share Event
              </Button>
              <Button asChild variant="ghost" size="sm" className="flex items-center gap-2">
                <Link href="/">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="container mx-auto px-4 py-8">
          {/* Event Header */}
          <div className="mb-8">
            <div className="w-full h-48 md:h-64 mb-6 rounded-xl overflow-hidden bg-muted">
              <div className="relative w-full h-48 md:h-64 mb-6 rounded-xl overflow-hidden bg-muted">
                <Image
                  src={imgSrc}
                  alt="Event banner"
                  fill
                  className="object-cover object-center"   // center crop
                  sizes="100vw"
                  onError={() => setImgSrc("/fallback.svg")}
                  priority
                />
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-medium">{eventData.title}</h1>
              {eventData.description && (
                <p className="text-lg text-muted-foreground">{eventData.description}</p>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Availability (left) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Your Information */}
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Your Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Label htmlFor="guestName" className="sr-only">
                        Your Name
                      </Label>
                      <Input
                        id="guestName"
                        placeholder="Enter your name"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        disabled={!!confirmedName}
                      />
                    </div>

                    {!confirmedName ? (
                      <Button onClick={handleConfirmName} disabled={confirming}>
                        {confirming ? "Confirming..." : "Confirm Name"}
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <div className="px-3 py-2 bg-green-100 text-green-800 rounded-lg flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          {confirmedName}
                        </div>
                      </div>
                    )}
                  </div>

                  {confirmedName && (
                    <div className="mt-3">
                      <Button onClick={handleSubmitAvailability} className="w-full" disabled={submitting}>
                        {submitting ? "Saving..." : "Save Availability"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Grid */}
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Select Your Availability</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {confirmedName
                      ? "Click and drag to select your available times"
                      : "Please confirm your name first to select availability"}
                  </p>
                </CardHeader>

                <CardContent>
                  <div ref={gridRef} className="overflow-x-auto" style={{ userSelect: "none" }}>
                    <div className="min-w-max">
                      {/* Dates header */}
                      <div
                        className="grid grid-cols-[100px_repeat(var(--cols),_60px)] gap-1 mb-2"
                        style={{ "--cols": dates.length } as GridStyle}
                      >
                        <div />
                        {dates.map((d, di) => (
                          <div key={di} className="text-xs text-center py-2 font-medium">
                            {formatDate(d)}
                          </div>
                        ))}
                      </div>

                      {/* Rows */}
                      {timeSlots.map((hour, ti) => (
                        <div
                          key={hour}
                          className="grid grid-cols-[100px_repeat(var(--cols),_60px)] gap-1 mb-1"
                          style={{ "--cols": dates.length } as GridStyle}
                        >
                          <div className="text-xs py-2 pr-2 text-right font-medium text-muted-foreground">
                            {formatTime(hour)}
                          </div>

                          {dates.map((_, di) => {
                            const cellId = getCellId(di, ti);
                            const isMine = myAvailability.has(cellId);
                            const { available } = getParticipantsForCell(cellId);
                            const hasVotes = available.length > 0;
                            const cellColor = getCellColor(cellId);

                            const cell = (
                              <div
                                key={cellId}
                                onMouseDown={(e) => handleMouseDown(e, cellId)}
                                onMouseEnter={() => {
                                  // When dragging, fill rectangle in handleMouseEnter
                                  handleMouseEnter(cellId);
                                }}
                                className={`h-8 border border-border/30 cursor-pointer transition-all duration-200 ${isMine
                                  ? "bg-green-400 border-green-500 shadow-sm"
                                  : hasVotes
                                    ? "border-green-300"
                                    : "bg-background hover:bg-green-50 hover:border-green-200"
                                  } ${!confirmedName ? "cursor-not-allowed opacity-50" : ""}`}
                                style={{
                                  backgroundColor: !isMine && hasVotes ? cellColor.backgroundColor : undefined,
                                  opacity: !isMine && hasVotes ? cellColor.opacity : undefined,
                                }}
                              />
                            );

                            return hasVotes ? (
                              <Tooltip key={cellId}>
                                <TooltipTrigger asChild>{cell}</TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <TooltipDetails cellId={cellId} getParticipantsForCell={getParticipantsForCell} />
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              cell
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar (right) */}
            <div className="space-y-6">
              {/* Participants */}
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Participants ({participants.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {participants.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No one has submitted their availability yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {participants.map((p) => (
                        <div key={p.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.availability.size} time slots selected
                            </p>
                          </div>
                          <div className="w-3 h-3 bg-green-500 rounded-full" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Chat & Polls (your existing client components) */}
              <ChatSection confirmedName={confirmedName} participants={participants.map((p) => p.name)} />
              <PollsSection confirmedName={confirmedName} participants={participants.map((p) => p.name)} />
            </div>
          </div>
        </main>
      </div >
    </TooltipProvider >
  );
}

/** small wrapper to keep render function lean */
function TooltipDetails({
  cellId,
  getParticipantsForCell,
}: {
  cellId: string;
  getParticipantsForCell: (id: string) => { available: Participant[]; unavailable: Participant[] };
}) {
  const { available, unavailable } = getParticipantsForCell(cellId);
  if (!available.length) return null;

  return (
    <div className="space-y-2">
      {available.length > 0 && (
        <div>
          <p className="font-medium text-green-600 mb-1">Available ({available.length}):</p>
          <ul className="text-sm space-y-1">
            {available.map((p) => (
              <li key={p.name} className="flex items-center gap-1">
                <Check className="w-3 h-3 text-green-600" />
                {p.name}
              </li>
            ))}
          </ul>
        </div>
      )}
      {unavailable.length > 0 && (
        <div>
          <p className="font-medium text-muted-foreground mb-1">Not Available ({unavailable.length}):</p>
          <ul className="text-sm space-y-1">
            {unavailable.map((p) => (
              <li key={p.name} className="flex items-center gap-1">
                <User className="w-3 h-3 text-muted-foreground" />
                {p.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
