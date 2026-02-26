'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  IconWorld,
  IconBrandX,
  IconBrandGithub,
  IconBrandDiscord,
  IconBrandTelegram,
  IconMail,
  IconCopy,
  IconCheck,
  IconArrowLeft,
  IconUser,
} from '@tabler/icons-react';

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
  const base = name.replace(/\.eth$/, '');
  if (base.length === 0) return '';
  return base.slice(0, 2).toUpperCase();
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
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy address');
    }
  }

  const socialLinks: {
    label: string;
    icon: ReactNode;
    value: string | null;
  }[] = [
    {
      label: 'Website',
      icon: <IconWorld size={18} stroke={1.5} />,
      value: profile.url,
    },
    {
      label: 'Twitter',
      icon: <IconBrandX size={18} stroke={1.5} />,
      value: profile.twitter,
    },
    {
      label: 'GitHub',
      icon: <IconBrandGithub size={18} stroke={1.5} />,
      value: profile.github,
    },
    {
      label: 'Discord',
      icon: <IconBrandDiscord size={18} stroke={1.5} />,
      value: profile.discord,
    },
    {
      label: 'Telegram',
      icon: <IconBrandTelegram size={18} stroke={1.5} />,
      value: profile.telegram,
    },
    {
      label: 'Email',
      icon: <IconMail size={18} stroke={1.5} />,
      value: profile.email,
    },
  ];

  const populatedLinks = socialLinks.filter((link) => link.value);
  const initials = getInitials(ensName);

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
          <Avatar className="h-24 w-24 shrink-0 text-2xl">
            {profile.avatar && (
              <AvatarImage src={profile.avatar} alt={ensName} />
            )}
            <AvatarFallback className="text-2xl font-bold">
              {initials || <IconUser size={32} stroke={1.5} />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-1 text-center sm:text-left">
            <h1 className="wrap-break-word text-2xl font-bold">{ensName}</h1>
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <Badge variant="secondary" className="font-mono text-xs">
                {truncateAddress(profile.address)}
              </Badge>
              <Button variant="ghost" size="sm" onClick={copyAddress}>
                {copied ? (
                  <IconCheck size={18} stroke={1.5} />
                ) : (
                  <IconCopy size={18} stroke={1.5} />
                )}
              </Button>
            </div>
            {profile.description && (
              <p className="text-sm text-muted-foreground pt-1">
                {profile.description}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {populatedLinks.length > 0 && (
          <div className="space-y-2">
            {populatedLinks.map((link) => (
              <div key={link.label} className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">{link.icon}</span>
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

export function ProfileBackButton() {
  const router = useRouter();

  function handleBack() {
    if (window.history.length <= 1) {
      router.push('/');
    } else {
      router.back();
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleBack}>
      <IconArrowLeft size={18} stroke={1.5} />
      Back
    </Button>
  );
}

export function ProfileNotFound({ ensName }: { ensName: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">ENS Name Not Found</h1>
        <p className="text-muted-foreground">
          The ENS name{' '}
          <span className="font-mono font-semibold">{ensName}</span> could not
          be resolved.
        </p>
      </div>
      <Button variant="outline" asChild>
        <a href="/">
          <IconArrowLeft size={18} stroke={1.5} />
          Back to Search
        </a>
      </Button>
    </div>
  );
}
