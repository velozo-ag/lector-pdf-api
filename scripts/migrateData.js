const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Iniciando migración de Notas al nuevo sistema global...");

  const notasAntiguas = await prisma.note.findMany({
    where: {
      documentId: { not: null },
    },
    include: {
      oldDocument: true,
    },
  });

  console.log(`📌 Se encontraron ${notasAntiguas.length} notas para migrar.`);

  let migradas = 0;

  for (const nota of notasAntiguas) {
    if (!nota.oldDocument) {
      console.warn(
        `⚠️ La nota ID ${nota.id} no tiene un documento asociado. Se omitirá.`,
      );
      continue;
    }

    const dueñoId = nota.oldDocument.userId;
    const documentoOrigenId = nota.oldDocument.id;

    let nuevosHighlights = [];
    if (Array.isArray(nota.highlights)) {
      nuevosHighlights = nota.highlights.map((h) => {
        return {
          ...h,
          documentId: h.documentId || documentoOrigenId,
        };
      });
    }

    await prisma.note.update({
      where: { id: nota.id },
      data: {
        userId: dueñoId, 
        highlights: nuevosHighlights, 
        documents: {
          connect: { id: documentoOrigenId }, 
        },
      },
    });

    migradas++;
    console.log(`✅ Nota ID ${nota.id} migrada con éxito.`);
  }

  console.log(
    `🎉 Migración completada. Total migradas: ${migradas} de ${notasAntiguas.length}.`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Error fatal durante la migración:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
