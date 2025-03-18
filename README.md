# Three.js Plane Game

A simple 3D game built with Three.js where you control a plane and navigate through obstacles.

## How to Run

1. Clone or download this repository
2. Open the `index.html` file in a modern web browser
   - For the best experience, use a local server to serve the files
   - You can use tools like [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) in VS Code

## How to Play

- Use the **WASD** keys or **Arrow keys** to control the plane:
  - **W** or **Up Arrow**: Move forward
  - **S** or **Down Arrow**: Move backward
  - **A** or **Left Arrow**: Move left (and bank left)
  - **D** or **Right Arrow**: Move right (and bank right)
- Press **SHIFT** to fly up (with pitch animation)
- Press **CTRL** to fly down (with pitch animation)
- Press **SPACE** to fire the machine guns

- Avoid hitting the obstacles (brown pillars)
- Shoot the orange moving targets with your machine guns to earn extra points
- Some targets float at different altitudes - use vertical flight to reach them!
- Your score increases automatically as you fly
- The game ends when you collide with an obstacle

## Game Features

- 3D plane with a realistic three-blade propeller that rotates with motion blur effect
- Propeller rotates along the correct axis aligned with the plane's forward direction
- Full 3D flight controls including vertical movement with pitch animations
- Machine guns mounted on the wings that shoot bullets with tracer effects
- Bullets are fired alternately from left and right machine guns with muzzle flash effects
- Randomly generated obstacles
- Decorative clouds in the sky
- Terrain features including rivers and mountains
- Moving targets at different altitudes that give you extra points when hit
- Explosion effects when targets are hit
- Score tracking
- Collision detection

## Technologies Used

- Three.js for 3D rendering
- JavaScript for game logic
- HTML/CSS for the user interface

## Customization

You can modify the game settings in the `game.js` file to adjust:
- Plane speed (horizontal and vertical)
- Propeller rotation speed
- Bullet speed and firing rate
- Obstacle spawn rate
- Target movement speed
- Altitude limits
- World size
- And more!

Enjoy flying! 