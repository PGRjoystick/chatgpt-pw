import Conversation from "../models/conversation.js";
import OpenAIKey from "../models/openai-key.js";

export interface IDbContext {
	// Initialization
	WaitForLoad?(): Promise<void>;
	connect?(): Promise<void>;
	disconnect?(): Promise<void>;
	
	// Conversation operations
	getConversation(id: string): Promise<Conversation | null> | Conversation | null;
	setConversation(conversation: Conversation): Promise<void> | void;
	deleteConversation(id: string): Promise<void> | void;
	getAllConversationIds?(): Promise<string[]> | string[];
	
	// API Key operations
	getApiKey(key: string): Promise<OpenAIKey | null> | OpenAIKey | null;
	setApiKey(apiKey: OpenAIKey): Promise<void> | void;
	getAllApiKeys(): Promise<OpenAIKey[]> | OpenAIKey[];
	deleteApiKey(key: string): Promise<void> | void;
}

// Legacy DbSet interface for backward compatibility
export interface ILegacyDbContext {
	keys: {
		Any: (predicate: (x: OpenAIKey) => boolean) => boolean;
		Add: (key: OpenAIKey) => void;
		FirstOrDefault: () => OpenAIKey | null;
		OrderBy: (selector: (x: OpenAIKey) => any) => { FirstOrDefault: () => OpenAIKey | null };
		Where: (predicate: (x: OpenAIKey) => boolean) => { FirstOrDefault: () => OpenAIKey | null };
	};
	conversations: {
		Add: (conversation: Conversation) => void;
		Where: (predicate: (x: Conversation) => boolean) => { FirstOrDefault: () => Conversation | null };
		FirstOrDefault: () => Conversation | null;
	};
	WaitForLoad(): Promise<void>;
}

export default IDbContext;
