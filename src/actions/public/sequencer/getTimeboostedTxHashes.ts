import type { Chain, Transport, Hash, PublicClient, Block, TransactionReceipt } from 'viem';
import { getTransactionReceipt } from 'viem/actions';

type TimeboostedTransactionReceipt = TransactionReceipt & {
  timeboosted?: boolean;
};

export async function getTimeboostedTxHashes<
  TChain extends Chain | undefined = undefined,
>(
  client: PublicClient<Transport, TChain>,
  { blockHash }: { blockHash: Hash },
): Promise<Hash[]> {
  const block = await client.getBlock({ 
    blockHash, 
    includeTransactions: true 
  }) as Block<bigint, true, 'latest'>;
  
  const boosted: Hash[] = [];

  for (const tx of block.transactions) {
    const receipt = await getTransactionReceipt(client, { hash: tx.hash }) as TimeboostedTransactionReceipt;
    if (receipt.timeboosted) boosted.push(tx.hash);
  }

  return boosted;
}
