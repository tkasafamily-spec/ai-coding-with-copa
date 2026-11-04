package com.smpterminal.screen;

import com.smpterminal.Config;
import com.smpterminal.Fmt;
import com.smpterminal.Profit;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.screens.Screen;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/** AH profit tracker: today's sales, buys and profit, plus the last 7 days. */
public class ProfitScreen extends BaseScreen {
	private String amountText = "", itemText = "", error = "";
	private boolean confirmReset;

	public ProfitScreen(Screen parent) {
		super("AH Profit Tracker", parent);
	}

	@Override
	protected void build() {
		Config.ProfitData p = Profit.data();
		int y = bottom();
		int x = px + 10;
		EditBox amount = field(x, y, 70, "Amount", amountText);
		amount.setResponder(s -> { amountText = s; error = ""; });
		EditBox item = field(x + 74, y, Math.max(50, pw - 20 - 74 - 4 - 56 * 2 - 8 - 70), "Item (optional)", itemText);
		item.setResponder(s -> itemText = s);
		int bx = px + pw - 10 - 56 * 2 - 4 - 70;
		button("+ Sale", "Add a sale by hand", bx, y, 56, b -> addManual(true));
		button("+ Buy", "Add a purchase by hand", bx + 60, y, 56, b -> addManual(false));
		Button reset = button(confirmReset ? "Sure?" : "Reset", "Start today's count from zero (saved to history)", bx + 120, y, 70, b -> {
			if (confirmReset) {
				Profit.resetNow();
				confirmReset = false;
			} else {
				confirmReset = true;
			}
			rebuildWidgets();
		});
		reset.active = p.saleCount > 0 || p.buyCount > 0 || confirmReset;
		button("Resets " + String.format("%02d:00", p.resetHour), "Change the time the day resets", px + pw - 128, py + 7, 68, b -> {
			Config.C.profit.resetHour = (Config.C.profit.resetHour + 1) % 24;
			Config.save();
			rebuildWidgets();
		});
	}

	private void addManual(boolean sale) {
		double v = Fmt.parseMoney(amountText);
		if (!(v > 0)) {
			error = "Type an amount like 250k or 1.5m.";
			return;
		}
		Profit.add(sale, itemText, v);
		amountText = "";
		itemText = "";
		rebuildWidgets();
	}

	@Override
	protected void draw(GuiGraphics g, int mouseX, int mouseY) {
		Config.ProfitData p = Profit.data();
		double net = p.sales - p.buys;
		int x = px + 10, y = py + 32;
		text(g, "Today", x, y, MUTED);
		text(g, Fmt.signed(net), x + 36, y, net >= 0 ? UP : DOWN);
		textRight(g, "Resets in " + Fmt.clock(Profit.msUntilReset()), px + pw - 10, y, MUTED);
		y += 13;
		text(g, "Sold " + p.saleCount + " for " + Fmt.money(p.sales) + "   ·   Bought " + p.buyCount + " for " + Fmt.money(p.buys), x, y, TEXT);
		y += 13;
		Double bal = Profit.balanceChange();
		text(g, bal == null ? "Balance change: waiting for the sidebar Money line" : "Balance change today: " + Fmt.signed(bal), x, y, bal == null ? MUTED : (bal >= 0 ? UP : DOWN));
		y += 16;

		// last 7 days + today as bars
		List<Config.DayTotal> days = new ArrayList<>(p.history);
		java.util.Collections.reverse(days);
		Config.DayTotal today = new Config.DayTotal();
		today.day = "Today";
		today.net = net;
		days.add(today);
		while (days.size() > 8) days.remove(0);
		double max = 1;
		for (Config.DayTotal d : days) max = Math.max(max, Math.abs(d.net));
		int chartH = 44, mid = y + chartH / 2, cw = pw - 20;
		g.fill(x, mid, x + cw, mid + 1, LINE);
		int slot = cw / 8;
		for (int i = 0; i < days.size(); i++) {
			Config.DayTotal d = days.get(i);
			int bh = (int) Math.round(Math.abs(d.net) / max * (chartH / 2 - 2));
			int bx = x + i * slot + slot / 4, bw = slot / 2;
			if (d.net >= 0) g.fill(bx, mid - bh, bx + bw, mid, UP);
			else g.fill(bx, mid + 1, bx + bw, mid + 1 + bh, DOWN);
			String lab = d.day.equals("Today") ? "Today" : d.day.substring(5);
			g.drawString(font, lab, bx + bw / 2 - font.width(lab) / 2, y + chartH + 2, MUTED);
		}
		y += chartH + 16;
		line(g, y);
		y += 6;

		// recent transactions
		if (p.txns.isEmpty()) {
			text(g, "No sales or buys yet today. They're picked up from chat,", x, y, MUTED);
			text(g, "or add one by hand below.", x, y + 11, MUTED);
		} else {
			SimpleDateFormat hm = new SimpleDateFormat("HH:mm");
			int rows = Math.max(1, (bottom() - 4 - y) / 11);
			for (int i = 0; i < Math.min(rows, p.txns.size()); i++) {
				Config.Txn t = p.txns.get(i);
				int ty = y + i * 11;
				text(g, hm.format(new Date(t.at)), x, ty, MUTED);
				text(g, fit((t.sale ? "Sold " : "Bought ") + t.item, pw - 130), x + 34, ty, TEXT);
				textRight(g, (t.sale ? "+" : "-") + Fmt.money(t.amount).replace("-", ""), px + pw - 10, ty, t.sale ? UP : DOWN);
			}
		}
		if (!error.isEmpty()) text(g, error, x, bottom() - 11, DOWN);
	}
}
