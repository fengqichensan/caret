import { Notice } from "obsidian";
import { streamText, StreamTextResult, CoreTool, generateText, generateObject } from "ai";
import { DeepSeekProvider } from "@ai-sdk/deepseek";

import { z } from "zod";
import CaretPlugin from "main";

// Zod validation for message structure
const MessageSchema = z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string(),
});

const ConversationSchema = z.array(MessageSchema);

export type sdk_provider = DeepSeekProvider;
export type eligible_provider = "deepseek";

const refactored_providers = ["deepseek"];
export const isEligibleProvider = (provider: string): provider is eligible_provider => {
    return refactored_providers.includes(provider);
};

/**
 * Resolves the SDK client for a provider.
 *
 * DeepSeek is currently the only supported provider.
 */
export function get_provider(plugin: CaretPlugin, provider: eligible_provider): sdk_provider {
    switch (provider) {
        case "deepseek":
            return plugin.deepseek_client;
        default:
            throw new Error(`Invalid provider: ${provider}. Must be one of: deepseek`);
    }
}

const provider_label = (provider_name: eligible_provider): string =>
    provider_name[0].toUpperCase() + provider_name.slice(1);

export async function ai_sdk_streaming(
    provider: sdk_provider,
    model: string,
    conversation: Array<{ role: string; content: string }>,
    temperature: number,
    provider_name: eligible_provider
): Promise<StreamTextResult<Record<string, CoreTool<any, any>>, never>> {
    new Notice(`Calling ${provider_label(provider_name)}`);

    // Validate conversation structure
    const validatedConversation = ConversationSchema.parse(conversation);

    const handleError = (event: unknown) => {
        const error = (event as { error: unknown }).error;
        const typedError = error as { errors: Array<{ statusCode: number }> };
        const errors = typedError.errors;

        if (errors?.some((e) => e.statusCode === 429)) {
            console.error("Rate limit exceeded error");
            new Notice(`Rate limit exceeded for ${provider_name} API`);
        } else {
            new Notice(`Unknown error during ${provider_name} streaming`);
        }
    };

    const stream = await streamText({
        model: provider(model),
        messages: validatedConversation,
        temperature,
        onError: handleError,
    });

    return stream;
}
export async function ai_sdk_completion(
    provider: sdk_provider,
    model: string,
    conversation: Array<{ role: string; content: string }>,
    temperature: number,
    provider_name: eligible_provider
): Promise<string> {
    new Notice(`Calling ${provider_label(provider_name)}`);

    // Validate conversation structure
    const validatedConversation = ConversationSchema.parse(conversation);

    const response = await generateText({
        model: provider(model),
        messages: validatedConversation,
        temperature,
    });

    return response.text;
}
export async function ai_sdk_structured<T extends z.ZodType>(
    provider: sdk_provider,
    model: string,
    conversation: Array<{ role: string; content: string }>,
    temperature: number,
    provider_name: eligible_provider,
    schema: T
): Promise<z.infer<T>> {
    new Notice(`Calling ${provider_label(provider_name)}`);

    // Validate conversation structure
    const validatedConversation = ConversationSchema.parse(conversation);

    const response = await generateObject({
        model: provider(model),
        schema,
        messages: validatedConversation,
        temperature,
    });

    return response.object;
}
