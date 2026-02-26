import { resolveEns } from "@/lib/ens";
import {
  ProfileCard,
  ProfileNotFound,
  ProfileBackButton,
} from "@/components/ProfileCard";

type Props = {
  params: Promise<{ ens: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { ens } = await params;
  return { title: `${decodeURIComponent(ens)} — ENS Social Graph` };
}

export default async function ProfilePage({ params }: Props) {
  const { ens } = await params;
  const ensName = decodeURIComponent(ens);

  let profile;
  try {
    profile = await resolveEns(ensName);
  } catch (err) {
    console.error("ENS resolution failed:", err);
    profile = null;
  }

  if (!profile) {
    return <ProfileNotFound ensName={ensName} />;
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="mb-2">
          <ProfileBackButton />
        </div>
        <ProfileCard ensName={ensName} profile={profile} />
      </div>
    </div>
  );
}
