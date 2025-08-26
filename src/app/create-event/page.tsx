// app/create-event/page.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, ArrowLeft, Upload, X, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";

export default function CreateEventPage() {
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Date range: 0..14 days from today
  const [dateRange, setDateRange] = useState<[number, number]>([0, 7]);
  // Time range: 0..23 hours
  const [timeRange, setTimeRange] = useState<[number, number]>([8, 22]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const formatDate = (daysFromToday: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromToday);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setBannerPreview(String(ev.target?.result));
    reader.readAsDataURL(file);
  };

  const removeBanner = () => {
    setBannerPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Please enter an event title");
      return;
    }
    // Simple client-only ID
    const id = Date.now().toString();

    // For a quick demo route, pass minimal info via query params.
    // In a real app you’d POST to an API, then route to /event/[id].
    const params = new URLSearchParams({
      title: title.trim(),
      startDay: String(dateRange[0]),
      endDay: String(dateRange[1]),
      startHour: String(timeRange[0]),
      endHour: String(timeRange[1]),
    });
    router.push(`/event/${id}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-medium text-lg">LetsMeetAt</span>
          </Link>

          <Button asChild variant="ghost" size="sm" className="flex items-center gap-2">
            <Link href="/">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </Button>
        </div>
      </header>

      {/* Create Event Form */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Create New Event</CardTitle>
              <p className="text-muted-foreground">
                Set up your event details and let people know when to meet
              </p>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Event Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    type="text"
                    placeholder="Enter event title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Event Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your event..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* Banner Upload */}
                <div className="space-y-2">
                  <Label>Event Banner (Optional)</Label>
                  {bannerPreview ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={bannerPreview}
                        alt="Banner preview"
                        className="w-full h-32 object-cover rounded-lg border border-border/50"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={removeBanner}
                        className="absolute top-2 right-2"
                        title="Remove banner"
                        aria-label="Remove banner"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center cursor-pointer hover:border-border transition-colors bg-accent/30"
                    >
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">Click to upload banner image</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    className="hidden"
                  />
                </div>

                {/* Date Range */}
                <div className="space-y-4">
                  <Label>Date Range</Label>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{formatDate(dateRange[0])}</span>
                      <span>{formatDate(dateRange[1])}</span>
                    </div>
                    <Slider
                      value={dateRange}
                      onValueChange={(v) => setDateRange(v as [number, number])}
                      max={14}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Today</span>
                      <span>2 weeks</span>
                    </div>
                  </div>
                </div>

                {/* Time Range */}
                <div className="space-y-4">
                  <Label>Time Range</Label>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{formatTime(timeRange[0])}</span>
                      <span>{formatTime(timeRange[1])}</span>
                    </div>
                    <Slider
                      value={timeRange}
                      onValueChange={(v) => setTimeRange(v as [number, number])}
                      max={23}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>12:00 AM</span>
                      <span>11:00 PM</span>
                    </div>
                  </div>
                </div>

                {/* Submit / Cancel */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button type="submit" className="flex-1" size="lg">
                    <Zap className="mr-2 h-5 w-5" />
                    Create Event
                  </Button>
                  <Button asChild type="button" variant="outline" size="lg" className="flex-1 sm:flex-none">
                    <Link href="/">Cancel</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
