package com.smpterminal.screen;

import com.smpterminal.Colors;
import com.smpterminal.Config;
import com.smpterminal.Fmt;
import com.smpterminal.Timers;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.screens.Screen;

import java.util.ArrayList;
import java.util.List;

/** Auction timer: type a custom time or click a saved time, then Start. Colorful, smooth bars. */
public class TimerScreen extends BaseScreen {
	private String timeText = "", nameText = "", error = "";
	private boolean editing;
	private int listTop;
	private final List<Button> presetButtons = new ArrayList<>();
	private final List<Integer> presetColors = new ArrayList<>();
	private static final int ROW = 26;

	public TimerScreen(Screen parent) {
		super("Auction Timer", parent);
	}

	@Override
	protected void build() {
		int x = px + 10, y = py + 40;
		int timeW = 74, btnW = 44;
		int nameW = Math.max(60, pw - 20 - timeW - btnW * 2 - 18);
		EditBox time = field(x, y, timeW, "1h30m", timeText);
		time.setResponder(s -> { timeText = s; error = ""; });
		EditBox name = field(x + timeW + 6, y, nameW, "Name (optional)", nameText);
		name.setResponder(s -> nameText = s);
		button("Start", "Start a timer with this time", x + timeW + nameW + 12, y, btnW, b -> startCustom());
		button("Save", "Save this time to your list", x + timeW + nameW + btnW + 18, y, btnW, b -> saveCustom());

		// saved times
		y += 38;
		button(editing ? "Done" : "Edit", editing ? "Stop removing" : "Remove saved times", px + pw - 54, y - 4, 44, b -> { editing = !editing; rebuildWidgets(); });
		y += 14;
		presetButtons.clear();
		presetColors.clear();
		List<Long> presets = Config.C.presets;
		int cellW = 56, cols = Math.max(1, (pw - 20 + 4) / (cellW + 4));
		for (int i = 0; i < presets.size() && i < cols * 2; i++) {
			long ms = presets.get(i);
			int color = Colors.palette(i);
			int cx = x + (i % cols) * (cellW + 4), cy = y + (i / cols) * 24;
			Button b;
			if (editing) {
				b = button("× " + Fmt.label(ms), cx, cy, cellW, btn -> { Config.C.presets.remove(Long.valueOf(ms)); Config.save(); rebuildWidgets(); });
			} else {
				b = button(Fmt.label(ms), "Start " + Fmt.label(ms) + (nameText.isBlank() ? "" : " · " + nameText.trim()), cx, cy, cellW, btn -> { Timers.start(nameText, ms, color); rebuildWidgets(); });
			}
			presetButtons.add(b);
			presetColors.add(color);
		}
		int rows = presets.isEmpty() ? 1 : Math.min(2, (presets.size() + cols - 1) / cols);
		y += rows * 24 + 6;

		// running timers
		listTop = y + 14;
		List<Config.TimerEntry> timers = new ArrayList<>(Config.C.timers);
		int per = perPage();
		int start = pager(timers.size(), per, bottom() + 2);
		for (int i = start; i < Math.min(timers.size(), start + per); i++) {
			Config.TimerEntry t = timers.get(i);
			button("Stop", px + pw - 54, listTop + (i - start) * ROW, 44, b -> { Timers.stop(t); rebuildWidgets(); });
		}
	}

	private int perPage() {
		return Math.max(1, (bottom() - listTop) / ROW);
	}

	private void startCustom() {
		long ms = Fmt.parseDuration(timeText);
		if (ms <= 0) {
			error = "Type a time like 1h30m, 45m, 2d or 90 (minutes).";
			return;
		}
		Timers.start(nameText, ms);
		rebuildWidgets();
	}

	private void saveCustom() {
		long ms = Fmt.parseDuration(timeText);
		if (ms <= 0) {
			error = "Type a time first, like 1h30m.";
			return;
		}
		if (!Config.C.presets.contains(ms)) {
			Config.C.presets.add(ms);
			Config.C.presets.sort(Long::compare);
			Config.save();
		}
		rebuildWidgets();
	}

	@Override
	protected void draw(GuiGraphics g, int mouseX, int mouseY) {
		text(g, "Custom time", px + 10, py + 29, MUTED);
		if (!error.isEmpty()) text(g, error, px + 10, py + 63, DOWN);
		text(g, editing ? "Click a time to remove it" : "Saved times (click to start)", px + 10, py + 80, MUTED);

		// colored strip on each saved-time button
		for (int i = 0; i < presetButtons.size(); i++) {
			Button b = presetButtons.get(i);
			int c = presetColors.get(i);
			boolean hover = b.isHovered();
			g.fill(b.getX() + 2, b.getY() + b.getHeight() - 4, b.getX() + b.getWidth() - 2, b.getY() + b.getHeight() - 2, hover ? Colors.mix(c, 0xFFFFFFFF, 0.35f) : c);
		}

		text(g, "Running", px + 10, listTop - 13, MUTED);
		List<Config.TimerEntry> timers = Config.C.timers;
		if (timers.isEmpty()) {
			text(g, "No timers running. Pick a saved time or type one above.", px + 10, listTop + 6, MUTED);
			return;
		}
		int per = perPage(), start = page * per;
		long now = System.currentTimeMillis();
		for (int i = start; i < Math.min(timers.size(), start + per); i++) {
			Config.TimerEntry t = timers.get(i);
			int rowY = listTop + (i - start) * ROW;
			int y = rowY + 2;
			long left = t.endAt - now;
			int color = Timers.colorOf(t);
			boolean urgent = left <= 60_000;
			// card behind the row
			g.fill(px + 8, rowY - 2, px + pw - 58, rowY + ROW - 4, Colors.alpha(color, 0.10f));
			g.fill(px + 8, rowY - 2, px + 10, rowY + ROW - 4, color);
			text(g, fit(t.name, pw - 190), px + 15, y, TEXT);
			String clock = Fmt.clock(left);
			textRight(g, clock, px + pw - 64, y, Colors.timeColor(color, left));
			double done = t.length > 0 ? 1 - Math.max(0, left) / (double) t.length : 1;
			int pct = (int) Math.floor(Math.min(1, done) * 100);
			textRight(g, pct + "%", px + pw - 70 - font.width(clock) - 6, y, MUTED);
			Colors.bar(g, px + 15, y + 11, pw - 15 - 70, 5, done, color, urgent);
		}
	}
}
