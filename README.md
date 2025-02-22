# Verlet3D

A high-performance 3D particle simulation using WebGPU for massive parallel computations. The project demonstrates advanced GPU programming techniques including spatial partitioning, instanced rendering, and parallel physics calculations.

## Features
- Real-time simulation of millions of particles using Verlet integration
- Spatial grid-based collision detection for optimal performance
- Multiple gravity modes:
  - No gravity
  - Center gravity 
  - Shell gravity
  - Cylindrical gravity
- GPU-accelerated particle rendering using billboards
- Dynamic lighting and depth-correct sphere rendering
- Interactive camera controls

## Requirements
- A WebGPU-compatible browser (Chrome Canary, Edge Canary, or other browsers with WebGPU flags enabled)
- Node.js and npm for building the project

## Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Build the project: `npm run build`

## Development
For development with hot reloading: `npm run dev`

## Technical Details

### GPU Pipeline
The simulation uses multiple compute and render passes:
- Movement Computation: Updates particle positions using Verlet integration
- Spatial Partitioning: Organizes particles into a 3D grid for efficient collision detection
- Collision Resolution: Processes particle collisions using the spatial grid
- Rendering: Uses billboard technique with correct depth sorting and lighting

### Performance
The simulation is optimized for handling large numbers of particles by:
- Using uniform grid spatial partitioning
- Implementing efficient GPU-based collision detection
- Not using CPU-GPU data transfers
- Using instanced rendering for particles

## Stack

### Core Technologies
- WebGPU - Next-generation graphics API for the web
- WGSL - WebGPU Shading Language for GPU computations

### Packages
- gl-matrix - High-performance matrix and vector operations
- WebPack - Module bundler
- ts-loader - TypeScript loader for WebPack
- webpack-cli - Command line interface for WebPack
- @webgpu/types - TypeScript types for WebGPU

### Build Tools & Development

- npm v11 - Package management
- Node.js v23 - Runtime environment
- Live Server - Development server (or just run the index.html file)

## Controls
- WASD: Camera movement
- Mouse: Look around
- P: pause/play
- Number keys 1-4: Switch gravity modes

## Console commands
- SharedData.loadDefaultScene(numSpheres): Load a default scene with the specified number of spheres.
    - 0.1M for low end computers
    - 0.5M for mid range computers
    - 1M-2M for high end computers.
    - 5M (max) for very high end computers.

## License
MIT License - see LICENSE file for details.

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.
