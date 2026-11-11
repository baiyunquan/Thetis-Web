using System;
using System.Collections.Generic;
using System.Data;
using System.Globalization;
using System.IO;

namespace Thetis.RadioServices
{
    // Shared persistence primitives for the existing Data/Key/Value XML schema. No presentation or native effects.
    public static class LegacySettingsStore
    {
        public static Dictionary<string, string> ReadValues(DataTable table)
        {
            var values = new Dictionary<string, string>(StringComparer.Ordinal);
            if (table == null) return values;
            foreach (DataRow row in table.Rows)
            {
                if (row.RowState == DataRowState.Deleted) continue;
                values.Add(Convert.ToString(row[0], CultureInfo.InvariantCulture), Convert.ToString(row[1], CultureInfo.InvariantCulture));
            }
            return values;
        }

        public static void MergeValues(DataTable table, IDictionary<string, string> values, bool saveEmptyValues = true)
        {
            if (table == null) throw new ArgumentNullException(nameof(table));
            if (values == null) throw new ArgumentNullException(nameof(values));
            // Validate the complete patch before altering a row.
            foreach (var pair in values)
                if (string.IsNullOrEmpty(pair.Key) || pair.Value == null) throw new InvalidDataException("Setting keys and values cannot be null; keys cannot be empty.");
            var rows = new Dictionary<string, DataRow>(StringComparer.Ordinal);
            foreach (DataRow row in table.Rows)
                if (row.RowState != DataRowState.Deleted) rows.Add(Convert.ToString(row[0], CultureInfo.InvariantCulture), row);
            foreach (var pair in values)
            {
                if (!saveEmptyValues && pair.Value.Length == 0) continue;
                if (rows.TryGetValue(pair.Key, out var row)) row[1] = pair.Value;
                else
                {
                    var added = table.NewRow(); added[0] = pair.Key; added[1] = pair.Value;
                    table.Rows.Add(added); rows.Add(pair.Key, added);
                }
            }
        }

        public static void WriteAtomic(DataSet data, string filename)
        {
            if (data == null) throw new ArgumentNullException(nameof(data));
            string destination = Path.GetFullPath(filename);
            string temporary = destination + ".thetis-" + Guid.NewGuid().ToString("N") + ".tmp";
            try
            {
                // A sibling file keeps replacement on the same volume. Flush before committing the new XML.
                using (var stream = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write, FileShare.None, 65536, FileOptions.WriteThrough))
                {
                    data.WriteXml(stream, XmlWriteMode.WriteSchema);
                    stream.Flush(true);
                }
                if (File.Exists(destination)) File.Replace(temporary, destination, null);
                else File.Move(temporary, destination);
            }
            finally
            {
                // Only the exact sibling created by this invocation is eligible for removal.
                if (File.Exists(temporary)) File.Delete(temporary);
            }
        }
    }

    public static class LegacySettingCodecs
    {
        public static double ParseMhz(string value) => double.Parse(value, NumberStyles.Float | NumberStyles.AllowThousands, CultureInfo.InvariantCulture);
        public static string FormatMhz(double value) => value.ToString("f6", CultureInfo.InvariantCulture);
        public static long? ToHertz(string value)
        {
            double mhz = ParseMhz(value);
            double hz = Math.Round(Math.Round(mhz, 6) * 1000000, MidpointRounding.ToEven);
            if (double.IsNaN(hz) || double.IsInfinity(hz) || hz < 0 || hz > RadioWire.MaxSafeInteger) return null;
            return checked((long)hz);
        }
    }
}
