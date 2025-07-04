import type { Chain, Transport, Hash, PublicClient, Block, TransactionReceipt } from 'viem';
import { getTransactionReceipt, watchBlocks } from 'viem/actions';

type TimeboostedTransactionReceipt = TransactionReceipt & {
  timeboosted?: boolean;
};

export type TimeboostedTransaction = {
  hash: Hash;
  blockNumber: bigint;
  blockHash: Hash;
  transactionIndex: number;
};

export type StreamTimeboostedTxsParams = {
  onTransaction?: (tx: TimeboostedTransaction) => void;
  onError?: (error: Error) => void;
  includeHistorical?: boolean;
  fromBlock?: bigint;
};

export function streamTimeboostedTxs<
  TChain extends Chain | undefined = undefined,
>(
  client: PublicClient<Transport, TChain>,
  {
    onTransaction,
    onError,
    includeHistorical = false,
    fromBlock,
  }: StreamTimeboostedTxsParams = {},
) {
  let isActive = true;

  const processBlock = async (block: Block<bigint, true, 'latest'>) => {
    if (!isActive) return;

    try {
      const timeboostedTxs: TimeboostedTransaction[] = [];

      for (const tx of block.transactions) {
        if (!isActive) break;

        try {
          const receipt = await getTransactionReceipt(client, { 
            hash: tx.hash 
          }) as TimeboostedTransactionReceipt;

          if (receipt.timeboosted) {
            const timeboostedTx: TimeboostedTransaction = {
              hash: tx.hash,
              blockNumber: block.number!,
              blockHash: block.hash!,
              transactionIndex: tx.transactionIndex!,
            };

            timeboostedTxs.push(timeboostedTx);
            onTransaction?.(timeboostedTx);
          }
        } catch (txError) {
          console.warn(`Failed to check transaction ${tx.hash}:`, txError);
        }
      }
    } catch (blockError) {
      onError?.(blockError as Error);
    }
  };

  const processHistoricalBlocks = async (startBlock: bigint) => {
    try {
      const latestBlock = await client.getBlockNumber();
      
      for (let blockNumber = startBlock; blockNumber <= latestBlock && isActive; blockNumber++) {
        const block = await client.getBlock({
          blockNumber,
          includeTransactions: true,
        }) as Block<bigint, true, 'latest'>;

        await processBlock(block);
      }
    } catch (error) {
      onError?.(error as Error);
    }
  };

  const startStreaming = async () => {
    try {
      if (includeHistorical && fromBlock !== undefined) {
        await processHistoricalBlocks(fromBlock);
      }

      if (!isActive) return;

      const unwatch = watchBlocks(client, {
        onBlock: async (block) => {
          if (!isActive) return;

          const fullBlock = await client.getBlock({
            blockHash: block.hash!,
            includeTransactions: true,
          }) as Block<bigint, true, 'latest'>;

          await processBlock(fullBlock);
        },
        onError: (error) => {
          onError?.(error);
        },
      });

      return unwatch;
    } catch (error) {
      onError?.(error as Error);
    }
  };

  const unwatch = startStreaming();

  return {
    unwatch: async () => {
      isActive = false;
      const unwatchFn = await unwatch;
      unwatchFn?.();
    },
  };
} 