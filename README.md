# QuickTiew ⚡ — เว็บติวสอบด่วน Web & Cyber Security

ระบบเว็บแอปพลิเคชันสำหรับติวสอบเร่งด่วน โดยใช้หลักการ **Worked Examples (Faded Guidance)** และ **Reverse Engineering** เพื่อลดภาระทางสมอง (Cognitive Load) ให้ผู้เรียนจดจำ Pattern คำตอบและวิธีคิดได้ก่อน แล้วจึงนำไปทดสอบกับข้อสอบจริงแบบสลับโจทย์และสลับตัวเลือกได้ 100%

🌐 **Live Website:** [https://tinarmon.github.io/QuickTiew/](https://tinarmon.github.io/QuickTiew/)

---

## 📚 แหล่งเนื้อหาที่ครอบคลุม (จากเอกสาร 1 - 4)

1. **`1.pdf` (ข้อสอบจริง 30 ข้อ ครบ 3 ชุด พร้อมเฉลยลายมือ):**
   - **ชุดที่ 1:** พื้นฐานความปลอดภัยของเว็บและภัยคุกคาม (ข้อ 1 - 10)
   - **ชุดที่ 2:** มาตรการป้องกัน และโปรโตคอล SSL / TLS (ข้อ 11 - 20)
   - **ชุดที่ 3:** สถาปัตยกรรม SSL, Session/Connection และแนวทางปฏิบัติ (ข้อ 21 - 30)
2. **`2.ppt` (ซอฟต์แวร์ที่เป็นอันตราย - Malicious Software):**
   - ประวัติศาสตร์ไวรัส (พ.ศ. 2505 Bell Labs, 2529 ไวรัสเบรน PC, 1988 Morris Worm)
   - การจำแนกประเภท: ไวรัส, เวิร์ม, แบคทีเรีย, ม้าโทรจัน, ระเบิดเวลา (Logic Bomb), ประตูกับดัก (Trapdoor)
   - ประเภทไวรัส: Boot Sector, Program, Polymorphic, Stealth, Macro
   - ยุคของโปรแกรมตรวจจับไวรัส (1st Signatures, 2nd Heuristics/Hash, 3rd Activity Traps, 4th Full Featured)
   - ขั้นตอนการโจมตี DDoS 3 ขั้นตอน: รวมพล (Botnet) ➔ จู่โจมเป้าหมาย ➔ เรียกค่าไถ่
3. **`3.pdf` (Cyber Security ความมั่นคงปลอดภัยไซเบอร์):**
   - องค์ประกอบ CIA Triad (Confidentiality, Integrity, Availability)
   - หน่วยงาน ThaiCERT และ G-CERT
   - ความสัมพันธ์: Threat (ภัยคุกคาม) ➔ Vulnerability (ช่องโหว่) ➔ Exploit (การโจมตี)
   - มัลแวร์เรียกค่าไถ่ Ransomware (WannaCry)
   - การโจมตีเครือข่าย 3 แบบ: Reconnaissance (ลาดตระเวน), Access Attacks (ความพยายามเข้าใช้ระบบ), DoS
   - วิศวกรรมสังคม (Social Engineering) และฟิชชิ่ง (Phishing)
   - แบบฝึกหัดและข้อควรระวังสำหรับผู้ใช้งานทั่วไป (Public Wi-Fi, การตั้งรหัสผ่าน)
4. **`4.pdf` (WEB Security):**
   - สถิติ 85%+ การโจมตีทางไซเบอร์มุ่งเป้าที่ระดับแอปพลิเคชัน
   - ตารางเปรียบเทียบภัยคุกคาม 4 ด้าน: Integrity, Confidentiality, DoS, Authentication พร้อมผลกระทบและมาตรการป้องกัน
   - TCP/IP Protocol Stack Security: Network (IPSec), Transport (SSL/TLS), Application (S/MIME, PGP, WAF)
   - สถาปัตยกรรม SSL: Two-layer protocol
   - ความแตกต่างระหว่าง SSL Session (48-byte Master secret) กับ SSL Connection (Server/Client random)
   - หน้าที่และขั้นตอนของ Handshake Protocol (client_hello) และ Record Protocol (บีบอัด + เข้ารหัสแบบสมมาตร)

---

## 🚀 โหมดการเรียนรู้ (Learning Modes)

- 🧠 **1. จำแก่นคำตอบ (Worked Examples / Reverse Engineering):**
  - แสดงโจทย์ + คำตอบที่ถูกต้องตัวเต็ม + **สูตรจำลัด (Reverse Hook)** + คำอธิบายเหตุผลว่าทำไมถึงตอบข้อนี้ พร้อมไฮไลต์จุดสังเกต
- 🧩 **2. จำลองข้อสอบจับคู่ A - J (เหมือน 1.pdf เป๊ะๆ):**
  - แสดงโจทย์ 10 ข้อฝั่งซ้าย และตัวเลือก A - J ฝั่งขวา
  - **สลับตำแหน่งโจทย์และตัวเลือกใหม่ทุกครั้งที่ทำ** ตรวจคะแนนทันที
- 🎯 **3. ทำโจทย์สลับชอยส์ (Multiple-Choice Quiz):**
  - สุ่มลำดับข้อ และ **สุ่มสลับตัวเลือก ก ข ค ง ทุกครั้ง**
  - เฉลยทันทีเมื่อกดเลือก พร้อมแสดงกล่องอธิบาย Worked Example
- ⚡ **4. การ์ดจำเร็ว (Flashcards):**
  - พลิกดูคำถามและคำตอบแบบ 3D รองรับคีย์ลัด Spacebar / ลูกศรซ้ายขวา
- 🏆 **5. จำลองสอบจับเวลาจริง (Mock Exam 30 ข้อ):**
  - สุ่ม 30 ข้อจากคลัง 70 ข้อ จับเวลา 30 นาที เกณฑ์ผ่าน 80% (24/30 คะแนน)
- 📌 **6. คลังข้อผิด (Weak Spots Drill):**
  - บันทึกข้อที่เคยตอบผิดลงฐานข้อมูลอัตโนมัติ เพื่อให้ผู้เรียนกลับมาฝึกซ้ำจนกว่าจะตอบถูก 100%
- 👤 **7. ระบบเข้าสู่ระบบ & ฐานข้อมูล NoSQL JSON Database (`database.json`):**
  - สมัครสมาชิก / เข้าสู่ระบบ พร้อมเลือก Avatar ประจำตัว (🎓, 💻, 🛡️, ⚡, 🚀, 🦊, 🦁, 👑)
  - ใช้งานแบบ Guest รวดเร็วได้ทันที
  - บันทึกประวัติการสอบจำลอง (Mock Exam History) วันที่ คะแนน เปอร์เซ็นต์ และสถานะผ่าน/ไม่ผ่าน
  - ซิงค์ข้อมูลกับ `database.json` ผ่าน REST API ใน `server.py` และรองรับ LocalStorage Fallback อัตโนมัติบน GitHub Pages

---

## 💻 วิธีเปิดใช้งานในเครื่อง (Local Run)

1. รันเซิร์ฟเวอร์ NoSQL Backend:
   ```bash
   python server.py
   ```
   แล้วเปิดเบราว์เซอร์เข้าที่: `http://localhost:8000`
2. หรือดับเบิลคลิกเปิดไฟล์ `index.html` บนเบราว์เซอร์ได้ทันทีโดยไม่ต้องรันเซิร์ฟเวอร์ (Offline 100%)

---
จัดทำขึ้นเพื่อการทบทวนและเตรียมสอบวิชา Web & Cyber Security
