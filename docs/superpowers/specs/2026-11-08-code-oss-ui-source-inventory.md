# Thetis UI source-surface inventory

Date: 2026-11-08. This is a static discovery inventory for the [reconstruction design](<D:/workspace/Thetis/docs/superpowers/specs/2026-11-08-code-oss-ui-reconstruction-design.md>) and [milestone plan](<D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-reconstruction.md>). It is not an interaction-level parity certificate.

## Scope and method

The scan follows explicit Compile entries in [Thetis.csproj](<D:/workspace/Thetis/Project Files/Source/Console/Thetis.csproj>), [Midi2Cat.csproj](<D:/workspace/Thetis/Project Files/Source/Midi2Cat/Midi2Cat.csproj>), [RawInput.csproj](<D:/workspace/Thetis/Project Files/Source/RawInput/RawInput.csproj>). It merges partial declarations by class name and follows the observed base-type chain for Form, DockContent and UserControl. It does not preprocess conditional compilation, execute constructors or prove reachability. Source-linked candidates include nested helpers, diagnostic classes and dormant forms. A source listed by a project is not proof that every declaration is active in a particular build configuration.

Observed: **236 project-listed C# files**, **56 distinct Form-derived class names** (51 Console, 5 Midi2Cat), **16 UserControl-derived class names**, and **89 Setup TabPage constructions**. No Form-derived class was discovered in the listed RawInput sources. Native dialogs, dynamically created controls, external library dialogs and one behavior exposed by several controls are not counted by these declarations.

Designer observations below count unique variable assignments to known WinForms/control-derived constructors in files containing InitializeComponent. Event observations count syntactic event hookups. Counts include labels, menus and containers, may include non-designer code in those files, and are not numbers of independent features. Setup pages may be hidden/removed according to model or driver capabilities.

## Form candidates and proposed editor milestone

| Class | Source declaration | Milestone | Classification / ownership |
|---|---|---|---|
| AmpView | [AmpView.cs](<D:/workspace/Thetis/Project Files/Source/Console/AmpView.cs:58>) | 7 | PureSignal plots |
| AndromedaEditForm | [AndromedaEditForm.cs](<D:/workspace/Thetis/Project Files/Source/Console/Andromeda/AndromedaEditForm.cs:36>) | 9 | Hardware-panel configuration |
| BandButtonsPopup | [BandButtonsPopup.cs](<D:/workspace/Thetis/Project Files/Source/Console/Andromeda/BandButtonsPopup.cs:36>) | 9 | Reusable band commands |
| CATTester | [CATTester.cs](<D:/workspace/Thetis/Project Files/Source/Console/CAT/CATTester.cs:13>) | 9 | CAT diagnostics |
| ColorPanel | [ColorButton.cs](<D:/workspace/Thetis/Project Files/Source/Console/ColorButton.cs:191>) | 8 | Color chooser helper |
| Console | [console.cs](<D:/workspace/Thetis/Project Files/Source/Console/console.cs:85>) | 3-5, 8 | Main operational surface; service extraction starts at milestone 2 |
| cwedit | [cwedit.cs](<D:/workspace/Thetis/Project Files/Source/Console/cwedit.cs:50>) | 6 | CW message editing |
| CWX | [cwx.cs](<D:/workspace/Thetis/Project Files/Source/Console/cwx.cs:69>) | 6 | Queued CW and backend timing |
| DisplaySettingsForm | [displaysettingsform.cs](<D:/workspace/Thetis/Project Files/Source/Console/Andromeda/displaysettingsform.cs:40>) | 9 | Reuses display settings |
| DiversityForm | [DiversityForm.cs](<D:/workspace/Thetis/Project Files/Source/Console/DiversityForm.cs:59>) | 7 | IQ/routing/calibration |
| EQForm | [eqform.cs](<D:/workspace/Thetis/Project Files/Source/Console/eqform.cs:54>) | 5 | Graphic/parametric EQ and profile coupling |
| FilterButtonsPopup | [FilterButtonsPopup.cs](<D:/workspace/Thetis/Project Files/Source/Console/Andromeda/FilterButtonsPopup.cs:35>) | 9 | Reusable filter commands |
| FilterForm | [FilterForm.cs](<D:/workspace/Thetis/Project Files/Source/Console/FilterForm.cs:52>) | 4 | Active preset editor |
| frmAbout | [frmAbout.cs](<D:/workspace/Thetis/Project Files/Source/Console/frmAbout.cs:50>) | 10 | Information/version view |
| frmAddCustomRadio | [frmAddCustomRadio.cs](<D:/workspace/Thetis/Project Files/Source/Console/frmAddCustomRadio.cs:54>) | 3 | Custom connection workflow |
| frmBandStack2 | [frmBandStack2.cs](<D:/workspace/Thetis/Project Files/Source/Console/frmBandStack2.cs:56>) | 4 | Band-stack controller/editor |
| frmBandwidth | [frmBandwidth.cs](<D:/workspace/Thetis/Project Files/Source/Console/frmBandwidth.cs:46>) | 10 | Network bandwidth diagnostics |
| frmCFCConfig | [frmCFCConfig.cs](<D:/workspace/Thetis/Project Files/Source/Console/frmCFCConfig.cs:53>) | 5 | CFC configuration |
| frmDBMan | [frmDBMan.cs](<D:/workspace/Thetis/Project Files/Source/Console/frmDBMan.cs:48>) | 10 | Database operations; shared persistence is foundational |
| frmFilterManager | [frmFilterManager.cs](<D:/workspace/Thetis/Project Files/Source/Console/frmFilterManager.cs:53>) | Triage | Compiled, unfinished/apparently unused; active editor is FilterForm |
| frmFinder | [frmFinder.cs](<D:/workspace/Thetis/Project Files/Source/Console/frmFinder.cs:55>) | 10 | Settings/help navigation |
| frmInfoBarPopup | [frmInfoBarPopup.cs](<D:/workspace/Thetis/Project Files/Source/Console/frmInfoBarPopup.cs:53>) | 8, 10 | Information/action popup |
| frmIPv4Picker | [frmIPv4Picker.cs](<D:/workspace/Thetis/Project Files/Source/Console/frmIPv4Picker.cs:49>) | 3 | NIC/address selection helper |
| frmLog | [frmLog.cs](<D:/workspace/Thetis/Project Files/Source/Console/frmLog.cs:46>) | 10 | General logs |
| frmMacroButtonConfig | [frmMacroButtonConfig.cs](<D:/workspace/Thetis/Project Files/Source/Console/frmMacroButtonConfig.cs:48>) | 8 | Macro button configuration |
| frmMeterDisplay | [frmMeterDisplay.cs](<D:/workspace/Thetis/Project Files/Source/Console/frmMeterDisplay.cs:49>) | 8 | Meter/gadget containers |
| frmNotchPopup | [frmNotchPopup.cs](<D:/workspace/Thetis/Project Files/Source/Console/frmNotchPopup.cs:48>) | 4 | Notch interaction |
| frmQuickRecallPopupList | [frmQuickRecallPopupList.cs](<D:/workspace/Thetis/Project Files/Source/Console/frmQuickRecallPopupList.cs:47>) | 4 | Quick recall |
| frmReleaseNotes | [frmReleaseNotes.cs](<D:/workspace/Thetis/Project Files/Source/Console/frmReleaseNotes.cs:55>) | 10 | Release information |
| frmSeqLog | [frmSeqLog.cs](<D:/workspace/Thetis/Project Files/Source/Console/frmSeqLog.cs:54>) | 10 | Sequence diagnostics |
| frmSerialPortPicker | [frmSerialPortPicker.cs](<D:/workspace/Thetis/Project Files/Source/Console/frmSerialPortPicker.cs:48>) | 9 | Backend serial-port selection |
| frmVariablePicker | [frmVariablePicker.cs](<D:/workspace/Thetis/Project Files/Source/Console/frmVariablePicker.cs:48>) | 8-9 | Macro variable helper |
| InputBox | [InputBox.cs](<D:/workspace/Thetis/Project Files/Source/Console/InputBox.cs:47>) | Cross-cutting | Generic input helper |
| LogForm | [clsProgressLog.cs](<D:/workspace/Thetis/Project Files/Source/Console/clsProgressLog.cs:413>) | Cross-cutting | Nested progress-log helper |
| MemoryForm | [MemoryForm.cs](<D:/workspace/Thetis/Project Files/Source/Console/Memory/MemoryForm.cs:45>) | 4, 6 | CRUD/recall first; scheduler and recording later |
| ModeButtonsPopup | [ModeButtonsPopup.cs](<D:/workspace/Thetis/Project Files/Source/Console/Andromeda/ModeButtonsPopup.cs:35>) | 9 | Reusable mode commands |
| ModeDependentSettingsForm | [ModeDependentSettingsForm.cs](<D:/workspace/Thetis/Project Files/Source/Console/Andromeda/ModeDependentSettingsForm.cs:36>) | 9 | Reuses qualified mode controls |
| Path_Illustrator | [Path_Illustrator.cs](<D:/workspace/Thetis/Project Files/Source/Console/Path_Illustrator.cs:12>) | 7 | RF route illustration |
| Progress | [progress.cs](<D:/workspace/Thetis/Project Files/Source/Console/progress.cs:51>) | Cross-cutting | Progress helper |
| PSForm | [PSForm.cs](<D:/workspace/Thetis/Project Files/Source/Console/PSForm.cs:57>) | 7 | PureSignal controller |
| RAForm | [RAForm.cs](<D:/workspace/Thetis/Project Files/Source/Console/RAForm.cs:55>) | 10 | Radio Astronomy acquisition/CSV |
| rxa | [rxa.cs](<D:/workspace/Thetis/Project Files/Source/Console/rxa.cs:15>) | Triage | Compiled; construction/exposure found commented out |
| SelectFormsForReposition | [setup.cs](<D:/workspace/Thetis/Project Files/Source/Console/setup.cs:37458>) | 8 | WinForms-specific window helper; define equivalent workbench layout-reset behavior |
| Setup | [setup.cs](<D:/workspace/Thetis/Project Files/Source/Console/setup.cs:76>) | 2-10 | Split by feature family; configuration/startup dependencies come first |
| ShutdownForm | [ShutdownForm.cs](<D:/workspace/Thetis/Project Files/Source/Console/ShutdownForm.cs:53>) | 2, 10 | Shutdown progress/lifecycle |
| SliderSettingsForm | [SliderSettingsForm.cs](<D:/workspace/Thetis/Project Files/Source/Console/Andromeda/SliderSettingsForm.cs:35>) | 9 | Reuses gain/slider commands |
| SpectrumTestForm | [clsSpectrumProcessor.cs](<D:/workspace/Thetis/Project Files/Source/Console/clsSpectrumProcessor.cs:1064>) | Triage | Diagnostic/test helper; runtime reachability not established |
| Splash | [splash.cs](<D:/workspace/Thetis/Project Files/Source/Console/splash.cs:58>) | 2, 10 | Bootstrap progress; Code mode must not construct WinForms splash |
| VFOSettingsPopup | [vfosettingspopup.cs](<D:/workspace/Thetis/Project Files/Source/Console/Andromeda/vfosettingspopup.cs:36>) | 9 | Reuses VFO commands |
| wideband | [wideband.cs](<D:/workspace/Thetis/Project Files/Source/Console/wideband.cs:14>) | 10 | Separate wideband acquisition route |
| XVTRForm | [xvtr.cs](<D:/workspace/Thetis/Project Files/Source/Console/xvtr.cs:47>) | 7 | Frequency translation/band/power |
| LoadDialog | [LoadDialog.cs](<D:/workspace/Thetis/Project Files/Source/Midi2Cat/Midi2Cat.IO/LoadDialog.cs:36>) | 9 | MIDI load helper |
| Midi2CatSetupForm | [Midi2CatSetupForm.cs](<D:/workspace/Thetis/Project Files/Source/Midi2Cat/Midi2CatSetupForm.cs:38>) | 9 | MIDI configuration |
| OrganiseDialog | [OrganiseDialog.cs](<D:/workspace/Thetis/Project Files/Source/Midi2Cat/Midi2Cat.IO/OrganiseDialog.cs:37>) | 9 | MIDI mapping organization |
| PickDialog | [PickDialog.cs](<D:/workspace/Thetis/Project Files/Source/Midi2Cat/Midi2Cat.IO/PickDialog.cs:36>) | 9 | MIDI selection helper |
| SaveAsDialog | [SaveAsDialog.cs](<D:/workspace/Thetis/Project Files/Source/Midi2Cat/Midi2Cat.IO/SaveAsDialog.cs:36>) | 9 | MIDI save helper |

## UserControl candidates

| Class | Source declaration | Milestone |
|---|---|---|
| MidiDeviceSetup | [MidiDeviceSetup.cs](<D:/workspace/Thetis/Project Files/Source/Midi2Cat/Midi2Cat.IO/MidiDeviceSetup.cs:46>) | 9 |
| ucBandwidthView | [ucBandwidthView.cs](<D:/workspace/Thetis/Project Files/Source/Console/ucBandwidthView.cs:48>) | 4 |
| ucGradientDefault | [ucGradientDefault.cs](<D:/workspace/Thetis/Project Files/Source/Console/ucGradientDefault.cs:49>) | 8 |
| ucInfoBar | [ucInfoBar.cs](<D:/workspace/Thetis/Project Files/Source/Console/ucInfoBar.cs:52>) | 3, 8 |
| ucLGPicker | [ucLGPicker.cs](<D:/workspace/Thetis/Project Files/Source/Console/ucLGPicker.cs:55>) | 8 |
| ucMeter | [ucMeter.cs](<D:/workspace/Thetis/Project Files/Source/Console/ucMeter.cs:60>) | 8 |
| ucOCLedStrip | [ucOCLedStrip.cs](<D:/workspace/Thetis/Project Files/Source/Console/ucOCLedStrip.cs:53>) | 7-8 |
| ucOtherButtonsOptionsGrid | [ucOtherButtonsOptionsGrid.cs](<D:/workspace/Thetis/Project Files/Source/Console/ucOtherButtonsOptionsGrid.cs:842>) | 8 |
| ucParametricEq | [ucParametricEq.cs](<D:/workspace/Thetis/Project Files/Source/Console/ucParametricEq.cs:52>) | 5 |
| ucProgress | [ucProgress.cs](<D:/workspace/Thetis/Project Files/Source/Console/ucProgress.cs:53>) | Cross-cutting |
| ucQuickRecall | [ucQuickRecall.cs](<D:/workspace/Thetis/Project Files/Source/Console/ucQuickRecall.cs:50>) | 4 |
| ucRadioList | [ucRadioList.cs](<D:/workspace/Thetis/Project Files/Source/Console/ucRadioList.cs:53>) | 3 |
| ucSignalSelect | [ucSignalSelect.cs](<D:/workspace/Thetis/Project Files/Source/Console/ucSignalSelect.cs:53>) | 3-7 |
| ucTunestepOptionsGrid | [ucTunestepOptionsGrid.cs](<D:/workspace/Thetis/Project Files/Source/Console/ucTunestepOptionsGrid.cs:48>) | 8 |
| ucUnderOverFlowWarningViewer | [ucUnderOverFlowWarningViewer.cs](<D:/workspace/Thetis/Project Files/Source/Console/ucUnderOverFlowWarningViewer.cs:54>) | 10 |
| ucVARGrapher | [ucVARGrapher.cs](<D:/workspace/Thetis/Project Files/Source/Console/ucVARGrapher.cs:49>) | 4 |

Custom primitives such as PrettyTrackBar, PanDisplay, ColorButton and thread-aware WinForms wrappers are not standalone forms. Reimplement their user-visible interactions in shared browser controls; do not expose their concrete WinForms types as an application protocol.

## Setup TabPage candidates

Paths are recovered from static Controls.Add relationships and Text labels. The fourteen unnamed-by-role tabPage variables belong to the meter/gadget settings editor; that ownership is shown explicitly below. Paths are candidate ownership labels, not a guarantee of visibility in every model. Source links point to object construction; associated behavior is in [setup.cs](<D:/workspace/Thetis/Project Files/Source/Console/setup.cs>).

| Page variable | Ownership / label path | Proposed editor milestone | Source |
|---|---|---|
| tpGeneral | Setup / General | 3 (required state: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:211>) |
| tpGeneralHardware | Setup / General / H/W Select | 3 (required state: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:213>) |
| tpGeneralOptions | Setup / General / Options | 10 (required startup behavior: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:270>) |
| tpOptions1 | Setup / General / Options / Options-1 | 10 (required startup behavior: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:272>) |
| tpOptions2 | Setup / General / Options / Options-2 | 10 (required startup behavior: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:337>) |
| tpOptions3 | Setup / General / Options / Options-3 | 10 (required startup behavior: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:405>) |
| tpOptionsStartUp | Setup / General / Options / StartUp Options | 10 (required startup behavior: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:414>) |
| tpGeneralCalibration | Setup / General / Calibration | 7 (required state: 2-3) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:466>) |
| tpFilters | Setup / General / Filters | 7 (required state: 2-3) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:500>) |
| tpADC | Setup / General / ADC | 7 (required state: 2-3) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:532>) |
| tpPennyCtrl | Setup / General / Penny/Hermes Ctrl | 7 (required state: 2-3) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:602>) |
| tpOCHFControl | Setup / General / Penny/Hermes Ctrl / HF | 7 (required state: 2-3) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:604>) |
| tbOCVHFControl | Setup / General / Penny/Hermes Ctrl / VHF | 7 (required state: 2-3) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:862>) |
| tpOCSWLControl | Setup / General / Penny/Hermes Ctrl / SWL | 7 (required state: 2-3) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:1101>) |
| tpHPSDR | Setup / General / F/W Set | 7 (required state: 2-3) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:1370>) |
| tpAlexControl | Setup / General / Alex | 7 (required state: 2-3) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:1399>) |
| tpAlexFilterControl | Setup / General / Alex / Alex-1 Filters | 7 (required state: 2-3) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:1401>) |
| tpAlex2FilterControl | Setup / General / Alex / Alex-2 Filters | 7 (required state: 2-3) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:1515>) |
| tpOtherHW | Setup / General / Other H/W | 7 (required state: 2-3) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:1583>) |
| tpApolloApollo | Setup / General / Other H/W / Apollo | 7 (required state: 2-3) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:1585>) |
| tpApolloATU | Setup / General / Other H/W / ATU | 7 (required state: 2-3) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:1589>) |
| tpOtherHW_amp | Setup / General / Other H/W / Amp | 7 (required state: 2-3) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:1611>) |
| tpRX2 | Setup / General / RX2 | 4 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:1621>) |
| tpGeneralNavigation | Setup / General / Navigation | 10 (required startup behavior: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:1626>) |
| tpAudio | Setup / Audio | 5-6 (startup values: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:1636>) |
| tpVAC | Setup / Audio / VAC 1 | 5-6 (startup values: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:1638>) |
| tpVAC2 | Setup / Audio / VAC 2 | 5-6 (startup values: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:1724>) |
| tpAudioOptions | Setup / Audio / Options | 5-6 (startup values: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:1807>) |
| tpAdvancedAudio | Setup / Audio / Advanced | 5-6 (startup values: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:1819>) |
| tpCMAsio | Setup / Audio / cmASIO | 5-6 (startup values: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:1894>) |
| tpAudioRecording | Setup / Audio / Recording | 6 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:1918>) |
| tpDisplay | Setup / Display | 4, 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:1986>) |
| tpDisplayGeneral | Setup / Display / General | 4, 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:1988>) |
| tpDisplayTop | Setup / Display / RX 1 | 4, 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:2052>) |
| tpDisplayBottom | Setup / Display / RX 2 | 4, 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:2128>) |
| tpDisplayTransmit | Setup / Display / TX | 4, 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:2204>) |
| tpDSP | Setup / DSP | 5-6 (startup values: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:2251>) |
| tpDSPOptions | Setup / DSP / Options | 5-6 (startup values: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:2253>) |
| tpDSPKeyer | Setup / DSP / CW | 5-6 (startup values: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:2328>) |
| tpDSPAGCALC | Setup / DSP / AGC/ALC | 5-6 (startup values: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:2363>) |
| tpDSPAMSAM | Setup / DSP / AM/SAM | 5-6 (startup values: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:2417>) |
| tpDSPFM | Setup / DSP / FM | 5-6 (startup values: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:2453>) |
| tpDSPAudio | Setup / DSP / Audio | 5-6 (startup values: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:2477>) |
| tpDSPEER | Setup / DSP / EER | 5-6 (startup values: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:2545>) |
| tpDSPNR | Setup / DSP / NR/ANF | 5-6 (startup values: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:2562>) |
| tpDSPMNF | Setup / DSP / MNF | 5-6 (startup values: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:2697>) |
| tpDSPNB | Setup / DSP / NB/SNB | 5-6 (startup values: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:2714>) |
| tpDSPVOXDE | Setup / DSP / VOX/DE | 5-6 (startup values: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:2732>) |
| tpDSPCFC | Setup / DSP / CFC | 5-6 (startup values: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:2767>) |
| tpTransmit | Setup / Transmit | 5-6 (startup values: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:2830>) |
| tpPowerAmplifier | Setup / PA Settings | 7 (required state: 2-3) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:2897>) |
| tpGainByBand | Setup / PA Settings / PA Gain | 7 (required state: 2-3) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:2899>) |
| tpWattMeter | Setup / PA Settings / Watt Meter | 7 (required state: 2-3) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:3004>) |
| tpAppearance | Setup / Appearance | 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:3119>) |
| tpAppearanceGeneral | Setup / Appearance / General | 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:3121>) |
| tpAppearanceDisplay | Setup / Appearance / RX Display | 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:3181>) |
| tcAppearanceTXDisplay | Setup / Appearance / TX Display | 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:3245>) |
| tpGradients | Setup / Appearance / Gradients | 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:3282>) |
| tpAppearanceMeter | Setup / Appearance / Meter | 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:3328>) |
| tpAppearanceMeter2 | Setup / Appearance / Meters/Gadgets | 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:3356>) |
| tpAppearanceCollapsible | Setup / Appearance / Collapsible Display | 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:3445>) |
| tpSkinServers | Setup / Appearance / Skin Servers | 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:3454>) |
| tpLegacyItems | Setup / Appearance / Legacy Items | 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:3478>) |
| tpKeyboard | Setup / Keyboard | 9 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:3495>) |
| tpCATControl | Setup / Serial/Network/Midi CAT | 9 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:3565>) |
| tpCATSerialPorts | Setup / Serial/Network/Midi CAT / Serial | 9 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:3567>) |
| tpTCITCPIPN1MM | Setup / Serial/Network/Midi CAT / Network | 9 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:3626>) |
| tbMIDIcat | Setup / Serial/Network/Midi CAT / MIDI | 9 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:3700>) |
| tpCAToptions | Setup / Serial/Network/Midi CAT / Options | 9 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:3711>) |
| tpUserInterface | Setup / Serial/Network/Midi CAT / User Interface | 9 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:3735>) |
| tpAndromeda | Setup / Serial/Network/Midi CAT / Andromeda | 9 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:3753>) |
| tpMultiMetersIO | Setup / Serial/Network/Midi CAT / Multi Meter I/O | 9 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:3770>) |
| tpDiscord | Setup / Serial/Network/Midi CAT / Discord Link | 9 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:3818>) |
| tpTests | Setup / Tests | 10 (required startup behavior: 2) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:3838>) |
| tabPage1 | Setup / Appearance / Meters/Gadgets / Properties / history | 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:4117>) |
| tabPage2 | Setup / Appearance / Meters/Gadgets / Properties / web | 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:4145>) |
| tabPage4 | Setup / Appearance / Meters/Gadgets / Properties / textoverlay | 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:4173>) |
| tabPage5 | Setup / Appearance / Meters/Gadgets / Properties / clock | 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:4198>) |
| tabPage6 | Setup / Appearance / Meters/Gadgets / Properties / spacer | 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:4203>) |
| tabPage7 | Setup / Appearance / Meters/Gadgets / Properties / buttonbox | 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:4210>) |
| tabPage8 | Setup / Appearance / Meters/Gadgets / Properties / led | 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:4256>) |
| tabPage9 | Setup / Appearance / Meters/Gadgets / Properties / dataout | 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:4283>) |
| tabPage10 | Setup / Appearance / Meters/Gadgets / Properties / vfo | 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:4288>) |
| tabPage11 | Setup / Appearance / Meters/Gadgets / Properties / rotator | 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:4308>) |
| tabPage12 | Setup / Appearance / Meters/Gadgets / Properties / filter | 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:4330>) |
| tabPage13 | Setup / Appearance / Meters/Gadgets / Properties / dial | 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:4383>) |
| tabPage14 | Setup / Appearance / Meters/Gadgets / Properties / custom | 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:4419>) |
| tabPage15 | Setup / Appearance / Meters/Gadgets / Properties / wavelistplayer | 8 | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:4431>) |
| tpAlexAntCtrl | Setup / General / Alex / Antenna | 7 (required state: 2-3) | [designer](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:4500>) |

Examples of conditional visibility occur in [hardware tab removal](<D:/workspace/Thetis/Project Files/Source/Console/setup.cs:6382>) and [cmASIO tab removal](<D:/workspace/Thetis/Project Files/Source/Console/setup.cs:32419>). Functional parity includes the conditions and persisted values, not merely the labels.

## Largest static designer/control observations

| Owner / file | Physical source lines | Control-construction observations | Event-hookup observations |
|---|---:|---:|---:|
| [Setup / setup.designer.cs](<D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs>) | 77118 | 4472 | 2624 |
| [Console / console.Designer.cs](<D:/workspace/Thetis/Project Files/Source/Console/console.Designer.cs>) | 7929 | 624 | 587 |
| [XVTRForm / xvtr.cs](<D:/workspace/Thetis/Project Files/Source/Console/xvtr.cs>) | 6035 | 223 | 99 |
| [Path_Illustrator / Path_Illustrator.Designer.cs](<D:/workspace/Thetis/Project Files/Source/Console/Path_Illustrator.Designer.cs>) | 2028 | 150 | 4 |
| [EQForm / eqform.cs](<D:/workspace/Thetis/Project Files/Source/Console/eqform.cs>) | 3645 | 99 | 75 |
| [frmMacroButtonConfig / frmMacroButtonConfig.Designer.cs](<D:/workspace/Thetis/Project Files/Source/Console/frmMacroButtonConfig.Designer.cs>) | 1109 | 74 | 55 |
| [DiversityForm / DiversityForm.cs](<D:/workspace/Thetis/Project Files/Source/Console/DiversityForm.cs>) | 2937 | 59 | 47 |
| [MidiDeviceSetup / MidiDeviceSetup.designer.cs](<D:/workspace/Thetis/Project Files/Source/Midi2Cat/Midi2Cat.IO/MidiDeviceSetup.designer.cs>) | 1214 | 56 | 33 |
| [PSForm / PSForm.designer.cs](<D:/workspace/Thetis/Project Files/Source/Console/PSForm.designer.cs>) | 970 | 54 | 24 |
| [frmFilterManager / frmFilterManager.Designer.cs](<D:/workspace/Thetis/Project Files/Source/Console/frmFilterManager.Designer.cs>) | 707 | 50 | 1 |
| [RAForm / RAForm.Designer.cs](<D:/workspace/Thetis/Project Files/Source/Console/RAForm.Designer.cs>) | 940 | 50 | 16 |
| [SliderSettingsForm / SliderSettingsForm.cs](<D:/workspace/Thetis/Project Files/Source/Console/Andromeda/SliderSettingsForm.cs>) | 1573 | 49 | 31 |
| [CWX / cwx.cs](<D:/workspace/Thetis/Project Files/Source/Console/cwx.cs>) | 2647 | 45 | 47 |
| [frmCFCConfig / frmCFCConfig.Designer.cs](<D:/workspace/Thetis/Project Files/Source/Console/frmCFCConfig.Designer.cs>) | 815 | 35 | 30 |
| [MemoryForm / MemoryForm.Designer.cs](<D:/workspace/Thetis/Project Files/Source/Console/Memory/MemoryForm.Designer.cs>) | 569 | 29 | 22 |
| [ucTunestepOptionsGrid / ucTunestepOptionsGrid.Designer.cs](<D:/workspace/Thetis/Project Files/Source/Console/ucTunestepOptionsGrid.Designer.cs>) | 439 | 28 | 0 |
| [frmSeqLog / frmSeqLog.Designer.cs](<D:/workspace/Thetis/Project Files/Source/Console/frmSeqLog.Designer.cs>) | 460 | 27 | 11 |
| [FilterForm / FilterForm.cs](<D:/workspace/Thetis/Project Files/Source/Console/FilterForm.cs>) | 969 | 25 | 24 |
| [frmDBMan / frmDBMan.Designer.cs](<D:/workspace/Thetis/Project Files/Source/Console/frmDBMan.Designer.cs>) | 556 | 24 | 22 |
| [frmBandStack2 / frmBandStack2.Designer.cs](<D:/workspace/Thetis/Project Files/Source/Console/frmBandStack2.Designer.cs>) | 376 | 19 | 16 |

## Main menu entry points

The [Console designer](<D:/workspace/Thetis/Project Files/Source/Console/console.Designer.cs:4100>) declares these top-level candidates; their text is recovered from [Console resources](<D:/workspace/Thetis/Project Files/Source/Console/console.resx>). Runtime visibility changes with the layout/mode. Each submenu and context action still needs its own behavior-ledger rows.

| Menu label | Designer identifier |
|---|---|
| Setup | setupToolStripMenuItem |
| Memory | memoryToolStripMenuItem |
| Equalizer | equalizerToolStripMenuItem |
| XVTRs | xVTRsToolStripMenuItem |
| CWX | cWXToolStripMenuItem |
| Diversity | eSCToolStripMenuItem |
| Collapse | collapseToolStripMenuItem |
| Display Controls | displayControlsToolStripMenuItem |
| DSP | dSPToolStripMenuItem |
| Band | bandToolStripMenuItem |
| Mode | modeToolStripMenuItem |
| Filter | filterToolStripMenuItem |
| RX2 | rX2ToolStripMenuItem |
| Linearity | linearityToolStripMenuItem |
| RA | RAtoolStripMenuItem |
| WB | wBToolStripMenuItem |
| PI | pIToolStripMenuItem |
| BPF | BPFToolStripMenuItem |
| Finder | finderMenuItem |
| About | miAbout |

## Functional inventory beyond windows

- [SpotManager2](<D:/workspace/Thetis/Project Files/Source/Console/SpotManager2.cs:54>) and [Console spot interactions](<D:/workspace/Thetis/Project Files/Source/Console/console.cs:48873>) belong to milestone 4, with final display variants in milestone 8. TCI/SWL spot lifetime, metadata, receiver-specific tuning/mode changes, lookup and outbound notifications require separate behavior rows.
- [DisplayMode](<D:/workspace/Thetis/Project Files/Source/Console/enums.cs:134>) includes spectrum, panadapter, scope/scope2, phase/phase2, waterfall, histogram, panafall, panascope, spectrascope and off. Primary spectrum/waterfall is an early slice; the other modes remain parity work.
- [MeterType](<D:/workspace/Thetis/Project Files/Source/Console/MeterManager.cs:178>) includes operating controls and recording/playback gadgets as well as measurements. Gadget behavior needs its own rows.
- [Memory scheduling](<D:/workspace/Thetis/Project Files/Source/Console/Memory/MemoryForm.cs:1010>) and [PureSignal control](<D:/workspace/Thetis/Project Files/Source/Console/PSForm.cs:63>) demonstrate behavior owned by form lifetimes. Move the behavior to backend services before treating the replacement as a passive panel.
- [CAT commands](<D:/workspace/Thetis/Project Files/Source/Console/CAT/CATCommands.cs>), [MIDI commands](<D:/workspace/Thetis/Project Files/Source/Console/Midi2CatCommands.cs>) and [TCI](<D:/workspace/Thetis/Project Files/Source/Console/TCIServer.cs>) are parallel command sources. Their state/feedback contracts belong in parity tests.
- The old manual describes Wave/DX interfaces that do not map one-to-one to the current compile-listed forms. Reconcile those workflows with current recording/gadget/spot handling; do not infer active functionality solely from old screenshots.

## Next inventory expansion

For each reachable surface, record separate rows for value edits, validation failures, mouse/digit/wheel behavior, context menus, keyboard actions, defaults/reset, Apply/Cancel, persistence, capability restrictions, external-controller updates and closing/reopening. Repeated controls can share a backend operation but retain separate interaction tests where semantics differ. This expansion is milestone 0 work; the present inventory provides the source-backed starting set.
