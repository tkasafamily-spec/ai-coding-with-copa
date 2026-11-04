package com.smpterminal;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.item.v1.ItemTooltipCallback;
import net.fabricmc.fabric.api.client.message.v1.ClientReceiveMessageEvents;
import net.minecraft.ChatFormatting;
import net.minecraft.client.Minecraft;
import net.minecraft.network.chat.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class SmpTerminal implements ClientModInitializer {
	public static final Logger LOG = LoggerFactory.getLogger("smpterminal");

	@Override
	public void onInitializeClient() {
		Config.load();
		Prices.load();
		PriceBook.load();
		AhScanner.init();
		Keys.init();
		Compat.registerHud();
		ClientTickEvents.END_CLIENT_TICK.register(Keys::tick);
		ClientReceiveMessageEvents.GAME.register((message, overlay) -> onMessage(message));
		ClientReceiveMessageEvents.CHAT.register((message, signed, sender, params, time) -> onMessage(message));
		ItemTooltipCallback.EVENT.register((stack, context, type, lines) -> Prices.tooltip(stack, lines));
		LOG.info("SMP Terminal loaded");
	}

	private static void onMessage(Component message) {
		try {
			String text = Fmt.strip(message.getString());
			Profit.onMessage(text);
			ChatAlerts.onMessage(text);
		} catch (Exception e) {
			LOG.warn("SMP Terminal could not read a chat message", e);
		}
	}

	/** Prints a message only you can see. */
	public static void chat(String text) {
		Minecraft mc = Minecraft.getInstance();
		if (mc.gui == null) return;
		mc.gui.getChat().addMessage(Component.literal("[Terminal] ").withStyle(ChatFormatting.LIGHT_PURPLE)
			.append(Component.literal(text).withStyle(ChatFormatting.WHITE)));
	}

	public static void actionBar(String text) {
		Minecraft mc = Minecraft.getInstance();
		if (mc.gui != null) mc.gui.setOverlayMessage(Component.literal(text).withStyle(ChatFormatting.LIGHT_PURPLE), false);
	}
}
