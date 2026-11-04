package com.smpterminal.screen;

import com.smpterminal.ChatAlerts;
import com.smpterminal.Config;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.screens.Screen;

import java.util.List;
import java.util.Locale;

/** Keywords that make a ping when they show up in chat. */
public class AlertsScreen extends BaseScreen {
	private String word = "";
	private int listTop;

	public AlertsScreen(Screen parent) {
		super("Chat Alerts", parent);
	}

	@Override
	protected void build() {
		Config c = Config.C;
		int x = px + 10, y = py + 32;
		EditBox box = field(x, y, pw - 20 - 50, "Keyword, e.g. your name or an item", word);
		box.setResponder(s -> word = s);
		setInitialFocus(box);
		button("Add", px + pw - 56, y, 46, b -> add());
		y += 24;
		button("Alerts: " + (c.alertsOn ? "On" : "Off"), x, y, 90, b -> { c.alertsOn = !c.alertsOn; Config.save(); rebuildWidgets(); });
		button("Sound: " + (c.alertSound ? "On" : "Off"), x + 94, y, 90, b -> { c.alertSound = !c.alertSound; Config.save(); rebuildWidgets(); });
		listTop = y + 30;
		List<String> words = c.alertWords;
		int per = perPage();
		int start = pager(words.size(), per, bottom());
		for (int i = start; i < Math.min(words.size(), start + per); i++) {
			String w = words.get(i);
			button("×", "Remove " + w, x + 150, listTop + (i - start) * 20 - 5, 20, b -> { c.alertWords.remove(w); Config.save(); rebuildWidgets(); });
		}
	}

	private void add() {
		String w = word.trim().toLowerCase(Locale.ROOT);
		if (!w.isEmpty() && !Config.C.alertWords.contains(w)) {
			Config.C.alertWords.add(w);
			Config.save();
		}
		word = "";
		rebuildWidgets();
	}

	private int perPage() {
		return Math.max(1, (bottom() - 4 - listTop) / 20);
	}

	@Override
	protected void draw(GuiGraphics g, int mouseX, int mouseY) {
		int x = px + 10;
		text(g, "Keywords", x, listTop - 12, MUTED);
		List<String> words = Config.C.alertWords;
		if (words.isEmpty()) text(g, "No keywords yet.", x, listTop, MUTED);
		int per = perPage(), start = page * per;
		for (int i = start; i < Math.min(words.size(), start + per); i++) {
			text(g, fit(words.get(i), 140), x, listTop + (i - start) * 20, ACCENT);
		}
		int rx = x + 182;
		text(g, "Recent matches", rx, listTop - 12, MUTED);
		if (ChatAlerts.RECENT.isEmpty()) {
			text(g, "Nothing yet.", rx, listTop, MUTED);
		} else {
			int y = listTop;
			for (String m : ChatAlerts.RECENT) {
				if (y > bottom() - 6) break;
				text(g, fit(m, px + pw - 10 - rx), rx, y, TEXT);
				y += 12;
			}
		}
	}
}
