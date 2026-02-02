import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
// Use require to avoid missing @types error
const csv = require('csv-parser');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Question Bank Seeding...');

  // 1. Ensure System Teacher Exists
  const systemEmail = 'system_content_admin@aims.com';
  let teacher = await prisma.teacherProfile.findUnique({ where: { email: systemEmail } });

  if (!teacher) {
    console.log('Creating System Teacher Profile...');
    let user = await prisma.user.findUnique({ where: { username: 'content_admin' }});
    if (!user) {
        user = await prisma.user.create({
        data: { username: 'content_admin', password: 'secure_password_123', role: 'TEACHER', isActive: true }
        });
    }
    teacher = await prisma.teacherProfile.create({
      data: { userId: user.id, fullName: 'System Content Admin', email: systemEmail, mobile: '0000000000', subject: 'GENERAL' }
    });
  }

  const teacherId = teacher.id;
  const questions: any[] = [];
  const filePath = path.join(__dirname, 'question_bank.csv'); 

  if (!fs.existsSync(filePath)) {
    console.error(`❌ CSV file not found at: ${filePath}`);
    console.error('   Please make sure "question_bank.csv" is in the "aims_backend/prisma/" folder.');
    process.exit(1);
  }

  console.log(`Reading CSV from ${filePath}...`);
  
  let rowCount = 0;
  let skippedCount = 0;

  fs.createReadStream(filePath)
    .pipe(csv({
      // Normalize headers to lowercase and trim spaces to avoid mismatches
      mapHeaders: ({ header }: { header: string }) => header.trim().toLowerCase()
    }))
    .on('headers', (headers: any) => {
        console.log('🔍 Detected Headers:', headers);
    })
    .on('data', (row: any) => {
      rowCount++;
      try {
        // --- 1. PARSE OPTIONS ---
        // Handles Python-style list strings: "['A', 'B']"
        let rawOptions = row.options || '[]';
        let parsedOptions: string[] = [];
        
        try {
            // Remove Python specific artifacts if simple JSON parse fails
            let cleaned = rawOptions.trim();
            // Replace single quotes with double quotes for valid JSON
            // Be careful not to break apostrophes inside text, but this is a heuristic
            if (cleaned.startsWith("['") || cleaned.startsWith("[\"")) {
                 // Simple strip and split for safety if JSON fails
                 cleaned = cleaned.slice(1, -1); // remove brackets
                 // Split by ', ' or ", "
                 parsedOptions = cleaned.split(/['"],\s?['"]/).map((opt: string) => opt.replace(/^['"]|['"]$/g, ''));
            } else {
                 parsedOptions = JSON.parse(cleaned);
            }
        } catch (e) {
            // Fallback for non-standard formats
            if(rawOptions.length > 5) {
                // Treat as simple string if parse fails but content exists
                parsedOptions = [rawOptions, "", "", ""];
            }
        }

        const optA = parsedOptions[0] || '';
        const optB = parsedOptions[1] || '';
        const optC = parsedOptions[2] || '';
        const optD = parsedOptions[3] || '';

        // --- 2. PARSE CORRECT ANSWER ---
        // Format might be "[B]" or "B" or "['B']"
        let correctKey = 'a';
        const rawAnswer = row['correct-answer'] || row.answer || '';
        const cleanAnswer = rawAnswer.toString().replace(/[\[\]'"]/g, '').toLowerCase().trim(); 
        
        if (cleanAnswer.includes('a')) correctKey = 'a';
        else if (cleanAnswer.includes('b')) correctKey = 'b';
        else if (cleanAnswer.includes('c')) correctKey = 'c';
        else if (cleanAnswer.includes('d')) correctKey = 'd';

        // --- 3. MAPPING ---
        const qText = row.question || row.question_text || '';
        
        // --- 4. VALIDATION ---
        if (!qText) {
             skippedCount++;
             if (skippedCount <= 3) console.warn(`⚠️ Skipped Row ${rowCount}: No Question Text`);
             return;
        }

        // Map Image Columns (normalized by mapHeaders to lowercase)
        const qImage = row['question-image'] || row.questionimage || null;
        const sImage = row['solution-image'] || row.solutionimage || null;
        // Images that are just "[]" or empty strings should be null
        const finalQImage = (qImage && qImage.length > 5) ? qImage : null;
        const finalSImage = (sImage && sImage.length > 5) ? sImage : null;

        questions.push({
          createdById: teacherId,
          questionText: qText,
          questionImage: finalQImage,
          solutionImage: finalSImage,
          options: { a: optA, b: optB, c: optC, d: optD },
          correctOption: correctKey,
          explanation: '',
          subject: (row.subject || 'GENERAL').toUpperCase(),
          topic: row.topic || 'General',
          difficulty: 'MEDIUM',
          marks: 4,
          negative: -1,
          expectedTime: 60,
          isActive: true,
          tags: [row.type || 'single']
        });

      } catch (err) {
          console.error(`❌ Error on Row ${rowCount}:`, err);
      }
    })
    .on('end', async () => {
      console.log(`\n📊 SUMMARY:`);
      console.log(`   Total Rows Read: ${rowCount}`);
      console.log(`   Valid Questions: ${questions.length}`);
      console.log(`   Skipped Rows:    ${skippedCount}`);
      
      if (questions.length === 0) {
        console.error('❌ No valid questions found. Check the headers above ^');
        return;
      }

      console.log(`\n🚀 Inserting ${questions.length} questions into DB...`);
      
      try {
        const batchSize = 50; 
        for (let i = 0; i < questions.length; i += batchSize) {
            const batch = questions.slice(i, i + batchSize);
            await prisma.questionBank.createMany({ data: batch, skipDuplicates: true });
            process.stdout.write(`.`);
        }
        console.log('\n✅ Question Bank Seeding Completed.');
      } catch (error) {
        console.error('\n❌ DB Error:', error);
      } finally {
        await prisma.$disconnect();
      }
    });
}

main().catch((e) => { console.error(e); process.exit(1); });