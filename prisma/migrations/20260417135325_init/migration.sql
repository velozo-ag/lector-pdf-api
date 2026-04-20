-- CreateTable
CREATE TABLE `Documento` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `urlPdf` VARCHAR(191) NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Anotacion` (
    `id` VARCHAR(191) NOT NULL,
    `documentoId` VARCHAR(191) NOT NULL,
    `textoPuro` TEXT NOT NULL,
    `coordenadas` JSON NOT NULL,
    `numeroPagina` INTEGER NOT NULL,
    `color` VARCHAR(191) NOT NULL DEFAULT '#FFFF00',
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Nota` (
    `id` VARCHAR(191) NOT NULL,
    `anotacionId` VARCHAR(191) NOT NULL,
    `contenido` TEXT NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizadoEn` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Nota_anotacionId_key`(`anotacionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Anotacion` ADD CONSTRAINT `Anotacion_documentoId_fkey` FOREIGN KEY (`documentoId`) REFERENCES `Documento`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Nota` ADD CONSTRAINT `Nota_anotacionId_fkey` FOREIGN KEY (`anotacionId`) REFERENCES `Anotacion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
