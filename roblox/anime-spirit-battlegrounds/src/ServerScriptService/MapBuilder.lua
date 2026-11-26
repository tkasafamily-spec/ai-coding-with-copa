-- Builds the whole world with code when the server starts:
-- a safe spawn temple, a training ground and the giant battle arena.

local Lighting = game:GetService("Lighting")

local MapBuilder = {}

MapBuilder.LobbyCenter = Vector3.new(0, 0, -260)
MapBuilder.SafeRadius = 48
MapBuilder.ArenaCenter = Vector3.new(0, 0, 60)
MapBuilder.ArenaRadius = 160
MapBuilder.TrainingCenter = Vector3.new(0, 0, -175)

local mapFolder

local function part(props)
	local p = Instance.new("Part")
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Material = Enum.Material.SmoothPlastic
	for k, v in pairs(props) do
		if k ~= "Parent" then
			p[k] = v
		end
	end
	p.Parent = props.Parent or mapFolder
	return p
end

-- Vertical cylinder: Roblox cylinders point along X, so tip them up.
local function cylinder(center, radius, height, props)
	props = props or {}
	props.Shape = Enum.PartType.Cylinder
	props.Size = Vector3.new(height, radius * 2, radius * 2)
	props.CFrame = CFrame.new(center) * CFrame.Angles(0, 0, math.rad(90))
	return part(props)
end

local function addLight(p, color, range, brightness)
	local l = Instance.new("PointLight")
	l.Color = color
	l.Range = range or 16
	l.Brightness = brightness or 2
	l.Parent = p
end

local function tree(pos, scale)
	scale = scale or 1
	part({
		Name = "Trunk",
		Size = Vector3.new(2, 14, 2) * scale,
		CFrame = CFrame.new(pos + Vector3.new(0, 7 * scale, 0)),
		Color = Color3.fromRGB(95, 60, 40),
		Material = Enum.Material.Wood,
	})
	local pinks = { Color3.fromRGB(255, 170, 200), Color3.fromRGB(255, 140, 185), Color3.fromRGB(255, 200, 220) }
	for i = 1, 4 do
		local offset = Vector3.new(math.random(-4, 4), math.random(0, 3), math.random(-4, 4)) * scale
		part({
			Name = "Blossom",
			Shape = Enum.PartType.Ball,
			Size = Vector3.new(9, 9, 9) * scale,
			CFrame = CFrame.new(pos + Vector3.new(0, 15 * scale, 0) + offset),
			Color = pinks[(i % 3) + 1],
			Material = Enum.Material.Grass,
			CanCollide = false,
		})
	end
end

local function lantern(pos)
	part({ Name = "LanternPost", Size = Vector3.new(1, 7, 1), CFrame = CFrame.new(pos + Vector3.new(0, 3.5, 0)), Color = Color3.fromRGB(60, 40, 30), Material = Enum.Material.Wood })
	local glow = part({
		Name = "Lantern",
		Size = Vector3.new(2.4, 2.4, 2.4),
		CFrame = CFrame.new(pos + Vector3.new(0, 8, 0)),
		Color = Color3.fromRGB(255, 120, 60),
		Material = Enum.Material.Neon,
	})
	addLight(glow, Color3.fromRGB(255, 150, 80), 20, 2)
end

local function gate(pos, facingAngle, scale, color)
	scale = scale or 1
	color = color or Color3.fromRGB(200, 40, 40)
	local base = CFrame.new(pos) * CFrame.Angles(0, facingAngle, 0)
	local w = 14 * scale
	local h = 18 * scale
	for _, side in ipairs({ -1, 1 }) do
		part({ Name = "GatePillar", Size = Vector3.new(1.6, h, 1.6) * Vector3.new(scale, 1, scale), CFrame = base * CFrame.new(side * w / 2, h / 2, 0), Color = color })
	end
	part({ Name = "GateTop", Size = Vector3.new(w + 6 * scale, 1.6 * scale, 2.2 * scale), CFrame = base * CFrame.new(0, h + 0.8 * scale, 0), Color = Color3.fromRGB(30, 30, 30) })
	part({ Name = "GateBeam", Size = Vector3.new(w + 2 * scale, 1.2 * scale, 1.4 * scale), CFrame = base * CFrame.new(0, h - 3 * scale, 0), Color = color })
end

local function rock(pos, size, color)
	return part({
		Name = "Rock",
		Size = size,
		CFrame = CFrame.new(pos) * CFrame.Angles(math.rad(math.random(-15, 15)), math.rad(math.random(0, 360)), math.rad(math.random(-15, 15))),
		Color = color or Color3.fromRGB(105, 100, 110),
		Material = Enum.Material.Slate,
	})
end

local function setupLighting()
	Lighting.ClockTime = 17.2
	Lighting.Brightness = 2.5
	Lighting.Ambient = Color3.fromRGB(70, 60, 90)
	Lighting.OutdoorAmbient = Color3.fromRGB(150, 120, 160)
	Lighting.GlobalShadows = true

	local atmosphere = Instance.new("Atmosphere")
	atmosphere.Density = 0.32
	atmosphere.Color = Color3.fromRGB(255, 190, 200)
	atmosphere.Decay = Color3.fromRGB(120, 80, 150)
	atmosphere.Glare = 0.4
	atmosphere.Haze = 1.5
	atmosphere.Parent = Lighting

	local bloom = Instance.new("BloomEffect")
	bloom.Intensity = 0.8
	bloom.Size = 30
	bloom.Threshold = 1.4
	bloom.Parent = Lighting

	local cc = Instance.new("ColorCorrectionEffect")
	cc.Saturation = 0.15
	cc.Contrast = 0.08
	cc.Parent = Lighting

	local sunRays = Instance.new("SunRaysEffect")
	sunRays.Intensity = 0.08
	sunRays.Parent = Lighting
end

local function buildGround()
	part({
		Name = "Ground",
		Size = Vector3.new(1400, 4, 1400),
		CFrame = CFrame.new(0, -2, -100),
		Color = Color3.fromRGB(90, 150, 80),
		Material = Enum.Material.Grass,
	})

	-- Mountains ring the world so it feels like a valley
	for i = 1, 28 do
		local a = (i / 28) * math.pi * 2
		local dist = 560 + math.random(-40, 40)
		local pos = Vector3.new(math.cos(a) * dist, 0, -100 + math.sin(a) * dist)
		local s = math.random(120, 220)
		part({
			Name = "Mountain",
			Shape = Enum.PartType.Ball,
			Size = Vector3.new(s * 1.6, s * 1.4, s * 1.6),
			CFrame = CFrame.new(pos),
			Color = Color3.fromRGB(110 + math.random(-15, 15), 100, 130),
			Material = Enum.Material.Rock,
		})
		part({
			Name = "SnowCap",
			Shape = Enum.PartType.Ball,
			Size = Vector3.new(s * 0.7, s * 0.5, s * 0.7),
			CFrame = CFrame.new(pos + Vector3.new(0, s * 0.62, 0)),
			Color = Color3.fromRGB(245, 245, 255),
			Material = Enum.Material.Snow,
			CanCollide = false,
		})
	end

	-- Invisible walls at the edge of the world
	local edge = 520
	for _, info in ipairs({
		{ Vector3.new(0, 100, -100 - edge), Vector3.new(edge * 2, 200, 4) },
		{ Vector3.new(0, 100, -100 + edge), Vector3.new(edge * 2, 200, 4) },
		{ Vector3.new(-edge, 100, -100), Vector3.new(4, 200, edge * 2) },
		{ Vector3.new(edge, 100, -100), Vector3.new(4, 200, edge * 2) },
	}) do
		part({ Name = "WorldEdge", Position = info[1], Size = info[2], Transparency = 1 })
	end

	-- Scatter trees and rocks outside the arena and lobby
	for _ = 1, 70 do
		local pos = Vector3.new(math.random(-450, 450), 0, math.random(-560, 360))
		local farFromArena = (pos - MapBuilder.ArenaCenter).Magnitude > MapBuilder.ArenaRadius + 30
		local farFromLobby = (pos - MapBuilder.LobbyCenter).Magnitude > 75
		local farFromPath = math.abs(pos.X) > 25
		if farFromArena and farFromLobby and farFromPath then
			if math.random() < 0.6 then
				tree(pos, 0.9 + math.random() * 0.6)
			else
				rock(pos + Vector3.new(0, 2, 0), Vector3.new(math.random(6, 14), math.random(5, 10), math.random(6, 14)))
			end
		end
	end
end

local function buildLobby()
	local c = MapBuilder.LobbyCenter
	cylinder(c + Vector3.new(0, 0.5, 0), MapBuilder.SafeRadius, 1, { Name = "TemplePlaza", Color = Color3.fromRGB(215, 205, 190), Material = Enum.Material.Marble })
	cylinder(c + Vector3.new(0, 1.1, 0), 14, 0.4, { Name = "SpawnCircle", Color = Color3.fromRGB(255, 150, 190), Material = Enum.Material.Neon, CanCollide = false })

	-- Spawn points
	for i = 1, 6 do
		local a = (i / 6) * math.pi * 2
		local s = Instance.new("SpawnLocation")
		s.Name = "Spawn" .. i
		s.Anchored = true
		s.Size = Vector3.new(6, 1, 6)
		s.CFrame = CFrame.new(c + Vector3.new(math.cos(a) * 8, 1.2, math.sin(a) * 8))
		s.Color = Color3.fromRGB(255, 200, 220)
		s.Material = Enum.Material.Marble
		s.Duration = 5
		s.Neutral = true
		s.TopSurface = Enum.SurfaceType.Smooth
		s.Parent = mapFolder
	end

	-- Big gate facing the arena
	gate(c + Vector3.new(0, 1, MapBuilder.SafeRadius - 4), 0, 1.4)
	-- Small gates on the sides
	gate(c + Vector3.new(-MapBuilder.SafeRadius + 4, 1, 0), math.rad(90), 0.9)
	gate(c + Vector3.new(MapBuilder.SafeRadius - 4, 1, 0), math.rad(90), 0.9)

	-- Temple at the back
	local back = c + Vector3.new(0, 1, -MapBuilder.SafeRadius + 14)
	part({ Name = "TempleBase", Size = Vector3.new(40, 4, 18), CFrame = CFrame.new(back + Vector3.new(0, 2, 0)), Color = Color3.fromRGB(80, 60, 50), Material = Enum.Material.Wood })
	for x = -16, 16, 8 do
		part({ Name = "TemplePillar", Size = Vector3.new(2, 14, 2), CFrame = CFrame.new(back + Vector3.new(x, 11, 6)), Color = Color3.fromRGB(200, 40, 40) })
	end
	part({ Name = "TempleRoof", Size = Vector3.new(48, 2, 26), CFrame = CFrame.new(back + Vector3.new(0, 19, 0)), Color = Color3.fromRGB(40, 40, 50), Material = Enum.Material.Slate })
	part({ Name = "TempleRoofTop", Size = Vector3.new(36, 2, 18), CFrame = CFrame.new(back + Vector3.new(0, 21, 0)), Color = Color3.fromRGB(40, 40, 50), Material = Enum.Material.Slate })

	-- Sign over the gate
	local sign = part({ Name = "WelcomeSign", Size = Vector3.new(26, 5, 1), CFrame = CFrame.new(c + Vector3.new(0, 30, MapBuilder.SafeRadius - 4)), Color = Color3.fromRGB(30, 20, 30) })
	local gui = Instance.new("SurfaceGui")
	gui.Face = Enum.NormalId.Back
	gui.CanvasSize = Vector2.new(520, 100)
	gui.Parent = sign
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Text = "THE ARENA AWAITS"
	label.Font = Enum.Font.FredokaOne
	label.TextScaled = true
	label.TextColor3 = Color3.fromRGB(255, 200, 90)
	label.Parent = gui

	-- Blossom trees and lanterns around the plaza
	for i = 1, 10 do
		local a = (i / 10) * math.pi * 2 + 0.3
		local r = MapBuilder.SafeRadius - 6
		local pos = c + Vector3.new(math.cos(a) * r, 1, math.sin(a) * r)
		if math.abs(math.sin(a)) < 0.9 or math.cos(a) < 0 then
			if i % 2 == 0 then
				tree(pos, 1.1)
			else
				lantern(pos)
			end
		end
	end

	-- Floating "SAFE ZONE" marker ring
	local ring = cylinder(c + Vector3.new(0, 0.6, 0), MapBuilder.SafeRadius + 0.5, 0.3, { Name = "SafeZoneEdge", Color = Color3.fromRGB(120, 255, 180), Material = Enum.Material.Neon, CanCollide = false, Transparency = 0.6 })
	ring.CastShadow = false
end

local function buildPath()
	local startZ = MapBuilder.LobbyCenter.Z + MapBuilder.SafeRadius
	local endZ = MapBuilder.ArenaCenter.Z - MapBuilder.ArenaRadius
	local len = endZ - startZ
	part({
		Name = "StonePath",
		Size = Vector3.new(18, 1, len + 4),
		CFrame = CFrame.new(0, 0.4, startZ + len / 2),
		Color = Color3.fromRGB(160, 150, 140),
		Material = Enum.Material.Cobblestone,
	})
	for z = startZ + 10, endZ - 6, 22 do
		lantern(Vector3.new(-11, 0, z))
		lantern(Vector3.new(11, 0, z))
	end
end

local function buildTraining()
	local c = MapBuilder.TrainingCenter
	part({
		Name = "TrainingFloor",
		Size = Vector3.new(70, 1, 34),
		CFrame = CFrame.new(c + Vector3.new(-50, 0.4, 0)),
		Color = Color3.fromRGB(170, 130, 90),
		Material = Enum.Material.WoodPlanks,
	})
	local sign = part({ Name = "TrainingSign", Size = Vector3.new(18, 4, 1), CFrame = CFrame.new(c + Vector3.new(-50, 9, -16)), Color = Color3.fromRGB(60, 40, 30), Material = Enum.Material.Wood })
	local gui = Instance.new("SurfaceGui")
	gui.Face = Enum.NormalId.Back
	gui.Parent = sign
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Text = "TRAINING DUMMIES"
	label.Font = Enum.Font.FredokaOne
	label.TextScaled = true
	label.TextColor3 = Color3.fromRGB(255, 240, 200)
	label.Parent = gui
	for _, x in ipairs({ -2, 4, 2 }) do
		part({ Name = "SignPost", Size = Vector3.new(1, 7, 1), CFrame = CFrame.new(c + Vector3.new(-50 + x * 3, 3.5, -16)), Color = Color3.fromRGB(60, 40, 30), Material = Enum.Material.Wood })
	end

	local spots = {}
	for i = 0, 4 do
		table.insert(spots, c + Vector3.new(-74 + i * 12, 4, 4))
	end
	return spots
end

local function buildArena()
	local c = MapBuilder.ArenaCenter
	local r = MapBuilder.ArenaRadius

	cylinder(c + Vector3.new(0, 0.3, 0), r, 1, { Name = "ArenaFloor", Color = Color3.fromRGB(150, 140, 135), Material = Enum.Material.Slate })
	cylinder(c + Vector3.new(0, 0.85, 0), r * 0.7, 0.2, { Name = "ArenaRing", Color = Color3.fromRGB(120, 110, 105), Material = Enum.Material.Concrete, CanCollide = false })

	-- Glowing lava cracks across the floor
	for i = 1, 14 do
		local a = math.random() * math.pi * 2
		local d = math.random(30, math.floor(r - 20))
		local pos = c + Vector3.new(math.cos(a) * d, 0.85, math.sin(a) * d)
		local crack = part({
			Name = "LavaCrack",
			Size = Vector3.new(math.random(10, 26), 0.2, math.random(1, 2)),
			CFrame = CFrame.new(pos) * CFrame.Angles(0, math.random() * math.pi, 0),
			Color = Color3.fromRGB(255, 90, 20),
			Material = Enum.Material.Neon,
			CanCollide = false,
		})
		crack.CastShadow = false
	end

	-- Colosseum wall with four entrances
	local segments = 48
	for i = 0, segments - 1 do
		local a = (i / segments) * math.pi * 2
		local deg = math.deg(a) % 90
		local isEntrance = deg < 6 or deg > 84
		local pos = c + Vector3.new(math.cos(a) * (r + 3), 0, math.sin(a) * (r + 3))
		local look = Vector3.new(c.X, 0, c.Z)
		local segLen = (2 * math.pi * (r + 3)) / segments + 1
		if not isEntrance then
			local h = 34
			part({
				Name = "ArenaWall",
				Size = Vector3.new(segLen, h, 6),
				CFrame = CFrame.lookAt(pos + Vector3.new(0, h / 2, 0), look + Vector3.new(0, h / 2, 0)),
				Color = Color3.fromRGB(175, 160, 145),
				Material = Enum.Material.Sandstone,
			})
			-- crenellations
			if i % 2 == 0 then
				part({
					Name = "WallTop",
					Size = Vector3.new(segLen * 0.6, 5, 6.5),
					CFrame = CFrame.lookAt(pos + Vector3.new(0, h + 2.5, 0), look + Vector3.new(0, h + 2.5, 0)),
					Color = Color3.fromRGB(150, 135, 120),
					Material = Enum.Material.Sandstone,
				})
			end
			-- tiered seats on the outside
			for tier = 1, 3 do
				local tpos = c + Vector3.new(math.cos(a) * (r + 6 + tier * 6), 0, math.sin(a) * (r + 6 + tier * 6))
				local th = h * 0.35 + tier * 6
				part({
					Name = "Seats",
					Size = Vector3.new(segLen + tier * 2.3, th, 6),
					CFrame = CFrame.lookAt(tpos + Vector3.new(0, th / 2, 0), look + Vector3.new(0, th / 2, 0)),
					Color = Color3.fromRGB(140 - tier * 10, 125 - tier * 10, 115 - tier * 10),
					Material = Enum.Material.Brick,
				})
			end
		else
			-- giant torch beside the entrance
			local torch = part({
				Name = "Torch",
				Size = Vector3.new(3, 3, 3),
				CFrame = CFrame.new(pos + Vector3.new(0, 20, 0)),
				Color = Color3.fromRGB(255, 120, 30),
				Material = Enum.Material.Neon,
			})
			addLight(torch, Color3.fromRGB(255, 140, 60), 40, 3)
			local fire = Instance.new("Fire")
			fire.Size = 8
			fire.Heat = 12
			fire.Parent = torch
			part({ Name = "TorchPole", Size = Vector3.new(2, 18, 2), CFrame = CFrame.new(pos + Vector3.new(0, 9, 0)), Color = Color3.fromRGB(50, 40, 40) })
		end
	end

	-- Entrance gates
	gate(c + Vector3.new(0, 0, -r - 3), 0, 2, Color3.fromRGB(180, 30, 30))
	gate(c + Vector3.new(0, 0, r + 3), 0, 2, Color3.fromRGB(180, 30, 30))
	gate(c + Vector3.new(-r - 3, 0, 0), math.rad(90), 2, Color3.fromRGB(180, 30, 30))
	gate(c + Vector3.new(r + 3, 0, 0), math.rad(90), 2, Color3.fromRGB(180, 30, 30))

	-- Cover: broken pillars and boulders
	for i = 1, 12 do
		local a = (i / 12) * math.pi * 2 + 0.25
		local d = r * 0.55 + math.random(-15, 15)
		local pos = c + Vector3.new(math.cos(a) * d, 0, math.sin(a) * d)
		local h = math.random(10, 28)
		part({
			Name = "BrokenPillar",
			Shape = Enum.PartType.Cylinder,
			Size = Vector3.new(h, 7, 7),
			CFrame = CFrame.new(pos + Vector3.new(0, h / 2, 0)) * CFrame.Angles(0, 0, math.rad(90)),
			Color = Color3.fromRGB(200, 190, 180),
			Material = Enum.Material.Marble,
		})
	end
	for _ = 1, 10 do
		local a = math.random() * math.pi * 2
		local d = math.random(45, math.floor(r - 25))
		rock(c + Vector3.new(math.cos(a) * d, 3, math.sin(a) * d), Vector3.new(math.random(8, 16), math.random(6, 12), math.random(8, 16)))
	end

	-- Boss stage in the middle
	cylinder(c + Vector3.new(0, 1.5, 0), 34, 3, { Name = "BossStage", Color = Color3.fromRGB(60, 40, 50), Material = Enum.Material.Basalt })
	cylinder(c + Vector3.new(0, 3.1, 0), 30, 0.2, { Name = "BossSigil", Color = Color3.fromRGB(255, 40, 60), Material = Enum.Material.Neon, CanCollide = false, Transparency = 0.4 })

	-- Floating crystals above the arena
	for i = 1, 8 do
		local a = (i / 8) * math.pi * 2
		local pos = c + Vector3.new(math.cos(a) * 70, 55 + math.random(-8, 8), math.sin(a) * 70)
		local crystal = part({
			Name = "FloatingCrystal",
			Size = Vector3.new(5, 14, 5),
			CFrame = CFrame.new(pos) * CFrame.Angles(math.rad(10), a, math.rad(15)),
			Color = Color3.fromRGB(170, 120, 255),
			Material = Enum.Material.Neon,
			CanCollide = false,
		})
		addLight(crystal, Color3.fromRGB(180, 130, 255), 30, 1.5)
	end

	-- Big arena sign
	local sign = part({ Name = "ArenaSign", Size = Vector3.new(60, 10, 1), CFrame = CFrame.new(c + Vector3.new(0, 52, -r - 3)), Color = Color3.fromRGB(30, 15, 20) })
	local gui = Instance.new("SurfaceGui")
	gui.Face = Enum.NormalId.Front
	gui.CanvasSize = Vector2.new(600, 100)
	gui.Parent = sign
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Text = "GRAND SPIRIT ARENA"
	label.Font = Enum.Font.FredokaOne
	label.TextScaled = true
	label.TextColor3 = Color3.fromRGB(255, 90, 90)
	label.Parent = gui
	local gui2 = gui:Clone()
	gui2.Face = Enum.NormalId.Back
	gui2.Parent = sign
end

function MapBuilder.Build()
	mapFolder = Instance.new("Folder")
	mapFolder.Name = "Map"
	mapFolder.Parent = workspace

	setupLighting()
	buildGround()
	buildLobby()
	buildPath()
	local dummySpots = buildTraining()
	buildArena()

	return {
		DummySpots = dummySpots,
		BossSpot = MapBuilder.ArenaCenter + Vector3.new(0, 8, 0),
	}
end

function MapBuilder.IsInSafeZone(position)
	local flat = Vector3.new(position.X, 0, position.Z)
	local c = Vector3.new(MapBuilder.LobbyCenter.X, 0, MapBuilder.LobbyCenter.Z)
	return (flat - c).Magnitude <= MapBuilder.SafeRadius
end

function MapBuilder.RandomArenaPoint(minDist, maxDist)
	local a = math.random() * math.pi * 2
	local d = math.random(minDist or 45, maxDist or (MapBuilder.ArenaRadius - 20))
	return MapBuilder.ArenaCenter + Vector3.new(math.cos(a) * d, 5, math.sin(a) * d)
end

return MapBuilder
