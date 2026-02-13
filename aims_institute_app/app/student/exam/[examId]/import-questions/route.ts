import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; 

export async function POST(
  req: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { examId } = resolvedParams;
    const body = await req.json();
    const { questions } = body; 

    console.log(`[Import API] Request for Exam: ${examId}, Questions: ${questions?.length}`);

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Prepare Data with TOPIC and TYPE
    const preparedQuestions = questions.map((q: any, index: number) => ({
        examId: examId,
        questionText: String(q.questionText || "Question text missing"),
        questionImage: q.questionImage ? String(q.questionImage) : null,
        
        subject: String(q.subject || "General"),
        // NOW WE CAN SAVE THESE:
        topic: String(q.topic || "General"),
        type: String(q.type || "SINGLE").toUpperCase(), 
        difficulty: String(q.difficulty || "MEDIUM").toUpperCase(),
        
        options: q.options || {}, 
        correctOption: String(q.correctOption || "a"),
        
        marks: Number(q.marks) || 4,
        negative: -1,
        orderIndex: index + 1
    }));

    // Transaction
    const createdQuestions = await prisma.$transaction(
      preparedQuestions.map(data => prisma.question.create({ data }))
    );

    // Update Exam Totals
    const totalMarks = preparedQuestions.reduce((sum, q) => sum + q.marks, 0);
    await prisma.exam.update({
        where: { id: examId },
        data: { 
            isPublished: true,
            totalMarks: totalMarks
        }
    });

    console.log(`[Import API] Success. Imported ${createdQuestions.length} questions.`);

    return NextResponse.json({ 
      success: true, 
      count: createdQuestions.length, 
      message: "Import successful" 
    });

  } catch (error: any) {
    console.error("[Import API CRASH]:", error);
    return NextResponse.json(
      { error: "Database Error", details: error.message },
      { status: 500 }
    );
  }
}