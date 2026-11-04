package com.smpterminal;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.network.chat.Component;

import java.util.ArrayList;
import java.util.List;

/** Two on-screen boxes: running timers (top middle by default) and, if turned on, today's AH profit. */
public final class Hud {
	private Hud() {}

	public static final String[] SPOTS = {"Top middle", "Top left", "Top right", "Left middle", "Right middle"};

	private static Component b(String s) {
		return Txt.b(s);
	}

	private static void draw(GuiGraphics g, Font font, String s, int x, int y, int color) {
		g.drawString(font, b(s), x, y, color, !Config.C.cleanFont);
	}

	private static int[] place(GuiGraphics g, int spot, int w, int h) {
		int sw = g.guiWidth(), sh = g.guiHeight();
		return switch (Math.floorMod(spot, SPOTS.length)) {
			case 1 -> new int[]{4, 4};
			case 2 -> new int[]{sw - w - 4, 4};
			case 3 -> new int[]{4, (sh - h) / 2};
			case 4 -> new int[]{sw - w - 4, (sh - h) / 2};
			default -> new int[]{(sw - w) / 2, 4};
		};
	}

	public static void render(GuiGraphics g) {
		Minecraft mc = Minecraft.getInstance();
		Config c = Config.C;
		if (mc.player == null || mc.options.hideGui) return;
		Font font = mc.font;
		if (c.hud && c.hudTimers) timers(g, font, c);
		if (c.profitHud) profit(g, font, c);
	}

	private static void timers(GuiGraphics g, Font font, Config c) {
		long now = System.currentTimeMillis();
		List<Config.TimerEntry> timers = new ArrayList<>();
		for (Config.TimerEntry t : c.timers) if (timers.size() < 4) timers.add(t);
		if (timers.isEmpty()) return;
		int w = 110;
		for (Config.TimerEntry t : timers) w = Math.max(w, font.width(b(t.name)) + 14 + font.width(b(Fmt.clock(t.endAt - now))));
		int boxW = w + 14;
		int h = 4 + timers.size() * 17;
		int[] p = place(g, c.timerHudSpot, boxW, h);
		int x = p[0], y = p[1];
		g.fill(x, y, x + boxW, y + h, 0x90000000);
		int ty = y + 4;
		for (Config.TimerEntry t : timers) {
			long left = t.endAt - now;
			int color = Timers.colorOf(t);
			String clock = Fmt.clock(left);
			g.fill(x, ty - 2, x + 2, ty + 13, color);
			draw(g, font, t.name, x + 6, ty, 0xFFDDE1F5);
			draw(g, font, clock, x + boxW - 5 - font.width(b(clock)), ty, Colors.timeColor(color, left));
			double done = t.length > 0 ? 1 - Math.max(0, left) / (double) t.length : 1;
			Colors.bar(g, x + 6, ty + 10, boxW - 11, 3, done, color, left <= 60_000);
			ty += 17;
		}
	}

	private static void profit(GuiGraphics g, Font font, Config c) {
		double net = Profit.net();
		String v = Fmt.signed(net);
		int boxW = font.width(b("AH today")) + 14 + font.width(b(v)) + 14;
		int h = 15;
		int[] p = place(g, c.profitHudSpot, boxW, h);
		int x = p[0], y = p[1];
		if (c.profitHudSpot == c.timerHudSpot && c.hud && c.hudTimers && !c.timers.isEmpty()) {
			y += 4 + Math.min(4, c.timers.size()) * 17 + 3; // sit under the timer box
		}
		g.fill(x, y, x + boxW, y + h, 0x90000000);
		g.fill(x, y, x + 2, y + h, 0xFFA97CFF);
		draw(g, font, "AH today", x + 6, y + 4, 0xFFB8BEE0);
		draw(g, font, v, x + boxW - 5 - font.width(b(v)), y + 4, net >= 0 ? 0xFF3DDC97 : 0xFFFF6B8A);
	}
}
