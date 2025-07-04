import type {
  Account,
  Chain,
  Hash,
  Hex,
  Transport,
  TransactionRequest,
  WalletClient,
} from "viem";
import { keccak256, toHex, pad, concat, numberToBytes } from "viem";
import {
  getAuctionAddressByChainId,
  getSequencerEndpointByChainId,
} from "../../../utils/timeboost.js";

export type SendExpressLaneTransactionParameters = {
  transaction: TransactionRequest;
  round: bigint;
  sequenceNumber?: bigint;
  options?: Record<string, any>;
};

export type SendExpressLaneTransactionReturnType = Hash;

export type WriteExpressLaneTransactionParameters<
  TChain extends Chain = Chain,
  TAccount extends Account = Account,
  TChainOverride extends Chain | undefined = Chain | undefined,
> = {
  /** The express lane transaction parameters */
  args: SendExpressLaneTransactionParameters;
} & { chain?: TChainOverride | TChain } & { account?: TAccount | Account };

const DONT_CARE_SEQUENCE_NUMBER = 2n ** 64n - 1n;

export async function sendExpressLaneTransaction<
  TChain extends Chain,
  TAccount extends Account,
>(
  client: WalletClient<Transport, TChain, TAccount>,
  {
    transaction,
    round,
    sequenceNumber = DONT_CARE_SEQUENCE_NUMBER,
    options = {},
  }: SendExpressLaneTransactionParameters,
): Promise<SendExpressLaneTransactionReturnType> {
  const chainId = client.chain.id;
  const auctionContractAddress = getAuctionAddressByChainId(chainId);
  const sequencerEndpoint = getSequencerEndpointByChainId(chainId);

  const preparedTransaction = await client.prepareTransactionRequest({
    account: client.account,
    ...transaction,
  } as unknown as Parameters<typeof client.prepareTransactionRequest>[0]);

  const serializedTransaction = await client.signTransaction({
    account: client.account,
    ...preparedTransaction,
  } as unknown as Parameters<typeof client.signTransaction>[0]);

  const hexChainId: Hex = `0x${Number(chainId).toString(16)}`;

  const signatureData = concat([
    keccak256(toHex("TIMEBOOST_BID")),
    pad(hexChainId),
    auctionContractAddress,
    toHex(numberToBytes(round, { size: 8 })),
    toHex(numberToBytes(sequenceNumber, { size: 8 })),
    serializedTransaction,
  ]);

  const signature = await client.signMessage({
    account: client.account,
    message: { raw: signatureData },
  } as unknown as Parameters<typeof client.signMessage>[0]);

  const response = await fetch(sequencerEndpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "express-lane-tx",
      method: "timeboost_sendExpressLaneTransaction",
      params: [
        {
          chainId: hexChainId,
          round: `0x${round.toString(16)}`,
          auctionContractAddress,
          sequenceNumber: `0x${sequenceNumber.toString(16)}`,
          transaction: serializedTransaction,
          options,
          signature,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();

  if (result.error) {
    const errorMessage = result.error.message || result.error;
    throw new Error(`Timeboost express lane error: ${errorMessage}`);
  }

  return result.result || serializedTransaction;
}

export async function writeExpressLaneTransaction<
  TChain extends Chain,
  TAccount extends Account,
  TChainOverride extends Chain | undefined = undefined,
>(
  client: WalletClient<Transport, TChain, TAccount>,
  {
    args,
  }: WriteExpressLaneTransactionParameters<TChain, TAccount, TChainOverride>,
): Promise<SendExpressLaneTransactionReturnType> {
  return sendExpressLaneTransaction(client, args);
}
