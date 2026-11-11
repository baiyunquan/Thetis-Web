using System;
using System.Collections.Generic;
using System.Data;
using System.Globalization;
using System.IO;
using Thetis.RadioServices;

internal static class SettingsTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static DataSet Fixture()
    {
        var data = new DataSet("Data");
        var state = data.Tables.Add("State"); state.Columns.Add("Key"); state.Columns.Add("Value");
        state.PrimaryKey = new[] { state.Columns[0] };
        state.Rows.Add("VFOAFreq", "14.200001"); state.Rows.Add("unknown_future_setting", "a/b/c");
        state.Rows.Add("Left", "123");
        var profiles = data.Tables.Add("TXProfile"); profiles.Columns.Add("Name"); profiles.Columns.Add("Gain", typeof(int));
        profiles.Rows.Add("Original", 17);
        return data;
    }
    public static void MergePreservesOtherSettings()
    {
        using (var data = Fixture()) {
            LegacySettingsStore.MergeValues(data.Tables["State"], new Dictionary<string, string> { ["VFOAFreq"] = "7.100000", ["empty"] = "" });
            var state = LegacySettingsStore.ReadValues(data.Tables["State"]);
            Check(state["VFOAFreq"] == "7.100000" && state["unknown_future_setting"] == "a/b/c" && state["Left"] == "123", "merge overwrote unrelated state");
            Check(state.ContainsKey("empty") && (int)data.Tables["TXProfile"].Rows[0][1] == 17, "empty value or profile lost");
            LegacySettingsStore.MergeValues(data.Tables["State"], new Dictionary<string, string> { ["VFOAFreq"] = "" }, false);
            Check(LegacySettingsStore.ReadValues(data.Tables["State"])["VFOAFreq"] == "7.100000", "skip-empty semantics changed");
        }
    }
    public static void AtomicWritePreservesSchemaAndPreviousFileOnFailure()
    {
        string root = Path.Combine(Path.GetTempPath(), "ThetisSettings-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        try {
            string path = Path.Combine(root, "database.xml");
            using (var data = Fixture()) {
                LegacySettingsStore.WriteAtomic(data, path);
                string original = File.ReadAllText(path);
                data.Tables["State"].Rows.Find("VFOAFreq")[1] = "7.100000";
                using (var locked = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read)) {
                    bool failed = false;
                    try { LegacySettingsStore.WriteAtomic(data, path); } catch (IOException) { failed = true; }
                    Check(failed && File.ReadAllText(path) == original, "failed replacement damaged original XML");
                }
                Check(Directory.GetFiles(root).Length == 1, "temporary file leaked after interrupted replacement");
                LegacySettingsStore.WriteAtomic(data, path);
                using (var restored = new DataSet()) {
                    restored.ReadXml(path);
                    Check(LegacySettingsStore.ReadValues(restored.Tables["State"])["VFOAFreq"] == "7.100000", "new value not persisted");
                    Check(restored.Tables["TXProfile"].Columns["Gain"].DataType == typeof(int), "profile schema changed");
                    Check(LegacySettingsStore.ReadValues(restored.Tables["State"])["unknown_future_setting"] == "a/b/c", "unknown value lost");
                }
            }
        } finally {
            if (Path.GetDirectoryName(Path.GetFullPath(root)) != Path.GetFullPath(Path.GetTempPath()).TrimEnd(Path.DirectorySeparatorChar) ||
                !Path.GetFileName(root).StartsWith("ThetisSettings-", StringComparison.Ordinal)) throw new InvalidOperationException("Invalid settings fixture cleanup path.");
            Directory.Delete(root, true);
        }
    }
    public static void LegacyFrequencyUsesInvariantSixDecimals()
    {
        var prior = CultureInfo.CurrentCulture;
        try {
            CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo("de-DE");
            Check(LegacySettingCodecs.ParseMhz("14.200001") == 14.200001, "locale changed legacy MHz");
            Check(LegacySettingCodecs.FormatMhz(14.200001) == "14.200001", "locale changed saved value");
            Check(LegacySettingCodecs.ToHertz("14.200001") == 14200001, "fractional Hz conversion wrong");
            Check(LegacySettingCodecs.ToHertz("-999.999") == null, "legacy unavailable sentinel became a tunable frequency");
            Check(LegacySettingCodecs.ToHertz("NaN") == null, "nonfinite frequency accepted");
        } finally { CultureInfo.CurrentCulture = prior; }
    }
}
