package com.smpterminal.screen;

import com.smpterminal.Config;
import com.smpterminal.Fmt;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.screens.Screen;

/** Buy with a buy order, sell on the auction house: what do you make? */
public class FlipScreen extends BaseScreen {
	private static String buyText = "", sellText = "", qtyText = "64";
	private EditBox fee;

	public FlipScreen(Screen parent) {
		super("Flip Calculator", parent);
	}

	@Override
	protected void build() {
		int x = px + 10, w = (pw - 20 - 18) / 4, y = py + 44;
		field(x, y, w, "e.g. 22k", buyText).setResponder(s -> buyText = s);
		field(x + w + 6, y, w, "e.g. 25k", sellText).setResponder(s -> sellText = s);
		field(x + (w + 6) * 2, y, w, "64", qtyText).setResponder(s -> qtyText = s);
		fee = field(x + (w + 6) * 3, y, w, "0", Config.C.fee == 0 ? "" : String.valueOf(Config.C.fee));
		fee.setResponder(s -> {
			double v = Fmt.parseMoney(s);
			Config.C.fee = Double.isNaN(v) ? 0 : Math.max(0, Math.min(90, v));
			Config.save();
		});
	}

	@Override
	protected void draw(GuiGraphics g, int mouseX, int mouseY) {
		int x = px + 10, w = (pw - 20 - 18) / 4;
		String[] labels = {"Buy price", "Sell price", "Amount", "AH fee %"};
		for (int i = 0; i < 4; i++) text(g, labels[i], x + (w + 6) * i, py + 33, MUTED);
		double buy = Fmt.parseMoney(buyText), sell = Fmt.parseMoney(sellText), qty = Fmt.parseMoney(qtyText);
		if (Double.isNaN(qty) || qty <= 0) qty = 1;
		int y = py + 80;
		if (Double.isNaN(buy) || Double.isNaN(sell)) {
			text(g, "Type a buy and sell price. You can write 22k, 1.5m and so on.", x, y, MUTED);
			return;
		}
		double feeRate = Config.C.fee / 100.0;
		double cost = buy * qty, revenue = sell * (1 - feeRate) * qty, profit = revenue - cost;
		double perItem = sell * (1 - feeRate) - buy;
		String[][] rows = {
			{"Cost", Fmt.full(cost)},
			{"You get" + (feeRate > 0 ? " (after fee)" : ""), Fmt.full(revenue)},
			{"Profit", (profit >= 0 ? "+" : "") + Fmt.full(profit)},
			{"Profit per item", (perItem >= 0 ? "+" : "") + Fmt.full(perItem)},
			{"Profit per 64", (perItem >= 0 ? "+" : "") + Fmt.full(perItem * 64)},
			{"Return", cost > 0 ? String.format("%+.1f%%", profit / cost * 100) : "-"},
			{"Break-even sell price", Fmt.full(feeRate < 1 ? buy / (1 - feeRate) : 0)}
		};
		for (String[] r : rows) {
			boolean money = r[0].startsWith("Profit") || r[0].equals("Return");
			text(g, r[0], x, y, r[0].equals("Profit") ? TEXT : MUTED);
			textRight(g, r[1], px + pw - 10, y, money ? (profit >= 0 ? UP : DOWN) : TEXT);
			y += 14;
		}
	}
}
