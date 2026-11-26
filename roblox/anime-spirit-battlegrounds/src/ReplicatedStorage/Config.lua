-- Anime Spirit Battlegrounds: shared settings.
-- Every fighter here is an original character, so the game is safe to publish.
-- To add a fighter, copy one block below and change the numbers and colors.

local Config = {}

Config.GameName = "Anime Spirit Battlegrounds"

-- Leveling
Config.MaxLevel = 100
Config.AwakenLevel = 10        -- level needed to use Awaken (T)
Config.AwakenDuration = 20
Config.AwakenCooldown = 60
Config.AwakenDamageBoost = 1.4

function Config.XPForLevel(level)
	-- XP needed to go from `level` to `level + 1`
	return math.floor(60 + level * 30 + (level ^ 1.6) * 4)
end

-- Rewards
Config.XPPerDamage = 0.6         -- XP for each point of damage you deal
Config.PlayerKillXP = 120
Config.PlayerKillCoins = 25
Config.PunchDamage = 7
Config.PunchCooldown = 0.35
Config.PunchRange = 7

-- Monetization (optional). Create these in the Creator Dashboard,
-- then paste the IDs here. 0 means "turned off".
Config.GamePasses = {
	DoubleXP = 0,      -- 2x XP forever
	VIP = 0,           -- VIP tag + 1.25x coins
}

-- Move types the server knows how to run:
--   Projectile : fires a glowing orb toward your aim
--   Dash       : zooms you forward and hits everyone you pass
--   Nova       : blast that pushes everyone around you away
--   Beam       : a long laser toward your aim
--   Meteor     : marks a spot, then something huge crashes down on it
Config.Characters = {
	{
		Id = "Kaen",
		Name = "Kaen",
		Title = "Flame Ninja",
		UnlockLevel = 1,
		Color = Color3.fromRGB(255, 110, 40),
		Aura = Color3.fromRGB(255, 180, 60),
		Health = 110,
		Speed = 22,
		Description = "Fast and aggressive. Burns enemies up close.",
		Moves = {
			Q = { Name = "Fire Orb", Type = "Projectile", Damage = 16, Cooldown = 1.6, Speed = 110, Size = 3 },
			E = { Name = "Blazing Dash", Type = "Dash", Damage = 14, Cooldown = 4, Distance = 45 },
			R = { Name = "Inferno Nova", Type = "Nova", Damage = 42, Cooldown = 14, Radius = 24, Level = 5 },
		},
	},
	{
		Id = "Volt",
		Name = "Volt",
		Title = "Storm Samurai",
		UnlockLevel = 1,
		Color = Color3.fromRGB(255, 225, 60),
		Aura = Color3.fromRGB(120, 200, 255),
		Health = 100,
		Speed = 24,
		Description = "Strikes like lightning from far away.",
		Moves = {
			Q = { Name = "Thunder Slash", Type = "Beam", Damage = 15, Cooldown = 2, Length = 45, Width = 4 },
			E = { Name = "Lightning Step", Type = "Dash", Damage = 10, Cooldown = 3, Distance = 60 },
			R = { Name = "Thunder God Strike", Type = "Meteor", Damage = 50, Cooldown = 15, Radius = 20, Level = 5 },
		},
	},
	{
		Id = "Yuki",
		Name = "Yuki",
		Title = "Frost Witch",
		UnlockLevel = 3,
		Color = Color3.fromRGB(120, 230, 255),
		Aura = Color3.fromRGB(200, 245, 255),
		Health = 95,
		Speed = 20,
		Description = "Slows enemies down, then freezes them solid.",
		Moves = {
			Q = { Name = "Ice Spear", Type = "Projectile", Damage = 14, Cooldown = 1.4, Speed = 130, Size = 2, Slow = 3 },
			E = { Name = "Frost Ring", Type = "Nova", Damage = 12, Cooldown = 6, Radius = 18, Slow = 4 },
			R = { Name = "Blizzard Beam", Type = "Beam", Damage = 48, Cooldown = 14, Length = 90, Width = 9, Slow = 5, Level = 5 },
		},
	},
	{
		Id = "Kuro",
		Name = "Kuro",
		Title = "Shadow Reaper",
		UnlockLevel = 8,
		Color = Color3.fromRGB(150, 60, 255),
		Aura = Color3.fromRGB(70, 0, 140),
		Health = 120,
		Speed = 23,
		Description = "Vanishes into shadows and hits extremely hard.",
		Moves = {
			Q = { Name = "Shadow Scythe", Type = "Projectile", Damage = 22, Cooldown = 2, Speed = 95, Size = 5 },
			E = { Name = "Void Step", Type = "Dash", Damage = 20, Cooldown = 4, Distance = 55 },
			R = { Name = "Eclipse", Type = "Meteor", Damage = 70, Cooldown = 16, Radius = 28, Level = 5 },
		},
	},
	{
		Id = "Sora",
		Name = "Sora",
		Title = "Celestial Monk",
		UnlockLevel = 15,
		Color = Color3.fromRGB(255, 245, 210),
		Aura = Color3.fromRGB(255, 215, 90),
		Health = 140,
		Speed = 22,
		Description = "Channels the power of the heavens. Huge range.",
		Moves = {
			Q = { Name = "Spirit Palm", Type = "Beam", Damage = 24, Cooldown = 2.2, Length = 60, Width = 6 },
			E = { Name = "Heaven's Shock", Type = "Nova", Damage = 26, Cooldown = 6, Radius = 22 },
			R = { Name = "Final Light Cannon", Type = "Beam", Damage = 95, Cooldown = 18, Length = 140, Width = 14, Level = 5 },
		},
	},
	{
		Id = "Gaia",
		Name = "Gaia",
		Title = "Iron Titan",
		UnlockLevel = 25,
		Color = Color3.fromRGB(90, 200, 90),
		Aura = Color3.fromRGB(60, 140, 60),
		Health = 220,
		Speed = 19,
		Description = "A walking mountain. Shakes the whole arena.",
		Moves = {
			Q = { Name = "Boulder Throw", Type = "Projectile", Damage = 30, Cooldown = 2.5, Speed = 80, Size = 7 },
			E = { Name = "Earth Charge", Type = "Dash", Damage = 28, Cooldown = 5, Distance = 40 },
			R = { Name = "World Quake", Type = "Nova", Damage = 90, Cooldown = 18, Radius = 40, Level = 5 },
		},
	},
}

function Config.GetCharacter(id)
	for _, c in ipairs(Config.Characters) do
		if c.Id == id then
			return c
		end
	end
	return Config.Characters[1]
end

-- Enemies that roam the arena
Config.Enemies = {
	{ Name = "Bandit", Health = 80, Damage = 8, Speed = 16, XP = 40, Coins = 6, Scale = 1, Color = Color3.fromRGB(150, 90, 60), Count = 6 },
	{ Name = "Oni Brute", Health = 220, Damage = 16, Speed = 14, XP = 110, Coins = 15, Scale = 1.6, Color = Color3.fromRGB(200, 50, 50), Count = 4 },
	{ Name = "Spirit Wraith", Health = 160, Damage = 12, Speed = 22, XP = 90, Coins = 12, Scale = 1.2, Color = Color3.fromRGB(110, 230, 220), Count = 4 },
}

Config.Boss = {
	Name = "Colossal Oni King",
	Health = 4000,
	Damage = 30,
	Speed = 13,
	XP = 1500,
	Coins = 300,
	Scale = 4,
	Color = Color3.fromRGB(120, 0, 0),
	RespawnTime = 180,
}

return Config
