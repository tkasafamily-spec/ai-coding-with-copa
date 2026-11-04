package com.smpterminal.screen;

import com.smpterminal.Fmt;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.Screen;

import java.util.Locale;

/** Buy with a buy order, sell on the auction house: what do you make? */
public class FlipScreen extends BaseScreen {
	private static String buyText = "", sellText = "", qtyText = "64";

	public FlipScreen(Screen parent) {
		super("Flip Calculator", parent);
	}

	@Override
	protected void build() {
		int x = px + 10, w = (pw - 20 - 12) / 3, y = py + 44;
		field(x, y, w, "e.g. 22k", buyText).setResponder(s -> buyText = s);
		field(x + w + 6, y, w, "e.g. 25k", sellText).setResponder(s -> sellText = s);
		field(x + (w + 6) * 2, y, w, "64", qtyText).setResponder(s -> qtyText = s);
	}

	@Override
	protected void draw(GuiGraphics g, int mouseX, int mouseY) {
		int x = px + 10, w = (pw - 20 - 12) / 3;
		String[] labels = {"Buy price", "Sell price", "Amount"};
		for (int i = 0; i < 3; i++) text(g, labels[i], x + (w + 6) * i, py + 33, MUTED);
		double buy = Fmt.parseMoney(buyText), sell = Fmt.parseMoney(sellText), qty = Fmt.parseMoney(qtyText);
		if (Double.isNaN(qty) || qty <= 0) qty = 1;
		int y = py + 80;
		if (Double.isNaN(buy) || Double.isNaN(sell)) {
			text(g, "Type a buy and sell price. You can write 22k, 1.5m and so on.", x, y, MUTED);
			return;
		}
		double cost = buy * qty, revenue = sell * qty, profit = revenue - cost, perItem = sell - buy;
		String[][] rows = {
			{"Cost", Fmt.money(cost)},
			{"You get", Fmt.money(revenue)},
			{"Profit", Fmt.signed(profit)},
			{"Profit per item", Fmt.signed(perItem)},
			{"Profit per 64", Fmt.signed(perItem * 64)},
			{"Return", cost > 0 ? String.format(Locale.ROOT, "%+.1f%%", profit / cost * 100) : "-"}
		};
		for (String[] r : rows) {
			boolean money = r[0].startsWith("Profit") || r[0].equals("Return");
			text(g, r[0], x, y, r[0].equals("Profit") ? TEXT : MUTED);
			textRight(g, r[1], px + pw - 10, y, money ? (profit >= 0 ? UP : DOWN) : TEXT);
			y += 14;
		}
	}
}
