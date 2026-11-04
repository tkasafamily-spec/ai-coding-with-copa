# SMP Terminal (Fabric mod for DonutSMP)

Press **]** in game to open the Terminal. Every tool also has its own keybind
(Options → Controls → SMP Terminal) that opens it directly.

## Tools
- **Auction Timer**: type a time (`1h30m`, `45m`, `2d`, `90`) or click a saved time, then Start. Countdown on the HUD, ping + title when it ends. Save your own times; remove them with Edit.
- **AH Profit Tracker**: picks up sales and purchases from chat, or add them by hand. Shows today's profit, balance change from the sidebar, the last 7 days as a bar chart. Resets every day at midnight (change the hour in the menu).
- **Price Check**: search prices, set your own. Prices also show in item tooltips.
- **Inventory Value**: total value of everything you carry.
- **Chat Alerts**: ping + action bar when chat contains your keywords.
- **Flip Calculator**: buy order vs. auction price, fee, profit per stack, break-even.
- **Notes**: quick notes that stay saved.
- **HUD**: running timers and today's profit in a corner (Settings).

## Downloads
Built jars are in `dist/` (one per Minecraft version). Needs Fabric Loader and Fabric API.

| File | Minecraft |
|---|---|
| `smp-terminal-mc1.21.8-*.jar` | 1.21.8 |
| `smp-terminal-mc1.21.10-*.jar` | 1.21.9 – 1.21.10 |
| `smp-terminal-mc1.21.11-*.jar` | 1.21.11 |

## Notes
- Prices are built-in estimates until the DonutSMP API is connected.
- Chat patterns for the profit tracker live in `config/smpterminal.json` (`salePatterns`, `buyPatterns`) and can be tuned to DonutSMP's exact messages.
- Version-specific code lives in `versions/<mc>/Compat.java`; GitHub Actions builds every version on push.
