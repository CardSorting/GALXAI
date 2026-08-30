// Generated Cloudflare Workers Environment Bindings for GALXAI
// Cleaned to prevent global DOM / Web API collisions in Next.js + Node runtime

type CloudflareKVNamespace = import('@cloudflare/workers-types').KVNamespace;
type CloudflareR2Bucket = import('@cloudflare/workers-types').R2Bucket;
type CloudflareDurableObjectNamespace = import('@cloudflare/workers-types').DurableObjectNamespace;

interface Env {
	ENVIRONMENT: "staging" | "production";
	SUPABASE_URL: string;
	PUBLIC_ASSETS_URL: string;
	NEXT_PUBLIC_SUPABASE_URL: string;
	NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
	NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
	SUPABASE_SERVICE_ROLE_KEY?: string;
	GALX_VAULT_MASTER_SECRET?: string;
	OPENAI_API_KEY?: string;
	XAI_API_KEY?: string;
	HYPERDRIVE?: {
		connectionString: string;
	};
	RATE_LIMIT_KV?: CloudflareKVNamespace;
	EDGE_CACHE?: CloudflareKVNamespace;
	ASSET_BUCKET?: CloudflareR2Bucket;
	TRAINING_DATASET_BUCKET?: CloudflareR2Bucket;
	SWARM_COORDINATOR?: CloudflareDurableObjectNamespace;
}

type __BaseEnv_Env = Env;
