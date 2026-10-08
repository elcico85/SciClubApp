using System.Drawing.Printing;
using System.Runtime.InteropServices;

namespace EtichetteSci;

/// <summary>Costruisce il PrintDocument: una pagina per etichetta, grande quanto l'etichetta.</summary>
static class LabelPrinter
{
    /// <summary>Formato carta 62x25 mm del driver, o null se non esiste (vedi FormInstaller).</summary>
    public static PaperSize? FindPaper(PrinterSettings ps)
    {
        PaperSize? best = null;
        foreach (PaperSize p in ps.PaperSizes)
        {
            if (p.PaperName == FormInstaller.FormName) return p;
            if (FormInstaller.IsLabelSize(p)) best ??= p;
        }
        return best;
    }

    /// <summary>paperApplied = false: la pagina resta quella predefinita del driver e l'etichetta va in alto a sinistra.</summary>
    public static PrintDocument Create(string printer, PaperSize? paper, List<Athlete> queue, string season)
    {
        var doc = new PrintDocument { DocumentName = "Etichette Sci Club" };
        doc.PrinterSettings.PrinterName = printer;
        doc.OriginAtMargins = false;
        doc.DefaultPageSettings.Margins = new Margins(0, 0, 0, 0);

        bool sized = false;
        if (paper != null) { doc.DefaultPageSettings.PaperSize = paper; sized = true; }
        else sized = TryCustomSize(doc, printer);

        int index = 0;
        doc.PrintPage += (_, e) =>
        {
            var g = e.Graphics!;
            g.PageUnit = GraphicsUnit.Millimeter;
            const float k = 0.254f; // centesimi di pollice -> mm
            float pw = e.PageBounds.Width * k, ph = e.PageBounds.Height * k;
            g.TranslateTransform(-e.PageSettings.HardMarginX * k, -e.PageSettings.HardMarginY * k);
            if (sized && pw < ph) // il driver espone l'etichetta in verticale: ruota il disegno
            {
                g.TranslateTransform(pw, 0);
                g.RotateTransform(90);
            }
            LabelRenderer.Draw(g, queue[index], season);
            index++;
            e.HasMorePages = index < queue.Count;
        };
        return doc;
    }

    public static bool IsSized(PrintDocument doc)
    {
        var p = doc.DefaultPageSettings.PaperSize;
        return FormInstaller.IsLabelSize(p);
    }

    // ---- formato personalizzato scritto direttamente nel DEVMODE (funziona con alcuni driver, es. Microsoft Print to PDF) ----

    const int DmOrientation = 0x1, DmPaperSize = 0x2, DmPaperLength = 0x4, DmPaperWidth = 0x8;
    const int DmOutBuffer = 2, DmInBuffer = 8;
    const int OffFields = 72, OffOrientation = 76, OffPaperSize = 78, OffPaperLength = 80, OffPaperWidth = 82;

    /// <summary>True se il driver ha accettato un formato 62x25 mm personalizzato.</summary>
    public static bool TryCustomSize(PrintDocument doc, string printer)
    {
        IntPtr hPrinter = IntPtr.Zero, hGlobal = IntPtr.Zero;
        try
        {
            if (!OpenPrinter(printer, out hPrinter, IntPtr.Zero)) return false;
            int size = DocumentProperties(IntPtr.Zero, hPrinter, printer, IntPtr.Zero, IntPtr.Zero, 0);
            if (size <= 0) return false;

            var buf = Marshal.AllocHGlobal(size);
            try
            {
                if (DocumentProperties(IntPtr.Zero, hPrinter, printer, buf, IntPtr.Zero, DmOutBuffer) < 0) return false;

                Marshal.WriteInt32(buf, OffFields, Marshal.ReadInt32(buf, OffFields) | DmOrientation | DmPaperSize | DmPaperLength | DmPaperWidth);
                Marshal.WriteInt16(buf, OffOrientation, 1);   // portrait: pagina 62 (largh.) x 25 (alt.)
                Marshal.WriteInt16(buf, OffPaperSize, 256);   // DMPAPER_USER
                Marshal.WriteInt16(buf, OffPaperLength, 250); // decimi di mm
                Marshal.WriteInt16(buf, OffPaperWidth, 620);

                // il driver convalida/normalizza i valori
                if (DocumentProperties(IntPtr.Zero, hPrinter, printer, buf, buf, DmInBuffer | DmOutBuffer) < 0) return false;

                hGlobal = GlobalAlloc(0x0002 /* GMEM_MOVEABLE */, (UIntPtr)size);
                var dst = GlobalLock(hGlobal);
                var bytes = new byte[size];
                Marshal.Copy(buf, bytes, 0, size);
                Marshal.Copy(bytes, 0, dst, size);
                GlobalUnlock(hGlobal);

                doc.PrinterSettings.SetHdevmode(hGlobal);
                doc.DefaultPageSettings.SetHdevmode(hGlobal);
                doc.DefaultPageSettings.Margins = new Margins(0, 0, 0, 0);
            }
            finally { Marshal.FreeHGlobal(buf); }

            return IsSized(doc);
        }
        catch { return false; }
        finally
        {
            if (hGlobal != IntPtr.Zero) GlobalFree(hGlobal);
            if (hPrinter != IntPtr.Zero) ClosePrinter(hPrinter);
        }
    }

    [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool OpenPrinter(string name, out IntPtr h, IntPtr defaults);
    [DllImport("winspool.drv", SetLastError = true)] static extern bool ClosePrinter(IntPtr h);
    [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern int DocumentProperties(IntPtr hwnd, IntPtr hPrinter, string device, IntPtr devModeOut, IntPtr devModeIn, int mode);
    [DllImport("kernel32.dll")] static extern IntPtr GlobalAlloc(uint flags, UIntPtr bytes);
    [DllImport("kernel32.dll")] static extern IntPtr GlobalLock(IntPtr h);
    [DllImport("kernel32.dll")] static extern bool GlobalUnlock(IntPtr h);
    [DllImport("kernel32.dll")] static extern IntPtr GlobalFree(IntPtr h);
}
