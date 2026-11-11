using System;
using System.IO;
using System.Reflection;
using System.Data;
using System.Collections.Generic;

namespace Thetis.Tests
{
    public sealed class DatabaseLifetimeProbe : MarshalByRefObject
    {
        public override string ToString()
        {
            Assembly assembly = Assembly.LoadFrom(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Thetis.exe"));
            var manager = assembly.GetType("Thetis.DBMan", true);
            bool visible = (bool)manager.GetProperty("IsVisible", BindingFlags.Static | BindingFlags.Public).GetValue(null, null);
            object form = manager.GetField("_frm_dbman", BindingFlags.Static | BindingFlags.NonPublic).GetValue(null);
            if (visible || form != null) throw new InvalidOperationException("Database manager initialized an operational Form before its editor was requested.");
            string parent = Path.GetFullPath(Path.GetTempPath());
            string fixture = Path.Combine(parent, "ThetisDbProbe-" + Guid.NewGuid().ToString("N"));
            try
            {
                Guid id = Guid.NewGuid();
                string root = Path.Combine(fixture, "DB") + Path.DirectorySeparatorChar;
                string database = Path.Combine(root, id.ToString());
                Directory.CreateDirectory(Path.Combine(database, "backups"));
                const string xml = "<Data><State><Key>fixture</Key><Value>unchanged</Value></State></Data>";
                File.WriteAllText(Path.Combine(database, "database.xml"), xml);
                File.WriteAllText(Path.Combine(database, "dbman.json"), "{\"BackupOnShutdown\":true}");
                manager.GetProperty("AppDataPath").SetValue(null, fixture + Path.DirectorySeparatorChar, null);
                var settingsType = manager.GetNestedType("DBSettings", BindingFlags.NonPublic);
                object settings = Activator.CreateInstance(settingsType, true);
                settingsType.GetProperty("ActiveDB_GUID").SetValue(settings, id, null);
                manager.GetField("_dbman_settings", BindingFlags.Static | BindingFlags.NonPublic).SetValue(null, settings);
                bool backedUp = (bool)manager.GetMethod("TakeBackup").Invoke(null, new object[] { Guid.Empty, "Startup fixture", true });
                if (!backedUp) throw new InvalidOperationException("Headless database backup failed.");
                manager.GetMethod("Shutdown").Invoke(null, null);
                string[] copies = Directory.GetFiles(Path.Combine(database, "backups"), "*.xml");
                if (copies.Length != 2) throw new InvalidOperationException("Startup and shutdown backup count differs from legacy behavior.");
                foreach (string copy in copies)
                    if (File.ReadAllText(copy) != xml) throw new InvalidOperationException("Backup changed database contents.");
                var db = assembly.GetType("Thetis.DB", true);
                using (var data = new DataSet("Data"))
                {
                    var state = data.Tables.Add("State"); state.Columns.Add("Key"); state.Columns.Add("Value");
                    state.Rows.Add("unknown_future_setting", "a/b/c"); state.Rows.Add("Left", "123");
                    db.GetField("ds").SetValue(null, data);
                    var patch = new Dictionary<string, string> { { "VFOAFreq", "14.200001" } };
                    db.GetMethod("SaveVarsDictionary").Invoke(null, new object[] { "State", patch, true });
                    var restored = (Dictionary<string, string>)db.GetMethod("GetVarsDictionary").Invoke(null, new object[] { "State" });
                    if (restored["unknown_future_setting"] != "a/b/c" || restored["Left"] != "123" || restored["VFOAFreq"] != "14.200001")
                        throw new InvalidOperationException("Deployed database adapter lost unrelated values.");
                    bool wrote = (bool)db.GetMethod("WriteDB", new[] { typeof(string), typeof(DataSet) }).Invoke(null, new object[] { Path.Combine(fixture, "roundtrip.xml"), data });
                    if (!wrote) throw new InvalidOperationException("Deployed database adapter could not write XML.");
                    db.GetField("ds").SetValue(null, null);
                }
                if (manager.GetField("_frm_dbman", BindingFlags.Static | BindingFlags.NonPublic).GetValue(null) != null)
                    throw new InvalidOperationException("Backups constructed the Database Manager editor.");
            }
            finally
            {
                if (Path.GetDirectoryName(Path.GetFullPath(fixture)) != parent.TrimEnd(Path.DirectorySeparatorChar) ||
                    !Path.GetFileName(fixture).StartsWith("ThetisDbProbe-", StringComparison.Ordinal)) throw new InvalidOperationException("Invalid fixture cleanup path.");
                if (Directory.Exists(fixture)) Directory.Delete(fixture, true);
            }
            return "PASS Database metadata/backups/persistence preserve XML and unrelated keys without creating presentation objects.";
        }
    }
}
