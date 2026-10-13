# Branch Inventory Flow

ฉันต้องการสร้างเว็บที่ใช้ในการบันทึกยอดสินค้าที่โอนย้ายไปสาขาอื่น และอาจจะมีขายแยกสำหรับลูกค้าพิเศษบางราย เพื่อคิดยอด โดยในแต่ละสินค้า จะมีราคาปลีก ส่ง และ สามารถกำหนดราคาพิเศษสำหรับ ลูกค้าบางรายได้ สร้างเว็บสำหรับจัดการสินค้าคงคลัง ชื่อเว็บว่า “OBWangnoi OG” ขอให้หน้าตาของเว็บสวยงามคล้ายกับเว็บ instagram ให้มี UI เป็น tab ที่สามารถเลือกเปลี่ยนหน้าต่างๆได้ โดยให้มีหน้าต่างๆดังต่อไปนี้ - หน้าข้อมูลสินค้า ใช้สร้างฐานข้อมูลสินค้า โดยมีหัวข้อให้ user กรอกดังต่อไปนี้ - รหัสสินค้า - ชื่อสินค้า - หน่วยนับ - ราคาขาย - ในหน่วยย่อยจำนวนสินค้า สามารถเพิ่มราคาปลีก ส่งได้ เพิ่มหน้าบันทึกรายชื่อให้สามารถดูรายการโอนสินค้า สรุปยอดในแต่ละวัน แยกเดือน - สรุปทั้งจำนวน - เพิ่มหน้าสาขา สามารถดูการทำรายการย้อนหลังและสรุปยอดบิลแยกรายได้และสามารถแชร์ข้อมูลไปไลน์ได้ โดยกำหนดให้ข้อมูลที่แชร์มี ชื่อรายการ จำนวน ราคา เวลา และหมายเหตุ และในการลบต่างๆต้องกดยืนยัน ให้แถบเมนูอยู่ด้านบน โดยข้อมูลให้ทำการเก็บไว้ที่ supabase และมีแท็บเมนูสรุปยอด ที่สามารถดูสรุปยอดแยกเป็นรายสาขาและรายลูกค้าได้

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://stock-story-41.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6d5a19be-c6ed-4db0-a1d3-5418bff3bbd8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
