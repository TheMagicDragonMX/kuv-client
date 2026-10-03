# Kü-V: LED Matrix Algorithmic Thinking System - Project Context for AI Coding Agents

> **File:** `AGENTS.md` / `PROJECT_CONTEXT.md`  
> **Project:** Kü-V (Arreglo de Matrices LED para el Desarrollo del Pensamiento Algorítmico) [1]  
> **Institution:** CUCEI - Universidad de Guadalajara (Sprint #4) [1]  
> **Authors:** Laura Fernanda Del Toro Rodríguez, Alejandro David García González, Jorge Isaac Quintero Carreón [1]

---

## 1. Executive Overview & Core Philosophy

**Kü-V** is an educational technological ecosystem designed to bridge the gap between abstract programming concepts and tangible physical reality [2, 20]. Built upon Seymour Papert's **Constructionism**, **Tangible User Interfaces (TUI)**, and **Ambient Intelligence**, Kü-V replaces traditional 2D flat-screen code instruction with a 3D physical active-faced LED cube and a Progressive Web App (PWA) [2, 4, 6, 20].

### Key Educational & System Goals
* **3D Algorithmic Thinking:** Helps students visualize spatial topology, loops, conditionals, and sequence continuities across cube edges and vertices [9, 11, 23].
* **Cognitive Fatigue Mitigation & Zen Mode:** Monitors user interaction telemetry (click speed, error entropy) and transitions into a decorative, relaxing ambient light pattern ("Zen Mode") when cognitive overload is detected [6, 18, 23, 31].
* **Code Optimization Index (IOC):** Evaluates user block code efficiency against ideal solutions ($IOC \ge 85\%$) rather than just completion [17, 22, 27].
* **Low-Latency Tangible Feedback:** Achieves $<100\text{ ms}$ execution response between web block commands and physical LED rendering to reinforce tactile-visual learning [21, 34].

---

## 2. Technical Stack & Architecture Overview

```
+---------------------------------------------------------------------------------+
|                                 FRONTEND (PWA)                                  |
|  - Angular Framework (Material Angular, RxJS)                                    |
|  - Blockly API (Visual Block Programming & Syntactic Pre-validation)             |
|  - 3D Virtual Cube Model (For digital-only / remote learning)                    |
+---------------------------------------------------------------------------------+
                                       |
                   WebSockets / HTTP REST (JWT Authentication)
                                       v
+---------------------------------------------------------------------------------+
|                                 BACKEND API                                     |
|  - .NET REST API (MVC Architecture, Entity Framework / ORM Migrations)           |
|  - Inference Engine (Calculates IOC, Error Entropy, & Cognitive Fatigue)         |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
|                                DATABASE LAYER                                   |
|  - PostgreSQL with TimescaleDB Extension                                        |
|  - High-frequency telemetry ingestion (IMU, buttons, click latency, events)     |
+---------------------------------------------------------------------------------+
                                       |
                   Local Wi-Fi LAN / WebSockets (<100ms Target)
                                       v
+---------------------------------------------------------------------------------+
|                               PHYSICAL DEVICE (SBC)                             |
|  - Raspberry Pi 4 (Single Board Computer) as core controller                    |
|  - 5 RGB LED Matrix Panels (5 active faces forming a cube)                       |
|  - Stepper Motor & Motorized Rotating Base (360° visibility & front-calibration) |
|  - IMU (Accelerometer/Gyroscope), Gesture Sensors, Tactile Industrial Buttons  |
|  - 5V / 10A Switched Power Supply                                               |
+---------------------------------------------------------------------------------+
```

### Stack Breakdown
* **Frontend:** Angular, Angular Material, RxJS, Blockly API [21, 26, 33].
* **Backend:** .NET Framework REST API, ORM migrations, MVC pattern [21, 26, 34].
* **Database:** PostgreSQL + TimescaleDB (for time-series telemetry and user tracking) [21, 25, 26].
* **Authentication:** JWT Access Tokens [27, 35].
* **Communication:** WebSockets & HTTP over local Wi-Fi (IEEE 802.11n LAN) [21, 27, 46, 52].
* **Embedded / Hardware:** Raspberry Pi 4 (SBC), 5 RGB LED matrices, stepper motor base, IMU sensors [24, 32, 33, 45].

---

## 3. Core Algorithms & Logic Specifications

### 1. Logical Continuity Map (*Mapa Lógico de Continuidad*)
* **Purpose:** Translates and maps $(x, y, z)$ coordinates smoothly across all 5 active faces of the LED cube [23, 28, 48].
* **Implementation Requirement:** Prevents visual cuts, screen tearing, or flickering as sprites or light pulses cross cube edges and vertices [23, 28, 67].

### 2. Code Optimization Index (*Índice de Optimización de Código - IOC*)
* **Formula:**
  $$\text{IOC} = \frac{\text{Ideal Blocks}}{\text{User Blocks}}$$ [17, 27]
* **Target Threshold:** $\text{IOC} \ge 85\%$ ($0.85$) indicates mastery and lack of code redundancy [17, 22, 27].
* **Usage:** Guides user feedback, achievements, and code review engines [27, 36].

### 3. Cognitive Fatigue & Entropy Metric
* **Mechanism:** Tracks click frequency, drag-and-drop latency, and error entropy in PostgreSQL [22, 36, 76].
* **Threshold:** If system usage variability/entropy exceeds **40%** over consecutive attempts, cognitive overload is inferred [28, 76].
* **Action:** Triggers progressive hint suggestions (RF05) or offers transition to **Zen Mode** [23, 31, 36, 76].

### 4. Zen Mode (*Modo Zen*)
* **Purpose:** Ambient intelligence mode during user rest or session inactivity [18, 31, 49].
* **Behavior:** Renders calm, decorative ambient light patterns on the LED matrices, dimming or softening visual output to reduce mental fatigue [18, 31, 49].

### 5. Efficient Command Protocol
* **Execution Flow:** The PWA compiles Blockly code into lightweight, pre-loaded command ID sequences rather than transmitting raw source code over Wi-Fi [21, 35].
* **Latency Goal:** $< 100\text{ ms}$ hardware reaction time via WebSockets [21, 34]; $< 1000\text{ ms}$ end-to-end PWA-to-hardware execution [66].

---

## 4. Key Functional Requirements (RF01 - RF07)

| Requirement ID | Name / Purpose | Description & Flow |
| :--- | :--- | :--- |
| **RF01** | **Blockly Interpreter** [37, 38] | Translates visual block instructions (loops, conditionals, sequences) into pre-loaded hardware command IDs and renders physical LED updates [37, 38]. |
| **RF02** | **Lesson Validation** [38, 39] | Evaluates expected output vs. actual execution results and execution time to validate lesson completion [38, 39]. |
| **RF03** | **STEM Learning Routes** [39, 40] | Provides predefined, progressive learning pathways with STEM challenges (loops, spatial logic, geometry) [39, 40]. |
| **RF04** | **Physical Hardware Reaction** [40] | Captures inputs from physical buttons, IMU orientation, and gesture sensors, feeding them into running programs [33, 40]. |
| **RF05** | **Progressive Hint Engine** [41, 42] | Tracks failed attempts; sequentially provides textual hints up to revealing the complete block sequence as a last resort [41, 42]. |
| **RF06** | **Metrics & Telemetry Dashboard** [42, 43] | Displays user progress, time-on-task, error rates, persistence streaks, and IOC analytics [42, 43, 73]. |
| **RF07** | **Shared Creation Library** [43, 44] | Admin-moderated community showcase where users publish, favorite, and load LED animations onto physical/virtual cubes [43, 44]. |

---

## 5. Development Guidelines & System Constraints

### Hardware & Thermal Constraints
* **Raspberry Pi Thermal Threshold:** SBC CPU temperature must stay below $80^\circ\text{C}$ to prevent thermal throttling (target $< 60^\circ\text{C}$ with active cooling) [44, 70].
* **Power Supply:** Demands constant $5\text{V} / 10\text{A}$ power supply for the 5 LED matrices and SBC. Non-portable device [46, 50].
* **Rotation Calibration:** Stepper motor rotates the cube $360^\circ$; requires front-face calibration alignment before starting animations [33, 49].

### Code Execution & Performance Requirements
* **WebSocket Throughput:** Backend must handle $\ge 100\text{ Events Per Second (EPS)}$ with SBC CPU load $\le 75\%$ [70].
* **Error Handling:** PWA performs pre-validation to trap infinite loops or syntax errors before dispatching commands to the Pi [35].
* **API Style:** Clean RESTful endpoints for .NET backend, JWT header authorization, and WebSocket event subscribers for real-time telemetry [21, 26, 27].

---

## 6. Guidelines for AI Coding Agents

When generating, editing, or refactoring code for Kü-V, follow these rules:

1. **Frontend (.NET / Angular / RxJS / Blockly):**
   - Keep PWA components reactive using RxJS observables for WebSocket streams.
   - Respect the Blockly command ID protocol: emit lightweight command ID payload arrays instead of large raw text strings [21, 35].
   - Ensure the 3D virtual cube simulator mirrors the 5-faced physical cube layout accurately [33, 56].

2. **Backend (.NET / PostgreSQL / TimescaleDB):**
   - Structure controller/service layers according to standard MVC pattern [21, 34].
   - Store high-frequency telemetry (clicks, errors, sensor events) into TimescaleDB hyper-tables for efficient time-series querying [21, 25, 26].
   - Ensure JWT authentication is enforced on protected REST and WebSocket routes [27].
   - Implement the IOC formula ($\text{Ideal} / \text{User}$) and entropy monitoring service in backend inference modules [27, 34, 76].

3. **Embedded / SBC Scripting (Python / C++ on Raspberry Pi):**
   - Ensure matrix rendering handles cross-face mapping without visual gaps [23, 28, 48].
   - Monitor SBC CPU temperature and keep execution non-blocking to prevent frame drops [44, 70].
