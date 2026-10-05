Virtual Cube Command API

Purpose

The project should be built around a virtual cube that acts as the source of truth for both:

the physical Raspberry Pi LED cube

the web-based visualization/control interface

The virtual cube should not know anything about HUB75, Raspberry Pi GPIO, panel wiring, or rpi-rgb-led-matrix.

Its job is to represent the cube, its surfaces, pixels, objects, and drawing operations.

                    VIRTUAL WORLD
                         │
                         ▼
                    CUBE GEOMETRY
                         │
                         ▼
                    PANEL MAPPING
                         │
                         ▼
                   HARDWARE RENDERER
                         │
                         ▼
                 rpi-rgb-led-matrix
                         │
                         ▼
                      HUB75
                         │
                         ▼
                  PHYSICAL CUBE

The web renderer follows the same virtual-world concepts but does not need to know anything about the physical hardware.

1. Design Principle

The virtual cube should expose drawing and world-level commands, rather than Raspberry Pi-specific commands.

For example:

cube.setPixel(...)
cube.drawLine(...)
cube.fillRect(...)

The Raspberry Pi renderer converts the resulting virtual representation into the physical LED-panel layout.

The browser renderer converts the same representation into a visual web representation.

This means application logic can be shared between both environments.

2. Core Command Categories

The API should be organized into several levels.

Level 1 — Pixel Operations

These are the lowest-level operations.

clear(color)
setPixel(x, y, z, color)
getPixel(x, y, z)

clear()

Sets the entire virtual cube surface to a color.

cube.clear(BLACK)

setPixel()

Changes one virtual pixel.

cube.setPixel(x, y, z, RED)

The exact coordinate representation may evolve. The important point is that the caller works with the virtual cube, not with a physical panel.

getPixel()

Returns the current color of a virtual pixel.

color = cube.getPixel(x, y, z)

3. 2D Drawing Operations

Each visible cube face is fundamentally a 64×64 surface.

The virtual cube should therefore provide familiar 2D drawing primitives.

drawLine(...)
drawRect(...)
fillRect(...)
drawCircle(...)
fillCircle(...)
drawText(...)
drawBitmap(...)

For example:

cube.drawLine(...)
cube.fillRect(...)
cube.drawText(...)

These commands should operate on the virtual surface.

The caller should not need to know which physical panel represents that surface.

4. Cube-Aware Operations

This is where the virtual cube becomes more powerful than a normal LED matrix.

The system should understand that the five visible faces are connected.

For example:

drawOnFace(face, ...)
drawAcrossEdge(...)

An object reaching the edge of one face can continue onto another face.

Conceptually:

             FRONT
        ┌──────────────┐
        │          ●───┼──────┐
        │              │      │
        └──────────────┘      │
                         RIGHT│
                         ┌────┴───────┐
                         │●           │
                         └─────────────┘

The application should not have to manually calculate the new coordinates.

The cube geometry/mapping layer performs that transformation.

For example, an object can simply continue moving:

object.position += object.velocity

and the virtual cube determines which face and coordinates represent the object.

5. Objects and Animation

Once the basic drawing system works, higher-level objects can be introduced.

An object might contain:

position
velocity
color
size

For example:

ball.position
ball.velocity
ball.color

An animation could update:

ball.position += ball.velocity

The object does not need to know whether it is currently on:

#1
#2
#3
#4
#5

or which cube face it occupies.

The virtual cube handles that.

6. What Should NOT Be Part of the Virtual Cube

Raspberry Pi and rpi-rgb-led-matrix configuration belongs to the hardware renderer.

The virtual API should NOT contain things such as:

--led-gpio-mapping
--led-slowdown-gpio
--led-chain
--led-row-addr-type

These are hardware/display-backend concerns.

The separation should remain:

Virtual Cube
    │
    │ drawing/world commands
    ▼
Cube Mapper
    │
    │ virtual → physical coordinates
    ▼
Panel Mapper
    │
    │ face → panel → chain position
    ▼
rpi-rgb-led-matrix
    │
    ▼
HUB75

This preserves the independence of the virtual world.

7. Physical Panel Identity vs. Cube Face

The virtual cube must also remain independent of the physical panel numbering.

Physical panels have permanent identities:

#1
#2
#3
#4
#5

But those identities should not be hardcoded to cube faces.

For example:

TOP   = #4
FRONT = #5
RIGHT = #2
BACK  = #1
LEFT  = #3

Another physical configuration could be:

TOP   = #3
FRONT = #5
RIGHT = #2
BACK  = #1
LEFT  = #4

The virtual cube remains unchanged.

Only the mapping configuration changes.

The same applies to HUB75 chain order.

These are three independent concepts:

Panel Identity
    #1 #2 #3 #4 #5

Cube Face Assignment
    TOP / FRONT / RIGHT / BACK / LEFT

HUB75 Chain Position
    0 / 1 / 2 / 3 / 4

8. Initial API

The first implementation should remain intentionally small.

Core

clear()
setPixel()
getPixel()

Drawing

drawLine()
drawRect()
fillRect()
drawCircle()
fillCircle()
drawText()
drawBitmap()

Cube

drawOnFace()
drawAcrossEdge()

Future

Sprite
Object
Animation
Transform

Not everything needs to be implemented immediately.

The first important milestone is establishing the virtual coordinate system and making basic drawing operations work correctly across the cube's connected surfaces.

9. Rendering Architecture

The final architecture should allow the same virtual-world state to be rendered by different targets.

                       APPLICATION
                            │
                            ▼
                      VIRTUAL CUBE
                            │
                 ┌──────────┴──────────┐
                 │                     │
                 ▼                     ▼
          Raspberry Pi             Web Browser
             Renderer                Renderer
                 │                     │
                 ▼                     ▼
          Panel Mapping          Web Visualization
                 │
                 ▼
       rpi-rgb-led-matrix
                 │
                 ▼
                HUB75
                 │
                 ▼
          Physical Cube

The important rule is:

The virtual cube is the source of truth. Renderers are outputs.

This allows us to develop and test cube behavior without requiring the physical cube to be connected.

10. Initial Implementation Goal

The first version of the virtual cube should focus on:

Defining the cube coordinate system.

Representing its five visible faces.

Defining how the faces connect at their edges.

Implementing pixel operations.

Implementing basic 2D drawing primitives.

Creating the mapping from virtual pixels to physical panels.

Rendering the same virtual state to both the Raspberry Pi and the web.

Once those foundations work, higher-level features such as sprites, animations, games, physics, and interactive objects can be built on top of them.

Core Philosophy

The project should treat rpi-rgb-led-matrix primarily as a hardware/display backend, not as the cube engine itself.

The cube engine should be hardware-independent.

Virtual World
     ↓
Cube Geometry
     ↓
Rendering / Mapping
     ↓
Output Device

This separation is what allows the physical cube and the web visualization to share the same standardized virtual-world system.
