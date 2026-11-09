"""Regenerate source discovery rows; review behavior/manual mappings before committing."""
import json
import re
from functools import cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INVENTORY = 'docs/superpowers/specs/2026-11-08-code-oss-ui-source-inventory.md'
MANUAL = 'Documentation/Radio/Thetis manual_1.1.pdf'
CONSOLE = 'Project Files/Source/Console/console.cs'
DESIGNER = 'Project Files/Source/Console/console.Designer.cs'
SETUP = 'Project Files/Source/Console/setup.cs'

def ref(path, line=1, symbol=None):
    result = {'path': path, 'line': line, 'href': 'file:///D:/workspace/Thetis/' + path.replace(' ', '%20') + '#L' + str(line)}
    if symbol:
        result['symbol'] = symbol
    return result

@cache
def source_text(path):
    return (ROOT / path).read_text(encoding='utf-8-sig', errors='replace')

@cache
def method(path, symbol):
    source = source_text(path)
    match = re.search(r'^[\t ]*(?:unsafe[\t ]+)?(?:private|public|protected|internal)\s+[^\n;{}=]*\b' + re.escape(symbol) + r'\s*\(', source, re.M)
    if not match:
        raise ValueError('No actual method declaration: ' + symbol)
    return ref(path, source[:match.start()].count('\n') + 1, symbol)

def manual(page, scope='contextual', note=None):
    result = {'path': MANUAL, 'page': page, 'kind': 'historical-manual', 'scope': scope,
              'href': 'file:///D:/workspace/Thetis/Documentation/Radio/Thetis%20manual_1.1.pdf#page=' + str(page)}
    if note:
        result['note'] = note
    return result

def image_ref():
    return {'path': 'docs/ui-parity/reference/manual-1.1-page-10.png', 'kind': 'historical-manual',
            'sourcePdf': MANUAL, 'page': 10, 'scope': 'expanded-console-layout',
            'href': 'file:///D:/workspace/Thetis/docs/ui-parity/reference/manual-1.1-page-10.png'}

TARGETS = {
    'Console': 'thetis.console', 'Setup': 'thetis.setup', 'AmpView': 'thetis.rf.amplitude',
    'PSForm': 'thetis.rf.pureSignal', 'DiversityForm': 'thetis.rf.diversity',
    'EQForm': 'thetis.audio.eq', 'frmCFCConfig': 'thetis.audio.cfc', 'FilterForm': 'thetis.filters.editor',
    'frmBandStack2': 'thetis.memories.bandStack', 'MemoryForm': 'thetis.memories.editor',
    'CWX': 'thetis.tasks.cwx', 'cwedit': 'thetis.cw.definitions', 'XVTRForm': 'thetis.rf.xvtr',
    'Path_Illustrator': 'thetis.rf.paths', 'wideband': 'thetis.diagnostics.wideband',
    'RAForm': 'thetis.diagnostics.radioAstronomy', 'frmLog': 'thetis.logs.engine',
    'frmSeqLog': 'thetis.logs.sequence', 'CATTester': 'thetis.logs.cat',
    'frmBandwidth': 'thetis.diagnostics.bandwidth', 'frmAbout': 'thetis.about',
    'frmReleaseNotes': 'thetis.releaseNotes', 'frmDBMan': 'thetis.database', 'frmFinder': 'thetis.finder',
    'frmMeterDisplay': 'thetis.display.meters', 'ucMeter': 'thetis.receiver.meters',
    'frmNotchPopup': 'thetis.console.notch', 'frmQuickRecallPopupList': 'thetis.memories.quickRecall',
    'ucQuickRecall': 'thetis.memories.quickRecall', 'ucRadioList': 'thetis.operation.device',
    'frmAddCustomRadio': 'thetis.connection.customRadio', 'frmIPv4Picker': 'thetis.connection.nic',
    'SelectFormsForReposition': 'thetis.layout.restoreDefault', 'ucInfoBar': 'thetis.operation.device',
    'MidiDeviceSetup': 'thetis.controllers.midi.device', 'Midi2CatSetupForm': 'thetis.controllers.midi',
}
PAGES = {'Console':10,'AmpView':60,'PSForm':59,'DiversityForm':57,'EQForm':56,'FilterForm':40,
         'frmBandStack2':54,'MemoryForm':54,'CWX':57,'cwedit':57,'XVTRForm':56,'Path_Illustrator':63,
         'RAForm':60,'wideband':62,'AndromedaEditForm':106,'SliderSettingsForm':63,'BandButtonsPopup':64,
         'ModeButtonsPopup':64,'FilterButtonsPopup':65,'DisplaySettingsForm':65,'VFOSettingsPopup':66,
         'ModeDependentSettingsForm':66,'Setup':67,'frmMeterDisplay':98,'ucMeter':98,
         'ucParametricEq':56,'frmCFCConfig':93,'ucBandwidthView':40,'ucVARGrapher':40,
         'ucQuickRecall':37,'frmQuickRecallPopupList':37,'frmNotchPopup':90,'ucRadioList':67,
         'Midi2CatSetupForm':123,'MidiDeviceSetup':123,'frmInfoBarPopup':51,'ucInfoBar':51}

def setup_page(label):
    parts = label.split(' / ')
    family = parts[1]
    if family != 'General':
        return {'Audio':78,'Display':80,'DSP':83,'Transmit':94,'PA Settings':95,'Appearance':96,
                'Keyboard':100,'Serial/Network/Midi CAT':101,'Tests':104}.get(family,67)
    checks = [('H/W Select',67),('Calibration',71),('ADC',69),('Options',69),('F/W',68),('RX2',77),
              ('Navigation',77),('Penny',72),('Alex',72),('Other H/W',73),('Filters',76)]
    for needle, page in checks:
        if needle in label:
            return page
    return 67

def descendants(designer, parent):
    tree = {}
    for owner, child in re.findall(r'this\.(\w+)\.Controls\.Add\(this\.(\w+)\)', designer):
        tree.setdefault(owner, []).append(child)
    result, pending = set(), [parent]
    while pending:
        item = pending.pop()
        if item not in result:
            result.add(item)
            pending += tree.get(item, [])
    return result

def event_refs(path, control=None):
    source_path = ROOT / path
    source = source_text(path)
    companions = [source_path]
    for name in [source_path.stem + '.Designer.cs', source_path.stem + '.designer.cs']:
        candidate = source_path.with_name(name)
        if candidate.exists() and candidate not in companions:
            companions.append(candidate)
    texts = [source_text(str(item.relative_to(ROOT))) for item in companions]
    hookups = '\n'.join(texts)
    allowed = descendants(hookups, control) if control else None
    handlers = []
    for owner, handler in re.findall(r'this\.(\w+)\.\w+\s*\+=\s*new\s+[\w.]+\(this\.(\w+)\)', hookups):
        if allowed is not None and owner not in allowed:
            continue
        if handler in [item.get('symbol') for item in handlers]:
            continue
        try:
            handlers.append(method(path, handler))
        except ValueError:
            continue
        if len(handlers) == 4:
            break
    return handlers

candidates, kind = [], None
for line in (ROOT / INVENTORY).read_text(encoding='utf-8-sig').splitlines():
    if line.startswith('## Form candidates'):
        kind = 'Form'
    elif line.startswith('## UserControl candidates'):
        kind = 'UserControl'
    elif line.startswith('## Setup TabPage candidates'):
        kind = 'SetupTabPage'
    elif line.startswith('## '):
        kind = None
    if not kind or not line.startswith('| '):
        continue
    cols = [part.strip() for part in line.split('|')[1:-1]]
    link = re.search(r'<D:/workspace/Thetis/(.+?):(\d+)>', line)
    if not link or cols[0] in ('Class','Variable'):
        continue
    name = cols[0]
    source, source_line = link.group(1), int(link.group(2))
    inventory_step = cols[2]
    primary = re.search(r'\d+', inventory_step)
    owner = 'Stage' + str(int(primary.group()) if primary else (1 if inventory_step == 'Triage' else 2)).zfill(2)
    label = cols[1] if kind == 'SetupTabPage' else name
    target = ('thetis.setup.' + name) if kind == 'SetupTabPage' else TARGETS.get(name)
    if not target:
        if '/Andromeda/' in source:
            target = 'thetis.controllers.andromeda.' + name
        elif '/Midi2Cat/' in source:
            target = 'thetis.controllers.midi.' + name
        else:
            target = 'thetis.helpers.' + name
    reachability = 'source-candidate-not-runtime-proven'
    note = 'Compile-listed/static declaration; runtime exposure and per-action parity remain to be qualified.'
    if name == 'rxa':
        reachability, note = 'dormant-commented-construction', 'Construction/exposure in cmaster is commented out; do not invent an active extra receiver.'
    elif name == 'frmFilterManager':
        reachability, note = 'unfinished-apparently-unused', 'No established active editor route; FilterForm is the active preset editor.'
    elif name == 'SpectrumTestForm':
        reachability, note = 'diagnostic-unproven', 'Diagnostic helper; no normal operator reachability established.'
    elif name in ('LogForm','InputBox','Progress','ucProgress','ShutdownForm','Splash'):
        reachability, note = 'cross-cutting-lifecycle-helper', 'Preserve required behavior with its owning lifecycle; Code-only startup must not construct WinForms helpers.'
    page = setup_page(label) if kind == 'SetupTabPage' else PAGES.get(name, 67 if owner == 'Stage02' else 51)
    historical_surfaces = {'Console','AmpView','PSForm','DiversityForm','EQForm','FilterForm','frmBandStack2','MemoryForm',
        'CWX','cwedit','XVTRForm','Path_Illustrator','RAForm','wideband','AndromedaEditForm','SliderSettingsForm',
        'BandButtonsPopup','ModeButtonsPopup','FilterButtonsPopup','DisplaySettingsForm','VFOSettingsPopup',
        'ModeDependentSettingsForm','Setup','frmCFCConfig'}
    scope = 'matching-historical-surface' if name in historical_surfaces else 'contextual'
    if kind == 'SetupTabPage':
        scope = 'contextual-page-family'
    handlers = event_refs(SETUP if kind == 'SetupTabPage' else source, name if kind == 'SetupTabPage' else None)
    declaration = ref(source, source_line, name)
    candidates.append({'id': kind + ':' + name, 'kind':kind, 'name':name, 'sourceClass': 'Setup' if kind == 'SetupTabPage' else name,
        'inventoryStep':inventory_step, 'ownerStage':owner, 'targetSurface':target, 'sourceLabel':label,
        'sourceRefs':[declaration], 'handlerRefs':handlers, 'handlerCoverage':'representative-static-hookups; expand-per-behavior',
        'manualRefs':[manual(page, scope, 'Historical context only; no live screenshot or current reachability is asserted.')],
        'screenshotRefs':[image_ref()] if name == 'Console' else [],
        'evidenceStatus':'source-and-historical-reference; live-unqualified',
        'reachability':reachability, 'capabilities': ['radio-model/driver conditional; qualify reachability'] if kind == 'SetupTabPage' else ['qualify platform/hardware prerequisites before activation'],
        'qualification': {'windowsLiveCapture':'unqualified','codeParity':'unqualified','hardware':'unqualified'},
        'notes':note, 'behaviorExpansion':'pending; discovery ownership is not complete interaction parity'})

behaviors = []
def behavior(id, controls, handlers, page, owner, target, initial, action, expected, units='not applicable', ranges='backend/current-handler governed; not measured', persistence='Inspect saved-state restore before parity acceptance.', external='CAT/TCI/MIDI mappings require individual differential qualification.', capability='Receiver/radio capability required; no hardware was operated.', notes=''):
    behaviors.append({'id':id,'candidateId':'Form:Console','ownerStage':'Stage'+str(owner).zfill(2),'targetSurface':target,
        'controls':controls.split(','),'sourceClass':'Console','authority':'current-handler',
        'sourceRefs':[ref(CONSOLE,85,'Console'),ref(DESIGNER,1)],'handlerRefs':[method(CONSOLE,item) for item in handlers.split(',')],
        'manualRefs':[manual(page,'matching-historical-control-group')],'screenshotRefs':[image_ref()],
        'initialState':initial,'action':action,'expectedResult':expected,'units':units,'rangeValidation':ranges,
        'persistence':persistence,'externalMapping':external,'capabilities':[capability],
        'reachability':'current-designer-hookup/source-backed; live-run-unqualified',
        'evidenceStatus':'source-and-historical-reference; live-unqualified','numericalTolerance':None,'timingToleranceMs':None,
        'qualification':{'windowsLiveCapture':'unqualified','codeParity':'unqualified','hardware':'unqualified'},
        'testEvidence':[],'plannedTest':'parity.'+id,'notes':notes})

behavior('console.vfoA.keyboard-entry','txtVFOAFreq','txtVFOAFreq_KeyPress,txtVFOAFreq_LostFocus',37,3,'thetis.console',
    'Copied receive-only profile; known VFO A, mode/filter, CTUN, split, locks and selected TX VFO.',
    'Enter a frequency and commit focus/Enter; repeat with invalid numeric text.',
    'Current parse/focus path applies frequency and model/DDC/CTUN rules; invalid text restores saved VFO A.',
    'Legacy MHz text; future protocol integer Hz', 'Double.TryParse plus current model/band/DDC checks; measure allowed range per capability.',
    notes='Do not replace locale-sensitive legacy parsing with an assumed universal range. Historical RX/TX tables require current-handler reconciliation.')
behavior('console.vfoB.keyboard-entry','txtVFOBFreq','txtVFOBFreq_KeyPress,txtVFOBFreq_LostFocus',37,3,'thetis.console',
    'Known VFO B with explicit RX2/sub/split/TX selections.', 'Edit/commit valid and invalid VFO B text.',
    'VFO B follows its own current receive/sub/transmit route; invalid input restores saved frequency.', 'Legacy MHz text; future integer Hz')
behavior('console.vfo.digit-wheel','txtVFOAFreq,txtVFOBFreq','Console_MouseWheel,txtVFOAFreq_MouseMove,txtVFOBFreq_MouseMove',52,4,'thetis.console',
    'Known selected digit, tune step, VFO locks and modifier keys.', 'Move over individual frequency digits and wheel in both directions with configured modifiers.',
    'Only the current handler-selected VFO/digit or tune step changes, respecting configured mouse actions and locks.', 'Hz step; MHz legacy display')
behavior('console.vfo.locks-sync','chkVFOLock,chkVFOBLock,chkVFOSync','chkVFOLock_CheckedChanged,chkVFOBLock_CheckedChanged,chkVFOSync_CheckedChanged',37,4,'thetis.console',
    'Two known frequencies with sync off and independent lock states.', 'Toggle each lock and synchronization; attempt keyboard/wheel/external tuning.',
    'Preserve separate locks and source-defined sync offset/rules; external paths need comparison.', 'boolean; frequency offset Hz')
behavior('console.vfo.ctun','chkFWCATU,chkX2TR','chkFWCATU_CheckedChanged,chkX2TR_CheckedChanged',47,4,'thetis.console',
    'Explicit RX1/RX2 identity, known center frequency/passband/zoom, CTUN disabled and copied band state.',
    'Toggle each receiver CTUN; tune inside and across visible passband limits; leave/re-enter band.',
    'Current handlers preserve receiver-specific CTUN and center/retune limits; explicit RX identity and TX/RIT/duplex rules apply.',
    'boolean; Hz center/tune/span',
    notes='Current controls retain legacy identifiers chkFWCATU and chkX2TR. Do not invent a chkCTUN control from the historical button label.')
behavior('console.vfo.transfer','btnVFOAtoB,btnVFOBtoA,btnVFOSwap','btnVFOAtoB_Click,btnVFOBtoA_Click,btnVFOSwap_Click',42,4,'thetis.console',
    'Different A/B frequency, mode, filter and CTUN states from copied profile.', 'Copy A>B, B>A and swap from separately reset states.',
    'Apply each current handler including its additional mode/filter/CTUN state; compare more than frequency.', 'Hz and receiver state')
behavior('console.vfo.split-tx-target','chkVFOSplit,chkVFOATX,chkVFOBTX','chkVFOSplit_CheckedChanged,chkVFOATX_CheckedChanged,chkVFOBTX_CheckedChanged',38,4,'thetis.console',
    'Receive-only run; enumerate RX2/sub/split/TX-target combinations without keying.', 'Select split and TX source using current control paths.',
    'Current handlers determine TX identity and subfrequency display; no historical table can override current routing.', 'boolean; Hz',
    capability='TX topology requires radio/firmware qualification; no transmit was initiated.')
behavior('console.plot.click-drag','pnlDisplay','pnlDisplay_MouseDown,pnlDisplay_MouseMove',47,4,'thetis.console',
    'Known spectrum bounds, RX1/RX2 identity, CTUN, filter and mouse action settings.', 'Click/drag spectrum, waterfall and passband with configured buttons/modifiers.',
    'Current hit-testing distinguishes receiver, tune/drag/filter/notch/spot actions; preserve the selected route.', 'Hz; pixels mapped through actual axes')
behavior('console.plot.pan-zoom','ptbDisplayPan,ptbDisplayZoom','ptbDisplayPan_Scroll,ptbDisplayZoom_Scroll',47,3,'thetis.console',
    'Fixed replay spectrum with known sample rate, center and zoom.', 'Pan, zoom and restore center; include boundaries and RX2.',
    'Display span/center follow current handlers and sampling constraints; quantify axes before claiming equivalence.', 'Hz span; legacy slider coordinates')
behavior('console.plot.display-modes','comboDisplayMode,comboRX2DisplayMode','comboDisplayMode_SelectedIndexChanged,comboRX2DisplayMode_SelectedIndexChanged',48,8,'thetis.console',
    'Known receiver and deterministic replay buffers.', 'Select every DisplayMode including scope/phase/histogram/combined/off.',
    'Each receiver retains selected display mode; recorded traces determine amplitude/time/calibration tolerances.', 'dBm/dBFS/Hz/time depend on mode',
    notes='Spectrum/waterfall alone do not establish full display parity. Numerical and timing tolerances remain null until measured.')
behavior('console.plot.average-peak','chkDisplayAVG,chkDisplayPeak,chkRX2DisplayAVG,chkRX2DisplayPeak','chkDisplayAVG_CheckedChanged,chkDisplayPeak_CheckedChanged,chkRX2DisplayAVG_CheckedChanged,chkRX2DisplayPeak_CheckedChanged',47,4,'thetis.console',
    'Known average/peak settings and replay frame sequence per receiver.', 'Toggle average and peak independently on both receivers.',
    'Receiver-specific DSP/display state follows handlers without conflating RX1/RX2 buffers.', 'display-dependent amplitude and time')
behavior('console.gain.master-af','ptbAF','ptbAF_Scroll',41,3,'thetis.operation.gain',
    'Known RX/MOX/MON/CW break-in state and mute/link settings.', 'Adjust master AF in receive-only path; model other branches with deterministic state tests.',
    'Handler routes monitor/RXAF/TXAF, linked AF and optional unmute; preserve current branch behavior.', 'relative 0..100', 'Designer minimum 0, maximum 100; current handler divides monitor volume by 100.',
    external='VolumeChangedHandlers and linked AF behavior; CAT/TCI/MIDI differential tests pending.',
    notes='Manual description of master monitor/sidetone is narrower than the current handler; current code controls the baseline.')
behavior('console.gain.rx-af','ptbRX1AF,ptbRX2AF','ptbRX1AF_Scroll,ptbRX2AF_Scroll',41,3,'thetis.operation.gain',
    'Independent RX1/RX2 AF, mute and linked-slider configuration.', 'Change each receiver AF including both endpoints.',
    'Update the correct receiver and linked/mute behavior without changing TX drive.', 'relative 0..100', 'Designer RX2 AF minimum 0, maximum 100; inspect configured linking.')
behavior('console.gain.agc','ptbRF,ptbRX2RF,comboAGC,comboRX2AGC','ptbRF_Scroll,ptbRX2RF_Scroll,comboAGC_SelectedIndexChanged,comboRX2AGC_SelectedIndexChanged',41,3,'thetis.operation.gain',
    'Explicit RX target, band and FIXD versus normal AGC.', 'Change AGC mode and slider; leave/re-enter band.',
    'FIXD routes fixed gain; normal mode routes AGC max gain; maintain per-band values and feedback.', 'legacy AGC gain/dB', 'Designer sliders -20..120; runtime setup mode governs meaning.',
    persistence='RX1 handler updates rx1_agct_by_band; verify saved setup restore and RX2 independently.',
    external='RX1 AGCGainChangedHandlers and MIDI AGCLevel_inc; receiver-specific mappings unqualified.')
behavior('console.gain.drive-limit','ptbPWR','ptbPWR_Scroll,ptbPWR_MouseUp',41,5,'thetis.operation.gain',
    'Receive-only copied profile with TX band and configured drive limit.', 'Adjust drive and right-drag limit without enabling TX.',
    'setPowerFromDriveSlider applies constraint; retain band power/limit and emitted drive-state feedback.', 'relative percent', 'Designer 0..100; effective drive subject to band limit/model.',
    persistence='power_by_band and limitPower_by_band updated; verify database restore.',
    external='MIDI DriveLevel/DriveLevel_inc; DrivePowerChangedHandlers include tune/two-tone state.',
    capability='Transmit output and watt calibration are unqualified; no radio was keyed.')
behavior('console.gain.squelch','ptbSquelch,ptbRX2Squelch','ptbSquelch_Scroll,ptbRX2Squelch_Scroll',42,3,'thetis.operation.gain',
    'Known RX1/RX2 mode and squelch enable settings.', 'Enable and adjust each threshold including mode changes.',
    'Preserve separate receiver/mode squelch thresholds and current validation.', 'dB threshold (mode-dependent)', 'RX1 designer -160..0; do not apply this blindly to every mode or RX2.')
behavior('console.receiver.band','radBand20,radBandGEN,comboRX2Band,btnBandHF,btnBandVHF','radBand_CheckedChanged,comboRX2Band_SelectedIndexChanged,btnBandHF_Click,btnBandVHF_Click',38,4,'thetis.receiver.bands',
    'Selected receiver with distinct band memory/mode/filter/antenna states.', 'Choose HF/VHF/SWL band and repeat selection; compare RX2 combo separately.',
    'Current RX1 band-stack and RX2 band rules apply; preserve antenna/mode/filter/CTUN coupling.', 'band ID; Hz',
    notes='Manual says RX1-only bandstacks; reconcile against current BandStackManager and handlers instead of inferring RX2 stack behavior.')
behavior('console.receiver.mode','radModeUSB,radModeLSB,radRX2ModeUSB,radRX2ModeLSB','radModeButton_CheckedChanged,radRX2ModeButton_CheckedChanged',39,4,'thetis.receiver.modes',
    'Explicit receiver with existing mode, filter and transmit profile.', 'Select each current mode for RX1 and RX2.',
    'Current mode enum/handler selects mode-dependent filters and control deck; preserve receiver identity.', 'DSPMode enum',
    notes='Historical manual DIGL/DIGU prose appears reversed; current handlers/enum are authoritative.')
behavior('console.receiver.filter-presets','radFilter1,radFilterVar1,radFilterVar2,radRX2Filter1,radRX2FilterVar1,radRX2FilterVar2','radFilter_CheckedChanged,radRX2Filter_CheckedChanged',40,4,'thetis.receiver.filters',
    'Explicit receiver and DSP mode with known preset definitions.', 'Select fixed/VAR1/VAR2 preset and change mode.',
    'Preset names/edges and mode coupling follow active FilterForm/current handlers.', 'Hz low/high edges',
    notes='frmFilterManager is unfinished/apparently unused; do not assign it active editor authority.')
behavior('console.receiver.filter-edges','udFilterLow,udFilterHigh,ptbFilterShift,ptbFilterWidth,btnFilterShiftReset','udFilterLow_ValueChanged,udFilterHigh_ValueChanged,ptbFilterShift_Scroll,ptbFilterWidth_Scroll,btnFilterShiftReset_Click',40,4,'thetis.receiver.filters',
    'Known mode-specific VAR edges/width and display passband.', 'Edit low/high; shift/resize; reset shift; include invalid/reversed edges.',
    'Current edge validation/mode offsets and reset-width semantics govern DSP/display updates.', 'Hz', 'Mode-specific backend limits and edge ordering; capture actual allowed ranges before acceptance.')
behavior('console.lower.rit-xit','chkRIT,chkXIT,udRIT,udXIT','chkRIT_CheckedChanged,chkXIT_CheckedChanged,udRIT_ValueChanged,udXIT_ValueChanged',42,4,'thetis.console',
    'Known offsets and enable/split/TX selection from copied receive-only profile.', 'Toggle offsets, edit endpoints and reset; compare RX and TX calculated state.',
    'Current handlers keep RIT/XIT effects distinct and use correct TX/receiver identity.', 'Hz', 'Designer offsets -99999..99999; mode/topology rules require comparison.')
behavior('console.lower.rx1-dsp','chkNB,chkNR','chkNB_CheckStateChanged,chkNR_Click',42,5,'thetis.console',
    'Known receiver mode, NR/NB algorithms and saved DSP settings.', 'Cycle DSP buttons including configured context actions.',
    'Current multi-state algorithms and backend state are preserved; a boolean NR/NB toggle is insufficient.', 'algorithm enum; enabled state')
behavior('console.lower.multirx','chkEnableMultiRX,ptbRX1Gain,ptbPanMainRX,ptbPanSubRX','chkEnableMultiRX_CheckedChanged,ptbRX1Gain_Scroll,ptbPanMainRX_Scroll,ptbPanSubRX_Scroll',43,4,'thetis.console',
    'Known RX1, RX2, split and mute state with subreceiver initially disabled.',
    'Enable/disable MultiRX, change sub gain and both pan controls, repeat with RX2/split combinations.',
    'Subreceiver channel activation/audio mixing/filter inheritance and VFO mapping follow current handlers; preserve RX1 mute interaction and per-receiver pan.',
    'boolean; relative gain; pan 0..100',
    external='MultiRxHandlers and gain/pan feedback; confirm CAT/TCI/MIDI behavior with deterministic receiver identities.',
    capability='Subreceiver uses RX1 DSP/channel topology; radio/DDC/audio qualification pending.')
behavior('console.lower.mode-dependent','radModeUSB,radModeCWL,radModeDIGU,radModeFMN,ptbMic','radModeButton_CheckedChanged,ptbMic_Scroll',43,5,'thetis.console',
    'Copied voice/CW/digital/FM profiles; transmitter remains disabled.', 'Switch mode families and edit passive/profile controls.',
    'Mode-specific deck follows current handlers; microphone gain/profile/state must not reset on visibility changes.', 'dB/Hz/WPM/ms depend on individual control',
    capability='TX, VOX, CW keying, FM/repeater behavior deferred to Stage05/06 hardware qualification.')
behavior('console.lower.pc-audio','chkVAC1,chkVAC2','chkVAC1_CheckedChanged,chkVAC2_CheckedChanged',46,5,'thetis.console',
    'Known local audio drivers/routes and independent VAC configuration.', 'Toggle VAC1/VAC2 with missing device and supported-driver scenarios.',
    'Keep Windows audio route/backend lifecycle and receiver identity; browser local microphone is a separate capability.', 'route identity; Hz/sample format',
    capability='Windows ASIO/VAC devices require installed-driver qualification; remote browser does not gain local Windows hardware.')
behavior('console.rx2.enable','chkRX2','chkRX2_CheckedChanged',46,3,'thetis.console',
    'Supported/unsupported model fixtures; RX2 disabled with saved receiver state.', 'Enable/disable RX2 through current handler.',
    'Preserve DDC/model checks, bottom deck visibility, independent VFO/plot/receiver state and restore behavior.', 'boolean; receiver identity',
    capability='RX2 model/protocol/ADC/DDC capability; hardware execution unqualified.')
behavior('console.rx2.lower-deck','comboRX2Band,ptbRX2RF,ptbRX2AF,radRX2ModeUSB,radRX2Filter1','comboRX2Band_SelectedIndexChanged,ptbRX2RF_Scroll,ptbRX2AF_Scroll,radRX2ModeButton_CheckedChanged,radRX2Filter_CheckedChanged',46,3,'thetis.console',
    'RX2 enabled with different band/mode/filter/gain from RX1.', 'Edit RX2 controls while RX1 right-side target is separately selected.',
    'RX2 lower-deck edits always address RX2; selecting right-side presentation target does not enable/retune a receiver.', 'receiver ID; Hz; dB; relative AF')
behavior('console.rx2.stereo-diversity','chkRX2SR,ptbPanMainRX,ptbRX2Pan','chkRX2SR_CheckedChanged,ptbPanMainRX_Scroll,ptbRX2Pan_Scroll',46,7,'thetis.console',
    'Compatible RX1/RX2 topology with explicit VFO and pan state.', 'Change stereo-diversity and receiver pan through passive fixture/state paths.',
    'Current linked tuning/routing rules prevail; preserve per-receiver pan and model capability restrictions.', 'pan position; Hz',
    capability='Diversity IQ/DDC/radio/firmware qualification pending; no calibration or RF output performed.')
behavior('console.power.lifecycle','chkPower','chkPower_CheckedChanged',36,3,'thetis.operation.power',
    'No connected radio; copied startup configuration and deterministic missing-device fixture.', 'Request start/stop in fixture paths; exercise failed discovery and readiness.',
    'Preserve backend readiness/error/lifecycle state; hiding any view cannot power down or recreate engine.', 'lifecycle enum',
    capability='Real discovery/start/stop requires separately authorized radio fixture; no RF hardware proof asserted.')

ledger = {'schemaVersion':1,'inventory':ref(INVENTORY),'counts':{kind:sum(row['kind']==kind for row in candidates) for kind in ('Form','UserControl','SetupTabPage')},
    'authorityPolicy':'Current reachable handler wins; historical manuals and screenshots never override current source.',
    'qualificationScope':'Static source and historical manual references only. No live Windows capture, radio/driver measurement or cross-machine LAN proof.',
    'candidates':candidates,'behaviors':behaviors,
    'historicalDiscrepancies':[
        {'id':'historical.wave-form','manualRefs':[manual(55,'historical-wave-ui')],'currentRefs':[ref('Project Files/Source/Console/MeterManager.cs',178,'MeterType')],
         'resolution':'Reconcile current recording/gadget state; do not resurrect a Wave form from a historical screenshot.','ownerStage':'Stage06'},
        {'id':'historical.dx-spot-form','manualRefs':[manual(58,'historical-dx-ui')],'currentRefs':[ref('Project Files/Source/Console/SpotManager2.cs',54,'SpotManager2'),method(CONSOLE,'pnlDisplay_MouseDown')],
         'resolution':'Current TCI/SWL spot lifetime/interaction supersedes the old DX window.','ownerStage':'Stage04'},
        {'id':'historical.filter-manager','currentRefs':[ref('Project Files/Source/Console/frmFilterManager.cs',53,'frmFilterManager'),ref('Project Files/Source/Console/FilterForm.cs',52,'FilterForm')],
         'resolution':'FilterForm remains active; unfinished/apparently unused frmFilterManager stays triaged.','ownerStage':'Stage01'},
        {'id':'historical.extra-receiver','currentRefs':[ref('Project Files/Source/Console/rxa.cs',15,'rxa')],
         'resolution':'rxa construction is commented out; declaration does not establish runtime reachability.','ownerStage':'Stage01'}]}
assert ledger['counts'] == {'Form':56,'UserControl':16,'SetupTabPage':89}, ledger['counts']
(ROOT/'ui/baseline/ledger.json').write_text(json.dumps(ledger,indent=2,ensure_ascii=True)+'\n',encoding='utf-8')
print('Generated',len(candidates),'source candidates and',len(behaviors),'explicit Console behaviors.')
