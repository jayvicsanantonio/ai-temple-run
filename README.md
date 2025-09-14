# 🏃‍♂️ Temple Run - Web Edition

A fast-paced endless runner game built with Babylon.js, featuring procedurally generated levels, smooth animations, and mobile-responsive controls.

![Game Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Babylon.js](https://img.shields.io/badge/Babylon.js-5.x-orange.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🎮 Play Now

[Play Temple Run Web Edition](#) (Deploy link will be added after deployment)

## ✨ Features

- **Endless Running**: Procedurally generated temple paths that never end
- **Lane-Based Movement**: Switch between 3 lanes to avoid obstacles
- **Dynamic Obstacles**: Logs, rocks, spikes, and pits to challenge your reflexes
- **Coin Collection**: Gather coins to increase your score
- **Progressive Difficulty**: Game speed and obstacle frequency increase over time
- **Responsive Controls**: 
  - **Desktop**: Arrow keys/WASD for movement, Space to jump, S to slide
  - **Mobile**: Intuitive swipe gestures
- **Visual Effects**: Particle systems for coins, collisions, and running dust
- **Sound Effects**: Synthetic audio feedback for all actions
- **High Score Tracking**: Local storage for persistent high scores

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ai-temple-run.git
cd ai-temple-run
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to:
```
http://localhost:5173
```

## 🎯 How to Play

### Controls

#### Desktop
- **Arrow Left / A**: Move left
- **Arrow Right / D**: Move right  
- **Arrow Up / W / Space**: Jump
- **Arrow Down / S**: Slide
- **P / ESC**: Pause game

#### Mobile
- **Swipe Left**: Move left
- **Swipe Right**: Move right
- **Swipe Up**: Jump
- **Swipe Down**: Slide
- **Double Tap**: Pause game

### Objective
- Run as far as possible while avoiding obstacles
- Collect coins to increase your score
- Score = Distance traveled + (Coins × 10)
- Beat your high score!

## 🏗️ Architecture

### Technology Stack
- **Game Engine**: Babylon.js 5.x
- **Build Tool**: Vite
- **Language**: JavaScript (ES6+)
- **3D Graphics**: WebGL
- **Physics**: Babylon.js built-in physics
- **Audio**: Web Audio API

### Project Structure
```
ai-temple-run/
├── public/
│   ├── models/        # 3D models (GLB/GLTF)
│   ├── textures/      # Texture files
│   └── ui/            # UI assets
├── src/
│   ├── core/
│   │   ├── gameLoop.js         # Main game update cycle
│   │   ├── playerController.js # Player movement and actions
│   │   ├── obstacleManager.js  # Obstacle spawning and pooling
│   │   ├── coinManager.js      # Coin spawning and collection
│   │   ├── worldManager.js     # Procedural tile generation
│   │   ├── assetManager.js     # 3D asset loading and management
│   │   ├── soundManager.js     # Audio effects
│   │   ├── particleEffects.js  # Visual effects
│   │   └── uiManager.js        # UI and HUD management
│   ├── scenes/
│   │   └── mainScene.js        # Babylon.js scene setup
│   ├── utils/
│   │   └── inputHandler.js     # Keyboard and touch input
│   └── index.js                 # Main entry point
├── index.html
├── style.css
├── package.json
└── vite.config.js
```

## 🎨 Asset Integration

The game supports loading custom 3D models in GLB/GLTF format. To add custom assets:

1. Place your `.glb` or `.gltf` files in the `public/models/` directory
2. Update the asset manager to load your models:
```javascript
await assetManager.loadGLBModel('/models/your-model.glb', 'modelName');
```

### Blender Integration
The project is designed to work with Blender MCP for asset creation. Required animations:
- Idle
- Run cycle
- Jump
- Slide
- Death/fall

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
```bash
npm install -g vercel
vercel
```

### Deploy to Netlify
1. Build the project
2. Drag and drop the `dist` folder to Netlify

### Deploy to GitHub Pages
```bash
npm run build
git add dist -f
git commit -m "Deploy to GitHub Pages"
git subtree push --prefix dist origin gh-pages
```

## 🔧 Configuration

### Game Settings
Edit `src/core/` files to adjust:
- `playerController.js`: Player speed, jump height, lane positions
- `worldManager.js`: Tile length, spawn rates, difficulty scaling
- `obstacleManager.js`: Obstacle types and spawn patterns
- `coinManager.js`: Coin group sizes and spacing

### Performance Optimization
- Object pooling for obstacles and coins
- Procedural tile recycling
- LOD (Level of Detail) for distant objects
- Texture compression support
- Mobile-optimized render settings

## 📊 Performance

- **Target FPS**: 60fps on desktop, 30fps on mobile
- **Draw Calls**: Optimized through instancing and pooling
- **Memory Usage**: ~100MB average
- **Load Time**: < 3 seconds on average connection

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the original Temple Run mobile game
- Built with [Babylon.js](https://www.babylonjs.com/)
- Particle effects and physics powered by Babylon.js
- Touch controls implemented with [Hammer.js](https://hammerjs.github.io/)

## 🐛 Known Issues

- Audio may not play on iOS Safari until user interaction
- Some older mobile devices may experience frame drops
- Touch controls may need calibration on certain devices

## 📮 Contact

Project Link: [https://github.com/yourusername/ai-temple-run](https://github.com/yourusername/ai-temple-run)

---

Made with ❤️ using Babylon.js and modern web technologies
# ai-temple-run
