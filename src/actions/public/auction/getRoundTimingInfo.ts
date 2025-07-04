import { type PublicClient, type Chain, type Transport } from 'viem';
import { getAuctionAddressByChainId } from '../../../utils/timeboost.js';
import ExpressLaneAuctionABI from '../../../abi/ExpressLaneAuction.json';

export type RoundTimingInfo = {
  offsetTimestamp: bigint;
  roundDurationSeconds: number;
  auctionClosingSeconds: number;
  reserveSubmissionSeconds: number;
  currentRoundProgress: number;
  timeRemainingInRound: number;
  auctionOpenDuration: number;
  reserveBlackoutDuration: number;
};

export async function getRoundTimingInfo<
  TTransport extends Transport,
  TChain extends Chain | undefined,
>(
  client: PublicClient<TTransport, TChain>,
): Promise<RoundTimingInfo> {
  const address = getAuctionAddressByChainId(client.chain!.id);
  const now = Math.floor(Date.now() / 1000);

  const [currentRound, roundTimingInfo] = await Promise.all([
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

  const [roundStart, roundEnd] = await client.readContract({
    address,
    abi: ExpressLaneAuctionABI,
    functionName: 'roundTimestamps',
    args: [currentRound],
  }) as [bigint, bigint];

  const offsetTimestamp = roundTimingInfo[0];
  const roundDurationSeconds = Number(roundTimingInfo[1]);
  const auctionClosingSeconds = Number(roundTimingInfo[2]);
  const reserveSubmissionSeconds = Number(roundTimingInfo[3]);

  const roundStartTime = Number(roundStart);
  const roundEndTime = Number(roundEnd);
  const timeRemainingInRound = Math.max(0, roundEndTime - now);

  let currentRoundProgress = 0;
  if (now >= roundStartTime && now <= roundEndTime) {
    const elapsed = now - roundStartTime;
    currentRoundProgress = Math.min(100, (elapsed / roundDurationSeconds) * 100);
  } else if (now > roundEndTime) {
    currentRoundProgress = 100;
  }

  const auctionOpenDuration = roundDurationSeconds - auctionClosingSeconds;
  const reserveBlackoutDuration = reserveSubmissionSeconds;

  return {
    offsetTimestamp,
    roundDurationSeconds,
    auctionClosingSeconds,
    reserveSubmissionSeconds,
    currentRoundProgress,
    timeRemainingInRound,
    auctionOpenDuration,
    reserveBlackoutDuration,
  };
} 