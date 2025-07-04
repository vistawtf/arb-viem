import { arbitrumOne, arbitrumNova, arbitrumSepolia } from '../chains/index.js';

const chainConfigs = [arbitrumOne, arbitrumNova, arbitrumSepolia];

export function getAuctionAddressByChainId(chainId: number): `0x${string}` {
  const config = chainConfigs.find(chain => chain.id === chainId);
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return config.auction;
}

export function getAuctioneerEndpointByChainId(chainId: number): string {
  const config = chainConfigs.find(chain => chain.id === chainId);
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return config.auctioneerEndpoint;
}

export function getSequencerEndpointByChainId(chainId: number): string {
  const config = chainConfigs.find(chain => chain.id === chainId);
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return config.sequencerFeed;
} 