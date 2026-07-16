import CinematicShell from "@/components/CinematicShell";
import { CollectionsView } from "@/marketplace/components/collections/CollectionsView";

export const metadata = {
  title: "My Collections",
  description:
    "Your bookmarks, favourites, watchlist, recently viewed properties and comparison set on the Relcko marketplace.",
};

export default function CollectionsPage() {
  return (
    <CinematicShell className="bg-gradient-to-b from-[#0E0F13] via-[#0E0F13] to-[#0A0D14]">
      <CollectionsView />
    </CinematicShell>
  );
}
