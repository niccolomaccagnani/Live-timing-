import { formatTime, type Analysis, type Driver } from "./timing";
export async function exportReport(entries: Analysis[], drivers: Driver[]) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  for (let i = 0; i < entries.length; i++) {
    if (i) pdf.addPage();
    const a = entries[i];
    pdf.setFillColor(18, 22, 28);
    pdf.rect(0, 0, 210, 35, "F");
    pdf.setTextColor(168, 239, 87);
    pdf.setFontSize(23);
    pdf.text("RACE ENGINEER", 15, 21);
    pdf.setTextColor(35);
    pdf.setFontSize(11);
    pdf.text("MONZA / FORMULA 3 / ENGINEERING REPORT", 15, 47);
    pdf.text(
      `${new Date(a.created).toLocaleString()} | Original laps ${a.interval.join(" - ")}`,
      15,
      56,
    );
    let y = 70;
    a.results.forEach((r) => {
      const d = drivers.find((d) => d.id === r.id)!;
      pdf.text(
        `${d.name}: ${formatTime(r.mean)} average | ${r.count} included laps`,
        15,
        y,
      );
      y += 8;
      pdf.text(
        `Excluded laps: ${r.excluded.join(", ") || "none"} | display shift: ${a.shifts[r.id] || 0}`,
        15,
        y,
      );
      y += 12;
    });
    const valid = a.results
      .filter((r) => r.mean !== null)
      .sort((x, y) => x.mean! - y.mean!);
    pdf.text(
      pdf.splitTextToSize(
        valid.length > 1
          ? `Engineering conclusion: ${valid[0].id} has the strongest average pace in this sample, ${(valid[1].mean! - valid[0].mean!).toFixed(3)}s ahead of ${valid[1].id}. Differences describe this selected sample; fuel loads and track conditions are not normalized.`
          : "Engineering conclusion: Insufficient comparable drivers for a pace difference.",
        180,
      ),
      15,
      y + 5,
    );
    y += 35;
    pdf.setFontSize(8);
    pdf.text(pdf.splitTextToSize(a.rules, 180), 15, y);
    y += 25;
    pdf.text(
      "Original lap times (seconds), retained without shift or exclusion mutation:",
      15,
      y,
    );
    y += 7;
    a.drivers.forEach((id) => {
      const d = drivers.find((d) => d.id === id);
      if (d) {
        if (y > 245) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(
          pdf.splitTextToSize(
            `${id}: ${d.laps.map((l) => `${l.number}=${l.time?.toFixed(3) ?? "incomplete"} (${l.status})`).join("; ")}`,
            180,
          ),
          15,
          y,
        );
        y += 31;
      }
    });
    pdf.addPage();
    pdf.setFontSize(15);
    pdf.text("Lap comparison — saved analysis", 15, 20);
    pdf.setFontSize(9);
    pdf.text(
      `Original interval ${a.interval.join(" - ")} | saved display shifts applied`,
      15,
      29,
    );
    const plotDrivers = drivers.filter((d) => a.drivers.includes(d.id));
    const points = plotDrivers.flatMap((d) =>
      d.laps
        .filter((l) => l.time !== null)
        .map((l) => ({ x: l.number + (a.shifts[d.id] || 0), y: l.time! })),
    );
    const xmin = Math.min(...points.map((p) => p.x)),
      xmax = Math.max(...points.map((p) => p.x)),
      ymin = Math.floor(Math.min(...points.map((p) => p.y))),
      ymax = Math.ceil(Math.max(...points.map((p) => p.y)));
    const px = (n: number) => 20 + ((n - xmin) / (xmax - xmin || 1)) * 170;
    const py = (n: number) => 135 - ((n - ymin) / (ymax - ymin || 1)) * 85;
    pdf.setDrawColor(210);
    for (let t = ymin; t <= ymax; t++) {
      pdf.line(20, py(t), 190, py(t));
      pdf.setTextColor(90);
      pdf.text(t.toFixed(0), 8, py(t) + 1);
    }
    pdf.text("Display lap", 95, 145);
    pdf.text("Lap time (s)", 15, 43);
    plotDrivers.forEach((d, index) => {
      const rgb = d.color.match(/\w\w/g)!.map((c) => parseInt(c, 16));
      pdf.setDrawColor(rgb[0], rgb[1], rgb[2]);
      pdf.setLineWidth(0.5);
      let prev: { x: number; y: number } | null = null;
      d.laps.forEach((l) => {
        if (l.time === null) {
          prev = null;
          return;
        }
        const p = { x: px(l.number + (a.shifts[d.id] || 0)), y: py(l.time) };
        if (prev) pdf.line(prev.x, prev.y, p.x, p.y);
        if (a.results.find((r) => r.id === d.id)?.excluded.includes(l.number)) {
          pdf.setDrawColor(220, 50, 60);
          pdf.circle(p.x, p.y, 1);
          pdf.setDrawColor(rgb[0], rgb[1], rgb[2]);
        }
        prev = p;
      });
      pdf.setTextColor(40);
      pdf.text(`${d.short}: shift ${a.shifts[d.id] || 0}`, 20, 158 + index * 7);
    });
  }
  pdf.save("Race-Engineer-Monza-report.pdf");
}
