import { type PublicClient, type Chain, type Transport, type Address } from 'viem';
import { getAuctionAddressByChainId } from '../../../utils/timeboost.js';
import ExpressLaneAuctionABI from '../../../abi/ExpressLaneAuction.json';

export type UserBalanceInfo = {
  balance: bigint;
  withdrawableBalance: bigint;
  currentRound: bigint;
  hasPendingWithdrawal: boolean;
  pendingWithdrawalAmount?: bigint;
  pendingWithdrawalRound?: bigint;
  canFinalizeWithdrawal: boolean;
};

export async function getUserBalance<
  TTransport extends Transport,
  TChain extends Chain | undefined,
>(
  client: PublicClient<TTransport, TChain>,
  userAddress: Address,
): Promise<UserBalanceInfo> {
  const address = getAuctionAddressByChainId(client.chain!.id);

  const [currentRound, balance, withdrawableBalance] = await Promise.all([
    client.readContract({
      address,
      abi: ExpressLaneAuctionABI,
      functionName: 'currentRound',
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
      functionName: 'withdrawableBalance',
      args: [userAddress],
    }) as Promise<bigint>,
  ]);

  let hasPendingWithdrawal = false;
  let pendingWithdrawalAmount: bigint | undefined;
  let pendingWithdrawalRound: bigint | undefined;
  let canFinalizeWithdrawal = false;

  if (balance > withdrawableBalance) {
    hasPendingWithdrawal = true;
    pendingWithdrawalAmount = balance - withdrawableBalance;

    try {
      const logs = await client.getLogs({
        address,
        event: {
          type: 'event',
          name: 'WithdrawalInitiated',
          inputs: [
            { indexed: true, name: 'account', type: 'address' },
            { indexed: false, name: 'withdrawalAmount', type: 'uint256' },
            { indexed: false, name: 'roundWithdrawable', type: 'uint256' },
          ],
        },
        args: { account: userAddress },
        fromBlock: currentRound - 10n > 0n ? currentRound - 10n : 0n,
        toBlock: 'latest',
      });

      const latestWithdrawal = logs
        .filter(log => log.args.withdrawalAmount === pendingWithdrawalAmount)
        .sort((a, b) => Number(b.blockNumber! - a.blockNumber!))[0];

      if (latestWithdrawal) {
        pendingWithdrawalRound = latestWithdrawal.args.roundWithdrawable!;
        canFinalizeWithdrawal = currentRound >= pendingWithdrawalRound;
      }
    } catch {
      // If we can't get logs, we can't determine finalization status
    }
  }

  return {
    balance,
    withdrawableBalance,
    currentRound,
    hasPendingWithdrawal,
    pendingWithdrawalAmount,
    pendingWithdrawalRound,
    canFinalizeWithdrawal,
  };
} 