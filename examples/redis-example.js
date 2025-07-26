// Example: Using ChatGPT with Redis storage
import ChatGPT from "./src/index.js";

async function exampleWithRedis() {
    // Initialize ChatGPT with Redis storage
    const chatgpt = new ChatGPT("your-openai-api-key", {
        useRedis: true,
        redis: {
            host: "localhost",
            port: 6379,
            // password: "your-redis-password", // if Redis has auth
            keyPrefix: "myapp:chatgpt:",
        },
        // Other options
        model: "gpt-3.5-turbo",
        temperature: 0.7,
        max_tokens: 1000
    });

    try {
        // Basic chat
        const response = await chatgpt.ask(
            undefined, // gptModel (will use default)
            "Hello, how are you?",
            "user123", // conversationId
            "John"     // userName
        );
        
        console.log("Response:", response);

        // Get conversation stats
        const stats = await chatgpt.getFirstAndLastMessage("user123");
        console.log("Conversation stats:", stats);

        // Count vision messages (if any)
        const visionCount = await chatgpt.countChatsWithVision("user123");
        console.log("Vision messages:", visionCount);

        // Delete last message
        await chatgpt.deleteLastMessage("user123");
        console.log("Last message deleted");

        // Reset conversation
        await chatgpt.resetConversation("user123");
        console.log("Conversation reset");

    } catch (error) {
        console.error("Error:", error);
    }
}

async function exampleWithJsonFiles() {
    // Initialize ChatGPT with traditional JSON file storage
    const chatgpt = new ChatGPT("your-openai-api-key", {
        useRedis: false, // or simply omit useRedis
        model: "gpt-3.5-turbo",
        temperature: 0.7,
        max_tokens: 1000
    });

    try {
        // Same API, different storage backend
        const response = await chatgpt.ask(
            undefined,
            "Hello, how are you?",
            "user123",
            "John"
        );
        
        console.log("Response:", response);

    } catch (error) {
        console.error("Error:", error);
    }
}

// Redis with connection URL
async function exampleWithRedisUrl() {
    const chatgpt = new ChatGPT("your-openai-api-key", {
        useRedis: true,
        redis: {
            url: "redis://localhost:6379"
        }
    });

    // Usage is the same...
}

// Multiple API keys with Redis
async function exampleWithMultipleKeys() {
    const chatgpt = new ChatGPT([
        "api-key-1",
        "api-key-2",
        "api-key-3"
    ], {
        useRedis: true,
        redis: {
            host: "localhost",
            port: 6379
        }
    });

    // The library will automatically rotate between keys
    const response = await chatgpt.ask(undefined, "Hello!", "conversation1");
    console.log(response);
}

// Run examples
console.log("ChatGPT Redis Examples");
console.log("Choose your preferred storage method:");
console.log("1. Redis (recommended for production)");
console.log("2. JSON files (simple setup)");

// Uncomment the example you want to run:
// exampleWithRedis();
// exampleWithJsonFiles();
// exampleWithRedisUrl();
// exampleWithMultipleKeys();
