package com.smpterminal.screen;

import com.smpterminal.Config;
import com.smpterminal.Fmt;
import com.smpterminal.Timers;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.screens.Screen;

import java.util.ArrayList;
import java.util.List;

/** Auction timer: type a custom time or click a saved time, then Start. */
public class TimerScreen extends BaseScreen {
	private String timeText = "", nameText = "", error = "";
	private boolean editing;
	private int listTop;

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
		List<Long> presets = Config.C.presets;
		int cellW = 56, cols = Math.max(1, (pw - 20 + 4) / (cellW + 4));
		for (int i = 0; i < presets.size() && i < cols * 2; i++) {
			long ms = presets.get(i);
			int cx = x + (i % cols) * (cellW + 4), cy = y + (i / cols) * 24;
			if (editing) {
				button("× " + Fmt.label(ms), cx, cy, cellW, b -> { Config.C.presets.remove(Long.valueOf(ms)); Config.save(); rebuildWidgets(); });
			} else {
				button(Fmt.label(ms), "Start " + Fmt.label(ms) + (nameText.isBlank() ? "" : " · " + nameText.trim()), cx, cy, cellW, b -> { Timers.start(nameText, ms); rebuildWidgets(); });
			}
		}
		int rows = presets.isEmpty() ? 1 : Math.min(2, (presets.size() + cols - 1) / cols);
		y += rows * 24 + 6;

		// running timers
		listTop = y + 12;
		List<Config.TimerEntry> timers = new ArrayList<>(Config.C.timers);
		int per = Math.max(1, (bottom() - listTop) / 22);
		int start = pager(timers.size(), per, bottom() + 2);
		for (int i = start; i < Math.min(timers.size(), start + per); i++) {
			Config.TimerEntry t = timers.get(i);
			button("Stop", px + pw - 54, listTop + (i - start) * 22, 44, b -> { Timers.stop(t); rebuildWidgets(); });
		}
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
		text(g, "Running", px + 10, listTop - 12, MUTED);
		List<Config.TimerEntry> timers = Config.C.timers;
		if (timers.isEmpty()) {
			text(g, "No timers running.", px + 10, listTop + 6, MUTED);
			return;
		}
		int per = Math.max(1, (bottom() - listTop) / 22);
		int start = page * per;
		long now = System.currentTimeMillis();
		for (int i = start; i < Math.min(timers.size(), start + per); i++) {
			Config.TimerEntry t = timers.get(i);
			int y = listTop + (i - start) * 22 + 6;
			long left = t.endAt - now;
			text(g, fit(t.name, pw - 170), px + 10, y, TEXT);
			textRight(g, Fmt.clock(left), px + pw - 62, y, left < 60_000 ? GOLD : UP);
			// progress bar
			double done = t.length > 0 ? 1 - Math.max(0, left) / (double) t.length : 1;
			int bx = px + 10, bw = pw - 76, by = y + 10;
			g.fill(bx, by, bx + bw, by + 2, LINE);
			g.fill(bx, by, bx + (int) (bw * Math.min(1, done)), by + 2, ACCENT);
		}
	}
}
