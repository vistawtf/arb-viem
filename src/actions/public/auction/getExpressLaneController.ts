import { type PublicClient, type Chain, type Transport } from 'viem';
import { getAuctionAddressByChainId } from '../../../utils/timeboost.js';
import ExpressLaneAuctionABI from '../../../abi/ExpressLaneAuction.json';

export type ExpressLaneController = {
  currentController: string | null;
  controllerForRound: bigint;
  roundStartTime: number;
  roundEndTime: number;
  timeRemainingInRound: number;
  isActiveController: boolean;
  hasTransferor: boolean;
  transferor?: string;
  transferorFixedUntilRound?: bigint;
};

export async function getExpressLaneController<
  TTransport extends Transport,
  TChain extends Chain | undefined,
>(
  client: PublicClient<TTransport, TChain>,
): Promise<ExpressLaneController> {
  const address = getAuctionAddressByChainId(client.chain!.id);
  const now = Math.floor(Date.now() / 1000);

  const [currentRound, resolvedRounds] = await Promise.all([
    client.readContract({
      address,
      abi: ExpressLaneAuctionABI,
      functionName: 'currentRound',
    }) as Promise<bigint>,
    client.readContract({
      address,
      abi: ExpressLaneAuctionABI,
      functionName: 'resolvedRounds',
    }) as Promise<[{ expressLaneController: string; round: bigint }, { expressLaneController: string; round: bigint }]>,
  ]);

  const currentRoundInfo = resolvedRounds.find(r => r.round === currentRound);
  const currentController = currentRoundInfo?.expressLaneController || null;

  const [roundStart, roundEnd] = currentController 
    ? await client.readContract({
        address,
        abi: ExpressLaneAuctionABI,
        functionName: 'roundTimestamps',
        args: [currentRound],
      }) as [bigint, bigint]
    : [0n, 0n];

  const roundStartTime = Number(roundStart);
  const roundEndTime = Number(roundEnd);
  const timeRemainingInRound = Math.max(0, roundEndTime - now);
  const isActiveController = currentController !== null && now >= roundStartTime && now < roundEndTime;

  let transferorInfo = null;
  if (currentController) {
    try {
      transferorInfo = await client.readContract({
        address,
        abi: ExpressLaneAuctionABI,
        functionName: 'transferorOf',
        args: [currentController],
      }) as [string, bigint];
    } catch {
      transferorInfo = null;
    }
  }

  const hasTransferor = transferorInfo !== null && transferorInfo[0] !== '0x0000000000000000000000000000000000000000';

  return {
    currentController,
    controllerForRound: currentRound,
    roundStartTime,
    roundEndTime,
    timeRemainingInRound,
    isActiveController,
    hasTransferor,
    transferor: hasTransferor ? transferorInfo![0] : undefined,
    transferorFixedUntilRound: hasTransferor ? transferorInfo![1] : undefined,
  };
} 