"use client";

import { useQuery } from "@tanstack/react-query";
import type { NFTCollection, NFTProperty } from "../types";

const MOCK_COLLECTIONS: NFTCollection[] = [
  { id: "col-1", name: "Relcko Prime Estates", symbol: "RLKO-PE", description: "Premium real estate NFTs representing fractional ownership in luxury properties.", totalSupply: 10_000, floorPrice: 0.85, volume24h: 125_000, owners: 1_240, image: "/images/nfts/prime-estates.jpg" },
  { id: "col-2", name: "Urban Development Pass", symbol: "RLKO-UDP", description: "Access passes for exclusive real estate development opportunities.", totalSupply: 5_000, floorPrice: 1.20, volume24h: 78_000, owners: 890, image: "/images/nfts/urban-pass.jpg" },
  { id: "col-3", name: "Yield Farming Realty", symbol: "RLKO-YFR", description: "NFTs that represent yield-generating real estate portfolios.", totalSupply: 8_000, floorPrice: 2.10, volume24h: 210_000, owners: 1_560, image: "/images/nfts/yield-farm.jpg" },
];

const MOCK_NFTS: NFTProperty[] = [
  { id: "nft-1", name: "Manhattan Penthouse #42", image: "/images/nfts/penthouse-42.jpg", collectionName: "Relcko Prime Estates", collectionId: "col-1", tokenId: "42", owner: "0x742d...bD18", value: 142_500, equityShare: 0.5, rentalShare: 0.5, status: "owned", acquired: "2024-03-15" },
  { id: "nft-2", name: "Silicon Valley Suite #107", image: "/images/nfts/suite-107.jpg", collectionName: "Relcko Prime Estates", collectionId: "col-1", tokenId: "107", owner: "0x742d...bD18", value: 95_000, equityShare: 0.3, rentalShare: 0.3, status: "owned", acquired: "2024-01-20" },
  { id: "nft-3", name: "Miami Beach Villa #8", image: "/images/nfts/villa-8.jpg", collectionName: "Relcko Prime Estates", collectionId: "col-1", tokenId: "8", owner: "0x742d...bD18", value: 210_000, equityShare: 0.25, rentalShare: 0.25, status: "fractionalized", acquired: "2024-05-01" },
  { id: "nft-4", name: "Development Pass Alpha", image: "/images/nfts/alpha-pass.jpg", collectionName: "Urban Development Pass", collectionId: "col-2", tokenId: "al-1", owner: "0x742d...bD18", value: 1_200, equityShare: 0, rentalShare: 0, status: "owned", acquired: "2024-06-10" },
  { id: "nft-5", name: "Austin Loft #12", image: "/images/nfts/loft-12.jpg", collectionName: "Yield Farming Realty", collectionId: "col-3", tokenId: "12", owner: "0x742d...bD18", value: 78_500, equityShare: 0.15, rentalShare: 0.2, status: "listed", acquired: "2024-06-10" },
];

export function useNFTCollections() {
  return useQuery({
    queryKey: ["investor", "nfts", "collections"],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      return MOCK_COLLECTIONS;
    },
    staleTime: 60_000,
  });
}

export function useUserNFTs() {
  return useQuery({
    queryKey: ["investor", "nfts", "user"],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 500));
      return MOCK_NFTS;
    },
    staleTime: 30_000,
  });
}

export function useNFTCollection(id: string) {
  return useQuery({
    queryKey: ["investor", "nfts", "collections", id],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 300));
      const col = MOCK_COLLECTIONS.find((c) => c.id === id);
      if (!col) throw new Error("Collection not found");
      return col;
    },
    enabled: !!id,
  });
}
