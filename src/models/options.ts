import { RedisDbContextOptions } from "../classes/redis-dbcontext.js";

interface Options {
	model?: string;
	temperature?: number;
	max_tokens?: number;
	top_p?: number;
	frequency_penalty?: number;
	presence_penalty?: number;
	instructions?: string;
	stop?: string;
	aiName?: string;
	moderation?: boolean;
	endpoint?: string;
	price?: number;
	max_conversation_tokens?: number;
	alt_endpoint?: string;
	alt_api_key?: string | string[];
	base_instruction?: string;
	xapi?: boolean;
	debug?: boolean;
	stream?: boolean;
	// Redis configuration
	useRedis?: boolean;
	redis?: RedisDbContextOptions;
}

export default Options;
