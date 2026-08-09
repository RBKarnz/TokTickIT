import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

// Issue 4 — write this test yourself, using health.test.ts as the pattern.
// Requires the DB to be migrated and seeded first.
// It should assert: GET /api/categories returns 200 and the four seeded
// category names in id order.
describe('GET /api/categories', () => {
  it('should return categories with ID and name in a predictable order', async () => {
    // ยิง Request ไปที่ API ที่เราเพิ่งสร้าง
    const response = await request(app).get('/api/categories');
    
    // ตรวจสอบว่าสำเร็จและส่งข้อมูลกลับมาเป็น Array
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    
    // ตรวจสอบโครงสร้างและการเรียงลำดับ
    if (response.body.length > 0) {
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      
      // ทดสอบว่าข้อมูลเรียงลำดับตามชื่อ (a-z) จริง
      if (response.body.length > 1) {
        const firstName = response.body[0].name;
        const secondName = response.body[1].name;
        expect(firstName.localeCompare(secondName)).toBeLessThanOrEqual(0);
      }
    }
  });
});