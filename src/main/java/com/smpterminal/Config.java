package com.smpterminal;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import net.fabricmc.loader.api.FabricLoader;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Everything the mod remembers, saved to config/smpterminal.json. */
public final class Config {
	private static final long MIN = 60_000L, HOUR = 3_600_000L;
	private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
	public static Config C = new Config();

	// Auction timer
	public List<Long> presets = new ArrayList<>(List.of(5 * MIN, 15 * MIN, 30 * MIN, HOUR, 6 * HOUR, 12 * HOUR, 24 * HOUR, 48 * HOUR));
	public List<TimerEntry> timers = new ArrayList<>();
	public String lastTimerName = "";
	public long lastTimerMs = HOUR;
	public int nextColor = 0;

	// AH profit tracker
	public ProfitData profit = new ProfitData();
	public List<String> salePatterns = new ArrayList<>(List.of(
		"(?i)(?:bought|purchased) your (?<item>.+?) for \\$?(?<amount>[\\d,.]+\\s*[kmbt]?)",
		"(?i)you sold (?<item>.+?) for \\$?(?<amount>[\\d,.]+\\s*[kmbt]?)"
	));
	public List<String> buyPatterns = new ArrayList<>(List.of(
		"(?i)you (?:bought|purchased) (?<item>.+?) for \\$?(?<amount>[\\d,.]+\\s*[kmbt]?)"
	));

	// Chat alerts
	public List<String> alertWords = new ArrayList<>(List.of("wtb", "buying"));
	public boolean alertsOn = true;
	public boolean alertSound = true;

	// Notes
	public List<String> notes = new ArrayList<>();

	// Prices
	public Map<String, Double> priceOverrides = new HashMap<>();
	public boolean tooltips = true;
	/** Thick clean font in menus and HUD (off = Minecraft font). */
	public boolean cleanFont = true;
	/** Read prices off auction / order menus you open. */
	public boolean learnPrices = true;
	public List<String> ahTitles = new ArrayList<>(List.of("auction", "/ah"));
	public List<String> orderTitles = new ArrayList<>(List.of("order"));

	// Flip calculator
	public double fee = 0;

	// HUD
	public boolean hud = true;
	public boolean hudTimers = true;
	public boolean hudProfit = true;
	public int hudCorner = 0;

	// DonutSMP API (coming later)
	public String apiKey = "";

	public static class TimerEntry {
		public String name;
		public long endAt;
		public long length;
		public int color = -1;
	}

	public static class ProfitData {
		public String day;
		public double sales, buys;
		public int saleCount, buyCount;
		public Double balanceStart;
		public int resetHour = 0;
		public List<Txn> txns = new ArrayList<>();
		public List<DayTotal> history = new ArrayList<>();
	}

	public static class Txn {
		public long at;
		public boolean sale;
		public String item;
		public double amount;
	}

	public static class DayTotal {
		public String day;
		public double net, sales, buys;
	}

	private static Path path() {
		return FabricLoader.getInstance().getConfigDir().resolve("smpterminal.json");
	}

	public static void load() {
		try {
			Path p = path();
			if (Files.exists(p)) {
				Config c = GSON.fromJson(Files.readString(p), Config.class);
				if (c != null) C = c;
			}
		} catch (Exception e) {
			SmpTerminal.LOG.warn("Could not read smpterminal.json, using defaults", e);
		}
		C.fillMissing();
	}

	public static void save() {
		try {
			Files.writeString(path(), GSON.toJson(C));
		} catch (Exception e) {
			SmpTerminal.LOG.warn("Could not save smpterminal.json", e);
		}
	}

	private void fillMissing() {
		Config d = new Config();
		if (presets == null) presets = d.presets;
		if (timers == null) timers = d.timers;
		if (lastTimerName == null) lastTimerName = "";
		if (profit == null) profit = d.profit;
		if (profit.txns == null) profit.txns = new ArrayList<>();
		if (profit.history == null) profit.history = new ArrayList<>();
		if (salePatterns == null) salePatterns = d.salePatterns;
		if (buyPatterns == null) buyPatterns = d.buyPatterns;
		if (alertWords == null) alertWords = d.alertWords;
		if (notes == null) notes = d.notes;
		if (priceOverrides == null) priceOverrides = d.priceOverrides;
		if (apiKey == null) apiKey = "";
		if (ahTitles == null) ahTitles = d.ahTitles;
		if (orderTitles == null) orderTitles = d.orderTitles;
	}
}
