/**
 * Public surface of the setup section: connecting to a physical cube over Bluetooth to set its
 * WiFi and see its state.
 *
 * Everything outside `src/app/setup/` should import from here and nothing else.
 */

export { connectBluetooth, isBluetoothAvailable } from './bluetooth-transport';
export { PROTOCOL_VERSION } from './protocol';
export type { CubeInfo, CubeStatus, SystemStatus, WifiNetwork, WifiState, WifiStatus } from './protocol';
export { SetupClient, SetupError } from './setup-client';
export type { SetupErrorCode } from './setup-client';
export { connectSimulated, SIMULATED_PIN } from './simulated-cube';
export type { CubeTransport } from './transport';
