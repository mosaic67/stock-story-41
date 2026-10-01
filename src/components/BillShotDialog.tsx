import { useRef, useState } from "react";
import { Share2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { baht, num, fmtDateTime, txnTotal, lineTotal, type Txn } from "@/lib/db";

export function BillShotDialog({ t, partyName, onClose }: { t: Txn; partyName: string; onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const fileName = `OBWangnoi-bill-${t.created_at.slice(0, 16).replace(/[:T]/g, "-")}.png`;

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
        await nav.share({ files: [file], title: "OBWangnoi OG — บิล" });
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = fileName;
        a.click();
        toast.success("บันทึกรูปบิลแล้ว");
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") toast.error("แคปภาพไม่สำเร็จ ลองอีกครั้ง");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-full w-full max-w-md space-y-3 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div ref={cardRef} className="receipt-light rounded-2xl border bg-card p-5 shadow-lg">
          <div className="text-center">
            <p className="ig-text font-display text-xl">OBWangnoi OG</p>
            <p className="mt-0.5 text-sm font-semibold">{partyName}</p>
            <p className="text-xs text-muted-foreground">{fmtDateTime(t.created_at)}</p>
            {t.deduct_stock === false && (
              <span className="mt-1 inline-block rounded-full bg-warn px-2 py-0.5 text-[10px] font-medium text-warn-foreground">ไม่หักสต๊อก</span>
            )}
          </div>
          <div className="my-3 border-t border-dashed" />
          <div className="space-y-1.5 text-sm">
            {t.transaction_items.map((i) => (
              <div key={i.id} className="flex justify-between gap-2">
                <span>
                  {i.product_name} {num(Number(i.qty))} {i.unit_name}
                  {i.price_type === "special" ? " (ราคาพิเศษ)" : ` x ${baht(Number(i.price))}`}
                  {i.note ? ` (${i.note})` : ""}
                </span>
                <span className="shrink-0">{baht(lineTotal(i))}</span>
              </div>
            ))}
          </div>
          <div className="my-3 border-t border-dashed" />
          <div className="flex justify-between text-base font-bold">
            <span>รวมทั้งบิล</span>
            <span>{baht(txnTotal(t))}</span>
          </div>
          {t.note && <p className="mt-2 text-xs text-muted-foreground">หมายเหตุ: {t.note}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            <X className="h-4 w-4" />ปิด
          </Button>
          <Button className="ig-gradient flex-1 border-0 text-on-gradient" disabled={busy} onClick={capture}>
            {busy ? "กำลังแคป..." : <><Share2 className="h-4 w-4" />แคป & ส่ง</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
