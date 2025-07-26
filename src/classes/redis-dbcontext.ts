import { createClient, RedisClientType } from "redis";
import Conversation from "../models/conversation.js";
import OpenAIKey from "../models/openai-key.js";

export interface RedisDbContextOptions {
	url?: string;
	host?: string;
	port?: number;
	password?: string;
	database?: number;
	keyPrefix?: string;
	connectionTimeout?: number;
	commandTimeout?: number;
}

class RedisDbContext {
	private client: RedisClientType;
	private keyPrefix: string;
	private isConnected: boolean = false;

	constructor(options?: RedisDbContextOptions) {
		this.keyPrefix = options?.keyPrefix || "chatgpt:";
		
		const redisConfig: any = {};
		
		if (options?.url) {
			redisConfig.url = options.url;
		} else {
			redisConfig.socket = {
				host: options?.host || "localhost",
				port: options?.port || 6379,
				connectTimeout: options?.connectionTimeout || 10000,
			};
			if (options?.password) {
				redisConfig.password = options.password;
			}
		}
		
		if (options?.database) {
			redisConfig.database = options.database;
		}

		this.client = createClient(redisConfig);

		// Handle Redis connection events
		this.client.on('error', (err) => {
			console.error('Redis Client Error:', err);
			this.isConnected = false;
		});

		this.client.on('connect', () => {
			console.log('Connected to Redis');
			this.isConnected = true;
		});

		this.client.on('ready', () => {
			console.log('Redis client ready');
			this.isConnected = true;
		});

		this.client.on('end', () => {
			console.log('Redis connection ended');
			this.isConnected = false;
		});
	}

	async connect(): Promise<void> {
		if (!this.isConnected) {
			await this.client.connect();
		}
	}

	async disconnect(): Promise<void> {
		if (this.isConnected) {
			await this.client.disconnect();
		}
	}

	isReady(): boolean {
		return this.isConnected && this.client.isReady;
	}

	// Conversation operations
	async getConversation(id: string): Promise<Conversation | null> {
		try {
			const key = `${this.keyPrefix}conversations:${id}`;
			const data = await this.client.get(key);
			if (data) {
				return JSON.parse(data) as Conversation;
			}
			return null;
		} catch (error) {
			console.error('Error getting conversation:', error);
			return null;
		}
	}

	async setConversation(conversation: Conversation): Promise<void> {
		try {
			const key = `${this.keyPrefix}conversations:${conversation.id}`;
			await this.client.set(key, JSON.stringify(conversation));
			
			// Set expiration to 30 days for inactive conversations
			const expireTime = 30 * 24 * 60 * 60; // 30 days in seconds
			await this.client.expire(key, expireTime);
		} catch (error) {
			console.error('Error setting conversation:', error);
			throw error;
		}
	}

	async deleteConversation(id: string): Promise<void> {
		try {
			const key = `${this.keyPrefix}conversations:${id}`;
			await this.client.del(key);
		} catch (error) {
			console.error('Error deleting conversation:', error);
			throw error;
		}
	}

	async getAllConversationIds(): Promise<string[]> {
		try {
			const pattern = `${this.keyPrefix}conversations:*`;
			const keys = await this.client.keys(pattern);
			return keys.map(key => key.replace(`${this.keyPrefix}conversations:`, ''));
		} catch (error) {
			console.error('Error getting all conversation IDs:', error);
			return [];
		}
	}

	// API Key operations
	async getApiKey(key: string): Promise<OpenAIKey | null> {
		try {
			const redisKey = `${this.keyPrefix}keys:${key}`;
			const data = await this.client.get(redisKey);
			if (data) {
				return JSON.parse(data) as OpenAIKey;
			}
			return null;
		} catch (error) {
			console.error('Error getting API key:', error);
			return null;
		}
	}

	async setApiKey(apiKey: OpenAIKey): Promise<void> {
		try {
			const key = `${this.keyPrefix}keys:${apiKey.key}`;
			await this.client.set(key, JSON.stringify(apiKey));
		} catch (error) {
			console.error('Error setting API key:', error);
			throw error;
		}
	}

	async getAllApiKeys(): Promise<OpenAIKey[]> {
		try {
			const pattern = `${this.keyPrefix}keys:*`;
			const keys = await this.client.keys(pattern);
			const apiKeys: OpenAIKey[] = [];
			
			for (const key of keys) {
				const data = await this.client.get(key);
				if (data) {
					apiKeys.push(JSON.parse(data) as OpenAIKey);
				}
			}
			
			return apiKeys;
		} catch (error) {
			console.error('Error getting all API keys:', error);
			return [];
		}
	}

	async deleteApiKey(key: string): Promise<void> {
		try {
			const redisKey = `${this.keyPrefix}keys:${key}`;
			await this.client.del(redisKey);
		} catch (error) {
			console.error('Error deleting API key:', error);
			throw error;
		}
	}

	// Health check
	async ping(): Promise<string> {
		return await this.client.ping();
	}

	// Get Redis client for advanced operations
	getClient(): RedisClientType {
		return this.client;
	}
}

export default RedisDbContext;
