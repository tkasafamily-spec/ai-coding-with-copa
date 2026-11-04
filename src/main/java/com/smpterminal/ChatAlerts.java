package com.smpterminal;

import net.minecraft.client.Minecraft;
import net.minecraft.client.resources.sounds.SimpleSoundInstance;
import net.minecraft.sounds.SoundEvents;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;

/** Plays a ping when a chat message contains one of your keywords. */
public final class ChatAlerts {
	private ChatAlerts() {}

	public static final Deque<String> RECENT = new ArrayDeque<>();
	private static long lastPing;

	public static void onMessage(String text) {
		if (!Config.C.alertsOn || text.isBlank()) return;
		String lower = text.toLowerCase(Locale.ROOT);
		for (String w : Config.C.alertWords) {
			if (w.isBlank() || !lower.contains(w.toLowerCase(Locale.ROOT))) continue;
			RECENT.addFirst(text.length() > 80 ? text.substring(0, 80) + "…" : text);
			while (RECENT.size() > 5) RECENT.removeLast();
			Minecraft mc = Minecraft.getInstance();
			long now = System.currentTimeMillis();
			if (Config.C.alertSound && now - lastPing > 700) {
				mc.getSoundManager().play(SimpleSoundInstance.forUI(SoundEvents.EXPERIENCE_ORB_PICKUP, 1.6F));
				lastPing = now;
			}
			SmpTerminal.actionBar("Chat alert: " + w);
			return;
		}
	}
}
