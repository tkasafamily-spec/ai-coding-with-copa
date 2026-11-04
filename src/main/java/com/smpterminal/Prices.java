package com.smpterminal;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import net.minecraft.ChatFormatting;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.ItemStack;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Item prices. Uses a built-in estimate list for now, plus any prices you set yourself.
 * When the DonutSMP API is connected, live prices will be used instead.
 */
public final class Prices {
	private Prices() {}

	public record Entry(String id, String name, double price) {}

	private static final Map<String, Entry> BY_ID = new HashMap<>();
	public static final List<Entry> ALL = new ArrayList<>();

	public static void load() {
		try (InputStream in = Prices.class.getResourceAsStream("/assets/smpterminal/prices.json")) {
			if (in == null) return;
			for (JsonElement el : JsonParser.parseReader(new InputStreamReader(in, StandardCharsets.UTF_8)).getAsJsonArray()) {
				JsonObject o = el.getAsJsonObject();
				Entry e = new Entry(o.get("id").getAsString(), o.get("name").getAsString(), o.get("price").getAsDouble());
				if (BY_ID.putIfAbsent(e.id(), e) == null) ALL.add(e);
			}
		} catch (Exception e) {
			SmpTerminal.LOG.warn("Could not load price list", e);
		}
	}

	public static String id(ItemStack stack) {
		return BuiltInRegistries.ITEM.getKey(stack.getItem()).getPath();
	}

	/** Your own price first, then the lowest auction price you've seen, then the built-in estimate. */
	public static Double of(String id) {
		Double own = Config.C.priceOverrides.get(id);
		if (own != null) return own;
		Double seen = PriceBook.ah(id);
		if (seen != null) return seen;
		Entry e = BY_ID.get(id);
		return e == null ? null : e.price();
	}

	/** Where the price comes from: "yours", "seen 5m ago" or "estimate". */
	public static String source(String id) {
		if (Config.C.priceOverrides.containsKey(id)) return "yours";
		if (PriceBook.ah(id) != null) return "seen " + PriceBook.ago(PriceBook.get(id).ahAt);
		return BY_ID.containsKey(id) ? "estimate" : "";
	}

	public static boolean isLearned(String id) {
		return !Config.C.priceOverrides.containsKey(id) && PriceBook.ah(id) != null;
	}

	public static boolean isCustom(String id) {
		return Config.C.priceOverrides.containsKey(id);
	}

	public static String name(String id, ItemStack fallback) {
		Entry e = BY_ID.get(id);
		if (e != null) return e.name();
		return fallback != null ? fallback.getHoverName().getString() : id;
	}

	public static List<Entry> search(String q, int limit) {
		String s = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
		List<Entry> starts = new ArrayList<>(), contains = new ArrayList<>();
		for (Entry e : ALL) {
			String n = e.name().toLowerCase(Locale.ROOT);
			if (s.isEmpty() || n.startsWith(s)) starts.add(e);
			else if (n.contains(s)) contains.add(e);
		}
		if (s.isEmpty()) starts.sort((a, b) -> Double.compare(price(b), price(a)));
		starts.addAll(contains);
		return starts.size() > limit ? starts.subList(0, limit) : starts;
	}

	private static double price(Entry e) {
		Double p = of(e.id());
		return p == null ? 0 : p;
	}

	public static void tooltip(ItemStack stack, List<Component> lines) {
		if (!Config.C.tooltips || stack.isEmpty()) return;
		Double p = of(id(stack));
		if (p == null) return;
		int n = stack.getCount();
		String id = id(stack);
		String text = "≈ " + Fmt.money(p) + " each" + (n > 1 ? "  ·  " + Fmt.money(p * n) + " for " + n : "");
		lines.add(Component.literal(text).withStyle(ChatFormatting.GOLD));
		Double order = PriceBook.order(id);
		String src = source(id);
		String extra = (order != null ? "Buy order " + Fmt.money(order) + "  ·  " : "") + (src.isEmpty() ? "" : src);
		if (!extra.isEmpty()) lines.add(Component.literal(extra).withStyle(ChatFormatting.DARK_GRAY));
	}
}
