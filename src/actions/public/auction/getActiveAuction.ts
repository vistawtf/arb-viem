import { type PublicClient, type Chain, type Transport } from 'viem';
import { getAuctionAddressByChainId } from '../../../utils/timeboost.js';
import ExpressLaneAuctionABI from '../../../abi/ExpressLaneAuction.json';

export type AuctionPhase = 'bidding' | 'closing' | 'resolving' | 'active';

export type ActiveAuctionInfo = {
  currentRound: bigint;
  biddingForRound: bigint;
  isAuctionOpen: boolean;
  currentPhase: AuctionPhase;
  timeUntilClose: number;
  timeUntilRoundStarts: number;
  reservePrice: bigint;
  minReservePrice: bigint;
  biddingToken: string;
  roundStartTime: number;
  roundEndTime: number;
  auctionCloseTime: number;
  roundDurationSeconds: number;
  currentController: string | null;
  hasActiveController: boolean;
};

export async function getActiveAuction<
  TTransport extends Transport,
  TChain extends Chain | undefined,
>(
  client: PublicClient<TTransport, TChain>,
): Promise<ActiveAuctionInfo> {
  const address = getAuctionAddressByChainId(client.chain!.id);
  const now = Math.floor(Date.now() / 1000);

  const [
    currentRound,
    isAuctionClosed,
    reservePrice,
    minReservePrice,
    biddingToken,
    roundTimingInfo,
    resolvedRounds
  ] = await Promise.all([
    client.readContract({
      address,
      abi: ExpressLaneAuctionABI,
      functionName: 'currentRound',
    }) as Promise<bigint>,
    client.readContract({
      address,
      abi: ExpressLaneAuctionABI,
      functionName: 'isAuctionRoundClosed',
    }) as Promise<boolean>,
    client.readContract({
      address,
      abi: ExpressLaneAuctionABI,
      functionName: 'reservePrice',
    }) as Promise<bigint>,
    client.readContract({
      address,
      abi: ExpressLaneAuctionABI,
      functionName: 'minReservePrice',
    }) as Promise<bigint>,
    client.readContract({
      address,
      abi: ExpressLaneAuctionABI,
      functionName: 'biddingToken',
    }) as Promise<string>,
    client.readContract({
      address,
      abi: ExpressLaneAuctionABI,
      functionName: 'roundTimingInfo',
    }) as Promise<[bigint, bigint, bigint, bigint]>,
    client.readContract({
      address,
      abi: ExpressLaneAuctionABI,
      functionName: 'resolvedRounds',
    }) as Promise<[{ expressLaneController: string; round: bigint }, { expressLaneController: string; round: bigint }]>,
  ]);

  const biddingForRound = currentRound + 1n;
  const roundDurationSeconds = Number(roundTimingInfo[1]);
  const auctionClosingSeconds = Number(roundTimingInfo[2]);

  const [roundStart, roundEnd] = await client.readContract({
    address,
    abi: ExpressLaneAuctionABI,
    functionName: 'roundTimestamps',
    args: [biddingForRound],
  }) as [bigint, bigint];

  const roundStartTime = Number(roundStart);
  const roundEndTime = Number(roundEnd);
  const auctionCloseTime = roundStartTime - auctionClosingSeconds;

  const timeUntilClose = Math.max(0, auctionCloseTime - now);
  const timeUntilRoundStarts = Math.max(0, roundStartTime - now);
  const isAuctionOpen = !isAuctionClosed && timeUntilClose > 0;

  let currentPhase: AuctionPhase;
  if (now < auctionCloseTime) {
    currentPhase = 'bidding';
  } else if (now < roundStartTime) {
    currentPhase = isAuctionClosed ? 'resolving' : 'closing';
  } else {
    currentPhase = 'active';
  }

  const currentRoundInfo = resolvedRounds.find(r => r.round === currentRound);
  const currentController = currentRoundInfo?.expressLaneController || null;
  const hasActiveController = currentController !== null && 
    currentController !== '0x0000000000000000000000000000000000000000' &&
    now >= (roundStartTime - roundDurationSeconds) && 
    now < (roundStartTime - roundDurationSeconds + roundDurationSeconds);

  return {
    currentRound,
    biddingForRound,
    isAuctionOpen,
    currentPhase,
    timeUntilClose,
    timeUntilRoundStarts,
    reservePrice,
    minReservePrice,
    biddingToken,
    roundStartTime,
    roundEndTime,
    auctionCloseTime,
    roundDurationSeconds,
    currentController,
    hasActiveController,
  };
} 