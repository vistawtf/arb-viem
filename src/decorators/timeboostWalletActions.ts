import type { Account, Chain, Transport, WalletClient } from "viem";
import {
  submitBid,
  writeSubmitBid,
  type SubmitBidParameters,
  type WriteSubmitBidParameters,
} from "../actions/wallet/auction/submitBid.js";
import {
  writeExpressLaneTransaction,
  type WriteExpressLaneTransactionParameters,
} from "../actions/wallet/sequencer/sendExpressTx.js";

export function timeboostWalletActions<
  TTransport extends Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TAccount extends Account | undefined = Account | undefined,
>(client: WalletClient<TTransport, TChain, TAccount>) {
  return {
    submitBid: (args: SubmitBidParameters) =>
      submitBid(client as WalletClient<Transport, Chain, Account>, args),
    writeSubmitBid: (args: WriteSubmitBidParameters) =>
      writeSubmitBid(client as WalletClient<Transport, Chain, Account>, args),
    writeExpressLaneTransaction: (
      args: WriteExpressLaneTransactionParameters,
    ) =>
      writeExpressLaneTransaction(
        client as WalletClient<Transport, Chain, Account>,
        args,
      ),
  };
}
