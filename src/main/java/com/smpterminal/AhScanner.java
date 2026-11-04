package com.smpterminal;

import net.fabricmc.fabric.api.client.screen.v1.ScreenEvents;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.gui.screens.inventory.AbstractContainerScreen;
import net.minecraft.core.component.DataComponents;
import net.minecraft.network.chat.Component;
import net.minecraft.world.entity.player.Inventory;
import net.minecraft.world.inventory.Slot;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.component.ItemLore;

import java.util.Collections;
import java.util.Locale;
import java.util.Set;
import java.util.WeakHashMap;

/**
 * Learns prices without an API: when you open the auction house (or the buy orders menu),
 * it reads the price lines off the listings on screen and remembers the lowest one per item.
 * Which menus count is set by "ahTitles" / "orderTitles" in config/smpterminal.json.
 */
public final class AhScanner {
	private AhScanner() {}

	private static final Set<Screen> HOOKED = Collections.newSetFromMap(new WeakHashMap<>());
	private static int learnedThisScreen;

	public static void init() {
		ScreenEvents.AFTER_INIT.register((client, screen, w, h) -> {
			if (!(screen instanceof AbstractContainerScreen<?> cs) || !HOOKED.add(screen)) return;
			learnedThisScreen = 0;
			int[] ticks = {0};
			ScreenEvents.afterTick(screen).register(s -> {
				if (++ticks[0] % 10 == 0) scan(cs);
			});
			ScreenEvents.remove(screen).register(s -> {
				if (learnedThisScreen > 0) {
					PriceBook.save();
					SmpTerminal.actionBar("Learned " + learnedThisScreen + " price" + (learnedThisScreen == 1 ? "" : "s") + " from the menu");
				}
			});
		});
	}

	private static Kind kindOf(String title) {
		String t = title.toLowerCase(Locale.ROOT);
		for (String k : Config.C.orderTitles) if (!k.isBlank() && t.contains(k.toLowerCase(Locale.ROOT))) return Kind.ORDER;
		for (String k : Config.C.ahTitles) if (!k.isBlank() && t.contains(k.toLowerCase(Locale.ROOT))) return Kind.AH;
		return null;
	}

	private enum Kind { AH, ORDER }

	private static void scan(AbstractContainerScreen<?> screen) {
		if (!Config.C.learnPrices) return;
		Kind kind = kindOf(Fmt.strip(screen.getTitle().getString()));
		if (kind == null) return;
		for (Slot slot : screen.getMenu().slots) {
			if (slot.container instanceof Inventory) continue; // your own items
			ItemStack stack = slot.getItem();
			if (stack.isEmpty()) continue;
			double each = priceEach(stack);
			if (!(each > 0)) continue;
			String id = Prices.id(stack);
			boolean changed = kind == Kind.AH ? PriceBook.seeListing(id, each) : PriceBook.seeOrder(id, each);
			if (changed) learnedThisScreen++;
		}
	}

	/** Reads a price from the item's lore. "each"/"per item" lines are per item, otherwise the price is for the whole stack. */
	static double priceEach(ItemStack stack) {
		ItemLore lore = stack.get(DataComponents.LORE);
		if (lore == null) return Double.NaN;
		for (Component c : lore.lines()) {
			String line = Fmt.strip(c.getString());
			String lower = line.toLowerCase(Locale.ROOT);
			int at = lower.indexOf('$');
			if (at < 0 && lower.contains("price")) at = lower.indexOf("price") + 5;
			if (at < 0) continue;
			double v = Fmt.parseMoney(line.substring(at));
			if (!(v > 0)) continue;
			boolean perItem = lower.contains("each") || lower.contains("per item") || lower.contains("/ea") || stack.getCount() <= 1;
			return perItem ? v : v / stack.getCount();
		}
		return Double.NaN;
	}

	public static boolean inWorld() {
		return Minecraft.getInstance().player != null;
	}
}
