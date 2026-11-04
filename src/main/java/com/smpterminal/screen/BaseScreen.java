package com.smpterminal.screen;

import net.minecraft.ChatFormatting;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.components.Tooltip;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;

/** Shared look for every Terminal menu: a dark panel with a blue-violet top bar. */
public abstract class BaseScreen extends Screen {
	public static final int PANEL = 0xEE0B1029, LINE = 0xFF2C3768, ACCENT = 0xFF7A8BFF, ACCENT2 = 0xFFA97CFF;
	public static final int TEXT = 0xFFE8EAF8, MUTED = 0xFF9AA1C7, UP = 0xFF3DDC97, DOWN = 0xFFFF6B8A, GOLD = 0xFFF0C04A;

	protected final Screen parent;
	protected int px, py, pw, ph;
	protected int page;

	protected BaseScreen(String title, Screen parent) {
		super(Component.literal(title));
		this.parent = parent;
	}

	@Override
	protected void init() {
		pw = Math.min(400, width - 16);
		ph = Math.min(272, height - 16);
		px = (width - pw) / 2;
		py = (height - ph) / 2;
		build();
		button(parent != null ? "Back" : "Close", px + pw - 56, py + 7, 48, b -> onClose());
	}

	/** Add this menu's buttons and text boxes. */
	protected abstract void build();

	/** Draw this menu's text (called every frame). */
	protected void draw(GuiGraphics g, int mouseX, int mouseY) {}

	@Override
	public void onClose() {
		if (minecraft != null) minecraft.setScreen(parent);
	}

	@Override
	public boolean isPauseScreen() {
		return false;
	}

	@Override
	public void renderBackground(GuiGraphics g, int mouseX, int mouseY, float delta) {
		super.renderBackground(g, mouseX, mouseY, delta);
		g.fill(px, py, px + pw, py + ph, PANEL);
		g.fill(px, py, px + pw, py + 1, LINE);
		g.fill(px, py + ph - 1, px + pw, py + ph, LINE);
		g.fill(px, py, px + 1, py + ph, LINE);
		g.fill(px + pw - 1, py, px + pw, py + ph, LINE);
		int half = pw / 2;
		g.fill(px + 1, py + 1, px + half, py + 3, ACCENT);
		g.fill(px + half, py + 1, px + pw - 1, py + 3, ACCENT2);
	}

	@Override
	public void render(GuiGraphics g, int mouseX, int mouseY, float delta) {
		super.render(g, mouseX, mouseY, delta);
		g.drawString(font, Component.literal(title.getString()).withStyle(ChatFormatting.BOLD), px + 10, py + 13, TEXT);
		draw(g, mouseX, mouseY);
	}

	// ---------- helpers ----------

	protected Button button(String label, int x, int y, int w, Button.OnPress onPress) {
		return addRenderableWidget(Button.builder(Component.literal(label), onPress).bounds(x, y, w, 20).build());
	}

	protected Button button(String label, String tip, int x, int y, int w, Button.OnPress onPress) {
		return addRenderableWidget(Button.builder(Component.literal(label), onPress).bounds(x, y, w, 20)
			.tooltip(Tooltip.create(Component.literal(tip))).build());
	}

	protected EditBox field(int x, int y, int w, String hint, String value) {
		EditBox e = new EditBox(font, x, y, w, 20, Component.literal(hint));
		e.setMaxLength(160);
		e.setHint(Component.literal(hint).withStyle(ChatFormatting.DARK_GRAY));
		e.setValue(value == null ? "" : value);
		return addRenderableWidget(e);
	}

	protected void text(GuiGraphics g, String s, int x, int y, int color) {
		g.drawString(font, s, x, y, color);
	}

	protected void textRight(GuiGraphics g, String s, int right, int y, int color) {
		g.drawString(font, s, right - font.width(s), y, color);
	}

	protected void line(GuiGraphics g, int y) {
		g.fill(px + 10, y, px + pw - 10, y + 1, LINE);
	}

	protected String fit(String s, int maxWidth) {
		if (font.width(s) <= maxWidth) return s;
		while (s.length() > 1 && font.width(s + "…") > maxWidth) s = s.substring(0, s.length() - 1);
		return s + "…";
	}

	/** Adds ◀ ▶ page buttons when a list is longer than one page. Returns the first index to show. */
	protected int pager(int total, int perPage, int y) {
		int pages = Math.max(1, (total + perPage - 1) / perPage);
		page = Math.max(0, Math.min(page, pages - 1));
		if (pages > 1) {
			Button prev = button("<", px + 10, y, 20, b -> { page--; rebuildWidgets(); });
			Button next = button(">", px + 34, y, 20, b -> { page++; rebuildWidgets(); });
			prev.active = page > 0;
			next.active = page < pages - 1;
		}
		return page * perPage;
	}

	protected int pageCount(int total, int perPage) {
		return Math.max(1, (total + perPage - 1) / perPage);
	}

	protected int bottom() {
		return py + ph - 28;
	}
}
