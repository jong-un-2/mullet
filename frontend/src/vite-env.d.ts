/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API_ENDPOINT: string
	readonly VITE_DEV_API_ENDPOINT: string
	readonly VITE_FAUCET_API_URL: string
	readonly VITE_API_KEY: string
	readonly GEMINI_API_KEY: string
	
	// Privy Configuration
	readonly VITE_PRIVY_APP_ID: string
	readonly VITE_PRIVY_CLIENT_ID: string
	readonly VITE_PRIVY_APP_SECRET: string
	
	// Wallet Configuration
	readonly VITE_WALLETCONNECT_PROJECT_ID: string
	
	// Ethereum Network Configuration
	readonly VITE_ALCHEMY_API_KEY: string
	readonly VITE_DEFAULT_CHAIN_ID: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}