import MessageType from "../enums/message-type.js";

interface Message {
	id: string;
	type: MessageType;
	content: string;
	date: number;
	usage?: object;
}

export interface UsageStats {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

export default Message;
