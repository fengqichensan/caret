import { App, Notice, PluginSettingTab, Setting, debounce } from "obsidian";

import { Models } from "./types";
import CaretPlugin, { DEFAULT_SETTINGS } from "./main";

export class CaretSettingTab extends PluginSettingTab {
    plugin: CaretPlugin;

    constructor(app: App, plugin: CaretPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    /**
     * Reads the details of a provider/model pair from settings.
     *
     * Stored settings can name a provider or model that no longer exists, so
     * every lookup is guarded instead of indexing the table directly.
     */
    private get_model_details(provider: string, model: string): Models | null {
        return this.plugin.settings.llm_provider_options?.[provider]?.[model] ?? null;
    }

    api_settings_tab(containerEl: HTMLElement): void {
        const provider = this.plugin.settings.llm_provider;
        const provider_options = this.plugin.settings.llm_provider_options?.[provider];

        if (!provider_options) {
            // loadSettings() migrates unknown providers, so reaching this means
            // the stored settings are malformed rather than merely outdated.
            containerEl.createEl("p", {
                text: `Unknown LLM provider "${provider}". Please reload the plugin.`,
            });
            return;
        }

        const context_window = this.get_model_details(provider, this.plugin.settings.model)?.context_window ?? null;

        const model_options_data = Object.fromEntries(
            Object.entries(provider_options).map(([key, value]) => [key, value.name])
        );

        // LLM Provider Settings
        new Setting(containerEl)
            .setName("LLM provider")
            .setDesc("")
            .addDropdown((dropdown) => {
                dropdown
                    .addOptions(this.plugin.settings.provider_dropdown_options)
                    .setValue(provider)
                    .onChange(async (selected_provider) => {
                        const first_model = Object.keys(
                            this.plugin.settings.llm_provider_options[selected_provider] ?? {}
                        )[0];
                        if (!first_model) {
                            new Notice(`Provider "${selected_provider}" has no models configured.`);
                            return;
                        }
                        this.plugin.settings.llm_provider = selected_provider;
                        this.plugin.settings.model = first_model;
                        this.plugin.settings.context_window =
                            this.get_model_details(selected_provider, first_model)?.context_window ??
                            this.plugin.settings.context_window;
                        await this.plugin.saveSettings();
                        await this.plugin.loadSettings();
                        this.display();
                    });
            });

        const setting = new Setting(containerEl).setName("Model").addDropdown((modelDropdown) => {
            modelDropdown.addOptions(model_options_data);
            modelDropdown.setValue(this.plugin.settings.model);
            modelDropdown.onChange(async (value) => {
                this.plugin.settings.model = value;
                this.plugin.settings.context_window =
                    this.get_model_details(this.plugin.settings.llm_provider, value)?.context_window ??
                    this.plugin.settings.context_window;
                await this.plugin.saveSettings();
                await this.plugin.loadSettings();
                this.display();
            });
        });

        if (context_window) {
            setting.setDesc(`FYI your selected model has a context window of ${context_window}`);
        }

        new Setting(containerEl)
            .setName("DeepSeek API key")
            .setDesc("")
            .addText((text) => {
                text.setPlaceholder("DeepSeek API key")
                    .setValue(this.plugin.settings.deepseek_api_key)
                    .onChange(async (value: string) => {
                        this.plugin.settings.deepseek_api_key = value;
                        await this.plugin.saveSettings();
                        await this.plugin.loadSettings();
                    });
                text.inputEl.addClass("caret-hidden-value-unsecure");
            });

        new Setting(containerEl)
            .setName("Reload after adding the API key!")
            .setDesc(
                "After you added the API key for the first time you will need to reload the plugin for that change to take effect. \n This only needs to be done the first time or when you change your key."
            );
    }
    chat_settings_tab(containerEl: HTMLElement): void {
        let tempChatFolderPath = this.plugin.settings.chat_logs_folder; // Temporary storage for input value

        const debouncedSave = debounce(
            async (value: string) => {
                if (value.length <= 1) {
                    new Notice("The folder path must be longer than one character.");
                    return;
                }
                if (value.endsWith("/")) {
                    new Notice("The folder path must not end with a trailing slash.");
                    return;
                }
                if (value !== this.plugin.settings.chat_logs_folder) {
                    this.plugin.settings.chat_logs_folder = value;
                    await this.plugin.saveSettings();
                    await this.plugin.loadSettings();
                }
            },
            1000,
            true
        ); // 500ms delay

        new Setting(containerEl)
            .setName("Chat folder path")
            .setDesc("Specify the folder path where chat logs will be stored.")
            .addText((text) => {
                text.setPlaceholder("Enter folder path")
                    .setValue(this.plugin.settings.chat_logs_folder)
                    .onChange((value: string) => {
                        tempChatFolderPath = value;
                        debouncedSave(value);
                    });
            });

        new Setting(containerEl)
            .setName("Use date format for subfolders")
            .setDesc("Use Year-Month-Date as subfolders for the chat logs.")
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.chat_logs_date_format_bool).onChange(async (value: boolean) => {
                    this.plugin.settings.chat_logs_date_format_bool = value;
                    await this.plugin.saveSettings();
                    await this.plugin.loadSettings();
                });
            });

        new Setting(containerEl)
            .setName("Rename chats")
            .setDesc("Chats will be given a descriptive name using your default set provider/model")
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.chat_logs_rename_bool).onChange(async (value: boolean) => {
                    this.plugin.settings.chat_logs_rename_bool = value;
                    await this.plugin.saveSettings();
                    await this.plugin.loadSettings();
                });
            });

        // LLM Provider Settings
        const send_chat_shortcut_options: { [key: string]: string } = {
            enter: "Enter",
            shift_enter: "Shift + Enter",
            // cmd_enter: "CMD + Enter",
        };
        new Setting(containerEl)
            .setName("Send chat keybinds")
            .setDesc("Select which shortcut will be used to send messages.")
            .addDropdown((dropdown) => {
                dropdown
                    .addOptions(send_chat_shortcut_options)
                    .setValue(this.plugin.settings.chat_send_chat_shortcut)
                    .onChange(async (selected) => {
                        this.plugin.settings.chat_send_chat_shortcut = selected;

                        await this.plugin.saveSettings();
                        await this.plugin.loadSettings();
                    });
            });

        new Setting(containerEl)
            .setName("Use nested [[]] content")
            .setDesc("When set to true, context will include 1 layer of block refs")
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.include_nested_block_refs).onChange(async (value: boolean) => {
                    this.plugin.settings.include_nested_block_refs = value;
                    await this.plugin.saveSettings();
                    await this.plugin.loadSettings();
                });
            });
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        if (this.plugin.settings.caret_version !== DEFAULT_SETTINGS.caret_version) {
            this.plugin.settings.caret_version = DEFAULT_SETTINGS.caret_version;
        }

        const tabContainer = containerEl.createEl("div", { cls: "caret-tab-container" });
        const apiTab = tabContainer.createEl("button", { text: "LLM APIs ", cls: "caret-tab" });
        const chatTab = tabContainer.createEl("button", { text: "Chat", cls: "caret-tab" });

        const apiSettingsContainer = containerEl.createEl("div", { cls: "caret-api-settings-container caret-hidden" });
        const chatSettingsContainer = containerEl.createEl("div", {
            cls: "caret-chat-settings-container caret-hidden",
        });

        this.api_settings_tab(apiSettingsContainer);
        this.chat_settings_tab(chatSettingsContainer);

        // LLM Provider Settings
        new Setting(containerEl).setDesc(`Caret Version: ${this.plugin.settings.caret_version}`);

        apiTab.addEventListener("click", () => {
            apiSettingsContainer.classList.remove("caret-hidden");
            chatSettingsContainer.classList.add("caret-hidden");
        });

        chatTab.addEventListener("click", () => {
            chatSettingsContainer.classList.remove("caret-hidden");
            apiSettingsContainer.classList.add("caret-hidden");
            // Placeholder for chat settings rendering function
            // this.chat_settings_tab(chatSettingsContainer);
        });

        // Initially load API settings tab
        apiTab.click();

        // this.api_settings_tab(containerEl);
    }
}
