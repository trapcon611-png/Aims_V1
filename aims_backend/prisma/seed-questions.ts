import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

const prisma = new PrismaClient();

const CSV_DIR = path.join(__dirname, 'csvs');

async function main() {
    console.log('🚀 Starting AIMS Intelligent DB Seed (APPEND MODE)...');

    // ✨ THE FIX: We completely removed the `deleteMany` command.
    // The database will NOT be wiped. Your corrected questions are 100% safe.
    console.log('🛡️ Append Mode Active: Existing questions will NOT be deleted.');

    if (!fs.existsSync(CSV_DIR)) {
        console.error(`❌ Folder not found: ${CSV_DIR}`);
        console.log('💡 Please create a "csvs" folder inside "aims_backend/prisma/" and put your files there.');
        return;
    }

    const files = fs.readdirSync(CSV_DIR).filter(f => f.endsWith('.csv'));

    if (files.length === 0) {
        console.log(`❌ No CSV files found in ${CSV_DIR}`);
        return;
    }

    const systemAdmin = await prisma.user.findUnique({ where: { username: 'system_admin' } });
    let teacherProfile = null;
    if (systemAdmin) {
        teacherProfile = await prisma.teacherProfile.findFirst({ where: { userId: systemAdmin.id } });
    }

    for (const file of files) {
        console.log(`\n📄 Processing: ${file}`);
        const filePath = path.join(CSV_DIR, file);

        let examType = 'JEE Main'; 
        const lowerFile = file.toLowerCase();
        
        // Smart Routing based on filename
        if (lowerFile.includes('cet')) examType = 'MHT-CET';
        else if (lowerFile.includes('advance')) examType = 'JEE Advanced';
        else if (lowerFile.includes('main')) examType = 'JEE Main';
        else if (lowerFile.includes('neet')) examType = 'NEET';

        const questions: any[] = [];

        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
              .pipe(csv())
              .on('data', (row) => {
                  // Clean up Subject Names
                  let subject = row.subject ? row.subject.trim().toUpperCase() : 'GENERAL';
                  if (subject.includes('MATH')) subject = 'Mathematics';
                  else if (subject.includes('PHY')) subject = 'Physics';
                  else if (subject.includes('CHEM')) subject = 'Chemistry';
                  else if (subject.includes('BIO')) subject = 'Biology';

                  // Clean up Question Types
                  let qType = 'MCQ';
                  if (row.type && row.type.toLowerCase().includes('numerical')) qType = 'NUMERICAL';
                  else if (row.type && row.type.toLowerCase().includes('single')) qType = 'MCQ';

                  // Bundle Options into JSON
                  const options = {
                      a: row.option_a || '',
                      b: row.option_b || '',
                      c: row.option_c || '',
                      d: row.option_d || '',
                      img_a: row.option_image_a && row.option_image_a !== 'null' ? row.option_image_a : null,
                      img_b: row.option_image_b && row.option_image_b !== 'null' ? row.option_image_b : null,
                      img_c: row.option_image_c && row.option_image_c !== 'null' ? row.option_image_c : null,
                      img_d: row.option_image_d && row.option_image_d !== 'null' ? row.option_image_d : null,
                  };

                  // Construct the Question Object
                  questions.push({
                      examType: examType,
                      subject: subject,
                      topic: row.topic_name ? (row.topic_name.charAt(0).toUpperCase() + row.topic_name.slice(1).toLowerCase()) : 'Uncategorized',
                      type: qType,
                      questionText: row.question_text || '',
                      questionImage: row.image_data && row.image_data !== 'null' ? row.image_data : null,
                      solutionImage: row.solution_images && row.solution_images !== 'null' ? row.solution_images : null,
                      explanation: row.solution && row.solution !== 'null' ? row.solution : '',
                      options: options,
                      correctOption: row.correct_answer ? String(row.correct_answer).toLowerCase() : 'pending',
                      
                      // Set to 'pending' so it goes straight to the Question Checker queue
                      difficulty: 'pending', 
                      
                      marks: examType === 'JEE Advanced' ? 4 : (examType === 'MHT-CET' && subject === 'Mathematics' ? 2 : 4),
                      negative: examType === 'MHT-CET' ? 0 : -1,
                      expectedTime: 60,
                      isActive: true,
                      createdById: teacherProfile ? teacherProfile.id : null
                  });
              })
              .on('end', resolve)
              .on('error', reject);
        });

        // Insert into Database in Batches
        const batchSize = 100;
        let inserted = 0;
        
        for (let i = 0; i < questions.length; i += batchSize) {
            const batch = questions.slice(i, i + batchSize);
            await prisma.questionBank.createMany({
                data: batch,
                skipDuplicates: true
            });
            inserted += batch.length;
            process.stdout.write(`\r✅ Inserted ${inserted} / ${questions.length} questions...`);
        }
        console.log(`\n🎉 Finished ${file}. Extracted Exam Type: [${examType}]`);
    }

    console.log('\n=============================================');
    console.log('🏆 NEW QUESTIONS SECURELY APPENDED TO DATABASE!');
    console.log('=============================================');
}

main()
  .catch(e => {
    console.error('Fatal Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });