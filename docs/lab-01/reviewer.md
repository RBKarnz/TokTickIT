# Lab 1 — Peer Review Record  (fill this in)

**Author:** <ธีรกาญจน์ น้อยรักษา> — <67070501062> — GitHub: @<RBKarnz>
**Peer reviewer:** <เมธิภัทร มั่นทรัพย์> — <67070501071> — GitHub: @<Bobbie-CPE38>



## Pull Requests I authored (reviewed by my partner)
| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| #1 | feature/1-project-foundation | Approved |
| #2 | feature/2-health-check | Approved after fix |
| #3 | feature/3-category-seed | Approved |
| #4 | feature/4-category-list | Approved |
| #9 | lab1-staging -> main | Approved |

### Reviewer comments I received
### PR #1: feature/1-project-foundation
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/5
- **Comment:**
    Approved.
    Verified local environment and setup:
    - Frontend: React + TS + Vite starts clean; Bootstrap styling confirmed.
    - Backend: Node + Express + TS starts properly; PostgreSQL connection and Prisma schema initialized.
    - Tooling & Config: Vitest/Supertest commands configured; .gitignore and .env.example in place with secrets excluded.
    - Docs: Initial README instructions present.

### PR #2: feature/2-health-check
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/6
- **Comment:**
    - Base branch: Please change the target branch to lab1-staging.
    - Error display: The error message in client/src/api.ts should be rendered directly on the page instead of using alert().
    #### After fix
    Looks great.
    Verified tests:
    - /api/health return correct status and content.
    - Supertest pass
    - React page properly display backend status and show useful error message when it's unavailable.
    Ready to merge.

### PR #3: feature/3-category-seed
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/7
- **Comment:**
    Looks good.
    Verified tests:
    - Prisma Category model exists with id, unique name, and createdAt
    - Migration creates the Category table
    - Seed inserts Account and Access, Hardware, Software, and Network and is safe to run more than once without duplicates
    - Database credentials are not committed

### PR #4: feature/4-category-list
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/8
- **Comment:**
    Good to go.
    - /api/categories retrieves categories in correct format and order.
    - Both frontend and backend tests passed.
    - React page properly displayed retrieved data and status.

### PR #9: lab1-staging -> main
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/9
- **Comment:**
    Verified tests:
    - Both frontend and backend tests pass.
    - Frontend properly displayed system status based on real API calls.
    - API endpoints retrieves data and returns in correct format.
    Ready to go.



## Pull Requests I reviewed for my partner
### PR #5: feature/1-project-foundation
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/5
- **Comment:**
    - React + Vite รันสำเร็จ หน้าเว็บโหลดขึ้นมาได้ตามปกติ ไม่มีหน้าจอ Error
    - Bootstrap ทำงานถูกต้อง ปุ่ม Check System บนหน้าเว็บมีสีตามสไตล์ของ Bootstrap
    - Node.js + Express + TypeScript รันสำเร็จ Terminal ฝั่ง Server สามารถ npm run dev ได้ปกติไม่มีข้อความ Error ขึ้น
    - ตั้งค่า Prisma และ Schema แล้ว รันคำสั่ง npx prisma db push ใน server ได้
    - Vitest ทำงานและแสดงผลการทดสอบขึ้นมาหลังจาก npm test
    - .gitignore ผ่านเงื่อนไข ไม่มีไฟล์ .env ตัวจริงและไม่มีโฟลเดอร์ node_modules ถูกนำขึ้นมาด้วย
    มีเอกสาร README.md มีการเขียนอธิบายขั้นตอนพื้นฐานในการรันโปรเจกต์

### PR #6: feature/2-health-check
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/6
- **Comment:**
    - ตรวจสอบใน server/src/app.ts มีการตั้งค่า res.status(200) ถูกต้องแล้ว 
    - API มีการตอบกลับข้อมูล JSON เป็น { status: "ok", service: "TokTickIT API" } ถูกต้องตามเงื่อนไข
    - Supertest ทำงานและแสดงผลการทดสอบว่าผ่านหลังจาก npm test ฝั่ง Server แล้ว
    - React page แสดงผลจากการดึงข้อมูลจาก API จริง และจัดการ status เพื่อแสดงผลได้ถูกต้อง
    - เว็บแสดงผล Error ได้ถูกต้อง เมื่อทดสอบโดยการปิด Server แล้วกด Check System

### PR #7: feature/3-category-seed
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/7
- **Comment:**
    - ใน database GUI มี id, name (ที่มีการตั้งค่า Unique constraint) และ createdAt อยู่จริง
    - ใน database GUI มี Category table หลังจากการใช้คำสั่ง npx prisma migrate dev จริง
    - เมื่อดูข้อมูลจาก SELECT * FROM "Category" พบว่ามีข้อมูลครบทั้ง 4 แถว (Account and Access, Hardware, Software, Network)
    - ทดสอบรัน Seed script ด้วยคำสั่ง npm run prisma:seed หลาย ๆ ครั้ง ระบบทำงานสำเร็จไม่แสดง Error ใด ๆ
    - บน Repository ไม่มีไฟล์ .env ขึ้นไป (ทดสอบจากการที่ต้องสร้างและ Copy ข้อมูลจากไฟล์ example เอง)

### PR #8: feature/4-category-list
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/8
- **Comment:**
    - ทดลองเพิ่มหรือแก้ไขข้อมูลหมวดหมู่โดยตรงผ่าน Prisma Studio จากนั้นกดปุ่ม Check System พบว่าชื่อหมวดหมู่ใหม่ที่เพิ่มเข้าไปใหม่ แสดงบนหน้าจอได้ ยืนยันได้ว่าหลังบ้านดึงข้อมูลจาก PostgreSQL ผ่าน Prisma มาใช้งานจริง
    - ลำดับการส่งค่าของ API  ID และชื่อ เรียงลำดับจากน้อยไปมากอย่างถูกต้อง และแสดงลำดับแบบเดิมเสมอ
    - รันคำสั่ง npm test  ใน server แล้วไม่แสดง error ใด ๆ (categories และ health ผ่านการตรวจเช็ค)
    - เปิดเครื่องมือ Developer Tools (กด F12) ไปที่แท็บ Network แล้วกดปุ่ม Check System ที่หน้าเว็บ จะเห็น Request เส้น /api/categories เด้งขึ้นมาทำให้พบข้อมูล JSON ที่ส่งตรงมาจาก API จริง ๆ ไม่ใช่การเขียนข้อความฝังไว้ใน HTML ของหน้าเว็บ
    - ทดลองปิด server เพื่อดูหน้าจอแจ้งเตือน พบว่าแสดงสถานะ loading และ error ครบถ้วน
    - รันคำสั่ง npm test  ใน client แล้วไม่แสดง error ใด ๆ (App.test.tsx ผ่านการตรวจเช็ค)

### PR #9: lab1-staging -> main
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/9
- **Comment:**
    - รันคำสั่ง npm test  ใน server แล้วไม่แสดง error ใด ๆ (categories และ health ผ่านการตรวจเช็ค)
    - รันคำสั่ง npm test  ใน client แล้วไม่แสดง error ใด ๆ (App.test.tsx ผ่านการตรวจเช็ค)
    - ทดสอบรันระบบจริงแบบ Full Vertical Slice (Docker Compose, Server และ Client) ทุกส่วนเชื่อมต่อและทำงานร่วมกันได้จริง

