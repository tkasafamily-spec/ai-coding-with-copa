package com.smpterminal;

import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.MutableComponent;
import net.minecraft.network.chat.Style;

/** Text in the Terminal's own thick font (Figtree), or Minecraft's font if turned off in Settings. */
public final class Txt {
	private Txt() {}

	private static Style bold, regular;

	private static Style bold() {
		if (bold == null) bold = Compat.font("bold");
		return bold;
	}

	private static Style regular() {
		if (regular == null) regular = Compat.font("regular");
		return regular;
	}

	/** Main text: extra-bold. */
	public static MutableComponent b(String s) {
		MutableComponent c = Component.literal(s);
		return Config.C.cleanFont ? c.withStyle(bold()) : c.withStyle(ChatFormatting.BOLD);
	}

	/** Hint text: semi-bold. */
	public static MutableComponent r(String s) {
		MutableComponent c = Component.literal(s);
		return Config.C.cleanFont ? c.withStyle(regular()) : c;
	}
}
