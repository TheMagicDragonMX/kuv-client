# `src/app/setup/`: setting up a cube over Bluetooth

The `/setup` page ([pages/setup/](../pages/setup/setup.component.ts)) connects to a physical cube over Bluetooth Low Energy, straight from the browser (Web Bluetooth). The user unlocks the cube with its PIN, picks its WiFi network and sees how it is doing. No app and no network are needed, only being near the cube.

The page works from any HTTPS address, but Bluetooth only reaches about 10 m. Reaching a cube that is already online from anywhere is a different problem (Tailscale for now, the API later).

## Browsers

Web Bluetooth works in Chrome and the other Chromium browsers (Edge, Samsung Internet...) on Android, Windows, macOS and ChromeOS. On Linux, Chrome may need `chrome://flags/#enable-experimental-web-platform-features`. Firefox, Safari and every browser on iOS do not have it. The page needs HTTPS, or `localhost` during development.

Without the hardware, use **Probar con un cubo simulado** on the page. It runs a pretend cube in the page ([simulated-cube.ts](simulated-cube.ts), PIN `1234`) that follows the same protocol.

## The files

| File | The one thing it does |
| --- | --- |
| `protocol.ts` | The contract with the Pi: UUIDs, operations, message and error types |
| `framing.ts` | Cuts messages into chunks that fit in a Bluetooth packet, and joins them back |
| `transport.ts` | What a connection to a cube looks like, at the level of whole messages |
| `bluetooth-transport.ts` | The real connection: device chooser, GATT, notifications, chunked writes |
| `simulated-cube.ts` | A pretend cube in the page, for development and tests |
| `setup-client.ts` | One method per operation; matches responses to requests, times out, reports drops |
| `web-bluetooth.d.ts` | Types for the part of Web Bluetooth used here |

The page imports from `index.ts` only.

## The protocol (for the Pi side)

Everything below is what the cube's Bluetooth service must do. [protocol.ts](protocol.ts) has the same thing as types.

### Advertising and GATT

- Advertise the name `Kuv-XXXX` (e.g. the last 4 hex digits of the MAC) and the service UUID.
- One primary service, `6b750001-c0be-4f2a-9e1d-5b3a7c2e9d10`, with two characteristics:

| Characteristic | UUID | Flags | Direction |
| --- | --- | --- | --- |
| RX | `6b750002-c0be-4f2a-9e1d-5b3a7c2e9d10` | write | page → cube: requests |
| TX | `6b750003-c0be-4f2a-9e1d-5b3a7c2e9d10` | notify | cube → page: responses and events |

### Framing

Every message is compact UTF-8 JSON followed by `\n`. A message is sent in chunks:

- **Page → cube:** the page writes chunks of up to 180 bytes to RX. Append every write to a buffer; each `\n` ends a message.
- **Cube → page:** the cube notifies chunks of at most `MTU - 3` bytes on TX (20 bytes if the MTU is unknown). The page joins them the same way.

A chunk can end in the middle of a UTF-8 character. Decode whole messages only. Drop a buffer that passes 64 KB without a newline.

### Messages

```jsonc
// request (page → cube); "params" only when the operation has some
{"id":3,"op":"wifi.connect","params":{"ssid":"Casa","password":"secret123"}}

// response (cube → page), with the id of the request
{"id":3,"ok":true,"result":{"state":"connected","ssid":"Casa","ip":"192.168.1.42","signal":82,"saved":["Casa"]}}
{"id":3,"ok":false,"error":{"code":"wifi_failed","message":"Secrets were required"}}

// event (cube → page), without an id, whenever the status changes and every ~5 s while connected
{"event":"status","data":{"wifi":{...},"system":{"uptime":5230,"temperature":47.5}}}
```

Requests can overlap (e.g. a `status` while `wifi.connect` is running). Answer each one with its `id`, in any order.

### Operations

| `op` | `params` | `result` |
| --- | --- | --- |
| `info` | none | `{ name, version, hostname, protocol: 1, authRequired }` |
| `auth` | `{ pin }` | `null` |
| `status` | none | `{ wifi: { state, ssid, ip, signal, saved }, system: { uptime, temperature } }` |
| `wifi.scan` | none | `{ networks: [ { ssid, signal, secure } ] }`, one entry per SSID, signal 0–100 |
| `wifi.connect` | `{ ssid, password?, hidden? }` | the new `wifi` status, once connected (can take up to 45 s) |
| `wifi.forget` | `{ ssid }` | `null` |
| `system.reboot` | none | `null`, sent **before** rebooting |

`wifi.state` is one of `disconnected`, `connecting`, `connected` or `failed`. Without `password`, `wifi.connect` joins a saved or open network. A failed connection must not make the cube forget the network it had before.

### Errors

| `code` | When |
| --- | --- |
| `unauthorized` | Any operation but `info`/`auth` before a successful `auth`, or a wrong PIN |
| `locked` | Too many wrong PINs (e.g. 5): refuse `auth` for a minute |
| `bad_request` | Missing or wrong params |
| `unknown_op` | An `op` the cube does not know |
| `wifi_failed` | Could not join (wrong password, out of range) |
| `busy` | A scan or a connection is already running |
| `internal` | Anything else |

### PIN

When `authRequired` is true, `auth` must succeed before any other operation except `info`. It lasts until the Bluetooth connection drops, so every new connection unlocks again. Show the PIN on the LED matrix while a page is connected, or print it on the cube.

### Security note

The PIN keeps people nearby from reconfiguring the cube, but the link itself is not encrypted, so a WiFi password sent over it could be sniffed. To close that, mark RX as `encrypt-write` in BlueZ: the phone then pairs with the cube (the OS asks once) and the link is encrypted. The page does not need to change.

### Suggested Pi implementation

- Python, with [`bluez-peripheral`](https://github.com/spacecheese/bluez_peripheral) or [`bless`](https://github.com/kevincar/bless) for the GATT server, running as a systemd service.
- WiFi through NetworkManager: `nmcli -t -f SSID,SIGNAL,SECURITY dev wifi list`, `nmcli dev wifi connect <ssid> password <pw>` (add `hidden yes` for hidden ones), `nmcli connection delete <name>`, `nmcli -t -f NAME,TYPE connection show` for the saved ones.
- Temperature from `/sys/class/thermal/thermal_zone0/temp` (millidegrees), uptime from `/proc/uptime`.
