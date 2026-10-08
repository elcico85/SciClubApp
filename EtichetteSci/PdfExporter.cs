using System.Drawing.Imaging;
using System.Globalization;
using System.Text;

namespace EtichetteSci;

/// <summary>Scrive un PDF con una pagina 62x25 mm per etichetta (etichetta disegnata a 600 dpi come immagine JPEG).</summary>
static class PdfExporter
{
    const int Dpi = 600;
    const double PageW = LabelRenderer.WidthMm / 25.4 * 72, PageH = LabelRenderer.HeightMm / 25.4 * 72;

    public static void Export(string path, List<Athlete> labels, string season)
    {
        int pxW = (int)Math.Round(LabelRenderer.WidthMm / 25.4 * Dpi), pxH = (int)Math.Round(LabelRenderer.HeightMm / 25.4 * Dpi);
        var jpegCodec = ImageCodecInfo.GetImageEncoders().First(c => c.FormatID == ImageFormat.Jpeg.Guid);
        var jpegParams = new EncoderParameters(1);
        jpegParams.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, 95L);

        using var fs = new FileStream(path, FileMode.Create, FileAccess.Write);
        var offsets = new List<long>();
        void Write(string s) { var b = Encoding.ASCII.GetBytes(s); fs.Write(b, 0, b.Length); }
        void Obj(int n, Action body) { while (offsets.Count < n) offsets.Add(0); offsets[n - 1] = fs.Position; Write($"{n} 0 obj\n"); body(); Write("endobj\n"); }
        string F(double d) => d.ToString("0.###", CultureInfo.InvariantCulture);

        Write("%PDF-1.4\n");
        int pageCount = labels.Count;
        // oggetti: 1 catalogo, 2 pagine, poi per ogni pagina: Page, Contents, Image
        Obj(1, () => Write("<< /Type /Catalog /Pages 2 0 R >>\n"));
        var kids = string.Join(" ", Enumerable.Range(0, pageCount).Select(i => $"{3 + i * 3} 0 R"));
        Obj(2, () => Write($"<< /Type /Pages /Kids [{kids}] /Count {pageCount} >>\n"));

        for (int i = 0; i < pageCount; i++)
        {
            int page = 3 + i * 3, content = page + 1, image = page + 2;
            byte[] jpeg;
            using (var bmp = new Bitmap(pxW, pxH))
            {
                bmp.SetResolution(Dpi, Dpi);
                using (var g = Graphics.FromImage(bmp))
                {
                    g.Clear(Color.White);
                    g.PageUnit = GraphicsUnit.Millimeter;
                    LabelRenderer.Draw(g, labels[i], season);
                }
                using var ms = new MemoryStream();
                bmp.Save(ms, jpegCodec, jpegParams);
                jpeg = ms.ToArray();
            }

            Obj(page, () => Write($"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {F(PageW)} {F(PageH)}] /Resources << /XObject << /Im0 {image} 0 R >> >> /Contents {content} 0 R >>\n"));
            var stream = $"q {F(PageW)} 0 0 {F(PageH)} 0 0 cm /Im0 Do Q";
            Obj(content, () => Write($"<< /Length {stream.Length} >>\nstream\n{stream}\nendstream\n"));
            Obj(image, () =>
            {
                Write($"<< /Type /XObject /Subtype /Image /Width {pxW} /Height {pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length {jpeg.Length} >>\nstream\n");
                fs.Write(jpeg, 0, jpeg.Length);
                Write("\nendstream\n");
            });
        }

        long xref = fs.Position;
        Write($"xref\n0 {offsets.Count + 1}\n0000000000 65535 f \n");
        foreach (var o in offsets) Write($"{o:D10} 00000 n \n");
        Write($"trailer\n<< /Size {offsets.Count + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n");
    }
}
