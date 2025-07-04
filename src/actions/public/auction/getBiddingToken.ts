import { type PublicClient, type Chain, type Transport } from 'viem';
import { getAuctionAddressByChainId } from '../../../utils/timeboost.js';
import ExpressLaneAuctionABI from '../../../abi/ExpressLaneAuction.json';

export type BiddingTokenInfo = {
  biddingToken: string;
  biddingTokenSymbol?: string;
  biddingTokenDecimals?: number;
};

export async function getBiddingToken<
  TTransport extends Transport,
  TChain extends Chain | undefined,
>(
  client: PublicClient<TTransport, TChain>,
): Promise<BiddingTokenInfo> {
  const address = getAuctionAddressByChainId(client.chain!.id);

  const biddingToken = await client.readContract({
    address,
    abi: ExpressLaneAuctionABI,
    functionName: 'biddingToken',
  }) as string;

  let biddingTokenSymbol: string | undefined;
  let biddingTokenDecimals: number | undefined;

  try {
    [biddingTokenSymbol, biddingTokenDecimals] = await Promise.all([
      client.readContract({
        address: biddingToken as `0x${string}`,
        abi: [
          {
            name: 'symbol',
            type: 'function',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ name: '', type: 'string' }],
          },
        ],
        functionName: 'symbol',
      }) as Promise<string>,
      client.readContract({
        address: biddingToken as `0x${string}`,
        abi: [
          {
            name: 'decimals',
            type: 'function',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ name: '', type: 'uint8' }],
          },
        ],
        functionName: 'decimals',
      }) as Promise<number>,
    ]);
  } catch {
    biddingTokenSymbol = undefined;
    biddingTokenDecimals = undefined;
  }

  return {
    biddingToken,
    biddingTokenSymbol,
    biddingTokenDecimals,
  };
} 