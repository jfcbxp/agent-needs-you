# LilyGO T-Display-S3 LCD: reference for Agent Needs You

## Confirmed board

- Board: LilyGO T-Display-S3 classic LCD.
- MCU: ESP32-S3R8, 240 MHz.
- Flash: 16 MB.
- PSRAM: 8 MB octal.
- Panel controller: ST7789.
- Physical panel size: 170 x 320 pixels.
- Working landscape canvas: 320 x 170 pixels.
- Interface: 8-bit Intel 8080 parallel/I80, not SPI, QSPI, AMOLED, or RM67162.

Do not apply the original T-Display-S3 AMOLED pin map or `Arduino_ESP32QSPI` setup to this board.

## LCD pins

| Function | GPIO |
|---|---:|
| CS | 6 |
| DC | 7 |
| WR | 8 |
| RD | 9 |
| RESET | 5 |
| Backlight | 38 |
| D0 | 39 |
| D1 | 40 |
| D2 | 41 |
| D3 | 42 |
| D4 | 45 |
| D5 | 46 |
| D6 | 47 |
| D7 | 48 |
| BOOT button | 0 |
| Right button | 14 |

Backlight GPIO 38 is active-high. Set it high before rendering.

## Arduino-GFX configuration

The working Arduino-GFX bus type is:

```cpp
Arduino_ESP32PAR8Q bus(
    7 /* DC */, 6 /* CS */, 8 /* WR */, 9 /* RD */,
    39 /* D0 */, 40 /* D1 */, 41 /* D2 */, 42 /* D3 */,
    45 /* D4 */, 46 /* D5 */, 47 /* D6 */, 48 /* D7 */);
Arduino_ST7789 panel(&bus, 5, 0, true, 170, 320,
    35 /* col offset 1 */, 0 /* row offset 1 */,
    35 /* col offset 2 */, 0 /* row offset 2 */);
Arduino_Canvas gfx(320, 170, &panel);
```

Use the board's USB serial port with:

```ini
board = esp32-s3-devkitc-1
board_build.arduino.memory_type = qio_opi
board_build.flash_size = 16MB
board_upload.flash_size = 16MB
board_build.partitions = default_16MB.csv
```

The reference TFT_eSPI setup uses `TFT_RGB_ORDER TFT_RGB`, inversion on, 170 width, and 320 height. If red/blue are reversed, switch to `TFT_BGR`; only change color policy after confirming the panel orientation with a four-color test pattern.

## Reset and startup sequence

1. Configure GPIO 38 as output and drive it high.
2. Configure GPIO 5 and pulse RESET low/high.
3. Call `gfx->begin()`.
4. Call `panel->setRotation(1)` for the 320 x 170 landscape view.
5. Call `panel->displayOn()`.
6. Render a white test frame, then clear the canvas before normal UI work.

Serial should show display initialization without an exception, and the idle screen should show the Wi-Fi IP once connected.

## Serial commands

- `test`: shows red, green, blue, and white strips for 20 seconds.
- `inv0`: disables display inversion.
- `inv1`: enables display inversion.
- `state`: prints the board session JSON.
- `setup`: opens the Wi-Fi setup portal.
- `wifi`: prints Wi-Fi state.

## Layout and buttons

Agent Needs You uses a 320 x 170 logical canvas:

- Face: centered near (72, 82).
- Text panel: starts at x=170.
- BOOT/GPIO 0: marks all completed sessions as seen.
- GPIO 14: cycles the focused session.
- Hold GPIO 14 for five seconds: opens Wi-Fi setup.

## Copilot integration

The repository includes `vscode-extension/anu-copilot-0.1.0` behavior:

- A new unfinished Copilot turn is reported as working.
- A completed assistant turn is reported as done.
- The VS Code command palette can manually set working, needs-you, done, or idle.
- Set `anuCopilot.boardUrl` to the board IP printed by the firmware.

Install by copying the extension folder to:

```text
%USERPROFILE%\.vscode\extensions\anu-copilot-0.1.0
```

Then reload the VS Code window.

## Build and flash

```powershell
python -m platformio run -e tdisplay-s3-lcd -t upload
python -m platformio device monitor -p COM9 -b 115200
```

If COM9 changes, update `upload_port` and `monitor_port` in `platformio.ini` or pass the actual port to PlatformIO.

## Failure patterns

- A black screen with serial booting normally usually means QSPI/AMOLED configuration was used instead of I80 LCD configuration.
- Purple or scattered short numbers indicate wrong display-width/buffer assumptions, wrong GPIO data mapping, or stale ROM firmware.
- If USB serial shows no output, enable `ARDUINO_USB_MODE=1` and `ARDUINO_USB_CDC_ON_BOOT=1`.
- If Wi-Fi is not saved, hold GPIO 14 for five seconds to enter setup.
- If the board IP is unknown, read the USB serial output or inspect the idle screen.
- Verify `Display ready`, normal reset behavior, and the test pattern before debugging application state logic.
