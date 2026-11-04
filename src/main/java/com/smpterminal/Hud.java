package com.smpterminal;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;

import java.util.ArrayList;
import java.util.List;

/** Small on-screen box with running timers and today's AH profit. */
public final class Hud {
	private Hud() {}

	public static final String[] CORNERS = {"Top left", "Top right", "Left middle", "Right middle"};

	public static void render(GuiGraphics g) {
		Minecraft mc = Minecraft.getInstance();
		Config c = Config.C;
		if (!c.hud || mc.player == null || mc.options.hideGui) return;
		List<String> left = new ArrayList<>();
		List<String> right = new ArrayList<>();
		List<Integer> colors = new ArrayList<>();
		long now = System.currentTimeMillis();
		if (c.hudTimers) {
			int shown = 0;
			for (Config.TimerEntry t : c.timers) {
				if (shown++ >= 4) break;
				long left0 = t.endAt - now;
				left.add(t.name);
				right.add(Fmt.clock(left0));
				colors.add(left0 < 60_000 ? 0xFFFFB347 : 0xFFE8EAF8);
			}
		}
		if (c.hudProfit) {
			double net = Profit.net();
			left.add("AH today");
			right.add(Fmt.signed(net));
			colors.add(net >= 0 ? 0xFF3DDC97 : 0xFFFF6B8A);
		}
		if (left.isEmpty()) return;

		Font font = mc.font;
		int w = 0;
		for (int i = 0; i < left.size(); i++) w = Math.max(w, font.width(left.get(i)) + 12 + font.width(right.get(i)));
		int h = left.size() * 11 + 6;
		int boxW = w + 10;
		int sw = g.guiWidth(), sh = g.guiHeight();
		int x = (c.hudCorner == 1 || c.hudCorner == 3) ? sw - boxW - 4 : 4;
		int y = c.hudCorner >= 2 ? (sh - h) / 2 : 4;
		g.fill(x, y, x + boxW, y + h, 0x90000000);
		g.fill(x, y, x + 2, y + h, 0xFF7A8BFF);
		for (int i = 0; i < left.size(); i++) {
			int ty = y + 4 + i * 11;
			g.drawString(font, left.get(i), x + 6, ty, 0xFFB8BEE0);
			g.drawString(font, right.get(i), x + boxW - 4 - font.width(right.get(i)), ty, colors.get(i));
		}
	}
}
