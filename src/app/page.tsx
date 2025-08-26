// app/page.tsx
import Link from "next/link";
import { Calendar, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-medium text-lg">LetsMeetAt</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
            <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-12">
            <h1 className="text-4xl md:text-6xl font-medium mb-6 leading-tight">
              Organize Events,<br />
              <span className="text-primary">Meet Effortlessly</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              LetsMeetAt makes it simple to create events, coordinate schedules, and bring people together. 
              Plan your next gathering with just a few clicks.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button asChild size="lg" className="w-full sm:w-auto px-8 py-6 text-lg">
              <Link href="/create-event"><Zap className="w-5 h-5 mr-2" />Create Event</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto px-8 py-6 text-lg">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto px-8 py-6 text-lg">
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>

          {/* Features Preview */}
          <div id="features" className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="p-6 text-center border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-medium mb-2">Easy Event Creation</h3>
              <p className="text-muted-foreground text-sm">
                Create events in seconds with our intuitive interface. Add details, set dates, and invite guests effortlessly.
              </p>
            </Card>

            <Card className="p-6 text-center border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-medium mb-2">Smart Coordination</h3>
              <p className="text-muted-foreground text-sm">
                Share events with friends and family. Let everyone communicate and coordinate seamlessly in one place.
              </p>
            </Card>

            <Card className="p-6 text-center border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-medium mb-2">Quick Sharing</h3>
              <p className="text-muted-foreground text-sm">
                Share your events instantly with custom links. No complicated setup or lengthy sign-up processes required.
              </p>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/20 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                <Calendar className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-medium">LetsMeetAt</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 LetsMeetAt. Making meetings happen, one event at a time.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
