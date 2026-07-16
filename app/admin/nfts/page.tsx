import { PageHeader } from "@/components/shared/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { Image as ImageIcon } from "lucide-react";

const nfts = [
  { id: "nft_1", name: "Luxury Tower #42", property: "Luxury Tower Manhattan", owner: "Alice Wang", status: "listed", price: 15000, tier: "gold" },
  { id: "nft_2", name: "Greenfield #107", property: "Greenfield Residences Austin", owner: "Bob Smith", status: "held", price: null, tier: "silver" },
  { id: "nft_3", name: "Waterfront #8", property: "Waterfront Condos Miami", owner: "Grace Kim", status: "listed", price: 22000, tier: "platinum" },
  { id: "nft_4", name: "Downtown #512", property: "Downtown Revival Detroit", owner: "Henry Park", status: "held", price: null, tier: "bronze" },
  { id: "nft_5", name: "Luxury Tower #15", property: "Luxury Tower Manhattan", owner: "Eve Chen", status: "held", price: null, tier: "gold" },
];

export default function NFTsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="NFT Management" description="Monitor tokenized property NFTs" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "NFTs" }]} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {nfts.map((nft) => (
          <Card key={nft.id}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">{nft.name}</CardTitle>
                <Badge>{nft.tier}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Property</span><span>{nft.property}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Owner</span><span>{nft.owner}</span></div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={nft.status === "listed" ? "success" : "info"}>{nft.status}</Badge>
                </div>
                {nft.price && <div className="flex justify-between"><span className="text-muted-foreground">Listed Price</span><span className="font-medium">${nft.price.toLocaleString()}</span></div>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
