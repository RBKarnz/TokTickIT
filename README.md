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
docker -compose up -d
ใช้สร้างฐานข้อมูลและ Adminer ขึ้นมาใหม่

docker -compose down -v
ใช้ลบ

docker -compose stop

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


- Git

git status

git checkout lab1-staging
git pull origin lab1-staging
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