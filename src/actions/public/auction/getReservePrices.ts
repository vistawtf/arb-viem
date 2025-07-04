import { type PublicClient, type Chain, type Transport } from 'viem';
import { getAuctionAddressByChainId } from '../../../utils/timeboost.js';
import ExpressLaneAuctionABI from '../../../abi/ExpressLaneAuction.json';

export type ReservePrices = {
  reservePrice: bigint;
  minReservePrice: bigint;
  isReserveBlackout: boolean;
  canUpdateReserve: boolean;
  blackoutTimeRemaining?: number;
  nextBlackoutStart?: number;
};

export async function getReservePrices<
  TTransport extends Transport,
  TChain extends Chain | undefined,
>(
  client: PublicClient<TTransport, TChain>,
): Promise<ReservePrices> {
  const address = getAuctionAddressByChainId(client.chain!.id);
  const now = Math.floor(Date.now() / 1000);

  const [reservePrice, minReservePrice, isReserveBlackout, currentRound, roundTimingInfo] = await Promise.all([
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
      functionName: 'isReserveBlackout',
    }) as Promise<boolean>,
    client.readContract({
      address,
      abi: ExpressLaneAuctionABI,
      functionName: 'currentRound',
    }) as Promise<bigint>,
    client.readContract({
      address,
      abi: ExpressLaneAuctionABI,
      functionName: 'roundTimingInfo',
    }) as Promise<[bigint, bigint, bigint, bigint]>,
  ]);

  const canUpdateReserve = !isReserveBlackout;

  let blackoutTimeRemaining: number | undefined;
  let nextBlackoutStart: number | undefined;

  if (isReserveBlackout) {
    const nextRound = currentRound + 1n;
    const [roundStart] = await client.readContract({
      address,
      abi: ExpressLaneAuctionABI,
      functionName: 'roundTimestamps',
      args: [nextRound],
    }) as [bigint, bigint];

    const roundStartTime = Number(roundStart);
    blackoutTimeRemaining = Math.max(0, roundStartTime - now);
  } else {
    const nextRound = currentRound + 1n;
    const [roundStart] = await client.readContract({
      address,
      abi: ExpressLaneAuctionABI,
      functionName: 'roundTimestamps',
      args: [nextRound],
    }) as [bigint, bigint];

    const auctionClosingSeconds = Number(roundTimingInfo[2]);
    const reserveSubmissionSeconds = Number(roundTimingInfo[3]);
    const roundStartTime = Number(roundStart);
    
    nextBlackoutStart = roundStartTime - auctionClosingSeconds - reserveSubmissionSeconds;
  }

  return {
    reservePrice,
    minReservePrice,
    isReserveBlackout,
    canUpdateReserve,
    blackoutTimeRemaining,
    nextBlackoutStart,
  };
}
