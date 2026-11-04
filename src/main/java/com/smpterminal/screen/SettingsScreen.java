package com.smpterminal.screen;

import com.smpterminal.Config;
import com.smpterminal.Hud;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.gui.screens.options.controls.KeyBindsScreen;

/** HUD, tooltip and reset-time settings, plus a shortcut to the keybinds menu. */
public class SettingsScreen extends BaseScreen {
	public SettingsScreen(Screen parent) {
		super("Settings & Keybinds", parent);
	}

	private static String onOff(boolean b) {
		return b ? "On" : "Off";
	}

	@Override
	protected void build() {
		Config c = Config.C;
		int gap = 8, colW = (pw - 20 - gap) / 2;
		int x1 = px + 10, x2 = x1 + colW + gap, y = py + 34;
		button("Set keybinds…", "Every Terminal menu has its own keybind here", x1, y, pw - 20, b -> minecraft.setScreen(new KeyBindsScreen(this, minecraft.options)));
		y += 30;
		button("HUD: " + onOff(c.hud), x1, y, colW, b -> { c.hud = !c.hud; save(); });
		button("HUD spot: " + Hud.CORNERS[Math.floorMod(c.hudCorner, Hud.CORNERS.length)], x2, y, colW, b -> { c.hudCorner = (c.hudCorner + 1) % Hud.CORNERS.length; save(); });
		y += 24;
		button("Timers on HUD: " + onOff(c.hudTimers), x1, y, colW, b -> { c.hudTimers = !c.hudTimers; save(); });
		button("Profit on HUD: " + onOff(c.hudProfit), x2, y, colW, b -> { c.hudProfit = !c.hudProfit; save(); });
		y += 24;
		button("Prices in tooltips: " + onOff(c.tooltips), x1, y, colW, b -> { c.tooltips = !c.tooltips; save(); });
		button("Profit resets at " + String.format("%02d:00", c.profit.resetHour), x2, y, colW, b -> { c.profit.resetHour = (c.profit.resetHour + 1) % 24; save(); });
	}

	private void save() {
		Config.save();
		rebuildWidgets();
	}

	@Override
	protected void draw(GuiGraphics g, int mouseX, int mouseY) {
		int y = py + 34 + 30 + 24 * 3 + 6;
		line(g, y);
		y += 8;
		text(g, "Default key: ] opens the Terminal. Every tool also has its own", px + 10, y, MUTED);
		text(g, "keybind (unset at first) under Controls > SMP Terminal.", px + 10, y + 11, MUTED);
		y += 28;
		text(g, "DonutSMP API: not connected yet (coming in the next update).", px + 10, y, MUTED);
		text(g, "Settings file: config/smpterminal.json", px + 10, y + 11, MUTED);
	}
}
