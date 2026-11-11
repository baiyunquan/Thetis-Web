# Stage 2 backend extraction record

Reviewed 2026-11-12 against the Stage 1 commit `f4557ed4`. This records extraction requirements, not completed radio parity. The approved eight work packages remain inside Stage 2 of the ten-stage roadmap.

## Behavior owners and ordering

| Current source | Behavior that must survive without its form | Extraction owner / evidence |
|---|---|---|
| [Console.Main](file:///D:/workspace/Thetis/Project%20Files/Source/Console/console.cs#L1405) | Arguments, profile path, instance policy, logging, timer resolution, restart | Bootstrap; mode choice precedes Console/splash/native initialization |
| [Console constructor](file:///D:/workspace/Thetis/Project%20Files/Source/Console/console.cs#L608) | Culture, library checks, PortAudio STA enumeration, database, DSP creation, delayed profile application | Native lifetime and settings; preserve ordering and rollback |
| [InitConsole](file:///D:/workspace/Thetis/Project%20Files/Source/Console/console.cs#L1711) | Eager helpers, default per-band state, meters, CWX, seven serial listeners, EQ, Setup, XVTR, memories and profile replay | Background services; meter before GetState, CWX before serial listeners, delayed Setup initialization after profile recovery |
| [Console state persistence](file:///D:/workspace/Thetis/Project%20Files/Source/Console/console.cs#L2730) | Control-name keys plus explicit per-band, filter, calibration, squelch and topology values | Explicit settings bindings; retain unknown keys and Windows layout |
| [Setup persistence](file:///D:/workspace/Thetis/Project%20Files/Source/Console/setup.cs#L1519) | Sorted Options replay, forced updates, extra non-control settings, selective restore | Settings transactions; compare effective values, not just XML |
| [Database manager](file:///D:/workspace/Thetis/Project%20Files/Source/Console/clsDBMan.cs#L229) | Active DB selection, dbid, migration, backup and damaged-database handling | Typed startup prompts and settings lifetime; no silent overwrite |
| [RadioDSP](file:///D:/workspace/Thetis/Project%20Files/Source/Console/radio.cs#L103) | Wisdom prompt/rebuild, impulse cache, CMaster creation and destruction, TCI stream shutdown | Native lifetime; remove MessageBoxes from shared paths |
| [Audio.Start](file:///D:/workspace/Thetis/Project%20Files/Source/Console/audio.cs#L1767) | Hardware startup, errors, audio and route application | Audio service; remove global Console and cursor dependencies |
| [NetworkIO.InitRadio](file:///D:/workspace/Thetis/Project%20Files/Source/Console/HPSDR/NetworkIO.cs#L27) | NIC/radio selection, first-found scan, custom bypass, protocol/firmware checks, UDP ports | Form-independent connection inputs/results; Setup currently supplies ucRadioList |
| [CWX](file:///D:/workspace/Thetis/Project%20Files/Source/Console/cwx.cs#L755) | Queues, multimedia timer, CAT worker, PTT/keyer interactions | CWX runtime; presentation constructed separately |
| [CAT parsing](file:///D:/workspace/Thetis/Project%20Files/Source/Console/console.cs#L15610) | Serialized CAT commands currently marshaled to Console | External controller adapter; preserve responses and apply semantics |
| [Serial listeners](file:///D:/workspace/Thetis/Project%20Files/Source/Console/CAT/SIOListenerII.cs#L35) | Serial lifetime tied to Console.Closing, settings and failure feedback | Controller lifetime, no form-close dependency |
| [TCI listener](file:///D:/workspace/Thetis/Project%20Files/Source/Console/TCIServer.cs#L793) | State access, events, CWX, audio/IQ and PTT ownership | Shared state/command adapters; keep legacy framing/options and custom port |
| [ExitConsole](file:///D:/workspace/Thetis/Project%20Files/Source/Console/console.cs#L2672) and [Console_Closing](file:///D:/workspace/Thetis/Project%20Files/Source/Console/console.cs#L28076) | Stop jobs/listeners/meters, save settings, terminate audio, close DB, destroy network/DSP, restore OS timing and release instance | Shared idempotent shutdown; partial-start rollback and late callback rejection |

The initial service harness compiles the actual shared source without referencing System.Windows.Forms. This proves the new shared classes are form independent; it does not prove legacy startup has been migrated. Operational Code mode must not be enabled merely because these new classes pass.

## Contract foundation

The [managed contracts](file:///D:/workspace/Thetis/Project%20Files/Source/Console/RadioServices/RadioContracts.cs) and [browser contracts](file:///D:/workspace/Thetis/ui/thetis-extension/src/contracts.ts) share a [wire fixture](file:///D:/workspace/Thetis/tests/fixtures/radio-snapshot-v1.json). Snapshots are immutable and carry backend generation/revision. Receiver and VFO identities are separate. Unavailable frequencies use null, never the legacy negative sentinel.

The bounded dispatcher checks registered connection identity at admission and execution, consumes sequence identities before mutation, caches results and retains a high-water mark after eviction. A repeated sequence with different content is rejected. A completed native application publishes its effective result even if the caller disconnects; failures cannot invent successful state.

## Qualification boundary

The harness uses a fake command target to test state and dispatch behavior. No hardware, settings, CWX, frontend startup, controller migration or operational browser acceptance is established by those results. Each later package adds its own reference comparisons and evidence.
