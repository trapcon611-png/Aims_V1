import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
const csv = require('csv-parser');

const prisma = new PrismaClient();

const cleanStr = (val: any) => {
    if (!val || String(val).trim().toLowerCase() === 'nan') return null;
    return String(val).trim();
};

const formatImage = (val: any) => {
    const str = cleanStr(val);
    if (!str) return null;
    if (str.startsWith('http') || str.startsWith('data:image')) return str;
    return `data:image/png;base64,${str}`;
};

const normalizeForCompare = (text: string) => text ? text.replace(/\s+/g, '').toLowerCase() : '';

const getSubjectFromFileName = (filename: string) => {
    const lower = filename.toLowerCase();
    if (lower.includes('physics')) return 'Physics';
    if (lower.includes('chemistry')) return 'Chemistry';
    if (lower.includes('biology')) return 'Biology';
    if (lower.includes('math')) return 'Mathematics';
    return 'General';
};

const formatExamType = (folderName: string) => {
    if (folderName === 'JEE_Advanced') return 'JEE Advanced';
    if (folderName === 'JEE_Main') return 'JEE Main';
    if (folderName === 'MHT_CET') return 'MHT-CET';
    return folderName;
};

async function processFile(filePath: string, examType: string, fallbackSubject: string, teacherId: string, existingMap: Map<string, string>) {
    return new Promise<void>((resolve, reject) => {
        const questionsToInsert: any[] = [];
        let skippedCount = 0;

        console.log(`\n📄 Processing: [${examType}] - (${path.basename(filePath)})`);

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row: any) => {
                const qTextRaw = cleanStr(row.question_text);
                if (!qTextRaw) return;

                const normalizedQText = normalizeForCompare(qTextRaw) + `_${examType}`;

                if (existingMap.has(normalizedQText)) {
                    skippedCount++;
                    return;
                }

                const parsedOptions = {
                    a: cleanStr(row.option_a) || '',
                    b: cleanStr(row.option_b) || '',
                    c: cleanStr(row.option_c) || '',
                    d: cleanStr(row.option_d) || '',
                    img_a: formatImage(row.option_image_a),
                    img_b: formatImage(row.option_image_b),
                    img_c: formatImage(row.option_image_c),
                    img_d: formatImage(row.option_image_d),
                };

                const mainImage = formatImage(row.image_data) || formatImage(row.extra_question_images);
                const solImage = formatImage(row.hint_image) || formatImage(row.solution_images);
                const solText = cleanStr(row.solution);
                
                let dbCorrectOpt = cleanStr(row.correct_answer)?.toLowerCase() || 'pending';
                if (!['a', 'b', 'c', 'd'].includes(dbCorrectOpt)) dbCorrectOpt = 'pending';

                existingMap.set(normalizedQText, 'pending_insert'); 
                
                questionsToInsert.push({
                    createdById: teacherId,
                    examType: examType,
                    subject: cleanStr(row.subject) ? row.subject.charAt(0).toUpperCase() + row.subject.slice(1).toLowerCase() : fallbackSubject,
                    topic: cleanStr(row.topic_name) || 'Uncategorized',
                    questionText: qTextRaw,
                    questionImage: mainImage,
                    solutionImage: solImage,
                    explanation: solText,
                    options: parsedOptions,
                    correctOption: dbCorrectOpt,
                    difficulty: 'pending',    
                    type: cleanStr(row.type) === 'numerical' ? 'NUMERICAL' : 'MCQ',
                    marks: 4,
                    negative: -1,
                });
            })
            .on('end', async () => {
                if (questionsToInsert.length > 0) {
                    const chunkSize = 50;
                    for (let i = 0; i < questionsToInsert.length; i += chunkSize) {
                        const chunk = questionsToInsert.slice(i, i + chunkSize);
                        await prisma.questionBank.createMany({ data: chunk, skipDuplicates: true });
                    }
                    console.log(`✅ Inserted ${questionsToInsert.length} new questions.`);
                } else {
                    console.log(`🛑 Skipped ${skippedCount} existing questions.`);
                }
                resolve();
            })
            .on('error', reject);
    });
}

async function main() {
    const csvBaseDir = path.join(__dirname, 'csv_uploads');
    if (!fs.existsSync(csvBaseDir)) {
        console.error(`❌ Please create the folder structure at: ${csvBaseDir}`);
        process.exit(1);
    }

    let systemUser = await prisma.user.findFirst({ where: { username: 'system_admin' } });
    if (!systemUser) systemUser = await prisma.user.create({ data: { username: 'system_admin', password: 'hashed_password', role: 'SUPER_ADMIN' } });

    let systemTeacher = await prisma.teacherProfile.findFirst({ where: { userId: systemUser.id } });
    if (!systemTeacher) systemTeacher = await prisma.teacherProfile.create({ data: { userId: systemUser.id, fullName: 'System Auto-Importer' } });

    console.log('⏳ Fetching existing question bank to prevent duplicates...');
    const existingDbQuestions = await prisma.questionBank.findMany({ select: { id: true, questionText: true, examType: true } });
    
    const existingMap = new Map();
    existingDbQuestions.forEach(q => {
        const safeExam = q.examType || 'General';
        existingMap.set(normalizeForCompare(q.questionText) + `_${safeExam}`, q.id);
    });

    const folders = fs.readdirSync(csvBaseDir);
    for (const folder of folders) {
        const folderPath = path.join(csvBaseDir, folder);
        if (fs.statSync(folderPath).isDirectory()) {
            const examType = formatExamType(folder);
            const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.csv'));
            
            for (const file of files) {
                const subject = getSubjectFromFileName(file);
                await processFile(path.join(folderPath, file), examType, subject, systemTeacher.id, existingMap);
            }
        }
    }

    console.log('\n🎉 ALL FOLDERS PROCESSED SUCCESSFULLY!');
    await prisma.$disconnect();
}

main().catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
});