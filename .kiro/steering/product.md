# Product Overview

## Temple Run - Web Edition

A fast-paced endless runner game built for the web, featuring procedurally generated temple environments and smooth 3D gameplay.

### Core Features

- **Endless Running**: Procedurally generated temple paths with increasing difficulty
- **Lane-Based Movement**: 3-lane system with smooth transitions between lanes
- **Dynamic Obstacles**: Logs, rocks, spikes, and pits that challenge player reflexes
- **Coin Collection**: Score system based on distance traveled and coins collected
- **Cross-Platform Controls**:
  - Desktop: Arrow keys/WASD + Space/S for actions
  - Mobile: Swipe gestures with touch support
- **Visual Effects**: Particle systems for coins, collisions, and environmental effects
- **Performance Optimization**: Object pooling, LOD system, and mobile-optimized rendering

### Target Platforms

- Modern web browsers (Chrome, Firefox, Safari, Edge)
- Desktop and mobile devices
- WebGL-capable devices

### Game Mechanics

- Score = Distance traveled + (Coins × 10)
- Progressive speed increase over time
- Local high score persistence
- Collision detection with graceful game over handling

### Technical Goals

- 60fps on desktop, 30fps on mobile
- Sub-3 second load times
- Responsive design for various screen sizes
- Accessibility compliance
