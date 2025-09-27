/* eslint-disable @typescript-eslint/no-explicit-any */

// Chain interface definition
export interface ChainConfig {
  id: string;
  name: string;
  displayName: string;
  symbol: string;
  chainId: number;
  rpcUrl: string;
  explorer: string;
  faucet: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  imageUrl: string;
  testnet: boolean;
  type: 'evm' | 'flow' | 'hedera' | 'other';
  gasSettings?: {
    defaultGasLimit: string;
    defaultGasPrice: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  };
  features: string[];
}

// Currency interface definition
export interface CurrencyConfig {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  imageUrl: string;
  chains: string[]; // Chain IDs where this currency is available
  contractAddress?: string; // For ERC-20 tokens
  isNative: boolean;
}

// Supported chains configuration
export const CHAINS: Record<string, ChainConfig> = {
  flow: {
    id: 'flow',
    name: 'Flow EVM Testnet',
    displayName: 'Flow',
    symbol: 'FLOW',
    chainId: 545,
    rpcUrl: 'https://testnet.evm.nodes.onflow.org',
    explorer: 'https://evm-testnet.flowscan.io',
    faucet: 'https://testnet-faucet.onflow.org',
    nativeCurrency: {
      name: 'Flow',
      symbol: 'FLOW',
      decimals: 18,
    },
    imageUrl: 'https://cryptologos.cc/logos/flow-flow-logo.png',
    testnet: true,
    type: 'evm',
    gasSettings: {
      defaultGasLimit: '21000',
      defaultGasPrice: '1000000000', // 1 Gwei
    },
    features: ['evm-compatible', 'smart-contracts', 'nft-support'],
  },
  
  hedera: {
    id: 'hedera',
    name: 'Hedera Testnet',
    displayName: 'Hedera',
    symbol: 'HBAR',
    chainId: 296,
    rpcUrl: 'https://testnet.hashio.io/api',
    explorer: 'https://hashscan.io/testnet',
    faucet: 'https://portal.hedera.com/faucet',
    nativeCurrency: {
      name: 'HBAR',
      symbol: 'HBAR',
      decimals: 18,
    },
    imageUrl: 'https://cryptologos.cc/logos/hedera-hbar-logo.png',
    testnet: true,
    type: 'evm',
    gasSettings: {
      defaultGasLimit: '21000',
      defaultGasPrice: '7000000000', // 7 Gwei
    },
    features: ['evm-compatible', 'fast-finality', 'carbon-negative'],
  },

  sepolia: {
    id: 'sepolia',
    name: 'Sepolia Testnet',
    displayName: 'Ethereum Sepolia',
    symbol: 'ETH',
    chainId: 11155111,
    rpcUrl: 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    explorer: 'https://sepolia.etherscan.io',
    faucet: 'https://sepoliafaucet.com',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    imageUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    testnet: true,
    type: 'evm',
    gasSettings: {
      defaultGasLimit: '21000',
      defaultGasPrice: '20000000000', // 20 Gwei
    },
    features: ['evm-native', 'smart-contracts', 'defi-ecosystem'],
  },

  polygonMumbai: {
    id: 'polygonMumbai',
    name: 'Polygon Mumbai',
    displayName: 'Polygon',
    symbol: 'MATIC',
    chainId: 80001,
    rpcUrl: 'https://polygon-mumbai.g.alchemy.com/v2/demo',
    explorer: 'https://mumbai.polygonscan.com',
    faucet: 'https://faucet.polygon.technology',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    imageUrl: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
    testnet: true,
    type: 'evm',
    gasSettings: {
      defaultGasLimit: '21000',
      defaultGasPrice: '1000000000', // 1 Gwei
    },
    features: ['evm-compatible', 'low-fees', 'fast-transactions'],
  },

  bscTestnet: {
    id: 'bscTestnet',
    name: 'BSC Testnet',
    displayName: 'Binance Smart Chain',
    symbol: 'BNB',
    chainId: 97,
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    explorer: 'https://testnet.bscscan.com',
    faucet: 'https://testnet.binance.org/faucet-smart',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    imageUrl: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
    testnet: true,
    type: 'evm',
    gasSettings: {
      defaultGasLimit: '21000',
      defaultGasPrice: '5000000000', // 5 Gwei
    },
    features: ['evm-compatible', 'bep20-tokens', 'defi-ecosystem'],
  },
};

// Supported currencies configuration
export const CURRENCIES: Record<string, CurrencyConfig> = {
  flow: {
    id: 'flow',
    name: 'Flow',
    symbol: 'FLOW',
    decimals: 18,
    imageUrl: 'https://cryptologos.cc/logos/flow-flow-logo.png',
    chains: ['flow'],
    isNative: true,
  },

  eth: {
    id: 'eth',
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    imageUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    chains: ['sepolia'],
    isNative: true,
  },

  hbar: {
    id: 'hbar',
    name: 'HBAR',
    symbol: 'HBAR',
    decimals: 18,
    imageUrl: 'https://cryptologos.cc/logos/hedera-hbar-logo.png',
    chains: ['hedera'],
    isNative: true,
  },

  matic: {
    id: 'matic',
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
    imageUrl: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
    chains: ['polygonMumbai'],
    isNative: true,
  },

  bnb: {
    id: 'bnb',
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
    imageUrl: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
    chains: ['bscTestnet'],
    isNative: true,
  },

  usdc: {
    id: 'usdc',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    imageUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
    chains: ['sepolia', 'polygonMumbai', 'bscTestnet'],
    isNative: false,
    contractAddress: '0x07865c6E87B9F70255377e024ace6630C1Eaa37F', // Sepolia USDC
  },

  usdt: {
    id: 'usdt',
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    imageUrl: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
    chains: ['sepolia', 'polygonMumbai', 'bscTestnet'],
    isNative: false,
    contractAddress: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', // Sepolia USDT
  },
};

// Default selections
export const DEFAULT_CHAIN = CHAINS.flow;
export const DEFAULT_CURRENCY = CURRENCIES.flow;

// Utility functions
export const getChainById = (chainId: string): ChainConfig | undefined => {
  return CHAINS[chainId];
};

export const getCurrencyById = (currencyId: string): CurrencyConfig | undefined => {
  return CURRENCIES[currencyId];
};

export const getChainsByType = (type: ChainConfig['type']): ChainConfig[] => {
  return Object.values(CHAINS).filter(chain => chain.type === type);
};

export const getCurrenciesByChain = (chainId: string): CurrencyConfig[] => {
  return Object.values(CURRENCIES).filter(currency => 
    currency.chains.includes(chainId)
  );
};

export const getNativeCurrencyForChain = (chainId: string): CurrencyConfig | undefined => {
  return Object.values(CURRENCIES).find(currency => 
    currency.chains.includes(chainId) && currency.isNative
  );
};

export const getTestnetChains = (): ChainConfig[] => {
  return Object.values(CHAINS).filter(chain => chain.testnet);
};

export const getMainnetChains = (): ChainConfig[] => {
  return Object.values(CHAINS).filter(chain => !chain.testnet);
};

export const getSupportedChainIds = (): number[] => {
  return Object.values(CHAINS).map(chain => chain.chainId);
};

export const getChainByChainId = (chainId: number): ChainConfig | undefined => {
  return Object.values(CHAINS).find(chain => chain.chainId === chainId);
};

// Export arrays for backward compatibility
export const CHAINS_ARRAY = Object.values(CHAINS);
export const CURRENCIES_ARRAY = Object.values(CURRENCIES);

// Type exports
export type { ChainConfig, CurrencyConfig };
