using System.ComponentModel;
using System.Diagnostics;
using System.Drawing.Printing;
using System.Runtime.InteropServices;
using System.Security.Principal;

namespace EtichetteSci;

/// <summary>
/// I driver di stampa accettano solo i formati carta che conoscono: serve un "modulo" 62x25 mm sul server di stampa.
/// Crearlo richiede i privilegi di amministratore (una sola volta per PC).
/// </summary>
static class FormInstaller
{
    public const string FormName = "Etichetta 62x25";
    const int Cx = 62000, Cy = 25000; // millesimi di millimetro

    public static bool IsInstalled(PrinterSettings ps)
    {
        foreach (PaperSize p in ps.PaperSizes)
            if (p.PaperName == FormName || IsLabelSize(p)) return true;
        return false;
    }

    public static bool IsLabelSize(PaperSize p)
    {
        int a = Math.Max(p.Width, p.Height), b = Math.Min(p.Width, p.Height);
        return Math.Abs(a - 244) <= 6 && Math.Abs(b - 98) <= 6;
    }

    public static bool ExistsOnAnyPrinter()
    {
        foreach (string name in PrinterSettings.InstalledPrinters)
            if (IsInstalled(new PrinterSettings { PrinterName = name })) return true;
        return false;
    }

    public static bool IsAdmin()
    {
        using var id = WindowsIdentity.GetCurrent();
        return new WindowsPrincipal(id).IsInRole(WindowsBuiltInRole.Administrator);
    }

    /// <summary>Lancia una copia elevata dell'app che crea il modulo (appare la richiesta UAC). True se il modulo è stato creato.</summary>
    public static int InstallElevated()
    {
        try
        {
            var psi = new ProcessStartInfo(Environment.ProcessPath!, "--install-form") { UseShellExecute = true, Verb = "runas" };
            using var p = Process.Start(psi)!;
            p.WaitForExit();
            return p.ExitCode;
        }
        catch (Win32Exception) { return -1; } // UAC rifiutato
    }

    /// <summary>Da eseguire con privilegi di amministratore. Restituisce 0 se ok.</summary>
    public static int Install()
    {
        const uint ServerAllAccess = 0x000F0003;
        var defaults = new PrinterDefaults { DesiredAccess = ServerAllAccess };
        if (!OpenPrinter(null, out var h, ref defaults)) return Marshal.GetLastWin32Error();
        try
        {
            var f = new FormInfo1
            {
                Flags = 0, Name = FormName,
                Size = new Size { Width = Cx, Height = Cy },
                ImageableArea = new Rect { Left = 0, Top = 0, Right = Cx, Bottom = Cy },
            };
            if (AddForm(h, 1, ref f)) return 0;
            int err = Marshal.GetLastWin32Error();
            return err is 80 or 1902 ? 0 : err; // ERROR_FILE_EXISTS / ERROR_FORM_ALREADY_EXISTS
        }
        finally { ClosePrinter(h); }
    }

    [StructLayout(LayoutKind.Sequential)] struct Size { public int Width, Height; }
    [StructLayout(LayoutKind.Sequential)] struct Rect { public int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    struct FormInfo1 { public uint Flags; public string Name; public Size Size; public Rect ImageableArea; }
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    struct PrinterDefaults { public IntPtr DataType; public IntPtr DevMode; public uint DesiredAccess; }

    [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool OpenPrinter(string? name, out IntPtr h, ref PrinterDefaults defaults);
    [DllImport("winspool.drv", SetLastError = true)] static extern bool ClosePrinter(IntPtr h);
    [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool AddForm(IntPtr h, int level, ref FormInfo1 form);
}
