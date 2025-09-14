# Technology Stack

## Core Technologies

- **Game Engine**: Babylon.js 8.x (WebGL-based 3D engine)
- **Build Tool**: Vite 7.x (fast development and production builds)
- **Language**: JavaScript ES6+ modules
- **Package Manager**: npm
- **Physics**: Babylon.js built-in physics engine
- **Audio**: Web Audio API with synthetic sound generation

## Development Dependencies

- **Linting**: ESLint with Prettier integration
- **Code Formatting**: Prettier (single quotes, 2-space tabs, 100 char width)
- **Type Checking**: TypeScript (dev dependency for better IDE support)

## Runtime Dependencies

- **babylonjs**: Core 3D engine
- **babylonjs-loaders**: Asset loading (GLB/GLTF support)
- **hammerjs**: Touch gesture recognition for mobile controls

## Common Commands

### Development

```bash
npm run dev          # Start development server (Vite)
npm run build        # Build for production
npm run preview      # Preview production build locally
```

### Code Quality

```bash
npm run lint         # Run ESLint on src/**/*.js
npm run format       # Format code with Prettier
```

### Asset Pipeline

- 3D models: GLB/GLTF format in `public/assets/models/`
- Textures: JPG/PNG in `public/assets/textures/`
- Audio: Synthetic generation via Web Audio API

## Performance Considerations

- Object pooling for obstacles and coins
- LOD (Level of Detail) system for 3D assets
- Texture compression and optimization
- Mobile-specific render settings
- Frame rate targeting: 60fps desktop, 30fps mobile

## Browser Compatibility

- Modern browsers with WebGL support
- ES6+ module support required
- Touch API for mobile gesture recognition
