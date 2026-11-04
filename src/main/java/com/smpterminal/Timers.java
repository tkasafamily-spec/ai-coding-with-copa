package com.smpterminal;

import net.minecraft.ChatFormatting;
import net.minecraft.client.Minecraft;
import net.minecraft.client.resources.sounds.SimpleSoundInstance;
import net.minecraft.network.chat.Component;
import net.minecraft.sounds.SoundEvents;

import java.util.Iterator;

/** Auction timers. They keep running if you close the game (end time is saved). */
public final class Timers {
	private Timers() {}

	public static void start(String name, long ms) {
		start(name, ms, Colors.palette(Config.C.nextColor++));
	}

	public static int colorOf(Config.TimerEntry t) {
		return t.color == -1 ? Colors.palette(t.name == null ? 0 : t.name.hashCode()) : t.color;
	}

	public static void start(String name, long ms, int color) {
		if (ms <= 0) return;
		Config.TimerEntry t = new Config.TimerEntry();
		String clean = name == null ? "" : name.trim();
		t.name = clean.isEmpty() ? Fmt.label(ms) + " timer" : clean;
		t.length = ms;
		t.endAt = System.currentTimeMillis() + ms;
		t.color = color;
		Config.C.timers.add(t);
		Config.C.lastTimerMs = ms;
		Config.C.lastTimerName = clean;
		Config.save();
		SmpTerminal.chat("Started " + t.name + " (" + Fmt.clock(ms) + ")");
	}

	public static void stop(Config.TimerEntry t) {
		Config.C.timers.remove(t);
		Config.save();
	}

	public static void tick(Minecraft mc) {
		if (Config.C.timers.isEmpty() || mc.player == null) return; // finished timers ping once you're back in a world
		long now = System.currentTimeMillis();
		boolean changed = false;
		Iterator<Config.TimerEntry> it = Config.C.timers.iterator();
		while (it.hasNext()) {
			Config.TimerEntry t = it.next();
			if (t.endAt <= now) {
				it.remove();
				changed = true;
				done(mc, t);
			}
		}
		if (changed) Config.save();
	}

	private static void done(Minecraft mc, Config.TimerEntry t) {
		if (mc.player == null) {
			SmpTerminal.LOG.info("Timer finished while not in a world: {}", t.name);
			return;
		}
		mc.getSoundManager().play(SimpleSoundInstance.forUI(SoundEvents.PLAYER_LEVELUP, 1.0F));
		mc.gui.setTitle(Component.literal("Timer done").withStyle(ChatFormatting.GOLD));
		mc.gui.setSubtitle(Component.literal(t.name).withStyle(ChatFormatting.WHITE));
		SmpTerminal.chat(t.name + " is done.");
	}
}
