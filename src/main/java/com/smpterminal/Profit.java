package com.smpterminal;

import net.minecraft.client.Minecraft;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.numbers.StyledFormat;
import net.minecraft.world.scores.DisplaySlot;
import net.minecraft.world.scores.Objective;
import net.minecraft.world.scores.PlayerScoreEntry;
import net.minecraft.world.scores.PlayerTeam;
import net.minecraft.world.scores.Scoreboard;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * AH profit tracker.
 * Sales and purchases are read from chat (patterns are editable in config/smpterminal.json),
 * you can also add them by hand. Totals reset every day at the reset hour (midnight by default)
 * and the last 7 days are kept. Your balance change for the day is read from the sidebar.
 */
public final class Profit {
	private Profit() {}

	public static Double balance;
	private static int tickCount;
	private static List<Pattern> salePatterns, buyPatterns;
	private static List<String> builtFrom;

	public static Config.ProfitData data() {
		roll();
		return Config.C.profit;
	}

	public static String dayKey() {
		return LocalDateTime.now().minusHours(Config.C.profit.resetHour).toLocalDate().toString();
	}

	public static long msUntilReset() {
		LocalDateTime now = LocalDateTime.now();
		LocalDateTime next = now.toLocalDate().atTime(Config.C.profit.resetHour, 0);
		if (!next.isAfter(now)) next = next.plusDays(1);
		return Duration.between(now, next).toMillis();
	}

	/** Starts a new day when the reset time has passed. */
	public static void roll() {
		Config.ProfitData p = Config.C.profit;
		String key = dayKey();
		if (key.equals(p.day)) return;
		if (p.day != null) archive(p);
		p.day = key;
		clearToday(p);
		Config.save();
	}

	public static void resetNow() {
		Config.ProfitData p = Config.C.profit;
		if (p.day != null && (p.saleCount > 0 || p.buyCount > 0)) archive(p);
		clearToday(p);
		p.day = dayKey();
		Config.save();
	}

	private static void archive(Config.ProfitData p) {
		p.history.removeIf(d -> d.day != null && d.day.equals(p.day));
		Config.DayTotal d = new Config.DayTotal();
		d.day = p.day;
		d.sales = p.sales;
		d.buys = p.buys;
		d.net = p.sales - p.buys;
		p.history.add(0, d);
		while (p.history.size() > 7) p.history.remove(p.history.size() - 1);
	}

	private static void clearToday(Config.ProfitData p) {
		p.sales = 0;
		p.buys = 0;
		p.saleCount = 0;
		p.buyCount = 0;
		p.txns.clear();
		p.balanceStart = balance;
	}

	public static double net() {
		Config.ProfitData p = data();
		return p.sales - p.buys;
	}

	public static void add(boolean sale, String item, double amount) {
		if (!(amount > 0)) return;
		Config.ProfitData p = data();
		Config.Txn t = new Config.Txn();
		t.at = System.currentTimeMillis();
		t.sale = sale;
		t.item = item == null || item.isBlank() ? (sale ? "Sale" : "Purchase") : item.trim();
		t.amount = amount;
		p.txns.add(0, t);
		while (p.txns.size() > 50) p.txns.remove(p.txns.size() - 1);
		if (sale) {
			p.sales += amount;
			p.saleCount++;
		} else {
			p.buys += amount;
			p.buyCount++;
		}
		Config.save();
	}

	private static void compile() {
		List<String> all = new ArrayList<>(Config.C.salePatterns);
		all.add("|");
		all.addAll(Config.C.buyPatterns);
		if (all.equals(builtFrom)) return;
		salePatterns = compileAll(Config.C.salePatterns);
		buyPatterns = compileAll(Config.C.buyPatterns);
		builtFrom = all;
	}

	private static List<Pattern> compileAll(List<String> src) {
		List<Pattern> out = new ArrayList<>();
		for (String s : src) {
			try {
				out.add(Pattern.compile(s));
			} catch (Exception e) {
				SmpTerminal.LOG.warn("Bad profit pattern: {}", s);
			}
		}
		return out;
	}

	public static void onMessage(String text) {
		compile();
		if (match(salePatterns, text, true)) return;
		match(buyPatterns, text, false);
	}

	private static boolean match(List<Pattern> patterns, String text, boolean sale) {
		for (Pattern p : patterns) {
			Matcher m = p.matcher(text);
			if (!m.find()) continue;
			double amount = Fmt.parseMoney(group(m, "amount"));
			if (!(amount > 0)) continue;
			String item = group(m, "item");
			add(sale, item, amount);
			SmpTerminal.actionBar((sale ? "Sold " : "Bought ") + (item == null ? "" : item + " ") + "for " + Fmt.money(amount) + " · today " + Fmt.signed(net()));
			return true;
		}
		return false;
	}

	private static String group(Matcher m, String name) {
		try {
			return m.group(name);
		} catch (IllegalArgumentException e) {
			return null;
		}
	}

	public static void tick(Minecraft mc) {
		if (++tickCount % 100 != 0) return; // every 5 seconds
		roll();
		Double b = readBalance(mc);
		if (b == null) return;
		balance = b;
		if (Config.C.profit.balanceStart == null) {
			Config.C.profit.balanceStart = b;
			Config.save();
		}
	}

	/** Finds the "Money" line on the sidebar scoreboard. */
	public static Double readBalance(Minecraft mc) {
		try {
			if (mc.level == null) return null;
			Scoreboard sb = mc.level.getScoreboard();
			Objective obj = sb.getDisplayObjective(DisplaySlot.SIDEBAR);
			if (obj == null) return null;
			for (PlayerScoreEntry e : sb.listPlayerScores(obj)) {
				if (e.isHidden()) continue;
				PlayerTeam team = sb.getPlayersTeam(e.owner());
				String line = Fmt.strip(PlayerTeam.formatNameForTeam(team, e.ownerName()).getString());
				String lower = line.toLowerCase(Locale.ROOT);
				int at = lower.indexOf("money");
				if (at < 0) at = lower.indexOf("balance");
				if (at < 0) continue;
				double v = Fmt.parseMoney(line.substring(at));
				if (Double.isNaN(v)) {
					Component score = e.formatValue(obj.numberFormatOrDefault(StyledFormat.SIDEBAR_DEFAULT));
					v = Fmt.parseMoney(Fmt.strip(score.getString()));
				}
				if (!Double.isNaN(v)) return v;
			}
		} catch (Exception e) {
			// scoreboard layouts vary; just skip
		}
		return null;
	}

	public static Double balanceChange() {
		Double start = Config.C.profit.balanceStart;
		if (start == null || balance == null) return null;
		return balance - start;
	}
}
