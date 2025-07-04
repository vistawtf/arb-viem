import {
  type WalletClient,
  type Chain,
  type Transport,
  type Address,
  type Account,
  hashTypedData,
} from "viem";
import {
  getAuctionAddressByChainId,
  getAuctioneerEndpointByChainId,
} from "../../../utils/timeboost.js";

export type SubmitBidParameters = {
  round: bigint;
  expressLaneController: Address;
  amount: bigint;
};

export type SubmitBidReturnType = {
  success: boolean;
  error?: string;
  bidHash?: string;
};

export type WriteSubmitBidParameters<
  TChain extends Chain = Chain,
  TAccount extends Account = Account,
  TChainOverride extends Chain | undefined = Chain | undefined,
> = {
  args: SubmitBidParameters;
} & { chain?: TChainOverride | TChain } & { account?: TAccount | Account };

export async function submitBid<TChain extends Chain, TAccount extends Account>(
  client: WalletClient<Transport, TChain, TAccount>,
  { round, expressLaneController, amount }: SubmitBidParameters,
): Promise<SubmitBidReturnType> {
  const chainId = client.chain.id;
  const auctionContractAddress = getAuctionAddressByChainId(chainId);
  const auctioneerEndpoint = getAuctioneerEndpointByChainId(chainId);

  const signatureData = hashTypedData({
    domain: {
      name: "ExpressLaneAuction",
      version: "1",
      chainId,
      verifyingContract: auctionContractAddress,
    },
    types: {
      Bid: [
        { name: "round", type: "uint64" },
        { name: "expressLaneController", type: "address" },
        { name: "amount", type: "uint256" },
      ],
    },
    primaryType: "Bid",
    message: {
      round,
      expressLaneController,
      amount,
    },
  });

  let signature: `0x${string}`;
  try {
    signature = await client.signMessage({
      account: client.account,
      message: { raw: signatureData },
    } as unknown as Parameters<typeof client.signMessage>[0]);
  } catch (error) {
    return {
      success: false,
      error: `Failed to sign bid: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }

  const hexChainId: `0x${string}` = `0x${Number(chainId).toString(16)}`;

  const requestBody = {
    jsonrpc: "2.0",
    id: "submit-bid",
    method: "auctioneer_submitBid",
    params: [
      {
        chainId: hexChainId,
        expressLaneController,
        auctionContractAddress,
        round: `0x${round.toString(16)}`,
        amount: `0x${amount.toString(16)}`,
        signature,
      },
    ],
  };

  try {
    const response = await fetch(auctioneerEndpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error: ${response.status} ${response.statusText}`,
      };
    }

    const result = await response.json();

    if (result.error) {
      return {
        success: false,
        error: result.error.message || result.error,
      };
    }

    return {
      success: true,
      bidHash: signatureData,
    };
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function writeSubmitBid<
  TChain extends Chain,
  TAccount extends Account,
  TChainOverride extends Chain | undefined = undefined,
>(
  client: WalletClient<Transport, TChain, TAccount>,
  { args }: WriteSubmitBidParameters<TChain, TAccount, TChainOverride>,
): Promise<SubmitBidReturnType> {
  return submitBid(client, args);
}
