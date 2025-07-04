import { type PublicClient, type Chain, type Transport } from 'viem';
import { getAuctionAddressByChainId } from '../../../utils/timeboost.js';
import ExpressLaneAuctionABI from '../../../abi/ExpressLaneAuction.json';

const ERC20_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export type TvlInfo = {
  totalValueLocked: bigint;
  biddingTokenAddress: string;
  beneficiaryBalance: bigint;
  netDeposits: bigint;
};

export async function getTvl<
  TTransport extends Transport,
  TChain extends Chain | undefined,
>(
  client: PublicClient<TTransport, TChain>,
): Promise<TvlInfo> {
  const auctionAddress = getAuctionAddressByChainId(client.chain!.id);

  const [biddingTokenAddress, beneficiaryBalance] = await Promise.all([
    client.readContract({
      address: auctionAddress,
      abi: ExpressLaneAuctionABI,
      functionName: 'biddingToken',
    }) as Promise<string>,
    client.readContract({
      address: auctionAddress,
      abi: ExpressLaneAuctionABI,
      functionName: 'beneficiaryBalance',
    }) as Promise<bigint>,
  ]);

  const totalValueLocked = await client.readContract({
    address: biddingTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [auctionAddress],
  });

  const netDeposits = totalValueLocked - beneficiaryBalance;

  return {
    totalValueLocked,
    biddingTokenAddress,
    beneficiaryBalance,
    netDeposits,
  };
}
