# Temple Run Art Direction Bible
## Visual Identity: Ancient Jungle Temple

### Core Aesthetic
**Stylized Realism** - Believable materials and proportions with slight exaggeration for gameplay clarity and visual appeal.

### Color Palette

#### Primary Colors
- **Ancient Stone**: #8B7355 (warm sandstone base)
- **Weathered Stone**: #6B5D4F (darker, aged sections)
- **Moss Green**: #4A5D3A (organic overgrowth)
- **Deep Jungle**: #2C3E2B (shadows and depth)

#### Accent Colors
- **Temple Gold**: #D4AF37 (coins, treasures)
- **Mystical Blue**: #4A90E2 (crystals, magic)
- **Torch Orange**: #FF6B35 (fire, warmth)
- **Danger Red**: #8B2635 (traps, warnings)

### Material Guidelines

#### Stone Surfaces
- **Roughness**: 0.7-0.9 (weathered, matte finish)
- **Metallic**: 0.0
- **Details**: Visible cracks, chips, moss growth in crevices
- **Variation**: 3-4 stone types with subtle color shifts

#### Organic Materials
- **Wood**: Dark, wet appearance with bark texture
- **Foliage**: Subsurface scattering for translucency
- **Vines**: Twisted geometry with small leaves
- **Moss**: Vertex painted on stone surfaces

#### Metals
- **Ancient Bronze**: Patina and verdigris
- **Gold**: High metallic (0.9), low roughness (0.2)
- **Iron**: Rust patches, medium roughness (0.6)

### Scale Reference
- **1 Blender Unit = 1 Meter**
- **Lane Width**: 2 meters
- **Path Width**: 6 meters (3 lanes)
- **Character Height**: 1.6-1.8 meters
- **Wall Height**: 0.8 meters (waist-high)
- **Pillar Height**: 4-5 meters

### Lighting Philosophy
- **Key Light**: Warm sunlight filtering through canopy (color temp: 5500K)
- **Fill Light**: Cool blue sky bounce (color temp: 8000K)
- **Rim Light**: Golden hour backlight for depth
- **Atmosphere**: Volumetric fog for depth layers

### Wear & Weathering Patterns
1. **Edge Wear**: Lighter color on raised edges
2. **Water Stains**: Dark vertical streaks
3. **Moss Growth**: In shadowed, damp areas
4. **Cracks**: Following natural stress lines
5. **Debris**: Accumulated in corners and crevices

### Asset Categories & Styles

#### Path System
- Modular stone slabs with visible mortar gaps
- Uneven surfaces showing age
- Moss along edges and in shadows
- Occasional missing stones revealing dirt below

#### Temple Architecture
- Massive stone blocks with carved details
- Partially collapsed sections
- Ornate but weathered decorations
- Warm interior lighting contrasting dark doorways

#### Jungle Environment
- Dense, layered foliage
- Hanging vines and roots
- Dappled lighting through leaves
- Morning mist in distance

### Visual Hierarchy
1. **Player Path**: Highest contrast, clearest readability
2. **Obstacles**: Strong silhouettes, danger colors
3. **Collectibles**: Emissive glow, spinning animation
4. **Background**: Lower contrast, atmospheric perspective

### Technical Specifications

#### Texture Resolutions
- **Hero Assets**: 2048x2048
- **Standard Props**: 1024x1024
- **Background Elements**: 512x512
- **Tiling Textures**: 2048x2048

#### Polygon Budgets
- **Path Segments**: 2,000-3,000 tris
- **Obstacles**: 1,000-2,000 tris
- **Decorations**: 500-1,500 tris
- **Hero Pieces**: 3,000-5,000 tris
- **Background**: 200-500 tris

#### Shader Requirements
- **PBR Materials**: Metallic-Roughness workflow
- **Vertex Colors**: For variation and moss masks
- **Emissive**: For crystals, fire, magic elements
- **Alpha**: For foliage cards and particles

### Animation Guidelines
- **Idle Animations**: Subtle swaying for plants
- **Interactive**: Coins rotate, crystals pulse
- **Environmental**: Torch flames, water ripples
- **Destruction**: Crumbling stone, falling debris

### Post-Processing Effects
- **Bloom**: Intensity 0.5 for emissive materials
- **Ambient Occlusion**: Subtle contact shadows
- **Color Grading**: Warm midtones, cool shadows
- **Vignette**: Light edge darkening for focus

### Asset Naming Convention
```
[category]_[name]_[variant]_[version].glb
```
Examples:
- `path_straight_A_v001.glb`
- `obstacle_spike_trap_B_v002.glb`
- `deco_temple_pillar_damaged_v001.glb`

### Quality Checklist
- [ ] Consistent scale (1 unit = 1 meter)
- [ ] Proper pivot points (center for tiles, base for props)
- [ ] UV unwrapped with no overlaps (except for tiling)
- [ ] Materials assigned and named properly
- [ ] LODs created for hero assets
- [ ] Collision mesh included where needed
- [ ] Tested in-engine for seams and lighting

### Mood & Atmosphere
The world should feel:
- **Ancient**: Centuries of weathering and overgrowth
- **Mysterious**: Hidden dangers and treasures
- **Alive**: Movement in foliage, particles in air
- **Adventurous**: Inviting exploration despite danger
- **Cohesive**: All elements feel part of same world

### Reference Sources
- Angkor Wat temple complex
- Indiana Jones temple aesthetics
- Uncharted series environments
- Tomb Raider jungle ruins
- PolyHaven texture library

---
*This document is the source of truth for all visual decisions in the Temple Run project. All assets must conform to these guidelines to maintain visual cohesion.*