import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
// Use require to avoid missing @types error
const csv = require('csv-parser');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Question Bank Seeding from CSV...');

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
    console.error('   Please upload "question_bank.csv" to the aims_backend/prisma/ folder.');
    process.exit(1);
  }

  console.log(`Reading CSV from ${filePath}...`);
  
  let rowCount = 0;
  let skippedCount = 0;

  fs.createReadStream(filePath)
    .pipe(csv({
      // Normalize headers: lowercase and trim spaces (Fixes "type " issue)
      mapHeaders: ({ header }: { header: string }) => header.trim().toLowerCase()
    }))
    .on('data', (row: any) => {
      rowCount++;
      try {
        // --- 1. PARSE OPTIONS ---
        // Handles Python-style list strings: "['(A) Text', '(B) Text']"
        let rawOptions = row.options || '[]';
        let parsedOptions: string[] = [];
        
        try {
            let cleaned = rawOptions.trim();
            // Remove outer brackets
            if (cleaned.startsWith("[") && cleaned.endsWith("]")) {
                 cleaned = cleaned.slice(1, -1);
            }
            
            // Regex to split by comma ONLY if it follows a closing quote and precedes an opening quote
            // This handles commas inside the option text safely
            // Matches: ', ' or '," or ", '
            parsedOptions = cleaned.split(/['"],\s?['"]/).map(opt => {
                // Strip remaining leading/trailing quotes
                return opt.replace(/^['"]|['"]$/g, '').trim();
            });

            // Fallback if split failed to produce 4 options
            if (parsedOptions.length < 2 && rawOptions.includes(',')) {
                 // Simple split fallback
                 parsedOptions = rawOptions.replace(/[\[\]']/g, "").split(",");
            }
        } catch (e) {
            console.warn(`Row ${rowCount}: Option parse error, using raw fallback.`);
            parsedOptions = ["Option A", "Option B", "Option C", "Option D"];
        }

        const optA = parsedOptions[0] || '';
        const optB = parsedOptions[1] || '';
        const optC = parsedOptions[2] || '';
        const optD = parsedOptions[3] || '';

        // --- 2. PARSE CORRECT ANSWER ---
        // Format: "[B]", "[A, B]", or "B"
        const rawAnswer = row['correct-answer'] || row.answer || '';
        // Clean: remove [ ] ' " and spaces -> "b" or "a,b"
        const cleanAnswer = rawAnswer.toString().replace(/[\[\]'"]/g, '').toLowerCase().replace(/\s/g, ''); 
        
        // Map Letters to Keys
        // If it's multi like "a,b", this logic preserves it
        let correctKey = cleanAnswer;

        // --- 3. MAPPING ---
        const qText = row.question || row.question_text || '';
        
        if (!qText) {
             skippedCount++;
             return;
        }

        // Handle Images
        const qImage = row['question-image'] || null;
        const sImage = row['solution-image'] || null;
        
        // Filter out empty brackets or invalid urls
        const finalQImage = (qImage && qImage.length > 5 && !qImage.includes('[]')) ? qImage : null;
        const finalSImage = (sImage && sImage.length > 5 && !sImage.includes('[]')) ? sImage : null;

        // Determine Subject/Tags
        const subject = (row.subject || 'GENERAL').toUpperCase();
        const topic = row.topic || 'General';
        const type = (row.type || 'single').trim().toLowerCase(); // 'single', 'multiple', 'integer'

        // Add 'multiple' or 'integer' to tags for frontend detection
        const tags = [topic];
        if (type.includes('multi')) tags.push('MULTIPLE');
        if (type.includes('int')) tags.push('INTEGER');

        questions.push({
          createdById: teacherId,
          questionText: qText,
          questionImage: finalQImage,
          solutionImage: finalSImage,
          options: { a: optA, b: optB, c: optC, d: optD },
          correctOption: correctKey, // Stores "b" or "a,b"
          explanation: '',
          subject: subject,
          topic: topic,
          difficulty: 'MEDIUM',
          marks: 4,
          negative: -1,
          expectedTime: 60,
          isActive: true,
          tags: tags
        });

      } catch (err) {
          console.error(`❌ Error on Row ${rowCount}:`, err);
      }
    })
    .on('end', async () => {
      console.log(`\n📊 CSV Processing Complete:`);
      console.log(`   - Total Rows: ${rowCount}`);
      console.log(`   - Valid Questions: ${questions.length}`);
      
      if (questions.length === 0) {
        console.error('❌ No valid questions found.');
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
        console.log('\n✅ Question Bank Seeding Completed Successfully.');
      } catch (error) {
        console.error('\n❌ Database Error:', error);
      } finally {
        await prisma.$disconnect();
      }
    });
}

main().catch((e) => { 
    console.error(e); 
    process.exit(1); 
});