package com.smpterminal.screen;

import com.smpterminal.Colors;
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

		// last 7 days + today as a line chart
		List<Config.DayTotal> days = new ArrayList<>(p.history);
		java.util.Collections.reverse(days);
		Config.DayTotal today = new Config.DayTotal();
		today.day = "Today";
		today.net = net;
		days.add(today);
		while (days.size() > 8) days.remove(0);
		int chartH = 58;
		lineChart(g, x, y, pw - 20, chartH, days);
		y += chartH + 14;
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

	/** Line chart of daily profit: green fill above $0, red below, a dot per day. */
	private void lineChart(GuiGraphics g, int x, int y, int w, int h, List<Config.DayTotal> days) {
		double max = 1, min = 0;
		for (Config.DayTotal d : days) { max = Math.max(max, d.net); min = Math.min(min, d.net); }
		double pad = (max - min) * 0.12;
		max += pad;
		if (min < 0) min -= pad;
		final double hi = max, lo = min;
		int n = days.size();
		int plotH = h - 12;
		java.util.function.DoubleToIntFunction yOf = v -> y + (int) Math.round((hi - v) / (hi - lo) * plotH);
		int zero = yOf.applyAsInt(0);
		int[] px0 = new int[n], py0 = new int[n];
		for (int i = 0; i < n; i++) {
			px0[i] = n == 1 ? x + w / 2 : x + 6 + (int) Math.round(i * (w - 12) / (double) (n - 1));
			py0[i] = yOf.applyAsInt(days.get(i).net);
		}
		// grid + zero line
		g.fill(x, y, x + w, y + 1, 0x14FFFFFF);
		g.fill(x, y + plotH / 2, x + w, y + plotH / 2 + 1, 0x10FFFFFF);
		g.fill(x, zero, x + w, zero + 1, LINE);
		// area under the line
		for (int i = 0; i + 1 < n; i++) {
			for (int cx = px0[i]; cx < px0[i + 1]; cx++) {
				double t = (cx - px0[i]) / (double) (px0[i + 1] - px0[i]);
				int cy = (int) Math.round(py0[i] + (py0[i + 1] - py0[i]) * t);
				if (cy < zero) g.fill(cx, cy, cx + 1, zero, 0x303DDC97);
				else if (cy > zero) g.fill(cx, zero + 1, cx + 1, cy, 0x30FF6B8A);
			}
		}
		// the line (2px), blue to violet
		for (int i = 0; i + 1 < n; i++) {
			int steps = Math.max(Math.abs(px0[i + 1] - px0[i]), Math.abs(py0[i + 1] - py0[i]));
			for (int k = 0; k <= steps; k++) {
				double t = steps == 0 ? 0 : k / (double) steps;
				int cx = (int) Math.round(px0[i] + (px0[i + 1] - px0[i]) * t);
				int cy = (int) Math.round(py0[i] + (py0[i + 1] - py0[i]) * t);
				int col = Colors.mix(ACCENT, ACCENT2, (i + (float) t) / Math.max(1, n - 1));
				g.fill(cx - 1, cy - 1, cx + 1, cy + 1, col);
			}
		}
		// dots + labels
		for (int i = 0; i < n; i++) {
			Config.DayTotal d = days.get(i);
			boolean last = i == n - 1;
			int r = last ? 3 : 2;
			int col = d.net >= 0 ? UP : DOWN;
			g.fill(px0[i] - r - 1, py0[i] - r - 1, px0[i] + r + 1, py0[i] + r + 1, PANEL | 0xFF000000);
			g.fill(px0[i] - r, py0[i] - r, px0[i] + r, py0[i] + r, col);
			String lab = d.day.equals("Today") ? "Today" : d.day.substring(5);
			int lw = width(lab, last ? TEXT : MUTED);
			int lx = Math.max(x, Math.min(x + w - lw, px0[i] - lw / 2));
			text(g, lab, lx, y + h - 8, last ? TEXT : MUTED);
		}
		// value tag on today
		int li = n - 1;
		String v = Fmt.signed(days.get(li).net);
		int vw = width(v, TEXT) + 6;
		int tx = Math.max(x, Math.min(x + w - vw, px0[li] - vw - 6));
		int ty = Math.max(y, Math.min(y + plotH - 10, py0[li] - 5));
		int tagCol = days.get(li).net >= 0 ? UP : DOWN;
		g.fill(tx, ty, tx + vw, ty + 11, Colors.alpha(tagCol, 0.25f));
		text(g, v, tx + 3, ty + 2, tagCol);
	}
}
