package com.smpterminal;

import com.mojang.blaze3d.platform.InputConstants;
import net.fabricmc.fabric.api.client.rendering.v1.hud.HudElementRegistry;
import net.minecraft.client.KeyMapping;
import net.minecraft.network.chat.Style;
import net.minecraft.resources.ResourceLocation;

/** Minecraft 1.21.8 */
public final class Compat {
	private Compat() {}

	public static KeyMapping key(String id, int glfwKey) {
		return new KeyMapping("key.smpterminal." + id, InputConstants.Type.KEYSYM, glfwKey, "key.category.smpterminal.main");
	}

	public static void registerHud() {
		HudElementRegistry.addLast(ResourceLocation.fromNamespaceAndPath("smpterminal", "hud"), (graphics, tick) -> Hud.render(graphics));
	}
	/** A text style that uses one of the mod's fonts (assets/smpterminal/font/<name>.json). */
	public static Style font(String name) {
		return Style.EMPTY.withFont(ResourceLocation.fromNamespaceAndPath("smpterminal", name));
	}
}
