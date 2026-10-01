import { useRef, useState } from "react";
import { Share2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { baht, num, fmtDateTime, txnTotal, lineTotal, type Txn } from "@/lib/db";

const priceNote = (t: string, p: number) =>
  t === "special" ? " (ราคาพิเศษ)" : t === "custom" ? " (กำหนดราคาเอง)" : ` x ${baht(p)}`;

export function SummaryShotDialog({ txns, partyName, period, onClose }: { txns: Txn[]; partyName: string; period: string; onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const sorted = [...txns].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const total = sorted.reduce((s, t) => s + txnTotal(t), 0);
  const noDeduct = sorted.filter((t) => t.deduct_stock === false);
  const noDeductTotal = noDeduct.reduce((s, t) => s + txnTotal(t), 0);
  const fileName = `OBWangnoi-summary-${partyName.replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.png`;

  const capture = async () => {
    if (!cardRef.current || busy) return;
    setBusy(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2.5, backgroundColor: "#ffffff" });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], fileName, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: `OBWangnoi OG — สรุป ${partyName}` });
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = fileName;
        a.click();
        toast.success("บันทึกรูปสรุปแล้ว");
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") toast.error("แคปภาพไม่สำเร็จ ลองอีกครั้ง");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-full w-full max-w-md space-y-3 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div ref={cardRef} className="receipt-light rounded-2xl border bg-card p-5 shadow-lg">
          <div className="text-center">
            <p className="ig-text font-display text-xl">OBWangnoi OG</p>
            <p className="mt-0.5 text-sm font-semibold">สรุปบิล · {partyName}</p>
            <p className="text-xs text-muted-foreground">{period} · {sorted.length} บิล</p>
          </div>
          <div className="my-3 border-t border-dashed" />
          <div className="space-y-3">
            {sorted.map((t, idx) => (
              <div key={t.id} className="text-sm">
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    #{idx + 1} · {fmtDateTime(t.created_at)}
                    {t.deduct_stock === false && <span className="rounded-full bg-warn px-1.5 py-0.5 text-[10px] font-medium text-warn-foreground">ไม่หักสต๊อก</span>}
                  </span>
                  <span className="font-semibold text-foreground">{baht(txnTotal(t))}</span>
                </div>
                {t.transaction_items.map((i) => (
                  <div key={i.id} className="flex justify-between gap-2 text-xs">
                    <span>• {i.product_name} {num(Number(i.qty))} {i.unit_name}{priceNote(i.price_type, Number(i.price))}{i.note ? ` (${i.note})` : ""}</span>
                    <span className="shrink-0">{baht(lineTotal(i))}</span>
                  </div>
                ))}
                {t.note && <p className="text-xs text-muted-foreground">หมายเหตุ: {t.note}</p>}
              </div>
            ))}
          </div>
          <div className="my-3 border-t border-dashed" />
          {noDeduct.length > 0 && (
            <div className="flex justify-between text-xs text-warn-foreground">
              <span>บิลไม่หักสต๊อก ({noDeduct.length} บิล)</span>
              <span>{baht(noDeductTotal)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between text-base font-bold">
            <span>ยอดรวมทั้งหมด</span>
            <span>{baht(total)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}><X className="h-4 w-4" />ปิด</Button>
          <Button className="ig-gradient flex-1 border-0 text-on-gradient" disabled={busy} onClick={capture}>
            {busy ? "กำลังแคป..." : <><Share2 className="h-4 w-4" />แคป & ส่ง</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
