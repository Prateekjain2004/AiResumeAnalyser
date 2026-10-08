
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export interface PdfConversionResult {
    imageUrl: string;
    file: File | null;
    error?: string;
}

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Converts the first page of a PDF into a PNG image.
 */
export async function convertPdfToImage(
    file: File
): Promise<PdfConversionResult> {
    try {
        if (!file) {
            return {
                imageUrl: "",
                file: null,
                error: "No file provided.",
            };
        }

        if (file.type !== "application/pdf") {
            return {
                imageUrl: "",
                file: null,
                error: "The selected file is not a PDF.",
            };
        }

        if (file.size === 0) {
            return {
                imageUrl: "",
                file: null,
                error: "The PDF file is empty.",
            };
        }

        // Read PDF
        const arrayBuffer = await file.arrayBuffer();

        // Load PDF
        const pdf = await pdfjsLib
            .getDocument({
                data: arrayBuffer,
            })
            .promise;

        if (pdf.numPages < 1) {
            return {
                imageUrl: "",
                file: null,
                error: "The PDF contains no pages.",
            };
        }

        // Get first page
        const page = await pdf.getPage(1);

        // Render page
        const viewport = page.getViewport({
            scale: 2,
        });

        const canvas = document.createElement("canvas");

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        const context = canvas.getContext("2d");

        if (!context) {
            return {
                imageUrl: "",
                file: null,
                error: "Failed to create canvas context.",
            };
        }

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";

        await page.render({
            canvas,
            canvasContext: context,
            viewport,
        }).promise;

        // Convert canvas to PNG
        const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, "image/png");
        });

        if (!blob) {
            return {
                imageUrl: "",
                file: null,
                error: "Failed to create PNG image.",
            };
        }

        const originalName = file.name.replace(
            /\.pdf$/i,
            ""
        );

        const imageFile = new File(
            [blob],
            `${originalName}.png`,
            {
                type: "image/png",
            }
        );

        const imageUrl = URL.createObjectURL(blob);

        return {
            imageUrl,
            file: imageFile,
        };
    } catch (error) {
        console.error("PDF conversion error:", error);

        return {
            imageUrl: "",
            file: null,
            error:
                error instanceof Error
                    ? error.message
                    : String(error),
        };
    }
}
