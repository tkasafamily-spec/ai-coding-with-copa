package com.smpterminal;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;

import java.util.ArrayList;
import java.util.List;

/** Small on-screen box with running timers (with colored progress bars) and today's AH profit. */
public final class Hud {
	private Hud() {}

	public static final String[] CORNERS = {"Top left", "Top right", "Left middle", "Right middle"};

	public static void render(GuiGraphics g) {
		Minecraft mc = Minecraft.getInstance();
		Config c = Config.C;
		if (!c.hud || mc.player == null || mc.options.hideGui) return;
		long now = System.currentTimeMillis();
		List<Config.TimerEntry> timers = new ArrayList<>();
		if (c.hudTimers) for (Config.TimerEntry t : c.timers) if (timers.size() < 4) timers.add(t);
		boolean profit = c.hudProfit;
		if (timers.isEmpty() && !profit) return;

		Font font = mc.font;
		double net = profit ? Profit.net() : 0;
		int w = 110;
		for (Config.TimerEntry t : timers) w = Math.max(w, font.width(t.name) + 14 + font.width(Fmt.clock(t.endAt - now)));
		if (profit) w = Math.max(w, font.width("AH today") + 14 + font.width(Fmt.signed(net)));
		int boxW = w + 14;
		int h = 6 + timers.size() * 17 + (profit ? 12 : 0);
		int sw = g.guiWidth(), sh = g.guiHeight();
		int x = (c.hudCorner == 1 || c.hudCorner == 3) ? sw - boxW - 4 : 4;
		int y = c.hudCorner >= 2 ? (sh - h) / 2 : 4;
		g.fill(x, y, x + boxW, y + h, 0x90000000);
		int ty = y + 4;
		for (Config.TimerEntry t : timers) {
			long left = t.endAt - now;
			int color = Timers.colorOf(t);
			String clock = Fmt.clock(left);
			g.fill(x, ty - 2, x + 2, ty + 13, color);
			g.drawString(font, t.name, x + 6, ty, 0xFFDDE1F5);
			g.drawString(font, clock, x + boxW - 5 - font.width(clock), ty, Colors.timeColor(color, left));
			double done = t.length > 0 ? 1 - Math.max(0, left) / (double) t.length : 1;
			Colors.bar(g, x + 6, ty + 10, boxW - 11, 3, done, color, left <= 60_000);
			ty += 17;
		}
		if (profit) {
			g.fill(x, ty - 2, x + 2, ty + 9, 0xFF7A8BFF);
			g.drawString(font, "AH today", x + 6, ty, 0xFFB8BEE0);
			String v = Fmt.signed(net);
			g.drawString(font, v, x + boxW - 5 - font.width(v), ty, net >= 0 ? 0xFF3DDC97 : 0xFFFF6B8A);
		}
	}
}
