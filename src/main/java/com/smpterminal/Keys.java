package com.smpterminal;

import com.smpterminal.screen.AlertsScreen;
import com.smpterminal.screen.FlipScreen;
import com.smpterminal.screen.InventoryValueScreen;
import com.smpterminal.screen.NotesScreen;
import com.smpterminal.screen.ProfitScreen;
import com.smpterminal.screen.SettingsScreen;
import com.smpterminal.screen.TerminalScreen;
import com.smpterminal.screen.TimerScreen;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import org.lwjgl.glfw.GLFW;

/**
 * Every tool has its own keybind (Options > Controls > SMP Terminal).
 * Only "Open Terminal" has a default key (]); set the others to whatever you like.
 */
public final class Keys {
	private Keys() {}

	private static final int NONE = -1;
	public static KeyMapping OPEN, TIMER, PROFIT, INVENTORY, ALERTS, FLIP, NOTES, SETTINGS, RESTART, HUD, PROFIT_HUD;

	public static void init() {
		OPEN = reg("open", GLFW.GLFW_KEY_RIGHT_BRACKET);
		TIMER = reg("timer", NONE);
		PROFIT = reg("profit", NONE);
		INVENTORY = reg("inventory", NONE);
		ALERTS = reg("alerts", NONE);
		FLIP = reg("flip", NONE);
		NOTES = reg("notes", NONE);
		SETTINGS = reg("settings", NONE);
		RESTART = reg("restart", NONE);
		HUD = reg("hud", NONE);
		PROFIT_HUD = reg("profit_hud", NONE);
	}

	private static KeyMapping reg(String id, int key) {
		return KeyBindingHelper.registerKeyBinding(Compat.key(id, key));
	}

	public static void tick(Minecraft mc) {
		while (OPEN.consumeClick()) mc.setScreen(new TerminalScreen(null));
		while (TIMER.consumeClick()) mc.setScreen(new TimerScreen(null));
		while (PROFIT.consumeClick()) mc.setScreen(new ProfitScreen(null));
		while (INVENTORY.consumeClick()) mc.setScreen(new InventoryValueScreen(null));
		while (ALERTS.consumeClick()) mc.setScreen(new AlertsScreen(null));
		while (FLIP.consumeClick()) mc.setScreen(new FlipScreen(null));
		while (NOTES.consumeClick()) mc.setScreen(new NotesScreen(null));
		while (SETTINGS.consumeClick()) mc.setScreen(new SettingsScreen(null));
		while (RESTART.consumeClick()) Timers.start(Config.C.lastTimerName, Config.C.lastTimerMs);
		while (HUD.consumeClick()) {
			Config.C.hud = !Config.C.hud;
			Config.save();
			SmpTerminal.actionBar("Timer HUD " + (Config.C.hud ? "on" : "off"));
		}
		while (PROFIT_HUD.consumeClick()) {
			Config.C.profitHud = !Config.C.profitHud;
			Config.save();
			SmpTerminal.actionBar("Profit HUD " + (Config.C.profitHud ? "on" : "off"));
		}
		Timers.tick(mc);
		Profit.tick(mc);
	}
}
