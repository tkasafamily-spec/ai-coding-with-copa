package com.smpterminal;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Money and time formatting / parsing. Accepts things like "1.5m", "$250k", "1h30m", "45m", "2d". */
public final class Fmt {
	private Fmt() {}

	private static final Pattern MONEY = Pattern.compile("([0-9][0-9,]*(?:\\.[0-9]+)?)\\s*([kmbtKMBT])?");
	private static final Pattern DUR = Pattern.compile("(\\d+(?:\\.\\d+)?)\\s*([dhms])");
	private static final Pattern CODES = Pattern.compile("§.");

	public static String strip(String s) {
		return s == null ? "" : CODES.matcher(s).replaceAll("");
	}

	public static double parseMoney(String s) {
		if (s == null) return Double.NaN;
		Matcher m = MONEY.matcher(s.trim());
		if (!m.find()) return Double.NaN;
		double v;
		try {
			v = Double.parseDouble(m.group(1).replace(",", ""));
		} catch (NumberFormatException e) {
			return Double.NaN;
		}
		String suf = m.group(2);
		if (suf != null) {
			switch (Character.toLowerCase(suf.charAt(0))) {
				case 'k' -> v *= 1e3;
				case 'm' -> v *= 1e6;
				case 'b' -> v *= 1e9;
				case 't' -> v *= 1e12;
				default -> { }
			}
		}
		return v;
	}

	public static String compact(double a) {
		a = Math.abs(a);
		if (a < 1000) return String.valueOf(Math.round(a));
		String[] suf = {"K", "M", "B", "T"};
		double[] div = {1e3, 1e6, 1e9, 1e12};
		int i = a >= 1e12 ? 3 : a >= 1e9 ? 2 : a >= 1e6 ? 1 : 0;
		double x = a / div[i];
		String t = String.format(Locale.ROOT, x >= 100 ? "%.0f" : x >= 10 ? "%.1f" : "%.2f", x);
		if (t.contains(".")) t = t.replaceAll("0+$", "").replaceAll("\\.$", "");
		return t + suf[i];
	}

	public static String money(double v) {
		return (v < 0 ? "-$" : "$") + compact(v);
	}

	public static String signed(double v) {
		return (v < 0 ? "-$" : "+$") + compact(v);
	}

	public static String full(double v) {
		return String.format(Locale.US, "$%,d", Math.round(v));
	}

	/** Returns milliseconds, or -1 if the text isn't a time. A plain number means minutes. */
	public static long parseDuration(String s) {
		if (s == null) return -1;
		s = s.trim().toLowerCase(Locale.ROOT);
		if (s.isEmpty()) return -1;
		try {
			if (s.matches("\\d+:\\d{1,2}")) {
				String[] p = s.split(":");
				return (Long.parseLong(p[0]) * 60 + Long.parseLong(p[1])) * 60_000L;
			}
			if (s.matches("\\d+:\\d{1,2}:\\d{1,2}")) {
				String[] p = s.split(":");
				return (Long.parseLong(p[0]) * 3600 + Long.parseLong(p[1]) * 60 + Long.parseLong(p[2])) * 1000L;
			}
			if (s.matches("\\d+(\\.\\d+)?")) return (long) (Double.parseDouble(s) * 60_000L);
		} catch (NumberFormatException e) {
			return -1;
		}
		Matcher m = DUR.matcher(s);
		long total = 0;
		boolean any = false;
		while (m.find()) {
			any = true;
			double n = Double.parseDouble(m.group(1));
			total += switch (m.group(2)) {
				case "d" -> (long) (n * 86_400_000L);
				case "h" -> (long) (n * 3_600_000L);
				case "m" -> (long) (n * 60_000L);
				default -> (long) (n * 1000L);
			};
		}
		return any && total > 0 ? total : -1;
	}

	/** Countdown style: 1h 05m 09s */
	public static String clock(long ms) {
		long s = Math.max(0, (ms + 999) / 1000);
		long d = s / 86400, h = (s % 86400) / 3600, m = (s % 3600) / 60, sec = s % 60;
		if (d > 0) return d + "d " + h + "h " + pad(m) + "m";
		if (h > 0) return h + "h " + pad(m) + "m " + pad(sec) + "s";
		if (m > 0) return m + "m " + pad(sec) + "s";
		return sec + "s";
	}

	/** Short label: 1h30m, 48h, 45s */
	public static String label(long ms) {
		long totalMin = ms / 60_000L, sec = (ms / 1000) % 60;
		long h = totalMin / 60, m = totalMin % 60;
		StringBuilder b = new StringBuilder();
		if (h > 0) b.append(h).append('h');
		if (m > 0) b.append(m).append('m');
		if (sec > 0 && h == 0) b.append(sec).append('s');
		if (b.length() == 0) b.append("0s");
		return b.toString();
	}

	private static String pad(long v) {
		return v < 10 ? "0" + v : String.valueOf(v);
	}
}
