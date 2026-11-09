using System;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Resources;

namespace Thetis.Tests
{
    // Load the deployed resource reader under the application's actual binding policy.
    // No Console, WinForms controls, audio devices or radio services are constructed.
    public sealed class ResourceProbe : MarshalByRefObject
    {
        // Use a base-class method across the AppDomain boundary so the runner
        // need not load and lock the temporary probe assembly in its own domain.
        public override string ToString()
        {
            string executable = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Thetis.exe");
            Assembly assembly = Assembly.LoadFrom(executable);
            var resources = new ResourceManager("Thetis.Properties.Resources", assembly);
            try
            {
                using (var image = resources.GetObject("Data-Edit-32") as Bitmap)
                {
                    if (image == null || image.Width <= 0 || image.Height <= 0)
                        throw new InvalidOperationException("Database Manager startup image is missing or invalid.");
                    return "PASS: deployed Database Manager startup image and resource-reader binding (" + image.Width + "x" + image.Height + ").";
                }
            }
            finally { resources.ReleaseAllResources(); }
        }
    }
}
