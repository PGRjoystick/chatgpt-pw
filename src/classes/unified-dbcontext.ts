import Conversation from "../models/conversation.js";
import OpenAIKey from "../models/openai-key.js";
import AppDbContext from "./app-dbcontext.js";
import RedisDbContext, { RedisDbContextOptions } from "./redis-dbcontext.js";
import { ILegacyDbContext } from "../interfaces/idb-context.js";

class UnifiedDbContext implements ILegacyDbContext {
	private redisDb?: RedisDbContext;
	private jsonDb?: AppDbContext;
	private useRedis: boolean;
	private isConnected: boolean = false;

	constructor(useRedis: boolean = false, redisOptions?: RedisDbContextOptions, jsonPath?: string) {
		this.useRedis = useRedis;
		
		if (useRedis) {
			this.redisDb = new RedisDbContext(redisOptions);
		} else {
			this.jsonDb = new AppDbContext(jsonPath);
		}
	}

	async WaitForLoad(): Promise<void> {
		if (this.useRedis && this.redisDb) {
			await this.redisDb.connect();
			this.isConnected = true;
		} else if (this.jsonDb) {
			await this.jsonDb.WaitForLoad();
			this.isConnected = true;
		}
	}

	async disconnect(): Promise<void> {
		if (this.useRedis && this.redisDb) {
			await this.redisDb.disconnect();
			this.isConnected = false;
		}
	}

	// Legacy keys interface
	keys = {
		Any: (predicate: (x: OpenAIKey) => boolean): boolean => {
			if (this.useRedis) {
				// For Redis, we'll need to implement this synchronously with cached data
				// This is a limitation when migrating to async Redis operations
				console.warn("Any() operation is not recommended with Redis. Consider using async methods.");
				return false;
			} else if (this.jsonDb) {
				return this.jsonDb.keys.Any(predicate);
			}
			return false;
		},
		
		Add: (key: OpenAIKey): void => {
			if (this.useRedis && this.redisDb) {
				// Fire and forget for compatibility
				this.redisDb.setApiKey(key).catch(err => 
					console.error("Error adding API key to Redis:", err)
				);
			} else if (this.jsonDb) {
				this.jsonDb.keys.Add(key);
			}
		},
		
		FirstOrDefault: (): OpenAIKey | null => {
			if (this.useRedis) {
				console.warn("FirstOrDefault() is not recommended with Redis. Use async getFirstApiKey() instead.");
				return null;
			} else if (this.jsonDb) {
				return this.jsonDb.keys.FirstOrDefault();
			}
			return null;
		},
		
		OrderBy: (selector: (x: OpenAIKey) => any) => ({
			FirstOrDefault: (): OpenAIKey | null => {
				if (this.useRedis) {
					console.warn("OrderBy().FirstOrDefault() is not recommended with Redis. Use async methods instead.");
					return null;
				} else if (this.jsonDb) {
					return this.jsonDb.keys.OrderBy(selector).FirstOrDefault();
				}
				return null;
			}
		}),
		
		Where: (predicate: (x: OpenAIKey) => boolean) => ({
			FirstOrDefault: (): OpenAIKey | null => {
				if (this.useRedis) {
					console.warn("Where().FirstOrDefault() is not recommended with Redis. Use async methods instead.");
					return null;
				} else if (this.jsonDb) {
					return this.jsonDb.keys.Where(predicate).FirstOrDefault();
				}
				return null;
			}
		})
	};

	// Legacy conversations interface
	conversations = {
		Add: (conversation: Conversation): void => {
			if (this.useRedis && this.redisDb) {
				// Fire and forget for compatibility
				this.redisDb.setConversation(conversation).catch(err => 
					console.error("Error adding conversation to Redis:", err)
				);
			} else if (this.jsonDb) {
				this.jsonDb.conversations.Add(conversation);
			}
		},
		
		Where: (predicate: (x: Conversation) => boolean) => ({
			FirstOrDefault: (): Conversation | null => {
				if (this.useRedis) {
					console.warn("Where().FirstOrDefault() is not recommended with Redis. Use async getConversation() instead.");
					return null;
				} else if (this.jsonDb) {
					return this.jsonDb.conversations.Where(predicate).FirstOrDefault();
				}
				return null;
			}
		}),
		
		FirstOrDefault: (): Conversation | null => {
			if (this.useRedis) {
				console.warn("FirstOrDefault() is not recommended with Redis. Use async methods instead.");
				return null;
			} else if (this.jsonDb) {
				return this.jsonDb.conversations.FirstOrDefault();
			}
			return null;
		}
	};

	// New async methods for Redis (recommended usage)
	async getConversationAsync(id: string): Promise<Conversation | null> {
		if (this.useRedis && this.redisDb) {
			return await this.redisDb.getConversation(id);
		} else if (this.jsonDb) {
			return this.jsonDb.conversations.Where(c => c.id === id).FirstOrDefault();
		}
		return null;
	}

	async setConversationAsync(conversation: Conversation): Promise<void> {
		if (this.useRedis && this.redisDb) {
			await this.redisDb.setConversation(conversation);
		} else if (this.jsonDb) {
			// For JSON DB, we need to find and update or add
			const existing = this.jsonDb.conversations.Where(c => c.id === conversation.id).FirstOrDefault();
			if (existing) {
				// Update existing conversation
				Object.assign(existing, conversation);
			} else {
				this.jsonDb.conversations.Add(conversation);
			}
		}
	}

	async getApiKeyAsync(key: string): Promise<OpenAIKey | null> {
		if (this.useRedis && this.redisDb) {
			return await this.redisDb.getApiKey(key);
		} else if (this.jsonDb) {
			return this.jsonDb.keys.Where(k => k.key === key).FirstOrDefault();
		}
		return null;
	}

	async setApiKeyAsync(apiKey: OpenAIKey): Promise<void> {
		if (this.useRedis && this.redisDb) {
			await this.redisDb.setApiKey(apiKey);
		} else if (this.jsonDb) {
			const existing = this.jsonDb.keys.Where(k => k.key === apiKey.key).FirstOrDefault();
			if (existing) {
				Object.assign(existing, apiKey);
			} else {
				this.jsonDb.keys.Add(apiKey);
			}
		}
	}

	async getAllApiKeysAsync(): Promise<OpenAIKey[]> {
		if (this.useRedis && this.redisDb) {
			return await this.redisDb.getAllApiKeys();
		} else if (this.jsonDb) {
			// Convert DbSet to array (this is a simplified approach)
			const keys: OpenAIKey[] = [];
			let current = this.jsonDb.keys.FirstOrDefault();
			// Note: This is a limitation of the DbSet interface - we can't easily get all items
			// In practice, you might need to modify the DbSet or track keys separately
			return keys;
		}
		return [];
	}

	async getFirstApiKeyAsync(): Promise<OpenAIKey | null> {
		if (this.useRedis && this.redisDb) {
			const keys = await this.redisDb.getAllApiKeys();
			return keys.length > 0 ? keys[0] : null;
		} else if (this.jsonDb) {
			return this.jsonDb.keys.FirstOrDefault();
		}
		return null;
	}

	async getOrderedApiKeyAsync(selector: (x: OpenAIKey) => any): Promise<OpenAIKey | null> {
		if (this.useRedis && this.redisDb) {
			const keys = await this.redisDb.getAllApiKeys();
			if (keys.length === 0) return null;
			
			// Sort keys by the selector
			keys.sort((a, b) => {
				const aVal = selector(a);
				const bVal = selector(b);
				return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
			});
			
			return keys[0];
		} else if (this.jsonDb) {
			return this.jsonDb.keys.OrderBy(selector).FirstOrDefault();
		}
		return null;
	}

	isRedis(): boolean {
		return this.useRedis;
	}

	isConnectedToDb(): boolean {
		return this.isConnected;
	}
}

export default UnifiedDbContext;
