package com.smpterminal.screen;

import com.smpterminal.Config;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.screens.Screen;

import java.util.List;

/** Quick notes that stay saved between sessions. */
public class NotesScreen extends BaseScreen {
	private String draft = "";
	private int listTop;

	public NotesScreen(Screen parent) {
		super("Notes", parent);
	}

	@Override
	protected void build() {
		int x = px + 10, y = py + 32;
		EditBox box = field(x, y, pw - 20 - 50, "Write a note and press Add", draft);
		box.setResponder(s -> draft = s);
		setInitialFocus(box);
		button("Add", px + pw - 56, y, 46, b -> {
			if (!draft.isBlank()) {
				Config.C.notes.add(0, draft.trim());
				Config.save();
			}
			draft = "";
			page = 0;
			rebuildWidgets();
		});
		listTop = y + 30;
		List<String> notes = Config.C.notes;
		int per = perPage();
		int start = pager(notes.size(), per, bottom());
		for (int i = start; i < Math.min(notes.size(), start + per); i++) {
			final int idx = i;
			button("×", "Delete this note", px + pw - 30, listTop + (i - start) * 20 - 5, 20, b -> {
				if (idx < Config.C.notes.size()) Config.C.notes.remove(idx);
				Config.save();
				rebuildWidgets();
			});
		}
	}

	private int perPage() {
		return Math.max(1, (bottom() - 4 - listTop) / 20);
	}

	@Override
	protected void draw(GuiGraphics g, int mouseX, int mouseY) {
		List<String> notes = Config.C.notes;
		if (notes.isEmpty()) {
			text(g, "No notes yet. Good for prices, coords, who owes you what.", px + 10, listTop, MUTED);
			return;
		}
		int per = perPage(), start = page * per;
		for (int i = start; i < Math.min(notes.size(), start + per); i++) {
			text(g, fit(notes.get(i), pw - 50), px + 10, listTop + (i - start) * 20, TEXT);
		}
	}
}
