<!-- KARN:START -->
# toktickit: ข้อกำหนดของงานนี้ (สรุปจาก KARN)

## งานนี้คืออะไร
- วิชา Software engineer, โปรเจกต์ยาว ทำเดี่ยว แต่ส่งงานผ่าน PR ให้เพื่อนรีวิว
- โจทย์ใหม่มาทุกสัปดาห์ (แต่ละ lab อยู่ใน docs/lab-XX, artifacts/lab-XX, e2e/lab-XX)
- Stack: TypeScript, React + Vite (client), Express + Prisma (server), PostgreSQL 16 (Docker), Playwright (e2e)

## วิธีรันและทดสอบ
- client: `npm run dev` / `npm test` (ใน client)
- server: `npm run dev` / `npm test` (ใน server)
- e2e: `npm run test:e2e` (ที่ root)
- รันเซิร์ฟเวอร์ให้ดูผลได้ แต่ถามก่อนทุกครั้ง; งานรันนานให้เตือนก่อนรัน

## กฎที่ต้องทำตาม
- git: commit ได้ แต่ห้าม push จนกว่าจะสั่ง; ตั้งจุดย้อนกลับ (commit) ก่อนแก้หลายไฟล์หรือ refactor
- ห้ามแตะ `.env` (server/.env, client/.env) และห้าม commit key หรือรหัสผ่าน
- ลบไฟล์ต้องถามก่อน; เข้าไฟล์นอกโฟลเดอร์ต้องถามพร้อมแจ้งเหตุผล (ยกเว้น C:/Users/teera/Documents/toktickit-notes)
- ส่งข้อมูลส่วนตัวไปบริการภายนอก ต้องถามก่อน
- คำสั่งกำกวม: ถามก่อน; บั๊ก: ใช้ skill debug-mantra
- ก่อนทำงานใหญ่: สรุปแผนเป็นไฟล์ .md (implementation plan ต่อ issue) ไปที่ toktickit-notes แล้วรออนุมัติ
- แก้ได้ถึงขั้น refactor เพื่อให้ตรงตามที่ออกแบบ (หลัง commit สำรอง); เขียนเทสต์ให้ทุกครั้ง; คอมเมนต์สั้น
- UI: เรียบ ตามที่อาจารย์กำหนด และรองรับมือถือ

## รูปแบบผลลัพธ์
- ไฟล์/PR/เอกสารที่ส่งออก: English, ละเอียด, ระดับปกติ-ชำนาญ, น้ำเสียงทางการ, คงศัพท์เทคนิคภาษาอังกฤษ
- ส่งผ่าน PR (เน้น Description) + doc ตอนเสร็จทั้งหมด; template ถามตอนทำจริง
- ใช้ AI ช่วยได้ ไม่ต้องระบุในงานที่ส่ง
- ก่อนบอกว่าเสร็จ: ตรวจเร็ว (รัน/เปิดผลลัพธ์จริง)
<!-- KARN:END -->
