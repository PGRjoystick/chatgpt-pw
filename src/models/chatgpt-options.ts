interface ChatGPTOptions {
	model?: string;
	temperature?: number;
	max_tokens?: number;
	top_p?: number;
	frequency_penalty?: number;
	presence_penalty?: number;
	instructions?: string;
	moderation?: boolean;
	stream?: boolean;
	price?: number;
	max_conversation_tokens?: number;
	endpoint?: string;
	alt_endpoint?: string;
	alt_api_key?: string | string[];
	base_instruction?: string;
	xapi?: boolean;
}

export default ChatGPTOptions;
