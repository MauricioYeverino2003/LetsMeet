// app/event/[id]/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Calendar, ArrowLeft, Users, Share, Check, User } from "lucide-react";

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

//import { ImageWithFallback } from "@/components/figma/ImageWithFallback";
import { ChatSection } from "@/components/ChatSection";
import { PollsSection } from "@/components/PollsSection";

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

type PageProps = {
  params: { id: string };
};

export default function EventPage({ params }: PageProps) {
  const { id } = params;
  const searchParams = useSearchParams();

  // Build a minimal event model from query (fallbacks for quick demo)
  const defaultTitle = searchParams.get("title") ?? "Untitled Event";
  const defaultStartDay = Number(searchParams.get("startDay") ?? 0);
  const defaultEndDay = Number(searchParams.get("endDay") ?? 7);
  const defaultStartHour = Number(searchParams.get("startHour") ?? 8);
  const defaultEndHour = Number(searchParams.get("endHour") ?? 22);

  const eventData: EventData = {
    id,
    title: defaultTitle,
    description: searchParams.get("description") ?? "",
    banner: searchParams.get("banner") ?? undefined,
    dateRange: [defaultStartDay, defaultEndDay],
    timeRange: [defaultStartHour, defaultEndHour],
  };

  // ---- Local state ----
  const [guestName, setGuestName] = useState("");
  const [confirmedName, setConfirmedName] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myAvailability, setMyAvailability] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [dragStartCell, setDragStartCell] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

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

  // ---- Helpers ----
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

  const getRandomBannerUrl = () => {
    const bannerIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const randomId = bannerIds[Math.floor(Math.random() * bannerIds.length)];
    return `https://picsum.photos/800/300?random=${randomId}`;
  };

  // ---- Name + availability interactions ----
  const handleConfirmName = () => {
    if (!guestName.trim()) {
      alert("Please enter your name");
      return;
    }
    if (confirmedName && confirmedName !== guestName.trim()) setMyAvailability(new Set());
    setConfirmedName(guestName.trim());
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

  // Use setParticipants((participants) => {set participants logic instead})
  const handleSubmitAvailability = () => {
    if (!confirmedName) return alert("Please confirm your name first");

    const existingIdx = participants.findIndex((p) => p.name === confirmedName);
    const next = [...participants];
    if (existingIdx >= 0) next[existingIdx].availability = new Set(myAvailability);
    else next.push({ name: confirmedName, availability: new Set(myAvailability) });

    setParticipants(next);
    alert("Availability saved!");
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
              <img
                src={eventData.banner || getRandomBannerUrl()}
                alt="Event banner"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;           // prevent infinite loop if fallback fails
                  e.currentTarget.src = "/fallback.png";    // file you’ll add to /public
                }}
              />
              {/* <ImageWithFallback
                src={eventData.banner || getRandomBannerUrl()}
                alt="Event banner"
                className="w-full h-full object-cover"
              /> */}
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
                      <Button onClick={handleConfirmName}>Confirm Name</Button>
                    ) : (
                      <div className="flex gap-2">
                        <div className="px-3 py-2 bg-green-100 text-green-800 rounded-lg flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          {confirmedName}
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setConfirmedName(null);
                            setGuestName("");
                            setMyAvailability(new Set());
                          }}
                        >
                          Change
                        </Button>
                      </div>
                    )}
                  </div>

                  {confirmedName && (
                    <div className="mt-3">
                      <Button onClick={handleSubmitAvailability} className="w-full">
                        Save Availability
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
                        style={{ ["--cols" as any]: dates.length }}
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
                          style={{ ["--cols" as any]: dates.length }}
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
