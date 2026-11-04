package com.smpterminal.screen;

import com.smpterminal.Config;
import com.smpterminal.Fmt;
import com.smpterminal.Profit;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.Screen;

import java.util.function.Supplier;

/** The main menu (default key: ]). */
public class TerminalScreen extends BaseScreen {
	public TerminalScreen(Screen parent) {
		super("SMP TERMINAL", parent);
	}

	@Override
	protected void build() {
		int gap = 8;
		int colW = (pw - 20 - gap) / 2;
		int x1 = px + 10, x2 = x1 + colW + gap;
		int y = py + 46;
		int n = Config.C.timers.size();
		tool(x1, y, colW, "Auction Timer" + (n > 0 ? " (" + n + ")" : ""), "Start a countdown. Saved times on the same menu.", () -> new TimerScreen(this));
		tool(x2, y, colW, "Profit: " + Fmt.signed(Profit.net()), "AH profit tracker. Resets every day.", () -> new ProfitScreen(this));
		y += 26;
		tool(x1, y, colW, "Price Check", "Look up and set item prices.", () -> new PriceScreen(this));
		tool(x2, y, colW, "Inventory Value", "What everything you're carrying is worth.", () -> new InventoryValueScreen(this));
		y += 26;
		tool(x1, y, colW, "Chat Alerts", "Ping when chat mentions your keywords.", () -> new AlertsScreen(this));
		tool(x2, y, colW, "Flip Calculator", "Buy order vs. auction profit.", () -> new FlipScreen(this));
		y += 26;
		tool(x1, y, colW, "Notes", "Quick notes that stay saved.", () -> new NotesScreen(this));
		tool(x2, y, colW, "Settings & Keybinds", "HUD, tooltips, reset time and keybinds.", () -> new SettingsScreen(this));
	}

	private void tool(int x, int y, int w, String label, String tip, Supplier<Screen> open) {
		button(label, tip, x, y, w, b -> minecraft.setScreen(open.get()));
	}

	@Override
	protected void draw(GuiGraphics g, int mouseX, int mouseY) {
		text(g, "DonutSMP toolkit", px + 10, py + 27, MUTED);
		int y = py + 46 + 26 * 4 + 6;
		line(g, y);
		y += 8;
		if (Config.C.timers.isEmpty()) {
			text(g, "No timers running.", px + 10, y, MUTED);
		} else {
			long now = System.currentTimeMillis();
			int shown = 0;
			for (Config.TimerEntry t : Config.C.timers) {
				if (y > bottom() + 8 || shown++ >= 3) break;
				text(g, fit(t.name, pw - 110), px + 10, y, TEXT);
				textRight(g, Fmt.clock(t.endAt - now), px + pw - 10, y, GOLD);
				y += 12;
			}
		}
		text(g, "Every menu has its own keybind: Settings & Keybinds.", px + 10, py + ph - 16, MUTED);
	}
}
