# Caret Obsidian Plugin

> **Note:** This plugin is no longer being actively maintained.

Caret is an Obsidian plugin that brings the power of LLMs into your Obsidian Vault. Caret follows all the main Obsidian philosophies. It's local-first, privacy preserving and stores all generated data as local files.

> **Note:** This fork supports **DeepSeek only**. All other providers have been removed — see [LLM Provider](#llm-provider) below.


# Features:
- AI Canvas: Use LLMs in the Obsidian Canvas for non-linear chat and more.
- Chat: Chat directly in Obsidian. Reference other files in your vault. All chat logs are stored as vault files.
- DeepSeek: Caret OP is wired to the DeepSeek API, with `deepseek-flash` and `deepseek-v4-pro` selectable out of the box.


## LLM Provider

Caret talks to the [DeepSeek API](https://api.deepseek.com) and nothing else. It is the only provider in the settings dropdown.

| Model | Context window | Notes |
| --- | --- | --- |
| `deepseek-flash` | 1M | Default. Faster and cheaper; the model itself accepts images, but Caret has no image input path yet. |
| `deepseek-v4-pro` | 1M | Stronger reasoning and agent capabilities, higher cost. |

**Setup**

1. Get an API key from the [DeepSeek platform](https://platform.deepseek.com/api_keys).
2. Paste it into **Settings → Caret → LLM APIs → DeepSeek API key**.
3. **Reload the plugin.** The API client is built at load time, so a key added afterwards is not picked up until a reload. This only needs doing once, or whenever the key changes.

**Thinking mode**

DeepSeek's thinking mode is on by default and Caret leaves it that way. The chain of thought is not displayed — only the final answer is streamed into the note or canvas node, so expect a longer pause before the first characters appear. Two consequences worth knowing:

- `temperature` (from settings, sparkle config and workflow prompts) is **ignored** by the API in thinking mode. It is still sent and still takes effect on models that honour it.
- DeepSeek retired the `deepseek-chat` and `deepseek-reasoner` model names on 2026-07-24, so they are not offered.

**Upgrading from an older version**

This build removes every other provider — OpenAI, Google Gemini, Anthropic, Groq, Ollama, OpenRouter, Perplexity and custom OpenAI-compatible endpoints, plus xAI (which was only used for image generation) — along with the image-generation feature itself. On first load, stored settings naming a removed provider are migrated automatically:

- `llm_provider` → `deepseek`, `model` → `deepseek-flash`, `context_window` → `1000000`
- The retired API keys, custom endpoints and `image_*` settings are deleted from `data.json`

You will still need a DeepSeek API key. Workflow and sparkle configurations saved with a removed provider in their XML (`provider="openai"`) are **not** rewritten — they report `Invalid provider: openai` when run, and the provider must be set back to `default` or `deepseek` in the workflow editor.


## Docs 
The full docs for the plugin will be on the site:
https://www.caretplugin.ai/

## Design Principles
These are the principles that guide the design and development of Caret. If a potential feature doesn't follow these then it probably won't be included in Caret OP.
- Keep to local-first
- No external services outside of LLM providers. No external APIs, DBs, RAG providers etc. All Caret OP functionality should come from just Caret OP.
- All Caret OP data is should be stored as markdown files within the users vault. Anything that Caret creates or consumes should be savable as a local file.
  


## Contributing
PRs welcome! More guidelines to come on this. But essentially if it's good, readable code that fits the Caret OP design principles then I'll try my best to incorporate it.

Big emphasis on "follows Caret OP's design principles". Please don't start working on something that violates a design principle without running it past me first. I don't want you to possibly waste time if it's a feature that I won't be able to incorporate.

