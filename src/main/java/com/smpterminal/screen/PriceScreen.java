package com.smpterminal.screen;

import com.smpterminal.Config;
import com.smpterminal.Fmt;
import com.smpterminal.Prices;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.screens.Screen;

import java.util.ArrayList;
import java.util.List;

/** Search item prices and set your own. Your prices also show in item tooltips. */
public class PriceScreen extends BaseScreen {
	private String query = "", priceText = "", error = "";
	private Prices.Entry selected;
	private int listTop;
	private List<Prices.Entry> list = new ArrayList<>();
	private final List<Button> rowButtons = new ArrayList<>();
	private Button prev, next;

	public PriceScreen(Screen parent) {
		super("Price Check", parent);
	}

	@Override
	protected void build() {
		list = Prices.search(query, 300);
		EditBox search = field(px + 10, py + 32, pw - 20, "Search items", query);
		search.setResponder(s -> { query = s; page = 0; list = Prices.search(query, 300); });
		setInitialFocus(search);
		listTop = py + 60;
		rowButtons.clear();
		for (int r = 0; r < perPage(); r++) {
			final int row = r;
			rowButtons.add(button("Set", px + pw - 46, listTop + r * 16 - 5, 36, b -> select(row)));
		}
		prev = button("<", px + 10, bottom(), 20, b -> page--);
		next = button(">", px + 34, bottom(), 20, b -> page++);
		if (selected != null) {
			int x = px + 60;
			EditBox price = field(x, bottom(), 76, "Price", priceText);
			price.setResponder(s -> { priceText = s; error = ""; });
			button("Save", x + 80, bottom(), 42, b -> {
				double v = Fmt.parseMoney(priceText);
				if (!(v > 0)) { error = "Type a price like 25k or 1.2m"; return; }
				Config.C.priceOverrides.put(selected.id(), v);
				Config.save();
				selected = null;
				rebuildWidgets();
			});
			button("Default", "Use the built-in price again", x + 126, bottom(), 52, b -> {
				Config.C.priceOverrides.remove(selected.id());
				Config.save();
				selected = null;
				rebuildWidgets();
			});
		}
	}

	private void select(int row) {
		int i = page * perPage() + row;
		if (i >= list.size()) return;
		selected = list.get(i);
		Double p = Prices.of(selected.id());
		priceText = p == null ? "" : String.valueOf(Math.round(p));
		rebuildWidgets();
	}

	private int perPage() {
		return Math.max(1, (bottom() - 8 - listTop) / 16);
	}

	@Override
	protected void draw(GuiGraphics g, int mouseX, int mouseY) {
		int per = perPage();
		int pages = pageCount(list.size(), per);
		page = Math.max(0, Math.min(page, pages - 1));
		prev.visible = next.visible = pages > 1;
		prev.active = page > 0;
		next.active = page < pages - 1;
		int start = page * per;
		textRight(g, "each", px + pw - 120, listTop - 11, MUTED);
		textRight(g, "x64", px + pw - 54, listTop - 11, MUTED);
		if (list.isEmpty()) text(g, "No items match that name.", px + 10, listTop, MUTED);
		for (int r = 0; r < per; r++) {
			int i = start + r;
			rowButtons.get(r).visible = i < list.size();
			if (i >= list.size()) continue;
			Prices.Entry e = list.get(i);
			int y = listTop + r * 16;
			Double p = Prices.of(e.id());
			boolean own = Prices.isCustom(e.id());
			boolean sel = selected != null && selected.id().equals(e.id());
			text(g, fit(e.name(), pw - 190), px + 10, y, sel ? ACCENT : own ? GOLD : TEXT);
			textRight(g, p == null ? "-" : Fmt.money(p), px + pw - 120, y, TEXT);
			textRight(g, p == null ? "-" : Fmt.money(p * 64), px + pw - 54, y, MUTED);
		}
		int noteX = pages > 1 ? px + 60 : px + 10;
		if (selected != null) {
			if (!error.isEmpty()) text(g, error, px + 10, bottom() - 11, DOWN);
			else text(g, "Your price for " + selected.name() + ":", px + 10, bottom() - 11, ACCENT);
		} else {
			text(g, fit("Gold = your own price. Estimates until the API is connected.", px + pw - 10 - noteX), noteX, bottom() + 6, MUTED);
		}
	}
}
