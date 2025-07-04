import { type PublicClient, type Chain, type Transport, type Address } from 'viem';
import { getAuctionAddressByChainId } from '../../../utils/timeboost.js';
import ExpressLaneAuctionABI from '../../../abi/ExpressLaneAuction.json';

export type BidValidationResult = {
  isValid: boolean;
  reason?: string;
  details?: {
    userBalance?: bigint;
    reservePrice?: bigint;
    minReservePrice?: bigint;
    currentRound?: bigint;
    biddingForRound?: bigint;
    isAuctionClosed?: boolean;
    timeUntilClose?: number;
  };
};

export async function validateBid<
  TTransport extends Transport,
  TChain extends Chain | undefined,
>(
  client: PublicClient<TTransport, TChain>,
  userAddress: Address,
  bidAmount: bigint,
): Promise<BidValidationResult> {
  const address = getAuctionAddressByChainId(client.chain!.id);

  try {
    const [
      currentRound,
      isAuctionClosed,
      reservePrice,
      minReservePrice,
      userBalance,
      roundTimingInfo
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
        functionName: 'balanceOf',
        args: [userAddress],
      }) as Promise<bigint>,
      client.readContract({
        address,
        abi: ExpressLaneAuctionABI,
        functionName: 'roundTimingInfo',
      }) as Promise<[bigint, bigint, bigint, bigint]>,
    ]);

    const biddingForRound = currentRound + 1n;
    
    let timeUntilClose = 0;
    try {
      const [roundStart] = await client.readContract({
        address,
        abi: ExpressLaneAuctionABI,
        functionName: 'roundTimestamps',
        args: [biddingForRound],
      }) as [bigint, bigint];

      const auctionClosingSeconds = Number(roundTimingInfo[2]);
      const auctionCloseTime = Number(roundStart) - auctionClosingSeconds;
      const now = Math.floor(Date.now() / 1000);
      timeUntilClose = Math.max(0, auctionCloseTime - now);
    } catch {
      // If we can't get round timestamps, assume auction is closed
      timeUntilClose = 0;
    }

    const details = {
      userBalance,
      reservePrice,
      minReservePrice,
      currentRound,
      biddingForRound,
      isAuctionClosed,
      timeUntilClose,
    };

    if (isAuctionClosed) {
      return {
        isValid: false,
        reason: 'AUCTION_CLOSED',
        details,
      };
    }

    if (timeUntilClose <= 0) {
      return {
        isValid: false,
        reason: 'AUCTION_CLOSING_SOON',
        details,
      };
    }

    if (bidAmount < reservePrice) {
      return {
        isValid: false,
        reason: 'BELOW_RESERVE_PRICE',
        details,
      };
    }

    if (bidAmount < minReservePrice) {
      return {
        isValid: false,
        reason: 'BELOW_MIN_RESERVE_PRICE',
        details,
      };
    }

    if (userBalance < bidAmount) {
      return {
        isValid: false,
        reason: 'INSUFFICIENT_BALANCE',
        details,
      };
    }

    return {
      isValid: true,
      details,
    };

  } catch (error) {
    return {
      isValid: false,
      reason: 'VALIDATION_ERROR',
    };
  }
} 