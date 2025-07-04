import { type PublicClient, type Chain, type Transport, type Address } from 'viem';
import { getAuctionAddressByChainId } from '../../../utils/timeboost.js';
import ExpressLaneAuctionABI from '../../../abi/ExpressLaneAuction.json';

export type WithdrawalQueueEntry = {
  account: Address;
  withdrawalAmount: bigint;
  roundWithdrawable: bigint;
  blockNumber: bigint;
  transactionHash: string;
  isFinalized: boolean;
  canFinalizeNow: boolean;
};

export type WithdrawalQueueInfo = {
  pendingWithdrawals: WithdrawalQueueEntry[];
  totalPendingAmount: bigint;
  currentRound: bigint;
};

export async function getWithdrawalQueue<
  TTransport extends Transport,
  TChain extends Chain | undefined,
>(
  client: PublicClient<TTransport, TChain>,
  options: {
    fromBlock?: bigint;
    toBlock?: bigint;
    accounts?: Address[];
  } = {},
): Promise<WithdrawalQueueInfo> {
  const auctionAddress = getAuctionAddressByChainId(client.chain!.id);
  const currentRound = (await client.readContract({
    address: auctionAddress,
    abi: ExpressLaneAuctionABI,
    functionName: 'currentRound',
  })) as bigint;

  const { fromBlock = currentRound - 100n, toBlock = 'latest', accounts } = options;

  const [withdrawalInitiatedLogs, withdrawalFinalizedLogs] = await Promise.all([
    client.getLogs({
      address: auctionAddress,
      event: {
        type: 'event',
        name: 'WithdrawalInitiated',
        inputs: [
          { indexed: true, name: 'account', type: 'address' },
          { indexed: false, name: 'withdrawalAmount', type: 'uint256' },
          { indexed: false, name: 'roundWithdrawable', type: 'uint256' },
        ],
      },
      fromBlock,
      toBlock,
      ...(accounts && { args: { account: accounts } }),
    }),
    client.getLogs({
      address: auctionAddress,
      event: {
        type: 'event',
        name: 'WithdrawalFinalized',
        inputs: [
          { indexed: true, name: 'account', type: 'address' },
          { indexed: false, name: 'withdrawalAmount', type: 'uint256' },
        ],
      },
      fromBlock,
      toBlock,
      ...(accounts && { args: { account: accounts } }),
    }),
  ]);

  const finalizedWithdrawals = new Set(
    withdrawalFinalizedLogs.map(log => `${log.args.account}-${log.blockNumber}`)
  );

  const pendingWithdrawals: WithdrawalQueueEntry[] = [];
  let totalPendingAmount = 0n;

  for (const log of withdrawalInitiatedLogs) {
    const account = log.args.account!;
    const withdrawalAmount = log.args.withdrawalAmount!;
    const roundWithdrawable = log.args.roundWithdrawable!;
    const blockNumber = log.blockNumber!;
    const transactionHash = log.transactionHash!;

    const withdrawalKey = `${account}-${blockNumber}`;
    const isFinalized = finalizedWithdrawals.has(withdrawalKey);
    const canFinalizeNow = !isFinalized && currentRound >= roundWithdrawable;

    const entry: WithdrawalQueueEntry = {
      account,
      withdrawalAmount,
      roundWithdrawable,
      blockNumber,
      transactionHash,
      isFinalized,
      canFinalizeNow,
    };

    pendingWithdrawals.push(entry);

    if (!isFinalized) {
      totalPendingAmount += withdrawalAmount;
    }
  }

  pendingWithdrawals.sort((a, b) => {
    if (a.roundWithdrawable !== b.roundWithdrawable) {
      return Number(a.roundWithdrawable - b.roundWithdrawable);
    }
    return Number(a.blockNumber - b.blockNumber);
  });

  return {
    pendingWithdrawals,
    totalPendingAmount,
    currentRound,
  };
}
