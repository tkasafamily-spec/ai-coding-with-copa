package com.smpterminal;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import net.fabricmc.loader.api.FabricLoader;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

/**
 * Prices learned from the auction house and buy orders you've looked at.
 * Saved to config/smpterminal-prices.json.
 */
public final class PriceBook {
	private PriceBook() {}

	/** A listing seen more than this long ago gets replaced by the next one you see. */
	private static final long FRESH_MS = 30 * 60_000L;
	/** After this long a learned price stops being used. */
	public static final long MAX_AGE_MS = 7L * 24 * 3_600_000L;

	public static class Seen {
		public double ah;       // lowest price per item on the auction house
		public long ahAt;
		public double order;    // highest buy order per item
		public long orderAt;
	}

	private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
	private static Map<String, Seen> book = new HashMap<>();

	private static Path path() {
		return FabricLoader.getInstance().getConfigDir().resolve("smpterminal-prices.json");
	}

	public static void load() {
		try {
			if (Files.exists(path())) {
				Map<String, Seen> m = GSON.fromJson(Files.readString(path()), new TypeToken<Map<String, Seen>>() {}.getType());
				if (m != null) book = m;
			}
		} catch (Exception e) {
			SmpTerminal.LOG.warn("Could not read learned prices", e);
		}
	}

	public static void save() {
		try {
			Files.writeString(path(), GSON.toJson(book));
		} catch (Exception e) {
			SmpTerminal.LOG.warn("Could not save learned prices", e);
		}
	}

	public static boolean seeListing(String id, double each) {
		long now = System.currentTimeMillis();
		Seen s = book.computeIfAbsent(id, k -> new Seen());
		if (s.ahAt == 0 || now - s.ahAt > FRESH_MS || each < s.ah) {
			boolean changed = s.ah != each;
			s.ah = each;
			s.ahAt = now;
			return changed;
		}
		return false;
	}

	public static boolean seeOrder(String id, double each) {
		long now = System.currentTimeMillis();
		Seen s = book.computeIfAbsent(id, k -> new Seen());
		if (s.orderAt == 0 || now - s.orderAt > FRESH_MS || each > s.order) {
			boolean changed = s.order != each;
			s.order = each;
			s.orderAt = now;
			return changed;
		}
		return false;
	}

	public static Seen get(String id) {
		return book.get(id);
	}

	/** Lowest auction price you've seen recently, or null. */
	public static Double ah(String id) {
		Seen s = book.get(id);
		if (s == null || s.ahAt == 0 || System.currentTimeMillis() - s.ahAt > MAX_AGE_MS) return null;
		return s.ah;
	}

	public static Double order(String id) {
		Seen s = book.get(id);
		if (s == null || s.orderAt == 0 || System.currentTimeMillis() - s.orderAt > MAX_AGE_MS) return null;
		return s.order;
	}

	public static int size() {
		return book.size();
	}

	public static void clear() {
		book.clear();
		save();
	}

	public static String ago(long at) {
		long s = (System.currentTimeMillis() - at) / 1000;
		if (s < 60) return "just now";
		if (s < 3600) return (s / 60) + "m ago";
		if (s < 86400) return (s / 3600) + "h ago";
		return (s / 86400) + "d ago";
	}
}
