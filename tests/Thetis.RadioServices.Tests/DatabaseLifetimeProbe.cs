using System;
using System.IO;
using System.Reflection;

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
                if (manager.GetField("_frm_dbman", BindingFlags.Static | BindingFlags.NonPublic).GetValue(null) != null)
                    throw new InvalidOperationException("Backups constructed the Database Manager editor.");
            }
            finally
            {
                if (Path.GetDirectoryName(Path.GetFullPath(fixture)) != parent.TrimEnd(Path.DirectorySeparatorChar) ||
                    !Path.GetFileName(fixture).StartsWith("ThetisDbProbe-", StringComparison.Ordinal)) throw new InvalidOperationException("Invalid fixture cleanup path.");
                if (Directory.Exists(fixture)) Directory.Delete(fixture, true);
            }
            return "PASS Database metadata, startup backup and shutdown backup create no presentation objects and preserve XML.";
        }
    }
}
