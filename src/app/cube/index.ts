/**
 * Public surface of the cube.
 *
 * Everything outside `src/app/cube/` should import from here and nothing else. If something
 * is not exported here, it is an internal detail of the cube.
 */

export { CubeComponent } from './component/cube.component';
export { CubeEngine } from './engine/cube-engine';
export type { CubeEngineOptions } from './engine/cube-engine';
export { CubePlayer } from './engine/cube-player';
export type { CubePlayerOptions } from './engine/cube-player';
export { EngineError, ProgramError } from './errors';
export { EXAMPLE_PROGRAMS } from './examples/example-programs';
export type { ExampleProgram } from './examples/example-programs';
export { formatColor } from './program/names';
export type { Block, Program, ProgramConfig, Script } from './program/program';
export { validateProgram } from './program/validate-program';
export type { ScriptError } from './runtime/scheduler';
export { CubeState, FACE_RESOLUTION, Face } from './state/cube-state';
export type { Color } from './state/cube-state';
export { CubeView } from './view/cube-view';
