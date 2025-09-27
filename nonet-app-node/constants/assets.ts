// Currency and Chain constants with image URLs

export interface Currency {
  id: string;
  name: string;
  symbol: string;
  imageUrl: string;
  decimals: number;
}

export interface Chain {
  id: string;
  name: string;
  symbol: string;
  imageUrl: string;
  chainId: number;
}

export const CURRENCIES: Currency[] = [
  {
    id: 'eth',
    name: 'Ethereum',
    symbol: 'ETH',
    imageUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    decimals: 18,
  },
  {
    id: 'usdc',
    name: 'USD Coin',
    symbol: 'USDC',
    imageUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
    decimals: 6,
  },
  {
    id: 'usdt',
    name: 'Tether',
    symbol: 'USDT',
    imageUrl: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
    decimals: 6,
  },
  {
    id: 'btc',
    name: 'Bitcoin',
    symbol: 'BTC',
    imageUrl: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
    decimals: 8,
  },
];

export const CHAINS: Chain[] = [
  {
    id: 'hedera',
    name: 'Hedera',
    symbol: 'HBAR',
    imageUrl: 'https://cryptologos.cc/logos/hedera-hbar-logo.png',
    chainId: 295,
  },
  {
    id: 'flow',
    name: 'Flow',
    symbol: 'FLOW',
    imageUrl: 'https://cryptologos.cc/logos/flow-flow-logo.png',
    chainId: 747,
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    imageUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    chainId: 1,
  },
  {
    id: 'polygon',
    name: 'Polygon',
    symbol: 'MATIC',
    imageUrl: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
    chainId: 137,
  },
];

// Default selections
export const DEFAULT_CURRENCY = CURRENCIES[0]; // ETH
export const DEFAULT_CHAIN = CHAINS[0]; // Hedera
