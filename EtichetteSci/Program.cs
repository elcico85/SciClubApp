using System.Drawing.Imaging;

namespace EtichetteSci;

static class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        // Diagnostica: EtichetteSci.exe --render out.png  -> salva un'etichetta di esempio a 600 dpi
        if (args.Length == 2 && args[0] == "--render")
        {
            var a = new Athlete("1901", Athlete.CamelCase("MAZZON ENRICO"), "15/04/1985", Athlete.CamelCase("TREVISO"), "MZZNRC85D15L407P", "M");
            using var bmp = new Bitmap(1465, 591);
            bmp.SetResolution(600, 600);
            using var g = Graphics.FromImage(bmp);
            g.Clear(Color.White);
            g.PageUnit = GraphicsUnit.Millimeter;
            LabelRenderer.Draw(g, a, "2025/2026");
            bmp.Save(args[1], ImageFormat.Png);
            return;
        }

        if (args.Length == 1 && args[0] == "--install-form") { Environment.Exit(FormInstaller.Install()); return; }

        if (args.Length == 2 && args[0] == "--pdf")
        {
            var a = new Athlete("1901", "Mazzon Enrico", "15/04/1985", "Treviso", "MZZNRC85D15L407P", "M");
            PdfExporter.Export(args[1], new List<Athlete> { a, a }, "2025/2026");
            return;
        }

        // Diagnostica: EtichetteSci.exe --print "Microsoft Print to PDF" out.pdf  -> stampa 2 etichette su file
        if (args.Length == 3 && args[0] == "--print")
        {
            var a = new Athlete("1901", "Mazzon Enrico", "15/04/1985", "Treviso", "MZZNRC85D15L407P", "M");
            var paper = LabelPrinter.FindPaper(new System.Drawing.Printing.PrinterSettings { PrinterName = args[1] });
            using var doc = LabelPrinter.Create(args[1], paper, new List<Athlete> { a, a }, "2025/2026");
            doc.PrinterSettings.PrintToFile = true;
            doc.PrinterSettings.PrintFileName = args[2];
            doc.PrintController = new System.Drawing.Printing.StandardPrintController();
            doc.Print();
            return;
        }

        // Diagnostica: EtichetteSci.exe --dump file.xlsx  -> elenca le persone lette
        if (args.Length == 2 && args[0] == "--dump")
        {
            var rows = XlsxReader.Read(args[1]);
            var list = rows.Select(Athlete.FromRow).Where(x => x != null).ToList();
            File.WriteAllLines(args[1] + ".txt", new[] { $"{list.Count} righe" }.Concat(list.Select(x => x!.ToString())));
            return;
        }

        ApplicationConfiguration.Initialize();
        Application.Run(new MainForm());
    }
}
