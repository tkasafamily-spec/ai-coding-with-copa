package com.smpterminal;

import net.minecraft.client.gui.GuiGraphics;

/** Timer colors and small drawing helpers for smooth, colorful bars. */
public final class Colors {
	private Colors() {}

	/** Blue, violet, mint, orange, pink, cyan. */
	public static final int[] PALETTE = {0xFF7A8BFF, 0xFFA97CFF, 0xFF3DDC97, 0xFFFFB347, 0xFFFF6B8A, 0xFF4FD1E8};
	public static final int URGENT = 0xFFFF5470;

	public static int palette(int i) {
		return PALETTE[Math.floorMod(i, PALETTE.length)];
	}

	public static int mix(int a, int b, float t) {
		t = Math.max(0, Math.min(1, t));
		int aa = a >>> 24, ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
		int ba = b >>> 24, br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
		return (Math.round(aa + (ba - aa) * t) << 24) | (Math.round(ar + (br - ar) * t) << 16)
			| (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
	}

	public static int alpha(int color, float a) {
		return (Math.round(Math.max(0, Math.min(1, a)) * 255) << 24) | (color & 0xFFFFFF);
	}

	/** 0..1 wave, for gentle pulsing. */
	public static float pulse(float speed) {
		return (float) (0.5 + 0.5 * Math.sin(System.currentTimeMillis() / 1000.0 * speed * Math.PI * 2));
	}

	/** Color for a countdown: the timer's own color, warming to red-pink in the last minute. */
	public static int timeColor(int base, long msLeft) {
		if (msLeft > 60_000) return base;
		return mix(0xFFFFB347, URGENT, pulse(1.2f));
	}

	/**
	 * Rounded-looking progress bar with a soft glow and a left-to-right gradient.
	 * progress is 0..1 and is computed every frame, so it moves smoothly.
	 */
	public static void bar(GuiGraphics g, int x, int y, int w, int h, double progress, int color, boolean urgent) {
		// rounded track
		g.fill(x + 1, y, x + w - 1, y + h, 0x22FFFFFF);
		g.fill(x, y + 1, x + w, y + h - 1, 0x22FFFFFF);
		int fw = (int) Math.round(w * Math.max(0, Math.min(1, progress)));
		if (fw <= 0) return;
		int start = color, end = mix(color, 0xFFFFFFFF, 0.45f);
		if (urgent) {
			float p = pulse(1.2f);
			start = mix(color, URGENT, p);
			end = mix(0xFFFFB347, 0xFFFFFFFF, 0.3f);
		}
		// glow
		g.fill(x, y - 1, x + fw, y + h + 1, alpha(start, 0.22f));
		// gradient body, drawn in thin slices
		int step = 2;
		for (int i = 0; i < fw; i += step) {
			int c = mix(start, end, fw <= 1 ? 1 : i / (float) (fw - 1));
			int x1 = x + i, x2 = Math.min(x + fw, x1 + step);
			boolean edge = i == 0 || x2 == x + fw;
			g.fill(x1, y + (edge ? 1 : 0), x2, y + h - (edge ? 1 : 0), c);
		}
	}
}
