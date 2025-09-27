// Re-export from centralized chain data for backward compatibility
export { 
  CURRENCIES_ARRAY as CURRENCIES,
  CHAINS_ARRAY as CHAINS,
  DEFAULT_CURRENCY,
  DEFAULT_CHAIN,
  type CurrencyConfig as Currency,
  type ChainConfig as Chain,
} from '@/data/chains';
