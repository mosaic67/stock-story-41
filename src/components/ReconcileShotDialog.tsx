import { useRef, useState } from "react";
import { Copy, Download, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { baht, num } from "@/lib/db";

export type ShotRow = { name: string; unit: string; sent: number; sold: number; left: number };

export function ReconcileShotDialog({ branch, period, sent, sold, rows, onClose }: { branch: string; period: string; sent: number; sold: number; rows: ShotRow[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const fileName = `OBWangnoi-reconcile-${branch.replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.png`;

  const render = async () => {
    const { toPng } = await import("html-to-image");
    return toPng(ref.current!, { pixelRatio: 2.5, backgroundColor: "#ffffff" });
  };
  const download = async () => {
    if (busy) return; setBusy(true);
    try {
      const url = await render();
      const a = document.createElement("a"); a.href = url; a.download = fileName; a.click();
      toast.success("ดาวน์โหลดรูปแล้ว");
    } catch { toast.error("สร้างรูปไม่สำเร็จ"); } finally { setBusy(false); }
  };
  const copy = async () => {
    if (busy) return; setBusy(true);
    try {
      const blob = await (await fetch(await render())).blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast.success("คัดลอกรูปแล้ว วางใน LINE ได้เลย");
    } catch { toast.error("เบราว์เซอร์นี้คัดลอกรูปไม่ได้ ลองกดดาวน์โหลดแทน"); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-full w-full max-w-md space-y-3 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div ref={ref} className="receipt-light rounded-2xl border bg-card p-5 shadow-lg">
          <div className="text-center">
            <p className="ig-text font-display text-xl">OBWangnoi OG</p>
            <p className="mt-0.5 text-sm font-semibold">สรุปกระทบยอด · สาขา {branch}</p>
            <p className="text-xs text-muted-foreground">{period}</p>
          </div>
          <div className="my-3 border-t border-dashed" />
          <table className="w-full text-xs">
            <thead className="text-muted-foreground"><tr><th className="text-left">สินค้า</th><th className="text-right">โอน</th><th className="text-right">ขาย</th><th className="text-right">คงเหลือ</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}><td>{r.name} <span className="text-muted-foreground">({r.unit})</span></td><td className="text-right">{num(r.sent)}</td><td className="text-right">{num(r.sold)}</td><td className="text-right">{num(r.left)}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="my-3 border-t border-dashed" />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>ยอดโอนไปสาขา</span><span>{baht(sent)}</span></div>
            <div className="flex justify-between"><span>ยอดขายหน้าร้าน</span><span>{baht(sold)}</span></div>
            <div className="flex justify-between border-t pt-1 text-base font-bold"><span>ยอดสุทธิที่ต้องเรียกเก็บ</span><span>{baht(sent - sold)}</span></div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}><X className="h-4 w-4" /></Button>
          <Button variant="secondary" className="flex-1" disabled={busy} onClick={copy}><Copy className="h-4 w-4" />คัดลอกรูป</Button>
          <Button className="ig-gradient flex-1 border-0 text-on-gradient" disabled={busy} onClick={download}><Download className="h-4 w-4" />ดาวน์โหลด</Button>
        </div>
      </div>
    </div>
  );
}
