import { createContext } from "react";
import type { UseChatReturn } from "../useChat";

export const ChatContext = createContext<UseChatReturn | null>(null);
