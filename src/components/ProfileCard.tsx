"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type EnsProfileData = {
  address: string;
  avatar: string | null;
  description: string | null;
  url: string | null;
  twitter: string | null;
  github: string | null;
  discord: string | null;
  telegram: string | null;
  email: string | null;
};

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getInitials(name: string): string {
  return name.replace(".eth", "").slice(0, 2).toUpperCase();
}

export function ProfileCard({
  ensName,
  profile,
}: {
  ensName: string;
  profile: EnsProfileData;
}) {
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(profile.address);
      setCopied(true);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy address");
    }
  }

  const socialLinks: { label: string; icon: string; value: string | null }[] = [
    { label: "Website", icon: "🌐", value: profile.url },
    { label: "Twitter", icon: "🐦", value: profile.twitter },
    { label: "GitHub", icon: "🐙", value: profile.github },
    { label: "Discord", icon: "💬", value: profile.discord },
    { label: "Telegram", icon: "✈️", value: profile.telegram },
    { label: "Email", icon: "📧", value: profile.email },
  ];

  const populatedLinks = socialLinks.filter((link) => link.value);

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="items-center space-y-4">
        {profile.avatar ? (
          <img
            src={profile.avatar}
            alt={ensName}
            className="h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted text-2xl font-bold text-muted-foreground">
            {getInitials(ensName)}
          </div>
        )}
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">{ensName}</h1>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-xs">
              {truncateAddress(profile.address)}
            </Badge>
            <Button variant="ghost" size="sm" onClick={copyAddress}>
              {copied ? "✓" : "📋"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile.description && (
          <p className="text-sm text-muted-foreground">{profile.description}</p>
        )}

        {populatedLinks.length > 0 && (
          <div className="space-y-2">
            {populatedLinks.map((link) => (
              <div
                key={link.label}
                className="flex items-center gap-3 text-sm"
              >
                <span>{link.icon}</span>
                <span className="font-medium text-muted-foreground">
                  {link.label}
                </span>
                <span className="truncate">{link.value}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ProfileNotFound({ ensName }: { ensName: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">ENS Name Not Found</h1>
        <p className="text-muted-foreground">
          The ENS name <span className="font-mono font-semibold">{ensName}</span>{" "}
          could not be resolved.
        </p>
      </div>
      <Button variant="outline" asChild>
        <a href="/">← Back to Search</a>
      </Button>
    </div>
  );
}
