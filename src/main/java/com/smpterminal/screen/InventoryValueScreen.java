package com.smpterminal.screen;

import com.smpterminal.Fmt;
import com.smpterminal.Prices;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.world.entity.player.Inventory;
import net.minecraft.world.item.ItemStack;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Adds up what everything in your inventory (armor and offhand too) is worth. */
public class InventoryValueScreen extends BaseScreen {
	private record Row(String id, String name, int count, Double each) {
		double value() { return each == null ? 0 : each * count; }
	}

	private final List<Row> rows = new ArrayList<>();
	private double total;
	private int unknown;
	private int listTop;

	public InventoryValueScreen(Screen parent) {
		super("Inventory Value", parent);
	}

	private void scan() {
		rows.clear();
		total = 0;
		unknown = 0;
		if (minecraft == null || minecraft.player == null) return;
		Inventory inv = minecraft.player.getInventory();
		Map<String, int[]> counts = new LinkedHashMap<>();
		Map<String, ItemStack> samples = new LinkedHashMap<>();
		for (int i = 0; i < inv.getContainerSize(); i++) {
			ItemStack s = inv.getItem(i);
			if (s.isEmpty()) continue;
			String id = Prices.id(s);
			counts.computeIfAbsent(id, k -> new int[1])[0] += s.getCount();
			samples.putIfAbsent(id, s);
		}
		for (Map.Entry<String, int[]> e : counts.entrySet()) {
			Double each = Prices.of(e.getKey());
			Row r = new Row(e.getKey(), Prices.name(e.getKey(), samples.get(e.getKey())), e.getValue()[0], each);
			if (each == null) unknown++;
			else total += r.value();
			rows.add(r);
		}
		rows.sort((a, b) -> Double.compare(b.value(), a.value()));
	}

	@Override
	protected void build() {
		scan();
		listTop = py + 52;
		pager(rows.size(), perPage(), bottom());
		button("Refresh", px + pw - 76 - 56, py + 7, 70, b -> rebuildWidgets());
	}

	private int perPage() {
		return Math.max(1, (bottom() - 6 - listTop) / 12);
	}

	@Override
	protected void draw(GuiGraphics g, int mouseX, int mouseY) {
		text(g, "Total", px + 10, py + 32, MUTED);
		text(g, Fmt.full(total), px + 42, py + 32, UP);
		if (unknown > 0) textRight(g, unknown + " item" + (unknown == 1 ? "" : "s") + " without a price", px + pw - 10, py + 32, MUTED);
		if (rows.isEmpty()) {
			text(g, "Your inventory is empty.", px + 10, listTop, MUTED);
			return;
		}
		int per = perPage(), start = page * per;
		for (int i = start; i < Math.min(rows.size(), start + per); i++) {
			Row r = rows.get(i);
			int y = listTop + (i - start) * 12;
			text(g, r.count() + "×", px + 10, y, MUTED);
			text(g, fit(r.name(), pw - 150), px + 40, y, TEXT);
			textRight(g, r.each() == null ? "no price" : Fmt.money(r.value()), px + pw - 10, y, r.each() == null ? MUTED : TEXT);
		}
		text(g, "Set missing prices in Price Check.", px + (pageCount(rows.size(), per) > 1 ? 60 : 10), bottom() + 6, MUTED);
	}
}
