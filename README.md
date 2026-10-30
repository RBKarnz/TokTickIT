# TokTickIT 

- Server (Backend)
cd server
npm install
npm run dev


- Client (Frontend)
cd client
npm install
npm run dev


- Docker
docker-compose up -d
ใช้สร้างฐานข้อมูลและ Adminer ขึ้นมาใหม่

docker-compose down -v
ใช้ลบ

docker-compose stop

- Database Management 
in server

npx prisma migrate dev --name <migration_name>
ใช้สร้างไฟล์ Migration และอัปเดตตารางใน Database จริงๆ ใช้เมื่อแก้ไขไฟล์ schema.prisma

npx prisma db seed
ใช้รัน script เพิ่มข้อมูล seed เข้า Database

npx prisma studio
ใช้เปิด browser เพื่อเข้าไปดูข้อมูลใน Database

npx prisma migrate reset
ใช้เพื่อ reset ข้อมูล

npx kill-port 3000
ใช้หยุดทำงานของ port ที่กำลังใช้งานเลขที่กำหนดอยู่


- Testing
in server (ต้องมี Postgres รันอยู่ก่อน เช่น docker-compose up -d)

npx prisma db seed
ใช้ reseed ข้อมูลทดสอบก่อนรันเทสต์ (idempotent รันซ้ำได้)

npx vitest run
รันเทสต์ Lab 1-4 ทั้งหมด (unit, API, workflow, migration, performance-smoke)

in client

npx vitest run
รันเทสต์ UI component ทั้งหมด

npx tsc --noEmit
เช็ก TypeScript error ทั้งโปรเจกต์ (ทำทั้ง server และ client)

- E2E Testing
in root (ต้องเปิด server และ client dev server ไว้ก่อน คนละ terminal)

npx playwright test e2e/lab-01 e2e/lab-02 e2e/lab-03 e2e/lab-04 --project="Desktop Chrome"
รัน E2E ทั้งหมดบน Desktop Chrome (ตัด --project ออกเพื่อรันครบ Desktop/Tablet/Mobile)

npx playwright test e2e/lab-04/visual-inspection.spec.ts
ใช้จับภาพ screenshot หน้า Lab 4 ลง artifacts/lab-04/screenshots/

- Git

git status

git checkout lab4-staging
git pull origin lab4-staging
git checkout -b <branch_name>

git add .
git commit -m "ข้อความอธิบายงาน"
git push origin <branch_name>


- Port

netstat -ano | findstr LISTENING
ใช้เช็คว่าใช้งาน port อะไรบ้าง

tasklist | findstr รหัส
ใช้เช็คว่าโปรแกรมอะไรใช้งาน port นั้น

taskkill /PID รหัส /F
ใช้หยุดการทำงาน