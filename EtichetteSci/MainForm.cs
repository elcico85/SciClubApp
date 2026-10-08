using System.Drawing.Printing;

namespace EtichetteSci;

class MainForm : Form
{
    readonly Settings _settings = Settings.Load();
    readonly DataGridView _grid = new();
    readonly TextBox _season = new() { Width = 110 };
    readonly ComboBox _printer = new() { Width = 260, DropDownStyle = ComboBoxStyle.DropDownList };
    readonly NumericUpDown _copies = new() { Width = 55, Minimum = 1, Maximum = 99, Value = 1 };
    readonly TextBox _filter = new() { Width = 220, PlaceholderText = "Cerca nome, codice, C.F. ..." };
    readonly Label _status = new() { AutoSize = true, Padding = new Padding(0, 6, 0, 0) };
    readonly List<Athlete> _athletes = new();

    List<Athlete> _queue = new();

    public MainForm()
    {
        Text = "Etichette Sci Club";
        Width = 1000; Height = 650;
        StartPosition = FormStartPosition.CenterScreen;

        var openBtn = Btn("Apri Excel...", (_, _) => OpenFile());
        var top = new FlowLayoutPanel { Dock = DockStyle.Top, AutoSize = true, Padding = new Padding(8, 8, 8, 0), WrapContents = true };
        top.Controls.AddRange(new Control[]
        {
            openBtn,
            Lbl("Stagione:"), _season,
            Lbl("Stampante:"), _printer,
            Lbl("Copie:"), _copies,
        });

        var bottom = new FlowLayoutPanel { Dock = DockStyle.Top, AutoSize = true, Padding = new Padding(8, 4, 8, 4), WrapContents = true };
        bottom.Controls.AddRange(new Control[]
        {
            _filter,
            Btn("Seleziona tutti (visibili)", (_, _) => SetAll(true)),
            Btn("Deseleziona tutti", (_, _) => SetAll(false)),
            Btn("Anteprima", (_, _) => Print(preview: true)),
            Btn("Stampa", (_, _) => Print(preview: false)),
            Btn("Esporta PDF...", (_, _) => ExportPdf()),
            _status,
        });

        _grid.Dock = DockStyle.Fill;
        _grid.AllowUserToAddRows = false;
        _grid.AllowUserToDeleteRows = false;
        _grid.RowHeadersVisible = false;
        _grid.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
        _grid.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.AllCells;
        _grid.Columns.Add(new DataGridViewCheckBoxColumn { HeaderText = "Stampa", Name = "sel", Width = 55, AutoSizeMode = DataGridViewAutoSizeColumnMode.None });
        foreach (var h in new[] { "Codice", "Nome", "Data di nascita", "Città nascita", "Codice fiscale", "Sesso" })
            _grid.Columns.Add(h, h);
        foreach (DataGridViewColumn c in _grid.Columns) if (c.Name != "sel") c.ReadOnly = true;
        _grid.CellContentClick += (_, e) => { if (e.ColumnIndex == 0) _grid.CommitEdit(DataGridViewDataErrorContexts.Commit); };
        _grid.CellValueChanged += (_, _) => UpdateStatus();
        _grid.CellDoubleClick += (_, e) =>
        {
            if (e.RowIndex >= 0) _grid[0, e.RowIndex].Value = !(_grid[0, e.RowIndex].Value is true);
        };
        _filter.TextChanged += (_, _) => ApplyFilter();

        Controls.Add(_grid);
        Controls.Add(bottom);
        Controls.Add(top);

        foreach (string p in PrinterSettings.InstalledPrinters)
            if (!p.Contains("PDF", StringComparison.OrdinalIgnoreCase)) _printer.Items.Add(p); // i PDF si fanno con "Esporta PDF"
        var def = new PrinterSettings().PrinterName;
        _printer.SelectedItem = _printer.Items.Contains(_settings.Printer) ? _settings.Printer : def;
        if (_printer.SelectedIndex < 0 && _printer.Items.Count > 0) _printer.SelectedIndex = 0;
        _season.Text = _settings.Season;

        FormClosing += (_, _) => SaveSettings();
        Shown += (_, _) =>
        {
            if (File.Exists(_settings.LastFile)) LoadFile(_settings.LastFile, silent: true);
            else UpdateStatus();
        };
    }

    static Button Btn(string text, EventHandler onClick)
    {
        var b = new Button { Text = text, AutoSize = true };
        b.Click += onClick;
        return b;
    }

    static Label Lbl(string text) => new() { Text = text, AutoSize = true, Padding = new Padding(8, 6, 0, 0) };

    void SaveSettings()
    {
        _settings.Printer = _printer.SelectedItem as string ?? "";
        _settings.Season = _season.Text.Trim();
        _settings.Save();
    }

    void OpenFile()
    {
        using var dlg = new OpenFileDialog { Filter = "Excel (*.xlsx)|*.xlsx", Title = "Seleziona il file Excel" };
        if (File.Exists(_settings.LastFile)) dlg.InitialDirectory = Path.GetDirectoryName(_settings.LastFile);
        if (dlg.ShowDialog(this) == DialogResult.OK) LoadFile(dlg.FileName, silent: false);
    }

    void LoadFile(string path, bool silent)
    {
        try
        {
            var rows = XlsxReader.Read(path);
            var missing = rows.Count == 0
                ? Athlete.RequiredColumns
                : Athlete.RequiredColumns.Where(c => !rows[0].ContainsKey(c)).ToArray();
            if (missing.Length > 0)
            {
                if (!silent) MessageBox.Show(this, "Colonne mancanti nel file: " + string.Join(", ", missing), Text, MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            _athletes.Clear();
            _grid.Rows.Clear();
            foreach (var r in rows)
            {
                var a = Athlete.FromRow(r);
                if (a == null) continue;
                _athletes.Add(a);
                _grid.Rows.Add(false, a.Codice, a.NomeCompleto, a.DataNascita, a.CittaNascita, a.CodiceFiscale, a.Sesso);
            }
            _settings.LastFile = path;
            Text = "Etichette Sci Club - " + Path.GetFileName(path);
            ApplyFilter();
        }
        catch (Exception ex)
        {
            if (!silent) MessageBox.Show(this, "Impossibile leggere il file:\n" + ex.Message, Text, MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    void ApplyFilter()
    {
        var q = _filter.Text.Trim();
        _grid.CurrentCell = null;
        foreach (DataGridViewRow row in _grid.Rows)
        {
            var a = _athletes[row.Index];
            row.Visible = q.Length == 0 ||
                a.NomeCompleto.Contains(q, StringComparison.CurrentCultureIgnoreCase) ||
                a.CodiceFiscale.Contains(q, StringComparison.CurrentCultureIgnoreCase) ||
                a.Codice.Contains(q, StringComparison.CurrentCultureIgnoreCase);
        }
        UpdateStatus();
    }

    void SetAll(bool value)
    {
        foreach (DataGridViewRow row in _grid.Rows) if (row.Visible) row.Cells[0].Value = value;
        UpdateStatus();
    }

    List<Athlete> Selected() =>
        _grid.Rows.Cast<DataGridViewRow>().Where(r => r.Cells[0].Value is true).Select(r => _athletes[r.Index]).ToList();

    void UpdateStatus() => _status.Text = $"{Selected().Count} selezionati su {_athletes.Count}";

    void ExportPdf()
    {
        var sel = Selected();
        if (sel.Count == 0) { MessageBox.Show(this, "Seleziona almeno una riga.", Text); return; }
        var season = _season.Text.Trim();
        if (season.Length == 0) { MessageBox.Show(this, "Indica la stagione.", Text); return; }
        using var dlg = new SaveFileDialog { Filter = "PDF (*.pdf)|*.pdf", FileName = "Etichette.pdf" };
        if (dlg.ShowDialog(this) != DialogResult.OK) return;
        try
        {
            PdfExporter.Export(dlg.FileName, sel.SelectMany(a => Enumerable.Repeat(a, (int)_copies.Value)).ToList(), season);
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, "Errore nel salvataggio:\n" + ex.Message, Text, MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    void Print(bool preview)
    {
        var sel = Selected();
        if (sel.Count == 0) { MessageBox.Show(this, "Seleziona almeno una riga.", Text); return; }
        var season = _season.Text.Trim();
        if (season.Length == 0) { MessageBox.Show(this, "Indica la stagione.", Text); return; }
        if (_printer.SelectedItem is not string printer) { MessageBox.Show(this, "Nessuna stampante selezionata.", Text); return; }

        _queue = sel.SelectMany(a => Enumerable.Repeat(a, (int)_copies.Value)).ToList();

        var ps = new PrinterSettings { PrinterName = printer };
        if (!ps.IsValid) { MessageBox.Show(this, "Stampante non valida: " + printer, Text); return; }
        var paper = LabelPrinter.FindPaper(ps);
        if (paper == null && !FormInstaller.ExistsOnAnyPrinter())
        {
            var ask = MessageBox.Show(this,
                "Nessun formato carta 62x25 mm sul PC: senza, la stampa uscirebbe su pagine normali.\n\n" +
                "Posso creare il formato \"" + FormInstaller.FormName + "\" (operazione una tantum, richiede i permessi di amministratore: comparirà la richiesta di Windows).\n\nProcedo?",
                Text, MessageBoxButtons.YesNo, MessageBoxIcon.Question);
            if (ask == DialogResult.Yes)
            {
                int rc = FormInstaller.InstallElevated();
                if (rc != 0)
                {
                    var why = rc == -1 ? "richiesta di amministratore rifiutata" : new System.ComponentModel.Win32Exception(rc).Message + " (codice " + rc + ")";
                    MessageBox.Show(this, "Formato non creato: " + why, Text, MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }
                paper = LabelPrinter.FindPaper(new PrinterSettings { PrinterName = printer });
            }
        }
        if (paper == null)
        {
            var ask = MessageBox.Show(this,
                "Il driver della stampante \"" + printer + "\" non supporta il formato 62x25 mm (succede con i driver moderni come Microsoft Print to PDF).\n\n" +
                "Stampo comunque sul formato carta predefinito, con l'etichetta in alto a sinistra?\n(Per un PDF con pagine 62x25 usa il pulsante \"Esporta PDF\".)",
                Text, MessageBoxButtons.YesNo, MessageBoxIcon.Question);
            if (ask != DialogResult.Yes) return;
        }
        using var doc = LabelPrinter.Create(printer, paper, _queue, season);

        try
        {
            if (preview)
            {
                doc.PrintController = new PreviewPrintController();
                using var dlg = new PrintPreviewDialog { Document = doc, Width = 700, Height = 500 };
                dlg.ShowDialog(this);
            }
            else
            {
                doc.PrintController = new StandardPrintController(); // niente finestra di avanzamento per ogni etichetta
                doc.Print();
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, "Errore di stampa:\n" + ex.Message, Text, MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
